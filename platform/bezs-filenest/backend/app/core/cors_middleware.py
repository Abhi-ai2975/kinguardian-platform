"""
app.core.cors_middleware — Per-project CORS middleware.

Enforces project-level allowed_origins restrictions for browser requests.
The global FastAPI CORSMiddleware handles non-project routes (health, auth).
This middleware intercepts requests to /v1/projects/{project_id}/* and:

  1. Extracts the project_id from the URL path.
  2. Loads allowed_origins from project_configs via a short-lived in-process
     cache (60-second TTL) to avoid a DB hit on every preflight.
  3. If the request Origin is not in the allowlist, returns 403 for OPTIONS
     preflight and omits CORS headers for actual requests (browser blocks it).
  4. If the allowlist is empty/null, all origins are permitted (pass-through).

Note: this cache is process-local. In a multi-replica deployment, a config
change propagates within 60 seconds as each replica's cache entry expires.

Usage:
    app.add_middleware(PerProjectCORSMiddleware, sessionmaker=AsyncSessionLocal)
"""
import re
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.models.project_config import ProjectConfig

_PROJECT_PATH_RE = re.compile(r"/v1/projects/([^/]+)/")

# in-process cache: project_id -> (allowed_origins | None, expiry_monotonic)
_origins_cache: dict[str, tuple[list[str] | None, float]] = {}
_CACHE_TTL = 60.0


async def _get_allowed_origins(
    project_id: str,
    sessionmaker: async_sessionmaker[AsyncSession],
) -> list[str] | None:
    """
    Return the allowed origins for a project, using the in-process cache.

    Returns None when the project has no restriction (all origins allowed).
    Returns an empty list only if the DB row exists but allowed_origins is empty.
    """
    now = time.monotonic()
    cached = _origins_cache.get(project_id)
    if cached is not None:
        origins, expiry = cached
        if now < expiry:
            return origins

    async with sessionmaker() as session:
        result = await session.execute(
            select(ProjectConfig.allowed_origins).where(
                ProjectConfig.project_id == project_id
            )
        )
        row = result.scalar_one_or_none()

    if row is None:
        # Project not found — no restriction (auth will 404 later)
        _origins_cache[project_id] = (None, now + _CACHE_TTL)
        return None

    if not row:
        _origins_cache[project_id] = (None, now + _CACHE_TTL)
        return None

    origins = [o.strip() for o in row.split(",") if o.strip()]
    result_origins = origins if origins else None
    _origins_cache[project_id] = (result_origins, now + _CACHE_TTL)
    return result_origins


class PerProjectCORSMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that enforces per-project CORS origin restrictions.

    Sits in front of the global CORSMiddleware. Only activates for requests
    whose path matches /v1/projects/{project_id}/. All other paths pass through.

    Args:
        sessionmaker: An async_sessionmaker used to open short-lived DB sessions
                      for cache misses. Pass the same AsyncSessionLocal used
                      by the rest of the app.
    """

    def __init__(self, app, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        super().__init__(app)
        self._sessionmaker = sessionmaker

    async def dispatch(self, request: Request, call_next) -> Response:
        origin = request.headers.get("Origin")
        if not origin:
            return await call_next(request)

        match = _PROJECT_PATH_RE.search(request.url.path)
        if not match:
            return await call_next(request)

        project_id = match.group(1)
        allowed_origins = await _get_allowed_origins(project_id, self._sessionmaker)

        if allowed_origins is None:
            # No restriction — let the global CORSMiddleware handle headers
            return await call_next(request)

        if origin not in allowed_origins:
            if request.method == "OPTIONS":
                return Response(
                    status_code=403,
                    content="Origin not allowed by project CORS policy",
                )
            # For non-preflight: proceed but omit CORS headers; browser will block
            return await call_next(request)

        # Origin is in the allowlist
        if request.method == "OPTIONS":
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Authorization, Content-Type",
                    "Access-Control-Max-Age": "86400",
                    "Vary": "Origin",
                },
            )

        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        return response
