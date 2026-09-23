"""
FastAPI application factory and startup/shutdown lifecycle for the FHIR middleware service.

This module is the entry point for uvicorn: `uvicorn app.main:app`.

Responsibilities:
  - Bootstrap structured JSON logging before anything else runs.
  - Initialise the dependency-injection container and wire it to the `app` package.
  - Define the application lifespan (startup: Redis ping; shutdown: close connections).
  - Register exception handlers, middleware, and API routers.
  - Expose a /health liveness endpoint that requires no authentication.

Architecture note: this service is a pure middleware layer — it owns auth/RBAC,
business-rule validation, and workflow orchestration, but never writes to a database
directly. All persistence flows through the downstream FHIR Server via FhirClient.
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.openapi.utils import get_openapi
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.auth.dependencies import get_current_user
from app.config import settings
from app.core.errors import (
    AppError,
    http_exception_handler,
    app_error_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestIdMiddleware
from app.core.redis import redis_client
from app.di.container import Container
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import api_router

setup_logging()
logger = get_logger(__name__)

container = Container()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    ASGI lifespan context manager — runs startup logic before `yield` and
    teardown logic after `yield` (when the server is shutting down).

    Startup:
      - Pings Redis to confirm connectivity. On success, stores the client on
        `app.state.redis` so RateLimitMiddleware can retrieve it per-request.
      - On failure, sets `app.state.redis = None` so the middleware falls back
        to the in-process store (with a degraded-mode warning on every request).

    Teardown:
      - Closes the FhirClient httpx connection pool to drain in-flight requests.
      - Closes the Redis connection pool to release socket resources cleanly.
      Both are closed explicitly rather than relying on garbage collection because
      async resources may not be cleaned up promptly by the GC.
    """
    try:
        await redis_client.ping()
        app.state.redis = redis_client
        logger.info("Redis connected", extra={"url": settings.REDIS_URL})
    except Exception as exc:
        app.state.redis = None
        logger.error("Redis unavailable at startup — rate limiting will be process-local only", exc_info=exc)

    yield

    fhir_client = container.core.fhir_client()
    await fhir_client.aclose()
    terminology_client = container.core.terminology_client()
    await terminology_client.aclose()
    await redis_client.aclose()


app = FastAPI(
    title="Middleware API",
    version="0.1.0",
    description=(
        "Healthcare middleware — business logic and orchestration layer above the FHIR Server. "
        "Owns auth/RBAC, use-case validation, workflow state machines, and notifications. "
        "All persistence flows through the FHIR Server — this service never writes directly to the database. "
        "Stamps `created_by` / `updated_by` from the validated JWT subject on every FHIR write."
    ),
    lifespan=lifespan,
)

app.container = container

# ── Exception handlers ─────────────────────────────────────────────────────────
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ── Middleware (applied in reverse order — last added runs first) ──────────────
app.add_middleware(
    RateLimitMiddleware,
    read_limit=settings.RATE_LIMIT_READ,
    write_limit=settings.RATE_LIMIT_WRITE,
    window_seconds=settings.RATE_LIMIT_WINDOW,
)
app.add_middleware(RequestIdMiddleware)

# ── Routers ────────────────────────────────────────────────────────────────────
# get_current_user runs once for all /api/v1 routes — decodes JWT, sets request.state.user
# Individual routes add require_permission(...) on top for fine-grained access control
app.include_router(
    api_router,
    prefix="/api/v1",
    dependencies=[Depends(get_current_user)],
)


# ── OpenAPI schema override ────────────────────────────────────────────────────
# FastAPI does not expose a constructor param for top-level `security` or
# `securitySchemes` — we must override app.openapi() to inject them.
# The schema is generated once and cached on app.openapi_schema for all subsequent
# calls to /openapi.json so there is no per-request overhead.
def _custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Register the Bearer JWT security scheme under components so Swagger UI
    # renders the Authorize button and lets users paste their JWT for testing.
    schema.setdefault("components", {})["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT access token (without the 'Bearer ' prefix).",
        }
    }
    # Apply BearerAuth globally — every endpoint shows a lock icon by default.
    # Individual public endpoints (e.g. /health) can override this with security=[].
    schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = _custom_openapi  # type: ignore[method-assign]


# ── Health (no auth) ───────────────────────────────────────────────────────────
@app.get(
    "/health",
    operation_id="health_check",
    summary="Liveness probe",
    description="Returns 200 if the process is running. No authentication required.",
    tags=["Health"],
)
async def health_check(request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "req_id": request.state.request_id})
