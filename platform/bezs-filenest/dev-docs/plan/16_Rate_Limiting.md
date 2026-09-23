# FileNest v1.0 — Rate Limiting

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Strategy](#1-strategy)
2. [Limit Tiers](#2-limit-tiers)
3. [Redis Token Bucket Implementation](#3-redis-token-bucket-implementation)
4. [Middleware](#4-middleware)
5. [Response Format](#5-response-format)
6. [Endpoint-Specific Limits](#6-endpoint-specific-limits)
7. [Admin Overrides](#7-admin-overrides)

---

## 1. Strategy

FileNest uses a **token bucket** algorithm implemented atomically in Redis. Token bucket is chosen over fixed window counters because it handles burst traffic naturally — a customer can briefly exceed their average rate as long as they have tokens accumulated.

**Two limit tiers operate simultaneously on every request:**

1. **API Key level** — limits per individual key (prevents a single key from starving others within the same project)
2. **Organization level** — aggregate limit across all projects and keys within an org (enforces plan limits)

The stricter of the two is enforced. Both bucket states are checked in a single Redis pipeline.

---

## 2. Limit Tiers

### 2.1 Organization-Level Limits (Plan-Based)

| Plan | Requests/min | Burst | Uploads/min | Downloads/min | Processing/min |
|------|-------------|-------|-------------|--------------|----------------|
| Starter | 100 | 150 | 10 | 50 | 5 |
| Professional | 1,000 | 2,000 | 100 | 500 | 50 |
| Enterprise | 10,000 | 20,000 | 1,000 | 5,000 | 500 |
| Healthcare Enterprise | 10,000 | 20,000 | 1,000 | 5,000 | 500 |

### 2.2 API Key-Level Limits (Default)

These apply per individual API key regardless of plan, preventing one runaway key from consuming the org's entire quota.

| Key Type | Requests/min | Burst |
|----------|-------------|-------|
| `fn_live_` (standard) | 500 | 1,000 |
| `fn_test_` (test env) | 200 | 400 |
| `fn_sa_` (service account) | 2,000 | 5,000 |

Service accounts have higher limits because they are server-side integrations, not user-facing clients.

---

## 3. Redis Token Bucket Implementation

### 3.1 Lua Script (Atomic Check-and-Consume)

```lua
-- rate_limit.lua
-- KEYS[1] = bucket key (e.g. "rl:org:org_abc:api")
-- ARGV[1] = capacity (max tokens)
-- ARGV[2] = refill_rate (tokens per second)
-- ARGV[3] = requested (tokens to consume, usually 1)
-- ARGV[4] = now (current timestamp as float, seconds)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local requested = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if tokens == nil then
    -- First request: initialize full bucket
    tokens = capacity
    last_refill = now
end

-- Refill based on time elapsed
local elapsed = now - last_refill
local refill = elapsed * refill_rate
tokens = math.min(capacity, tokens + refill)

local allowed = 0
local remaining = tokens

if tokens >= requested then
    tokens = tokens - requested
    remaining = tokens
    allowed = 1
end

-- Persist updated bucket state with TTL
redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
redis.call("EXPIRE", key, 3600)  -- Expire unused buckets after 1h

return {allowed, math.floor(remaining), math.ceil(capacity)}
```

### 3.2 Python Rate Limiter

```python
import time
import redis.asyncio as redis

RATE_LIMIT_SCRIPT = """..."""  # Lua script above

class RateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._script = None

    async def _get_script(self):
        if self._script is None:
            self._script = self.redis.register_script(RATE_LIMIT_SCRIPT)
        return self._script

    async def check(
        self,
        key: str,
        capacity: int,
        refill_rate: float,
        requested: int = 1,
    ) -> RateLimitResult:
        script = await self._get_script()
        now = time.time()

        result = await script(
            keys=[key],
            args=[capacity, refill_rate, requested, now],
        )

        allowed, remaining, limit = result
        reset_at = int(now + (limit - remaining) / refill_rate)

        return RateLimitResult(
            allowed=bool(allowed),
            remaining=remaining,
            limit=limit,
            reset_at=reset_at,
        )

    async def check_org_and_key(
        self,
        org_id: str,
        api_key_id: str,
        key_type: str,
        plan: str,
        endpoint_type: str,
    ) -> tuple[RateLimitResult, RateLimitResult]:
        plan_limits = PLAN_LIMITS[plan][endpoint_type]
        key_limits = KEY_TYPE_LIMITS[key_type]

        org_key = f"rl:org:{org_id}:{endpoint_type}"
        key_key = f"rl:key:{api_key_id}:{endpoint_type}"

        # Check both in parallel
        org_result, key_result = await asyncio.gather(
            self.check(
                org_key,
                capacity=plan_limits["burst"],
                refill_rate=plan_limits["per_min"] / 60,
            ),
            self.check(
                key_key,
                capacity=key_limits["burst"],
                refill_rate=key_limits["per_min"] / 60,
            ),
        )

        return org_result, key_result
```

---

## 4. Middleware

```python
class RateLimitMiddleware(BaseHTTPMiddleware):

    def __init__(self, app, rate_limiter: RateLimiter):
        super().__init__(app)
        self.limiter = rate_limiter

    async def dispatch(self, request: Request, call_next):
        auth: AuthContext = request.state.auth  # Set by auth middleware before this

        if auth is None or auth.is_internal:
            return await call_next(request)  # Skip for health checks, internal

        endpoint_type = classify_endpoint(request.url.path, request.method)

        org_result, key_result = await self.limiter.check_org_and_key(
            org_id=auth.org_id,
            api_key_id=auth.api_key_id,
            key_type=auth.key_type,
            plan=auth.org_plan,
            endpoint_type=endpoint_type,
        )

        # Use the stricter result
        binding_result = org_result if not org_result.allowed else key_result
        limited_by = "org" if not org_result.allowed else "key"

        response_headers = {
            "X-RateLimit-Limit": str(binding_result.limit),
            "X-RateLimit-Remaining": str(binding_result.remaining),
            "X-RateLimit-Reset": str(binding_result.reset_at),
            "X-RateLimit-Policy": f"{binding_result.limit};w=60",
        }

        if not org_result.allowed or not key_result.allowed:
            logger.warning(
                "rate_limit_exceeded",
                org_id=auth.org_id,
                api_key_id=auth.api_key_id,
                limited_by=limited_by,
                endpoint_type=endpoint_type,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "rate_limit_exceeded",
                        "message": (
                            f"Rate limit exceeded. Retry after {binding_result.reset_at}."
                        ),
                        "limit": binding_result.limit,
                        "remaining": 0,
                        "reset_at": binding_result.reset_at,
                        "limited_by": limited_by,
                        "docs": "https://docs.filenest.io/rate-limits",
                    }
                },
                headers=response_headers,
            )

        response = await call_next(request)
        for k, v in response_headers.items():
            response.headers[k] = v
        return response


def classify_endpoint(path: str, method: str) -> str:
    if "/uploads" in path or (method == "POST" and "/files" in path):
        return "uploads"
    if "/download" in path or "/stream" in path:
        return "downloads"
    if "/processing" in path:
        return "processing"
    return "api"
```

---

## 5. Response Format

### 5.1 Success Response Headers

Every API response includes rate limit state:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1750000860
X-RateLimit-Policy: 1000;w=60
```

### 5.2 Rate Limited Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1750000872

{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 1750000872.",
    "limit": 1000,
    "remaining": 0,
    "reset_at": 1750000872,
    "limited_by": "org",
    "docs": "https://docs.filenest.io/rate-limits"
  }
}
```

`limited_by` is `"org"` or `"key"` — tells the developer whether they need to upgrade their plan or spread load across multiple keys.

---

## 6. Endpoint-Specific Limits

Some endpoints have separate, stricter limits regardless of plan:

| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| `POST /v1/api-keys` | 10/hour per org | Prevent key harvesting |
| `POST /v1/organizations` | 5/hour per IP | Prevent org farming |
| `POST /v1/auth/token` | 20/min per IP | Brute force protection |
| `GET /v1/audit/events` | 30/min per org | Audit export is expensive |
| `POST /v1/search` | Per-plan limit × 2 | Search is expensive; double allocation |

These are enforced by dedicated middleware applied per router, not the global token bucket.

---

## 7. Admin Overrides

```python
# Stored in organizations table: rate_limit_overrides JSONB
{
  "api": { "per_min": 50000, "burst": 100000 },
  "uploads": { "per_min": 5000, "burst": 10000 }
}
```

Overrides are loaded into Redis on org creation/update and cached for 5 minutes. When present, they replace plan-based limits entirely. Used for:
- Enterprise customers with negotiated SLAs
- Internal FileNest services
- Load testing accounts (temporarily elevated)
