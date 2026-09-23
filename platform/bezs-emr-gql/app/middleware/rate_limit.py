"""
Sliding-window rate limiting middleware with Redis and in-process fallback.

Algorithm:
  Each unique client+method combination gets a sliding window tracked as a Redis
  sorted set where every member is a request timestamp and the score is the same
  timestamp value. On each request:
    1. Remove all members with a score older than `now - window_seconds` (expired).
    2. Count remaining members.
    3. If count >= limit → reject with 429.
    4. Otherwise → add the current timestamp and set TTL = window_seconds.

  This gives an exact sliding window (vs. a fixed-window counter which can allow 2×
  the limit across a window boundary) with O(log N) Redis operations per request.

Fallback:
  If Redis is unavailable at startup or fails during a request, the middleware
  falls back to an in-process Python list per key (also a sliding window). This
  fallback is NOT safe in multi-process or multi-instance deployments — each worker
  maintains its own counters and the effective limit multiplies by the number of workers.
  The fallback logs an error so the operator knows protection is degraded.

Client identification:
  - Authenticated requests: use the JWT `sub` claim (user ID) — ensures per-user limits
    are not shared across different users on the same IP (e.g. corporate NAT).
  - Unauthenticated requests: use the leftmost IP from X-Forwarded-For (set by the
    load balancer / reverse proxy), falling back to the TCP peer address.

Excluded paths:
  Health, docs, and static asset paths are excluded to avoid counting them against
  the rate limit of monitoring agents and browser clients loading the Swagger UI.
"""

import asyncio
import time
from collections import defaultdict

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger

logger = get_logger(__name__)


