# Rate Limiting & DDoS Protection

---

## Why Rate Limiting Matters for FHIR

1. **Cost control** — AI operations, bulk exports, and search are expensive
2. **Fairness** — one tenant shouldn't degrade performance for others
3. **Security** — prevents credential stuffing, scraping, brute force
4. **HIPAA** — protection against PHI mass exfiltration

---

## Rate Limit Tiers

| Endpoint Category | Free | Starter | Professional | Enterprise |
|---|---|---|---|---|
| FHIR CRUD | 30 req/min | 100 req/min | 1000 req/min | Custom |
| List/Search | 10 req/min | 30 req/min | 200 req/min | Custom |
| `$export` / Bulk | 1/hour | 1/hour | 10/hour | Custom |
| `$ai` operations | 0 | 10/hour | 100/hour | Custom |
| Auth endpoints | 5/min | 20/min | 20/min | 20/min |
| HL7 ingestion | 0 | 100 msg/min | 1000 msg/min | Custom |
| WebSocket connections | 0 | 5 | 50 | Custom |

---

## Implementation

```bash
uv add slowapi  # Redis-backed rate limiting for FastAPI
```

```python
# app/core/rate_limiting.py

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(
    key_func=lambda request: f"{get_org_id(request)}:{get_remote_address(request)}",
    storage_uri=settings.REDIS_URL,
    default_limits=["1000 per day", "100 per hour"],
)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        {
            "resourceType": "OperationOutcome",
            "issue": [{"severity": "error", "code": "throttled", "diagnostics": f"Rate limit exceeded. Retry after {exc.retry_after} seconds."}],
        },
        status_code=429,
        headers={"Retry-After": str(exc.retry_after), "X-RateLimit-Limit": str(exc.limit)},
    )
```

### Route-Level Limits

```python
@router.post("/Patient")
@limiter.limit("60/minute")
async def create_patient(request: Request, ...):
    ...

@router.get("/Patient")
@limiter.limit("100/minute")
async def list_patients(request: Request, ...):
    ...

@router.post("/Patient/{id}/$ai")
@limiter.limit("10/hour")
async def patient_ai(request: Request, ...):
    ...

@router.get("/$export")
@limiter.limit("1/hour")
async def bulk_export_kickoff(request: Request, ...):
    ...
```

---

## Response Headers

```python
# Always include rate limit info in response headers:
response.headers["X-RateLimit-Limit"] = str(limit)
response.headers["X-RateLimit-Remaining"] = str(remaining)
response.headers["X-RateLimit-Reset"] = str(reset_time)
response.headers["Retry-After"] = str(retry_after_seconds)  # only on 429
```

---

## IP-Level DDoS Protection

At the infrastructure level (before our app):

```nginx
# nginx.conf — connection and request limits
limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
limit_req_zone  $binary_remote_addr zone=req_limit_per_ip:10m rate=100r/s;

server {
    limit_conn conn_limit_per_ip 10;
    limit_req  zone=req_limit_per_ip burst=200 nodelay;

    location /oauth2/token {
        limit_req zone=req_limit_per_ip burst=5 nodelay;  # stricter for auth
    }
}
```

---

## Concurrent Request Limiting

Prevent a single user from running too many simultaneous expensive operations:

```python
# app/core/concurrency_limiter.py

class ConcurrencyLimiter:
    def __init__(self, redis, max_concurrent: int = 5):
        self.redis = redis
        self.max_concurrent = max_concurrent

    async def acquire(self, key: str, timeout: int = 300) -> bool:
        current = await self.redis.incr(f"concurrent:{key}")
        if current > self.max_concurrent:
            await self.redis.decr(f"concurrent:{key}")
            return False
        await self.redis.expire(f"concurrent:{key}", timeout)
        return True

    async def release(self, key: str):
        await self.redis.decr(f"concurrent:{key}")

# In $export endpoint:
async def bulk_export_kickoff(request: Request, ...):
    key = f"export:{user_id}"
    if not await concurrency_limiter.acquire(key):
        raise HTTPException(429, "You already have a bulk export running. Wait for it to complete.")
    try:
        job_id = await start_export(...)
        return Response(status_code=202, headers={"Content-Location": f"/bulk-status/{job_id}"})
    finally:
        # Release when job is done (via callback), not immediately
        pass
```
