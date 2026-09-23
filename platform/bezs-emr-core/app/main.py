from contextlib import asynccontextmanager
from typing import Any, cast
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from app.routers.vitals import router as vitals_router
from app.routers.terminology import router as terminology_router
from app.core.database import Database
from app.core.logging import get_logger, setup_logging
from app.core.openapi_tags import OPENAPI_TAGS
from app.core.redis import redis_client
from app.core.request_context import request_context_middleware
from app.di.container import Container
from app.errors.base import ApplicationError
from app.errors.handlers import (
    application_error_handler,
    http_exception_handler,
    request_validation_exception_handler,
    response_validation_exception_handler,
    unhandled_exception_handler,
)
from app.middleware import (
    RateLimitMiddleware,
)
from app.routers import api_router

setup_logging()
logger = get_logger(__name__)

container = Container()
db: Database = container.core.database()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🟢 Starting up the application")

    await db.create_extensions()

    try:
        await cast(Any, redis_client.ping())
        app.state.redis = redis_client
        logger.info("Connected to Redis successfully.")
    except Exception as e:
        logger.error("Failed to connect to Redis.", exc_info=e)
        app.state.redis = None
    yield

    logger.info("🔴 Shutting down application...")
    await db.disconnect()

    logger.info("Database engine disposed.")


app: FastAPI = FastAPI(
    title="FHIR Server",
    version="1.0.0",
    description=(
        "FHIR R4-compliant REST API server for managing healthcare resources. "
        "Supports 34 FHIR R4 resources with dual-format responses (application/json and "
        "application/fhir+json). Pure CRUD data layer — no auth, no business rules. "
        "Designed for integration with AI agents via FastMCP dynamic tool generation."
    ),
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
)

app.add_exception_handler(ApplicationError, application_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
app.add_exception_handler(
    ResponseValidationError, response_validation_exception_handler
)
app.add_exception_handler(HTTPException, http_exception_handler)

app.container = container

# app.add_middleware(RateLimitMiddleware)
app.middleware("http")(request_context_middleware)

app.include_router(
    api_router, prefix="/api/fhir/v1"
)

app.include_router(
    vitals_router,
    prefix="/api/v1/vitals",
    tags=["Vitals"],
)

app.include_router(
    terminology_router,
    prefix="/api/v1/terminology",
    tags=["Terminology"],
)


@app.get(
    "/health",
    operation_id="health_check",
    summary="Liveness probe",
    description=(
        "Returns 200 if the process is running. "
        "Use for liveness probes — does not check DB or Redis. "
        "No authentication required."
    ),
    response_description="Process is alive",
    tags=["Health"],
)
async def health_check(request: Request):
    return JSONResponse(content={"status": "ok", "req_id": request.state.request_id})


@app.get(
    "/health/ready",
    operation_id="readiness_check",
    summary="Readiness probe",
    description=(
        "Returns 200 only when the database and Redis are reachable. "
        "Use for readiness probes — orchestrators should stop routing traffic "
        "to this instance when it returns 503. No authentication required."
    ),
    response_description="All dependencies are reachable",
    tags=["Health"],
    responses={503: {"description": "One or more dependencies are unavailable"}},
)
async def readiness_check(request: Request):
    checks: dict[str, str] = {}
    healthy = True

    # Database check
    try:
        async with db.session() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        logger.error("Readiness: database check failed", exc_info=exc)
        checks["database"] = "unavailable"
        healthy = False

    # Redis check
    redis = getattr(request.app.state, "redis", None)
    if redis is not None:
        try:
            await redis.ping()
            checks["redis"] = "ok"
        except Exception as exc:
            logger.error("Readiness: Redis check failed", exc_info=exc)
            checks["redis"] = "unavailable"
            healthy = False
    else:
        checks["redis"] = "unavailable"
        healthy = False

    payload = {
        "status": "ok" if healthy else "degraded",
        "req_id": request.state.request_id,
        "checks": checks,
    }
    return JSONResponse(content=payload, status_code=200 if healthy else 503)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)


"""
Common Mertics:
 - CPU Usage
 - Memory Usage
 - Response Time
 - Server Load
 - Network Traffic
 - Database Queries

Observability:
 - Logs
 - Metrics
 _ Traces
"""
# python.analysis.typeCheckingMode

# observability
# deterministic execution
# auditability
# retries
# tracing
# idempotency
# failure recovery