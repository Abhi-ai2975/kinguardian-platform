import uuid
import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, get_logger, request_id_ctx_var
from app.core.database import db
from app.domains.family.presentation.router import router as family_router
from app.domains.family.presentation.parent_router import router as parent_router
from app.domains.family.presentation.families_router import router as families_router
from app.domains.family.presentation.subjects_router import router as subjects_router
from app.domains.family.presentation.appointments_router import router as appointments_router
from app.domains.family.presentation.care_tasks_router import router as care_tasks_router
from app.domains.family.presentation.insights_router import router as insights_router
from app.domains.family.presentation.ai_router import router as ai_router
from app.domains.clinical.router import router as clinical_router



from app.domains.documents.router import router as documents_router
from app.domains.agent.router import router as agent_router
from app.domains.agent.mcp.router import router as mcp_router
from app.domains.notifications.router import router as notifications_router
from app.domains.scheduling.router import router as scheduling_router
from app.domains.family.presentation.checkins_router import router as checkins_router
from app.domains.clinical.medications_router import router as medications_router
from app.domains.family.presentation.i18n_router import router as i18n_router
from app.domains.family.presentation.mobile_router import router as mobile_router
from app.domains.family.presentation.conversations_router import router as conversations_router
from app.domains.family.presentation.realtime_router import router as realtime_router
from app.domains.events.router import router as events_router
from app.domains.wearables.router import router as wearables_router
from app.domains.wearables.webhook_router import router as wearables_webhook_router
from app.domains.wearables.read_router import router as wearables_read_router
from app.domains.wearables.connection_router import router as wearables_connection_router















logger = get_logger(__name__)

# Initialize structured logging
setup_logging()

app = FastAPI(
    title="KinGuardian Platform API",
    description="Scalable two-sided cross-border parent health application backend.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


from app.core.openapi import custom_openapi_generator
app.openapi = lambda: custom_openapi_generator(app)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.errors import AppError, ErrorCode

from app.core.logging import (
    setup_logging,
    get_logger,
    request_id_ctx_var,
    trace_id_ctx_var,
    actor_id_ctx_var,
    family_id_ctx_var,
    subject_id_ctx_var
)

@app.middleware("http")
async def correlation_tracking_middleware(request: Request, call_next):
    # Extract or generate correlation IDs
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    trace_id = request.headers.get("X-Trace-ID", request.headers.get("traceparent", str(uuid.uuid4())))
    actor_id = request.headers.get("X-Actor-ID", request.headers.get("X-User-ID", ""))
    family_id = request.headers.get("X-Family-ID", "")
    subject_id = request.headers.get("X-Subject-ID", "")

    # Set context variables for structured telemetry logging
    t_req = request_id_ctx_var.set(request_id)
    t_trace = trace_id_ctx_var.set(trace_id)
    t_actor = actor_id_ctx_var.set(actor_id)
    t_fam = family_id_ctx_var.set(family_id)
    t_sub = subject_id_ctx_var.set(subject_id)
    
    start_time = time.perf_counter()
    logger.info(
        f"Incoming Request: {request.method} {request.url.path}",
        extra={
            "http_method": request.method,
            "http_path": request.url.path,
        }
    )
    
    try:
        response: Response = await call_next(request)
        duration = time.perf_counter() - start_time
        logger.info(
            f"Completed Request: {request.method} {request.url.path} - Status: {response.status_code}",
            extra={"duration_sec": duration, "status_code": response.status_code}
        )
        # Defense-in-depth: Security Headers & Request/Trace Correlation
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Trace-ID"] = trace_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response
    except Exception as e:
        duration = time.perf_counter() - start_time
        logger.error(f"Unhandled server error on {request.method} {request.url.path}: {e}", exc_info=True)
        # Never leak patient data or raw database stack traces in exception responses
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": ErrorCode.INTERNAL_SERVER_ERROR.value,
                    "message": "An internal error occurred. Please contact support.",
                    "request_id": request_id
                }
            },
            headers={"X-Request-ID": request_id, "X-Trace-ID": trace_id, "X-Content-Type-Options": "nosniff"}
        )
    finally:
        request_id_ctx_var.reset(t_req)
        trace_id_ctx_var.reset(t_trace)
        actor_id_ctx_var.reset(t_actor)
        family_id_ctx_var.reset(t_fam)
        subject_id_ctx_var.reset(t_sub)



# Standardized Application Exception Handlers

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    req_id = request_id_ctx_var.get() or request.headers.get("X-Request-ID", str(uuid.uuid4()))
    code_val = exc.code.value if hasattr(exc.code, "value") else str(exc.code)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code_val,
                "message": exc.message,
                "request_id": req_id,
                "details": exc.details
            }
        },
        headers={"X-Request-ID": req_id, "X-Content-Type-Options": "nosniff"}
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    req_id = request_id_ctx_var.get() or request.headers.get("X-Request-ID", str(uuid.uuid4()))
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": ErrorCode.VALIDATION_ERROR.value,
                "message": "Invalid request payload or parameters.",
                "request_id": req_id,
                "details": exc.errors()
            }
        },
        headers={"X-Request-ID": req_id, "X-Content-Type-Options": "nosniff"}
    )




# Register domain-driven routers
api_routers = [
    realtime_router,
    family_router,
    conversations_router,
    mobile_router,
    families_router,
    subjects_router,
    checkins_router,
    medications_router,
    appointments_router,
    care_tasks_router,
    insights_router,
    ai_router,
    parent_router,
    clinical_router,
    documents_router,
    agent_router,
    mcp_router,
    notifications_router,
    scheduling_router,
    i18n_router,
    events_router,
    wearables_router,
    wearables_webhook_router,
    wearables_read_router,
    wearables_connection_router
]




for r in api_routers:
    app.include_router(r, prefix="/api/v1")
    app.include_router(r)















@app.get("/api/versions", response_model=list, tags=["System"])
async def list_api_versions():
    """
    Returns supported API versions (/api/v1 active, /api/v2 planned).
    Domain services remain completely version-independent.
    """
    from app.core.versioning import VersionRegistry
    return VersionRegistry.get_supported_versions()


from app.core.health import HealthCheckService

@app.get("/health", tags=["System"])
async def liveness_probe():
    """
    Fast in-memory liveness probe.
    Never fails on downstream systems to avoid unnecessary container restarts.
    """
    return HealthCheckService.get_liveness()


@app.get("/health/ready", tags=["System"])
async def readiness_probe():
    """
    Comprehensive readiness probe checking:
    1. PostgreSQL
    2. Redis
    3. Required Downstream Services (IAM, EMR Core, FileNest)
    """
    is_ready, details = await HealthCheckService.get_readiness()
    status_code = 200 if is_ready else 503
    return JSONResponse(status_code=status_code, content=details)