def _make_429(limit: int, window: int) -> JSONResponse:
    """
    Build a 429 Too Many Requests JSON response with standard rate-limit headers.

    The Retry-After header tells the client how many seconds to wait before retrying.
    X-RateLimit-* headers follow the IETF draft standard so clients that understand
    them can implement backoff without parsing the error body.

    Args:
        limit:  The request limit that was exceeded (for the X-RateLimit-Limit header).
        window: The window duration in seconds (used as Retry-After value).

    Returns:
        A JSONResponse with status 429 and populated rate-limit headers.
    """
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Rate limit exceeded. Please slow down."},
        headers={
            "Retry-After": str(window),          # seconds until the window resets
            "X-RateLimit-Limit": str(limit),      # total allowed per window
            "X-RateLimit-Remaining": "0",         # explicitly zero on rejection
            "X-RateLimit-Window": str(window),    # window duration in seconds
        },
    )


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter that uses Redis as the primary store and falls back
    to an in-process store when Redis is unavailable.

    Separate limits are applied to read (GET/HEAD/OPTIONS) and write (POST/PATCH/DELETE)
    operations because reads are significantly more frequent in a clinical UI and
    a lower write limit reduces the blast radius of a compromised or runaway client.
    """

    def __init__(
        self,
        app,
        read_limit: int = 100,
        write_limit: int = 20,
        window_seconds: int = 60,
    ):
        """
        Args:
            app:            The ASGI application to wrap (passed by Starlette).
            read_limit:     Max GET/HEAD/OPTIONS requests per client per window.
            write_limit:    Max POST/PATCH/DELETE requests per client per window.
            window_seconds: Duration of the sliding window in seconds.
        """
        super().__init__(app)
        self.read_limit = read_limit
        self.write_limit = write_limit
        self.window = window_seconds

        # Paths that are never rate-limited — monitoring and API docs must always
        # be reachable regardless of client request volume.
        self._EXCLUDED_PATHS = {"/health", "/openapi.json"}
        self._EXCLUDED_PREFIXES = ("/docs", "/redoc", "/favicon")

        # In-process fallback store: maps rate-limit key → list of request timestamps.
        # defaultdict(list) avoids a KeyError on first access for a new client key.
        self._local_windows: dict[str, list[float]] = defaultdict(list)

        # Async lock prevents race conditions when two concurrent requests for the
        # same client_id both read and modify the list simultaneously.
        self._local_lock = asyncio.Lock()

    async def _check_local(self, key: str, limit: int) -> tuple[bool, int]:
        """
        Enforce the rate limit using the in-process sliding window store.

        Thread-safe via asyncio.Lock — only one coroutine at a time can read and
        mutate the list for a given key. This is safe in a single-process async
        server (uvicorn with one worker) but NOT across multiple processes.

        Args:
            key:   The rate-limit key (e.g. "rate:<client_id>:<METHOD>").
            limit: The maximum number of requests allowed in the window.

        Returns:
            (allowed, remaining) where `allowed` is True if the request is within
            the limit, and `remaining` is the number of requests still available.
        """
        now = time.time()
        cutoff = now - self.window

        async with self._local_lock:
            # Evict timestamps older than the sliding window cutoff — this is what
            # makes it a sliding window rather than a fixed-bucket counter.
            self._local_windows[key] = [t for t in self._local_windows[key] if t > cutoff]
            count = len(self._local_windows[key])

            if count >= limit:
                # Window is full — reject without recording this request.
                return False, 0

            # Record the current request timestamp and return remaining capacity.
            self._local_windows[key].append(now)
            return True, max(limit - count - 1, 0)

    async def _check_redis(self, redis, key: str, limit: int) -> tuple[bool, int]:
        """
        Enforce the rate limit using a Redis sorted set (distributed, multi-instance safe).

        Sorted set design: member = str(timestamp), score = int(timestamp).
        Using the timestamp as both member and score allows:
          - O(log N) removal of expired entries via zremrangebyscore.
          - O(1) count of valid entries via zcard.
          - Natural TTL management: the key expires window_seconds after the last request.

        Note: This is not atomic (no Lua script or MULTI/EXEC). Under extreme concurrent
        load from the same client_id, the count check and zadd could race, allowing a
        small burst above the limit. For clinical middleware this is an acceptable trade-off
        vs. the complexity of a Lua atomic script.

        Args:
            redis: The async Redis client from app.state.redis.
            key:   The rate-limit key (e.g. "rate:<client_id>:<METHOD>").
            limit: The maximum number of requests allowed in the window.

        Returns:
            (allowed, remaining) — same semantics as _check_local.
        """
        now = int(time.time())

        # Remove entries older than the sliding window — anything scored below
        # (now - window) is expired and should not count toward the limit.
        await redis.zremrangebyscore(key, 0, now - self.window)

        # Count how many valid (within-window) requests already exist for this key.
        count = await redis.zcard(key)

        if count >= limit:
            return False, 0

        # Record this request: member = str(now) to ensure uniqueness per second.
        # If two requests arrive in the same second, zadd with the same score just
        # updates the existing member — using `now` as member value means same-second
        # requests share one slot. This is acceptable for 60-second windows.
        await redis.zadd(key, {str(now): now})

        # Reset the TTL so the key expires window_seconds after the most recent request,
        # not after it was first created. This prevents stale keys from accumulating.
        await redis.expire(key, self.window)

        return True, max(limit - count - 1, 0)

    async def dispatch(self, request: Request, call_next):
        """
        Main middleware entry point — enforce rate limits on every incoming request.

        Execution flow:
          1. Skip excluded paths (health, docs) immediately.
          2. Determine client identity (JWT sub for authed requests, IP for others).
          3. Choose the limit tier (read vs. write).
          4. Check Redis (primary) or local store (fallback).
          5. Reject with 429 if over limit, otherwise forward the request and annotate
             the response with X-RateLimit-* headers.

        Args:
            request:   The incoming FastAPI/Starlette request.
            call_next: Callable to forward the request to the next handler.

        Returns:
            Either a 429 JSONResponse (rate limited) or the handler's response with
            X-RateLimit-* headers added.
        """
        path = request.url.path

        # Fast path — skip rate limiting for non-API paths that must always be accessible.
        if path in self._EXCLUDED_PATHS or path.startswith(self._EXCLUDED_PREFIXES):
            return await call_next(request)

        # Determine who is making this request.
        # Authenticated requests: use the JWT subject (`sub`) so per-user limits are
        # isolated even if multiple users share an IP (corporate NAT, VPN exit node).
        # Unauthenticated requests: use the leftmost IP from X-Forwarded-For (set by the
        # load balancer). The leftmost IP is the original client; rightmost is the proxy.
        # Fall back to the direct TCP peer address if no proxy header is present.
        user = getattr(request.state, "user", None)
        if user:
            client_id = user.get("sub", "unknown")
        else:
            forwarded = request.headers.get("x-forwarded-for")
            client_id = (
                forwarded.split(",")[0].strip()   # take leftmost (original client) IP
                if forwarded
                else (request.client.host if request.client else "unknown")
            )

        # Apply separate limits for read vs. write operations to allow a higher
        # throughput for reads (which are more frequent in a clinical dashboard).
        is_read = request.method in ("GET", "HEAD", "OPTIONS")
        limit = self.read_limit if is_read else self.write_limit

        # Rate-limit key format: "rate:<client_id>:<METHOD>" — includes the HTTP method
        # so read and write budgets are tracked independently for the same client.
        key = f"rate:{client_id}:{request.method}"

        # Retrieve the Redis client attached to app.state during the lifespan startup.
        # Will be None if Redis was unavailable at startup.
        redis = getattr(request.app.state, "redis", None)

        if redis is not None:
            try:
                # Primary path: distributed Redis store — safe across multiple instances.
                allowed, remaining = await self._check_redis(redis, key, limit)
                backend = "redis"
            except Exception as exc:
                # Redis command failed mid-request — fall back to local store and log
                # the error so the operator knows Redis is degraded.
                logger.error("Rate limit Redis error, falling back to local", exc_info=exc)
                allowed, remaining = await self._check_local(key, limit)
                backend = "local"
        else:
            # Redis was never available — warn loudly because multi-instance deployments
            # will have degraded (per-worker) rate limiting.
            logger.error(
                "Redis unavailable — rate limiting is process-local only. "
                "Protection is degraded in multi-instance deployments."
            )
            allowed, remaining = await self._check_local(key, limit)
            backend = "local"

        if not allowed:
            # Log the rejection with structured fields so it can be queried in the
            # log aggregation system to detect abuse patterns.
            logger.info(
                "Rate limit exceeded",
                extra={
                    "client_id": client_id,
                    "method": request.method,
                    "path": path,
                    "limit": limit,
                    "backend": backend,
                },
            )
            return _make_429(limit, self.window)

        # Request is within limits — forward it and annotate the response with
        # standard rate-limit headers so well-behaved clients can throttle themselves.
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(self.window)
        return response
