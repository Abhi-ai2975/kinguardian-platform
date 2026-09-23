# FileNest v1.0 — Backend Architecture

**Version:** 1.1.0
**Status:** Approved for Engineering
**Stack:** Python 3.12 · FastAPI · SQLAlchemy 2.x · Pydantic v2
**Last Updated:** 2026-06-18

> **Modular monolith.** All domain logic lives in a single FastAPI process (`backend/`). Each domain area (files, projects, processing, compliance, etc.) is an isolated module with its own `service.py`, `repository.py`, `schemas/`, and `routers/` — no cross-module DB joins, no shared state. Cross-module work goes through the transactional outbox (NATS). This keeps the system simple to operate now while making it straightforward to extract any module into its own microservice later: copy the module files into a new FastAPI app, point it at the same DB, done.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Core Infrastructure](#2-core-infrastructure)
3. [Authentication & Tenant Context](#3-authentication--tenant-context)
4. [Project Module](#4-project-module)
5. [File Module](#5-file-module)
6. [Storage Module](#6-storage-module)
7. [Metadata Module](#7-metadata-module)
8. [Search Module](#8-search-module)
9. [Processing Module](#9-processing-module)
10. [Audit Module](#10-audit-module)
11. [Webhook Module](#11-webhook-module)
12. [Compliance Module](#12-compliance-module)
13. [Healthcare Module](#13-healthcare-module)
14. [In-Process Communication](#14-in-process-communication)
15. [Error Handling](#15-error-handling)
16. [Observability](#16-observability)

---

## 1. Project Structure

### 1.1 Backend Layout

All Python backend code lives in `backend/`. There is a single FastAPI process — no microservices.

```
backend/
├── app/
│   ├── main.py              # FastAPI app factory + lifespan
│   ├── core/                # Shared infrastructure
│   │   ├── config.py        # Pydantic Settings singleton
│   │   ├── database.py      # SQLAlchemy engines + get_db dependency
│   │   ├── logging.py       # structlog setup
│   │   ├── messaging.py     # TransactionalOutboxPublisher + OutboxWorker
│   │   └── telemetry.py     # OpenTelemetry initialisation
│   ├── auth/                # Authentication + tenant context
│   │   ├── models.py        # TenantContext dataclass
│   │   └── dependencies.py  # authenticate_request, require_scope FastAPI deps
│   ├── errors/              # Exception hierarchy + handlers
│   │   ├── base.py          # FileNestError subclasses
│   │   └── handlers.py      # FastAPI exception handlers
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── project.py       # Project
│   │   └── file.py          # File
│   ├── schemas/             # Pydantic request/response DTOs
│   │   ├── project.py
│   │   └── file.py
│   ├── repositories/        # All DB queries (tenant-scoped)
│   │   ├── project.py
│   │   └── file.py
│   ├── services/            # Business logic layer
│   │   ├── project.py
│   │   ├── file.py
│   │   ├── metadata.py
│   │   ├── search.py
│   │   ├── processing.py
│   │   ├── audit.py
│   │   ├── webhook.py
│   │   ├── compliance.py
│   │   ├── healthcare.py
│   │   └── stages/          # Processing pipeline stages
│   │       ├── virus_scan.py
│   │       ├── ocr.py
│   │       └── ...
│   ├── storage/             # Storage provider abstraction
│   │   ├── provider.py      # StorageProvider Protocol
│   │   ├── s3.py            # S3 / RustFS / MinIO / R2 implementation
│   │   └── resolver.py      # StorageResolver singleton
│   └── routers/             # HTTP handlers (thin)
│       ├── __init__.py      # api_router with /v1 prefix
│       ├── health.py
│       ├── files.py
│       └── projects.py
├── migrations/
│   ├── alembic.ini
│   ├── env.py
│   └── alembic/versions/
├── scripts/
│   └── seed_dev.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── pyproject.toml
└── .env.example
```

**Identity (auth, API keys, organisations)** is handled entirely by the IAM (`iam/`) via BetterAuth. The backend never stores API keys — it validates them by calling `POST /api/internal/verify-api-key` on the IAM.

### 1.2 App Factory

```python
# backend/app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging
from app.core.telemetry import init_telemetry
from app.errors.handlers import register_exception_handlers
from app.routers import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_telemetry(service_name="filenest")
    await init_db()
    yield

def create_app() -> FastAPI:
    app = FastAPI(
        title="FileNest API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.is_dev else None,
    )
    register_exception_handlers(app)
    app.include_router(api_router)
    return app

app = create_app()
```

### 1.3 Settings

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    service_name: str = "filenest"

    database_primary_url: str
    database_replica_url: str | None = None
    database_pool_size: int = 20

    redis_url: str = "redis://localhost:6379/0"
    nats_url: str = "nats://localhost:4222"
    nats_stream_name: str = "FILENEST_EVENTS"

    # IAM URL — used to verify fn_ API keys and fetch JWKS
    iam_url: str = "http://localhost:3000"

    default_storage_provider: str = "s3"
    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_bucket_name: str = "filenest"
    s3_region: str = "us-east-1"
    s3_force_path_style: bool = True

    jwt_secret_key: str = "dev-secret"  # HS256 local testing only
    healthcare_pack_enabled: bool = False

    @property
    def is_dev(self) -> bool:
        return self.env == "development"

    @property
    def iam_jwks_url(self) -> str:
        return f"{self.iam_url}/api/auth/jwks"

settings = Settings()
```

---

## 2. Core Infrastructure

### 2.1 Database Session Management

```python
# backend/app/core/database.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from contextlib import asynccontextmanager

engine = create_async_engine(
    settings.database_primary_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
    echo=settings.is_dev,
)

read_engine = create_async_engine(
    settings.database_replica_url or settings.database_primary_url,
    pool_size=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
ReadAsyncSessionLocal = async_sessionmaker(read_engine, expire_on_commit=False)

@asynccontextmanager
async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

async def get_db() -> AsyncSession:
    async with get_db_session() as session:
        yield session
```

### 2.2 Structured Logging

```python
# backend/app/core/logging.py
import structlog

def setup_logging() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.BoundLogger,
        logger_factory=structlog.WriteLoggerFactory(),
    )

# Usage — always include tenant context
logger = structlog.get_logger()
logger.info(
    "file_upload_started",
    file_id=file_id,
    organization_id=ctx.organization_id,
    project_id=ctx.project_id,
)
```

### 2.3 OpenTelemetry

```python
# backend/app/core/telemetry.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

def init_telemetry(service_name: str) -> None:
    provider = TracerProvider(
        resource=Resource.create({
            SERVICE_NAME: service_name,
            SERVICE_VERSION: "1.0.0",
            DEPLOYMENT_ENVIRONMENT: settings.env,
        })
    )
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.otel_endpoint))
    )
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    RedisInstrumentor().instrument()
```

---

## 3. Authentication & Tenant Context

**API keys are created and stored entirely by the IAM.** The backend validates them by calling the IAM's internal endpoint. JWT tokens issued by the IAM are verified locally via JWKS.

### 3.1 TenantContext

```python
# backend/app/auth/models.py
from dataclasses import dataclass

@dataclass(frozen=True)
class TenantContext:
    organization_id: str
    project_id: str | None      # None for org-scoped tokens
    actor_id: str
    scopes: frozenset[str]
    is_test_mode: bool = False

def require_project_context(ctx: TenantContext) -> str:
    """Raise 400 if the token has no project_id."""
    if ctx.project_id is None:
        raise HTTPException(400, {"code": "PROJECT_REQUIRED"})
    return ctx.project_id
```

### 3.2 Request Authentication

```python
# backend/app/auth/dependencies.py
from PyJWT import PyJWKClient
import jwt, httpx

_jwks_client: PyJWKClient | None = None

def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.iam_jwks_url)
    return _jwks_client

async def _verify_api_key(raw_key: str) -> TenantContext:
    """Call IAM to validate an fn_live_ / fn_test_ API key."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{settings.iam_url}/api/internal/verify-api-key",
            json={"key": raw_key},
        )
    if resp.status_code == 401:
        raise AuthenticationError("Invalid or revoked API key")
    resp.raise_for_status()
    data = resp.json()
    return TenantContext(
        organization_id=data["organizationId"],
        project_id=data.get("projectId"),
        actor_id=data["userId"],
        scopes=frozenset(data.get("scopes", [])),
        is_test_mode=data.get("isTestMode", False),
    )

def _verify_jwt(token: str) -> TenantContext:
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token, signing_key.key,
        algorithms=["EdDSA", "RS256"],
        audience=settings.iam_url,
        issuer=settings.iam_url,
    )
    return TenantContext(
        organization_id=payload["organizationId"],
        project_id=payload.get("projectId"),
        actor_id=payload["sub"],
        scopes=frozenset(payload.get("scopes", [])),
    )

async def authenticate_request(request: Request) -> TenantContext:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AuthenticationError("Missing Authorization header")
    token = auth_header.removeprefix("Bearer ")

    if token.startswith(("fn_live_", "fn_test_")):
        return await _verify_api_key(token)
    return _verify_jwt(token)
```

### 3.3 Scope Enforcement

```python
# backend/app/auth/dependencies.py (continued)
def require_scope(ctx: TenantContext, scope: str) -> None:
    if scope not in ctx.scopes:
        raise AuthorizationError(f"Missing required scope: {scope}")
```

Available scopes: `files:upload`, `files:download`, `files:read`, `files:delete`,
`files:update_metadata`, `api_keys:create`, `api_keys:revoke`,
`projects:read`, `projects:update`, `audit:read`, `compliance:manage`

---

## 4. Project Module

### 4.1 Responsibilities

- Project CRUD
- Project configuration management and validation
- Compliance profile assignment
- Capability pack activation
- Metadata schema management
- Webhook management

### 4.2 Configuration Validation

```python
# backend/app/services/project.py
from pydantic import BaseModel, validator, Field

class StorageConfig(BaseModel):
    provider: Literal["s3", "azure_blob", "gcs", "minio", "r2"]
    region: str | None = None
    bucket_name: str | None = None
    byob: bool = False
    encryption: Literal["AES256", "aws:kms", "none"] = "AES256"
    kms_key_id: str | None = None

    @validator("kms_key_id")
    def kms_required_for_kms_encryption(cls, v, values):
        if values.get("encryption") == "aws:kms" and not v:
            raise ValueError("kms_key_id required when encryption=aws:kms")
        return v

class ComplianceConfig(BaseModel):
    profile: Literal["generic", "healthcare", "finance", "legal", "insurance", "custom"]
    hipaa_controls: bool = False
    phi_detection: bool = False
    pii_detection: bool = False
    audit_retention_years: int = Field(1, ge=1, le=10)
    legal_hold_enabled: bool = False
    worm: bool = False
    retention_days: int = Field(365, ge=1)
    immutable_audit: bool = False

class ProjectConfig(BaseModel):
    storage: StorageConfig
    compliance: ComplianceConfig
    processing: ProcessingConfig
    metadata: MetadataConfig
    security: SecurityConfig
    versioning: VersioningConfig
    retention: RetentionConfig
    search: SearchConfig
```

### 4.3 Capability Pack Activation

```python
# backend/app/services/project.py (continued)
CAPABILITY_PACKS: dict[str, dict] = {
    "healthcare": {
        "compliance": {
            "profile": "healthcare",
            "hipaa_controls": True,
            "phi_detection": True,
            "audit_retention_years": 7,
            "legal_hold_enabled": True,
            "immutable_audit": True,
        },
        "processing": {
            "phi_detection": True,
            "ocr": True,
            "virus_scan": True,
            "classification": True,
        },
    },
    "finance": {
        "compliance": {
            "profile": "finance",
            "worm": True,
            "legal_hold_enabled": True,
            "retention_days": 2555,
            "audit_retention_years": 7,
        },
        "processing": {
            "pii_detection": True,
            "classification": True,
        },
    },
}

def apply_capability_pack(
    base_config: dict, pack_name: str, overrides: dict | None = None
) -> dict:
    pack = CAPABILITY_PACKS.get(pack_name)
    if not pack:
        raise ValueError(f"Unknown capability pack: {pack_name}")
    config = deep_merge(base_config, pack)
    if overrides:
        config = deep_merge(config, overrides)
    return config
```

---

## 5. File Module

### 5.1 Responsibilities

- Upload session creation and management
- File record CRUD
- Version management
- Folder CRUD
- File move/copy
- Soft delete and restore
- Legal hold management
- Upload completion and processing trigger

### 5.2 Upload Service

```python
# backend/app/services/file.py
class FileService:

    async def create_upload_session(
        self,
        request: CreateUploadSessionRequest,
        ctx: TenantContext,
    ) -> UploadSessionResponse:
        # 1. Load project config
        project_config = await self.project_repo.get_config(ctx.project_id)

        # 2. Validate file against project policies
        await self._validate_upload_policies(request, project_config)

        # 3. Validate metadata against schema
        if project_config.metadata.enforce_schema:
            schema = await self.metadata_service.get_active_schema(ctx.project_id)
            await self.metadata_service.validate(request.metadata, schema)

        # 4. Create file record (status=uploading)
        file_record = File(
            organization_id=ctx.organization_id,
            project_id=ctx.project_id,
            filename=sanitize_filename(request.filename),
            original_filename=request.filename,
            size=request.size,
            mime_type=request.mime_type or "application/octet-stream",
            status=FileStatus.UPLOADING,
            metadata=request.metadata or {},
            tags=request.tags or [],
        )
        self.db.add(file_record)
        await self.db.flush()

        # 5. Create upload session (single or multipart)
        if request.size > settings.multipart_threshold_bytes:
            upload_session = await self._create_multipart_session(
                file_record, request, project_config
            )
        else:
            upload_session = await self._create_single_upload_session(
                file_record, request, project_config
            )

        return upload_session

    async def complete_upload(
        self,
        session_id: str,
        completion: CompleteUploadRequest,
        ctx: TenantContext,
    ) -> FileResponse:
        session = await self._get_upload_session(session_id, ctx)
        file_record = await self.file_repo.get(session.file_id, ctx)

        if session.upload_type == "multipart":
            await self.storage.complete_multipart(
                key=file_record.storage_key,
                upload_id=session.provider_upload_id,
                parts=completion.parts,
            )

        file_record.status = FileStatus.UPLOAD_COMPLETE
        file_record.checksum_sha256 = completion.checksum_sha256

        version = FileVersion(
            organization_id=ctx.organization_id,
            file_id=file_record.id,
            project_id=ctx.project_id,
            version_number=1,
            storage_key=file_record.storage_key,
            size=file_record.size,
        )
        self.db.add(version)
        await self.db.flush()
        file_record.current_version_id = version.id

        # Emit upload event (transactional outbox)
        await self.outbox.publish(
            event_type="file.uploaded",
            subject_id=str(file_record.id),
            payload=FileUploadedPayload.from_file(file_record).model_dump(),
            organization_id=ctx.organization_id,
            project_id=ctx.project_id,
            db=self.db,
        )

        return FileResponse.model_validate(file_record)

    async def _validate_upload_policies(
        self, request: CreateUploadSessionRequest, config: ProjectConfig
    ) -> None:
        if request.size > config.storage.max_file_size_bytes:
            raise FileTooLargeError(actual=request.size, maximum=config.storage.max_file_size_bytes)

        if config.storage.allowed_mime_types:
            if request.mime_type not in config.storage.allowed_mime_types:
                raise MimeTypeNotAllowedError(
                    mime_type=request.mime_type,
                    allowed=config.storage.allowed_mime_types,
                )

        if config.compliance.worm:
            existing = await self.file_repo.find_by_filename(request.filename, ctx.project_id)
            if existing:
                raise WORMViolationError("Cannot overwrite existing file in WORM project")
```

### 5.3 Download Service

```python
# backend/app/services/file.py (continued)
    async def generate_download_url(
        self,
        file_id: str,
        options: DownloadOptions,
        ctx: TenantContext,
    ) -> DownloadURLResponse:
        file_record = await self.file_repo.get(file_id, ctx)
        if not file_record:
            raise FileNotFoundError(file_id)

        if file_record.status == FileStatus.QUARANTINED:
            raise FileQuarantinedError(file_id)

        ttl = min(options.ttl_seconds or 3600, 86400)
        signed_url = await self.storage.generate_signed_url(
            key=file_record.storage_key,
            ttl_seconds=ttl,
            content_type=file_record.mime_type,
            content_disposition=f'attachment; filename="{file_record.original_filename}"',
        )

        await self.audit.log(
            event_type="file.downloaded",
            subject_id=file_record.id,
            payload={"filename": file_record.filename, "size": file_record.size, "ttl_seconds": ttl},
            ctx=ctx,
            db=self.db,
        )

        return DownloadURLResponse(
            url=signed_url,
            expires_at=datetime.utcnow() + timedelta(seconds=ttl),
            filename=file_record.original_filename,
            content_type=file_record.mime_type,
            size=file_record.size,
        )
```

### 5.4 Version Management

```python
# backend/app/services/file.py (continued)
    async def create_version(
        self,
        file_id: str,
        upload: CreateVersionRequest,
        ctx: TenantContext,
    ) -> FileVersionResponse:
        file_record = await self.file_repo.get(file_id, ctx)
        project_config = await self.project_repo.get_config(ctx.project_id)

        if not project_config.versioning.enabled:
            raise VersioningNotEnabledError(ctx.project_id)

        new_version_number = file_record.version_count + 1
        new_storage_key = build_storage_key(
            organization_id=ctx.organization_id,
            project_id=ctx.project_id,
            file_id=file_id,
            version_id=f"v{new_version_number}",
            filename=upload.filename or file_record.filename,
        )

        version = FileVersion(
            file_id=file_id,
            version_number=new_version_number,
            storage_key=new_storage_key,
            size=upload.size,
            metadata_snapshot=file_record.metadata,
            change_note=upload.change_note,
        )
        self.db.add(version)
        file_record.current_version_id = version.id
        file_record.version_count = new_version_number
        await self.db.flush()

        await self.outbox.publish("file.versioned", file_id, {}, ctx.organization_id, ctx.project_id, self.db)
        return FileVersionResponse.model_validate(version)

    async def rollback_to_version(
        self, file_id: str, version_number: int, ctx: TenantContext
    ) -> FileResponse:
        version = await self.version_repo.get_by_number(file_id, version_number)
        rollback_version = FileVersion(
            file_id=file_id,
            version_number=file_record.version_count + 1,
            storage_key=version.storage_key,  # Points to old storage key
            size=version.size,
            change_note=f"Rollback to version {version_number}",
        )
        self.db.add(rollback_version)
        file_record.current_version_id = rollback_version.id
        return FileResponse.model_validate(file_record)
```

---

## 6. Storage Module

### 6.1 Provider Registry

```python
# backend/app/storage/__init__.py
from .s3 import S3Provider

PROVIDERS: dict[str, type[StorageProvider]] = {
    "s3": S3Provider,
    # Phase 7: azure_blob, gcs, minio, r2
}
```

### 6.2 Provider Interface

```python
# backend/app/storage/provider.py
from typing import Protocol, BinaryIO, AsyncIterator
from dataclasses import dataclass

@dataclass
class Part:
    part_number: int
    etag: str

class StorageProvider(Protocol):
    async def upload(self, key: str, data: BinaryIO, content_type: str, metadata: dict[str, str] | None = None) -> str: ...
    async def download_stream(self, key: str) -> AsyncIterator[bytes]: ...
    async def delete(self, key: str) -> None: ...
    async def exists(self, key: str) -> bool: ...
    async def copy(self, source_key: str, dest_key: str, metadata: dict | None = None) -> str: ...
    async def generate_signed_url(self, key: str, ttl_seconds: int, method: str = "GET", content_type: str | None = None, content_disposition: str | None = None) -> str: ...
    async def generate_multipart_upload_id(self, key: str, content_type: str) -> str: ...
    async def generate_part_upload_url(self, key: str, upload_id: str, part_number: int) -> str: ...
    async def complete_multipart(self, key: str, upload_id: str, parts: list[Part]) -> str: ...
    async def abort_multipart(self, key: str, upload_id: str) -> None: ...
    async def head(self, key: str) -> dict: ...
```

### 6.3 S3 Provider

```python
# backend/app/storage/s3.py
import aiobotocore.session

class S3Provider:
    def __init__(self, config: S3Config):
        self.config = config
        self._session = aiobotocore.session.get_session()

    def _get_client_kwargs(self) -> dict:
        kwargs = {
            "region_name": self.config.region,
            "aws_access_key_id": self.config.access_key_id,
            "aws_secret_access_key": self.config.secret_access_key,
        }
        if self.config.endpoint_url:
            kwargs["endpoint_url"] = self.config.endpoint_url
        return kwargs

    async def generate_signed_url(self, key: str, ttl_seconds: int, method: str = "GET", **kwargs) -> str:
        async with self._session.create_client("s3", **self._get_client_kwargs()) as client:
            params = {"Bucket": self.config.bucket_name, "Key": key}
            client_method = "get_object" if method == "GET" else "put_object"
            return await client.generate_presigned_url(client_method, Params=params, ExpiresIn=ttl_seconds)

    async def generate_multipart_upload_id(self, key: str, content_type: str) -> str:
        async with self._session.create_client("s3", **self._get_client_kwargs()) as client:
            response = await client.create_multipart_upload(
                Bucket=self.config.bucket_name,
                Key=key,
                ContentType=content_type,
                ServerSideEncryption=self.config.server_side_encryption,
            )
            return response["UploadId"]
```

### 6.4 Provider Resolution

```python
# backend/app/storage/resolver.py
class StorageResolver:
    """Resolves the correct StorageProvider for a project. Phase 1 always returns S3 from settings."""

    def get_provider(self, project_id: str | None = None) -> StorageProvider:
        config = S3Config(
            endpoint_url=settings.s3_endpoint_url,
            access_key_id=settings.s3_access_key_id,
            secret_access_key=settings.s3_secret_access_key,
            bucket_name=settings.s3_bucket_name,
            region=settings.s3_region,
            force_path_style=settings.s3_force_path_style,
        )
        return S3Provider(config)

storage_resolver = StorageResolver()
```

---

## 7. Metadata Module

### 7.1 Schema Validation Engine

```python
# backend/app/services/metadata.py
import jsonschema
from jsonschema import Draft7Validator

class MetadataValidator:
    def __init__(self, cache: Redis):
        self.cache = cache

    async def get_schema(self, project_id: str) -> dict | None:
        cache_key = f"metadata_schema:{project_id}"
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)

        schema_record = await self.db.execute(
            select(MetadataSchema).where(
                MetadataSchema.project_id == project_id,
                MetadataSchema.is_active == True,
            )
        ).first()

        if not schema_record:
            return None

        await self.cache.setex(cache_key, 300, json.dumps(schema_record.schema))
        return schema_record.schema

    async def validate(self, metadata: dict, schema: dict) -> None:
        errors = list(Draft7Validator(schema).iter_errors(metadata))
        if errors:
            raise MetadataValidationError(errors=[
                {"field": ".".join(str(p) for p in e.absolute_path), "message": e.message, "value": e.instance}
                for e in errors
            ])
```

---

## 8. Search Module

### 8.1 Indexing

```python
# backend/app/services/search.py
from opensearchpy import AsyncOpenSearch

class FileIndexer:
    def __init__(self, client: AsyncOpenSearch):
        self.client = client

    def _index_name(self, project_id: str) -> str:
        return f"filenest-{project_id}"

    async def index_file(self, file: FileIndexDocument) -> None:
        await self.client.index(
            index=self._index_name(file.project_id),
            id=str(file.file_id),
            body=file.to_search_doc(),
        )

    async def delete_file(self, project_id: str, file_id: str) -> None:
        await self.client.delete(
            index=self._index_name(project_id),
            id=file_id,
            ignore=[404],
        )

    async def search(self, project_id: str, query: SearchQuery) -> SearchResults:
        must = []
        filter_clauses = []

        if query.q:
            must.append({
                "multi_match": {
                    "query": query.q,
                    "fields": ["filename^3", "ocrContent", "metadata.*"],
                    "type": "best_fields",
                }
            })

        if query.filters:
            for field, value in query.filters.items():
                if isinstance(value, list):
                    filter_clauses.append({"terms": {f"metadata.{field}": value}})
                else:
                    filter_clauses.append({"term": {f"metadata.{field}": value}})

        if query.tags:
            filter_clauses.append({"terms": {"tags": query.tags}})

        es_query = {
            "query": {"bool": {"must": must or [{"match_all": {}}], "filter": filter_clauses}},
            "from": query.offset,
            "size": query.limit,
        }
        response = await self.client.search(index=self._index_name(project_id), body=es_query)
        return self._parse_results(response)
```

---

## 9. Processing Module

### 9.1 Worker

```python
# backend/app/services/processing.py
import nats
from nats.js import JetStreamContext

class ProcessingWorker:
    def __init__(self, js: JetStreamContext):
        self.js = js
        self.pipeline = PipelineExecutor()

    async def start(self):
        sub = await self.js.subscribe(
            subject="filenest.*.*.file.uploaded",
            durable="processing-workers",
            queue="processing-pool",
            config=nats.js.api.ConsumerConfig(
                ack_policy=nats.js.api.AckPolicy.EXPLICIT,
                max_deliver=3,
                ack_wait=300,
                max_ack_pending=50,
            ),
        )
        async for msg in sub.messages:
            try:
                event = FileUploadedEvent.model_validate_json(msg.data)
                await self.pipeline.execute(event)
                await msg.ack()
            except PermanentFailure as e:
                logger.error("processing_permanent_failure", file_id=event.payload.file_id, error=str(e))
                await msg.term()
            except Exception as e:
                logger.warning("processing_transient_failure", file_id=event.payload.file_id, error=str(e))
                await msg.nak(delay=backoff_delay(msg.metadata.num_delivered))
```

### 9.2 Pipeline Executor

```python
# backend/app/services/processing.py (continued)
class PipelineExecutor:
    STAGE_REGISTRY: dict[str, type[PipelineStage]] = {
        "virus_scan": VirusScanStage,
        "mime_validation": MimeValidationStage,
        "ocr": OCRStage,
        "phi_detection": PHIDetectionStage,
        "pii_detection": PIIDetectionStage,
        "classification": ClassificationStage,
        "thumbnail": ThumbnailStage,
        "preview": PreviewStage,
        "embedding": EmbeddingStage,
        "indexing": IndexingStage,
    }

    async def execute(self, event: FileUploadedEvent) -> None:
        project_config = await self.project_repo.get_config(event.project_id)
        pipeline_stages = self._resolve_stages(project_config.processing)

        job = await self.job_repo.create(file_id=event.payload.file_id, pipeline_config=project_config.processing.model_dump())

        parallel_stages = ["virus_scan", "mime_validation"]
        sequential_stages = [s for s in pipeline_stages if s not in parallel_stages]

        try:
            parallel_results = await asyncio.gather(*[
                self._run_stage(job, s, event)
                for s in parallel_stages if s in pipeline_stages
            ], return_exceptions=True)

            if any(isinstance(r, VirusDetectedError) for r in parallel_results):
                await self._quarantine_file(event.payload.file_id)
                await self.job_repo.mark_failed(job.id, "Virus detected")
                return

            for stage_name in sequential_stages:
                await self._run_stage(job, stage_name, event)

            await self.job_repo.mark_completed(job.id)

        except Exception as e:
            await self.job_repo.mark_failed(job.id, str(e))
            raise
```

### 9.3 Virus Scan Stage

```python
# backend/app/services/stages/virus_scan.py
import clamd

class VirusScanStage:
    async def execute(self, event: FileUploadedEvent) -> dict:
        stream = await self.storage.download_stream(event.payload.storage_key)
        file_bytes = b"".join([chunk async for chunk in stream])

        scanner = clamd.ClamdNetworkSocket(host="clamav", port=3310)
        result = scanner.instream(io.BytesIO(file_bytes))
        status, threat_name = result.get("stream", ("UNKNOWN", None))

        if status == "FOUND":
            await self.file_repo.quarantine(file_id=event.payload.file_id, threat=threat_name)
            raise VirusDetectedError(threat=threat_name)

        return {
            "provider": "clamav",
            "result": "clean" if status == "OK" else "error",
            "scanned_at": datetime.utcnow().isoformat(),
            "file_size": len(file_bytes),
        }
```

---

## 10. Audit Module

### 10.1 Audit Logger

```python
# backend/app/services/audit.py
class AuditLogger:
    """
    Writes to audit_logs in the same DB transaction as the business operation.
    Guaranteed completeness — no separate async flush.
    """

    async def log(
        self,
        event_type: str,
        subject_type: str,
        subject_id: str | None,
        payload: dict,
        ctx: TenantContext,
        request: Request | None = None,
        phi_involved: bool = False,
        db: AsyncSession | None = None,
    ) -> None:
        audit_entry = AuditLog(
            organization_id=ctx.organization_id,
            project_id=ctx.project_id,
            event_type=event_type,
            subject_type=subject_type,
            subject_id=subject_id,
            actor_id=ctx.actor_id,
            ip_address=request.client.host if request else None,
            user_agent=request.headers.get("user-agent") if request else None,
            request_id=request.headers.get("x-request-id") if request else None,
            payload=payload,
            phi_involved=phi_involved,
            compliance_relevant=phi_involved or event_type.startswith("compliance."),
        )
        session = db or self.db
        session.add(audit_entry)
```

### 10.2 Audit Export

```python
# backend/app/services/audit.py (continued)
class AuditExportService:
    async def create_export(self, params: AuditExportParams, ctx: TenantContext) -> AuditExport:
        export = AuditExport(organization_id=ctx.organization_id, status="generating", params=params.model_dump())
        self.db.add(export)
        await self.db.flush()

        asyncio.create_task(self._generate_export(export.id, params, ctx))
        return export

    async def _generate_export(self, export_id: str, params: AuditExportParams, ctx: TenantContext) -> None:
        query = (
            select(AuditLog)
            .where(
                AuditLog.organization_id == ctx.organization_id,
                AuditLog.occurred_at >= params.date_from,
                AuditLog.occurred_at <= params.date_to,
            )
        )
        if params.event_types:
            query = query.where(AuditLog.event_type.in_(params.event_types))

        key = f"exports/{ctx.organization_id}/audit-{export_id}.csv"
        async with self.storage.streaming_write(key) as writer:
            await writer.write(CSV_HEADERS)
            async for row in self.db.stream(query):
                await writer.write(format_audit_row(row))

        export_url = await self.storage.generate_signed_url(key, ttl_seconds=3600)
        await self.export_repo.mark_ready(export_id, download_url=export_url)
```

---

## 11. Webhook Module

### 11.1 Delivery Worker

```python
# backend/app/services/webhook.py
class WebhookDeliveryWorker:
    async def process_event(self, event: dict) -> None:
        webhooks = await self.webhook_repo.get_subscribed(
            project_id=event["project_id"],
            event_type=event["event_type"],
        )
        for webhook in webhooks:
            await self._deliver(webhook, event)

    async def _deliver(self, webhook: Webhook, event: dict) -> None:
        payload = json.dumps(event)
        signature = hmac.new(webhook.signing_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-FileNest-Event": event["event_type"],
            "X-FileNest-Signature": f"sha256={signature}",
            "X-FileNest-Delivery": str(uuid4()),
            "X-FileNest-Timestamp": str(int(time.time())),
        }

        delivery = WebhookDelivery(
            webhook_id=webhook.id,
            event_type=event["event_type"],
            event_id=event["event_id"],
            request_payload=event,
            request_headers=headers,
        )
        self.db.add(delivery)

        async with httpx.AsyncClient(timeout=webhook.timeout_seconds) as client:
            try:
                response = await client.post(webhook.url, content=payload, headers=headers)
                delivery.status = "delivered" if response.is_success else "failed"
                delivery.response_status = response.status_code
                delivery.response_body = response.text[:2048]
                if not response.is_success:
                    await self._schedule_retry(delivery)
            except Exception as e:
                delivery.status = "failed"
                delivery.response_body = str(e)
                await self._schedule_retry(delivery)

    async def _schedule_retry(self, delivery: WebhookDelivery) -> None:
        if delivery.attempt_count >= delivery.webhook.max_retries:
            delivery.status = "dead_lettered"
            return
        delay = 2 ** delivery.attempt_count * 30  # 30s, 60s, 120s …
        delivery.next_attempt_at = datetime.utcnow() + timedelta(seconds=delay)
        delivery.attempt_count += 1
        delivery.status = "pending"
```

---

## 12. Compliance Module

### 12.1 Policy Engine

```python
# backend/app/services/compliance.py
class CompliancePolicyEngine:

    async def check_delete_allowed(self, file_id: str, ctx: TenantContext) -> PolicyCheckResult:
        file = await self.file_repo.get(file_id, ctx)
        violations = []

        if file.worm_committed:
            violations.append(PolicyViolation(policy="worm", message="WORM-committed files cannot be deleted"))

        if file.legal_hold_active:
            violations.append(PolicyViolation(policy="legal_hold", reason=file.legal_hold_reason, message="File is under legal hold"))

        if file.folder_id:
            folder = await self.folder_repo.get(file.folder_id)
            if folder and folder.legal_hold_active:
                violations.append(PolicyViolation(policy="folder_legal_hold", message="Parent folder is under legal hold"))

        if file.retain_until and file.retain_until > datetime.utcnow():
            days_remaining = (file.retain_until - datetime.utcnow()).days
            violations.append(PolicyViolation(policy="retention", message=f"File under retention policy. {days_remaining} days remaining."))

        return PolicyCheckResult(allowed=len(violations) == 0, violations=violations)

    async def apply_legal_hold(self, file_id: str, reason: str, ctx: TenantContext) -> None:
        file = await self.file_repo.get(file_id, ctx)
        file.legal_hold_active = True
        file.legal_hold_reason = reason
        file.legal_hold_set_by = ctx.actor_id
        file.legal_hold_set_at = datetime.utcnow()

        await self.audit.log(event_type="file.legal_hold_set", subject_id=file_id, payload={"reason": reason}, ctx=ctx, db=self.db)

    async def commit_worm(self, file_id: str, ctx: TenantContext) -> None:
        """WORM commit is IRREVERSIBLE."""
        project_config = await self.project_repo.get_config(ctx.project_id)
        if not project_config.compliance.worm:
            raise WORMNotEnabledError(ctx.project_id)

        file = await self.file_repo.get(file_id, ctx)
        if file.worm_committed:
            raise AlreadyWORMError(file_id)

        file.worm_committed = True
        file.worm_committed_at = datetime.utcnow()
```

---

## 13. Healthcare Module

### 13.1 FHIR Resource Mapper

```python
# backend/app/services/healthcare.py
class FHIRMapper:
    def file_to_document_reference(self, file: File, fhir_metadata: FHIRMetadata) -> dict:
        """Map a FileNest file to a FHIR R4 DocumentReference."""
        return {
            "resourceType": "DocumentReference",
            "id": f"fn-{file.id}",
            "status": "current",
            "docStatus": "final" if file.status == "ready" else "preliminary",
            "type": self._get_document_type(file.metadata.get("documentType")),
            "subject": {"reference": f"Patient/{file.metadata.get('patientId')}"},
            "date": file.created_at.isoformat(),
            "content": [{"attachment": {
                "contentType": file.mime_type,
                "size": file.size,
                "title": file.original_filename,
                "url": fhir_metadata.content_url,
                "hash": file.checksum_sha256,
            }}],
            "context": {
                "encounter": [{"reference": f"Encounter/{file.metadata.get('encounterId')}"}]
                    if file.metadata.get("encounterId") else [],
                "facilityType": self._get_facility_type(file.metadata),
            },
            "meta": {
                "source": "urn:filenest",
                "tag": [{"system": "urn:filenest:project", "code": str(file.project_id)}],
            }
        }
```

---

## 14. In-Process Communication

There are no inter-service HTTP calls within the backend. All modules communicate through direct Python function calls. The only external HTTP call the backend makes is to the IAM to verify API keys.

### 14.1 Module Dependencies

```
routers/ → services/ → repositories/ → models/
                     → storage/
                     → core/messaging.py (outbox)
```

Services import repositories and core utilities directly. Never skip a layer.

### 14.2 Transactional Outbox (NATS Events)

```python
# backend/app/core/messaging.py
class TransactionalOutboxPublisher:
    """
    Writes events to outbox_messages in the same transaction as business logic.
    OutboxWorker polls and publishes to NATS separately.
    Guarantees at-least-once delivery without distributed transactions.
    """

    async def publish(
        self,
        event_type: str,
        subject_id: str,
        payload: dict,
        organization_id: str,
        project_id: str,
        db: AsyncSession,
    ) -> None:
        event = OutboxMessage(
            organization_id=organization_id,
            project_id=project_id,
            event_type=event_type,
            subject_id=subject_id,
            payload=payload,
            status="pending",
        )
        db.add(event)
        # Committed with the parent transaction

class OutboxWorker:
    """Background task that polls outbox_messages and publishes to NATS."""

    async def run(self) -> None:
        while True:
            async with get_db_session() as db:
                pending = await db.execute(
                    select(OutboxMessage)
                    .where(OutboxMessage.status == "pending")
                    .order_by(OutboxMessage.created_at)
                    .limit(100)
                    .with_for_update(skip_locked=True)
                )
                for msg in pending.scalars():
                    try:
                        await self.nats.publish(
                            subject=f"filenest.{msg.organization_id}.{msg.project_id}.{msg.event_type}",
                            payload=msg.payload,
                        )
                        msg.status = "published"
                    except Exception:
                        msg.attempt_count += 1
                        if msg.attempt_count >= 5:
                            msg.status = "failed"
            await asyncio.sleep(1)
```

NATS subject format: `filenest.{org_id}.{project_id}.{event_type}`

---

## 15. Error Handling

### 15.1 Exception Hierarchy

```python
# backend/app/errors/base.py
class FileNestError(Exception):
    status_code: int = 500
    error_code: str = "internal_error"
    message: str = "An internal error occurred"

class NotFoundError(FileNestError):
    status_code = 404
    error_code = "not_found"

class FileNotFoundError(NotFoundError):
    def __init__(self, file_id: str):
        self.message = f"File {file_id} not found"
        self.error_code = "file_not_found"

class AuthenticationError(FileNestError):
    status_code = 401
    error_code = "unauthorized"

class AuthorizationError(FileNestError):
    status_code = 403
    error_code = "forbidden"

class MetadataValidationError(FileNestError):
    status_code = 422
    error_code = "metadata_validation_failed"
    def __init__(self, errors: list[dict]):
        self.validation_errors = errors

class WORMViolationError(FileNestError):
    status_code = 409
    error_code = "worm_violation"

class LegalHoldViolationError(FileNestError):
    status_code = 409
    error_code = "legal_hold_active"

class FileTooLargeError(FileNestError):
    status_code = 413
    error_code = "file_too_large"
```

### 15.2 Global Exception Handler

```python
# backend/app/errors/handlers.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

async def filenest_error_handler(request: Request, exc: FileNestError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "request_id": request.headers.get("x-request-id"),
                **({"validation_errors": exc.validation_errors} if hasattr(exc, "validation_errors") else {}),
            }
        },
    )

def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(FileNestError, filenest_error_handler)
```

---

## 16. Observability

### 16.1 Structured Logging

```python
# backend/app/core/logging.py
import structlog

def setup_logging() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.BoundLogger,
        logger_factory=structlog.WriteLoggerFactory(),
    )

# Always include tenant context in every log call
logger = structlog.get_logger()
logger.info("file_upload_started", file_id=file_id, organization_id=ctx.organization_id, project_id=ctx.project_id)
```

### 16.2 Request ID Middleware

```python
# backend/app/main.py (middleware wired in lifespan)
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
```

### 16.3 OpenTelemetry Integration

See `backend/app/core/telemetry.py` — initialised once in the FastAPI lifespan via `init_telemetry(service_name="filenest")`.
Instruments FastAPI, SQLAlchemy, and Redis automatically.
