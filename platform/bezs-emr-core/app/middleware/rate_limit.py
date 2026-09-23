import asyncio
import time
from collections import defaultdict

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger

logger = get_logger(__name__)


def _make_429(limit: int, window: int) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "throttled",
                    "diagnostics": "Rate limit exceeded",
                }
            ],
        },
        headers={
            "Retry-After": str(window),
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Window": str(window),
        },
    )


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        read_limit: int = 100,
        write_limit: int = 20,
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.read_limit = read_limit
        self.write_limit = write_limit
        self.window = window_seconds

        self.EXCLUDED_PATHS = {"/", "/health", "/health/ready", "/openapi.json"}
        self.EXCLUDED_PREFIXES = ("/docs", "/redoc", "/favicon")

        # Per-process fallback used when Redis is unavailable.
        # Not coordinated across instances — but better than no limiting at all.
        self._local_windows: dict[str, list[float]] = defaultdict(list)
        self._local_lock = asyncio.Lock()

    # ── Local (in-process) sliding window ────────────────────────────────────

    async def _check_local(self, key: str, limit: int) -> tuple[bool, int]:
        """Return (allowed, remaining). Mutates _local_windows under lock."""
        now = time.time()
        cutoff = now - self.window
        async with self._local_lock:
            timestamps = self._local_windows[key]
            # Drop expired
            self._local_windows[key] = [t for t in timestamps if t > cutoff]
            count = len(self._local_windows[key])
            if count >= limit:
                return False, 0
            self._local_windows[key].append(now)
            return True, max(limit - count - 1, 0)

    # ── Redis sliding window ──────────────────────────────────────────────────

    async def _check_redis(self, redis, key: str, limit: int) -> tuple[bool, int]:
        """Return (allowed, remaining). Uses sorted-set sliding window in Redis."""
        now = int(time.time())
        window_start = now - self.window
        await redis.zremrangebyscore(key, 0, window_start)
        count = await redis.zcard(key)
        if count >= limit:
            return False, 0
        await redis.zadd(key, {str(now): now})
        await redis.expire(key, self.window)
        return True, max(limit - count - 1, 0)

    # ── Middleware entry point ────────────────────────────────────────────────

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path in self.EXCLUDED_PATHS or path.startswith(self.EXCLUDED_PREFIXES):
            return await call_next(request)

        # Identify client
        user = getattr(request.state, "user", None)
        if user:
            user_id = user.get("sub", "unknown")
        else:
            forwarded = request.headers.get("x-forwarded-for")
            user_id = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

        is_read = request.method in ("GET", "HEAD", "OPTIONS")
        limit = self.read_limit if is_read else self.write_limit
        key = f"rate:{user_id}:{request.method}"

        redis = getattr(request.app.state, "redis", None)

        if redis is not None:
            try:
                allowed, remaining = await self._check_redis(redis, key, limit)
                backend = "redis"
            except Exception as exc:
                # Redis call failed mid-request — fall back to local
                logger.error(
                    "Rate limit Redis error, falling back to in-process limiter",
                    exc_info=exc,
                )
                allowed, remaining = await self._check_local(key, limit)
                backend = "local"
        else:
            # Redis unavailable at startup or reconnect — use local limiter.
            # Log at ERROR so this shows up in alerts, not just warning noise.
            logger.error(
                "Redis unavailable — rate limiting is process-local only. "
                "Protection is degraded in multi-instance deployments."
            )
            allowed, remaining = await self._check_local(key, limit)
            backend = "local"

        if not allowed:
            logger.info(
                "Rate limit exceeded",
                extra={
                    "user_id": user_id,
                    "method": request.method,
                    "path": path,
                    "limit": limit,
                    "backend": backend,
                },
            )
            return _make_429(limit, self.window)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(self.window)
        return response
