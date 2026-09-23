"""
app.main — FileNest FastAPI application factory.

Single-process FastAPI backend handling file operations, project management,
and storage abstraction. Authentication is delegated entirely to the IAM
(BetterAuth) — this service only verifies tokens, never issues them.

Run locally:
    uv run uvicorn app.main:app --reload --port 8000

API docs: http://localhost:8000/docs
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError

from app.core import nats as nats_core
from app.core.config import settings
from app.core.cors_middleware import PerProjectCORSMiddleware
from app.core.database import AsyncSessionLocal
from app.core.logging import configure_logging, get_logger
from app.core.messaging import OutboxWorker
from app.di.container import Container
from app.workers.processing import ProcessingWorker
from app.workers.webhook import WebhookWorker
from app.errors.base import FileNestError
from app.errors.handlers import (
    filenest_error_handler,
    http_exception_handler,
    integrity_error_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.routers import api_router
from app.routers.health import router as health_router
from app.storage.resolver import storage_resolver

# Import all models so Alembic can discover the full schema in one pass
import app.models  # noqa: F401
import app.core.messaging  # noqa: F401

configure_logging()
logger = get_logger(__name__)

container = Container()


async def _apply_startup_cors() -> None:
    """
    Ensure all managed storage buckets have CORS applied on startup.

    Two passes:
      1. Default platform bucket — create if absent, set CORS to ["*"].
      2. Per-project managed buckets — restore each bucket's CORS from the
         project's stored allowed_origins in project_configs. This is necessary
         because RustFS (and MinIO) do not persist CORS policies across container
         restarts; without this pass any volume wipe or restart drops all
         per-project bucket CORS, blocking browser presigned URL uploads.
    """
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.project_config import ProjectConfig
    from app.models.storage_config import StorageConfig

    _default_buckets = {
        "s3": settings.s3_bucket_name,
        "minio": settings.minio_bucket_name,
        "rustfs": settings.rustfs_bucket_name,
        "r2": settings.r2_bucket_name,
    }
    p = settings.default_storage_provider.lower()
    bucket = _default_buckets.get(p, "filenest")

    # ── Pass 1: default platform bucket ──────────────────────────────────────
    try:
        provider = await storage_resolver.get_provider("_startup")
        await provider.create_bucket(bucket)
        await provider.set_bucket_cors(["*"])
        logger.info("storage.cors_applied_at_startup", provider=p, bucket=bucket)
    except Exception as exc:
        cause = getattr(exc, "__cause__", None) or exc
        logger.error(
            "storage.cors_apply_failed",
            provider=p,
            bucket=bucket,
            error=str(exc),
            cause=str(cause),
        )

    # ── Pass 2: per-project managed buckets ──────────────────────────────────
    try:
        async with AsyncSessionLocal() as session:
            rows = (
                await session.execute(
                    select(StorageConfig, ProjectConfig)
                    .outerjoin(
                        ProjectConfig,
                        StorageConfig.project_id == ProjectConfig.project_id,
                    )
                    .where(
                        StorageConfig.storage_mode == "managed",
                        StorageConfig.status == "active",
                    )
                )
            ).all()

        await asyncio.gather(
            *[_restore_project_bucket_cors(sc, pc) for sc, pc in rows],
            return_exceptions=True,
        )
    except Exception as exc:
        logger.error("storage.cors_restore_query_failed", error=str(exc))


async def _restore_project_bucket_cors(storage_cfg, project_cfg) -> None:
    """
    Restore CORS on a single per-project managed bucket from the DB config.

    Uses the project's stored allowed_origins (falling back to ["*"] when
    no restriction is configured). Called concurrently for all projects at
    startup — individual failures are logged and do not block the others.
    """
    origins = ["*"]
    if project_cfg and project_cfg.allowed_origins:
        parsed = [o.strip() for o in project_cfg.allowed_origins.split(",") if o.strip()]
        if parsed:
            origins = parsed
    try:
        provider = storage_resolver.build_provider(storage_cfg)
        await provider.set_bucket_cors(origins)
        logger.info(
            "storage.project_cors_restored",
            project_id=storage_cfg.project_id,
            bucket=storage_cfg.bucket_name,
            origins=origins,
        )
    except Exception as exc:
        logger.error(
            "storage.project_cors_restore_failed",
            project_id=storage_cfg.project_id,
            bucket=storage_cfg.bucket_name,
            error=str(exc),
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("filenest.startup", env=settings.env, service=settings.service_name)

    # Apply CORS to the default managed bucket so browsers can PUT presigned URLs.
    await _apply_startup_cors()

    # Connect NATS and ensure the FILENEST_EVENTS stream exists
    await nats_core.connect()

    # Start workers first so they are ready to consume as soon as recovery enqueues.
    outbox_worker = OutboxWorker(AsyncSessionLocal)
    worker_task = outbox_worker.start()

    processing_worker = ProcessingWorker()
    processing_task = processing_worker.start()

    webhook_worker = WebhookWorker()
    webhook_task = webhook_worker.start()

    yield

    # Graceful shutdown: cancel workers before closing NATS
    processing_task.cancel()
    try:
        await processing_task
    except asyncio.CancelledError:
        pass

    webhook_task.cancel()
    try:
        await webhook_task
    except asyncio.CancelledError:
        pass

    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    await nats_core.disconnect()

    logger.info("filenest.shutdown")


app = FastAPI(
    title="FileNest API",
    version="1.0.0",
    description=(
        "FileNest — enterprise file infrastructure platform. "
        "Handles file upload, download, processing, search, and compliance. "
        "All auth is delegated to the IAM; this service verifies Bearer tokens."
    ),
    docs_url="/docs" if settings.is_dev else None,
    redoc_url="/redoc" if settings.is_dev else None,
    lifespan=lifespan,
)

# Per-project CORS must be added before exception handlers so preflight
# responses are returned before any middleware that might interfere.
app.add_middleware(PerProjectCORSMiddleware, sessionmaker=AsyncSessionLocal)

# Exception handlers — order matters: most specific first
app.add_exception_handler(FileNestError, filenest_error_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Routers
app.include_router(health_router)
app.include_router(api_router)
