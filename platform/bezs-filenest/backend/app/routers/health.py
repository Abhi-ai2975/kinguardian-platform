"""
app.routers.health — Liveness and readiness probe endpoints.

Two distinct probes follow the Kubernetes convention:

  GET /health/live   — liveness:  always 200; proves the process is running.
  GET /health/ready  — readiness: 200 when DB + Redis are reachable; 503 otherwise.

GET /health is kept as an alias for /health/live for backwards compatibility.
"""
import redis.asyncio as aioredis
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import AsyncSessionLocal

router = APIRouter(tags=["Health"])


@router.get("/health/live", operation_id="liveness_check", include_in_schema=False)
@router.get("/health", operation_id="health_check", include_in_schema=False)
async def liveness_check():
    """Liveness probe — returns 200 if the process is running. No dependency checks."""
    return {"status": "ok"}


@router.get("/health/ready", operation_id="readiness_check")
async def readiness_check():
    """
    Readiness probe — returns 200 only when all dependencies are reachable.

    Checks:
      database — async SELECT 1 against the primary PostgreSQL pool
      cache    — PING against the Redis instance at settings.redis_url

    Returns HTTP 503 with degraded status if any check fails so that
    Kubernetes removes the pod from the load-balancer until it recovers.
    """
    checks: dict[str, str] = {}
    healthy = True

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unavailable"
        healthy = False

    try:
        client = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        await client.ping()
        await client.aclose()
        checks["cache"] = "ok"
    except Exception:
        checks["cache"] = "unavailable"
        healthy = False

    return JSONResponse(
        content={"status": "ok" if healthy else "degraded", "checks": checks},
        status_code=200 if healthy else 503,
    )
