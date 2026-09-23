"""
app.services.project — Business logic for project management.

All project business rules live here. Coordinates with ProjectRepository (DB)
and StorageConfigRepository (auto-creates a storage config on project creation).
No direct SQL, no storage calls, no HTTP calls.

Usage:
    svc = ProjectService(session=session, ctx=ctx)
    result = await svc.create_project(request_body)
"""
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.core.logging import get_logger
from app.errors import ConflictError
from app.repositories.project import ProjectRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.storage.resolver import storage_resolver


from app.schemas.project import (
    CreateProjectRequest,
    ProjectListParams,
    ProjectListResponse,
    ProjectResponse,
    UpdateProjectRequest,
)

logger = get_logger(__name__)

# Providers where SSE is always on by platform default (not toggleable by users).
_SSE_DEFAULT_ENABLED = {"s3", "r2", "azure_blob", "gcs"}


class ProjectService:
    """
    Orchestrates project lifecycle operations for a single request.

    Args:
        session: Active DB session (owns commit/rollback).
        ctx:     Resolved caller identity. Only organization_id is required.
    """

    def __init__(
        self,
        session: AsyncSession,
        repo: ProjectRepository,
        storage_repo: StorageConfigRepository,
        config_repo: ProjectConfigRepository,
        ctx: TenantContext,
    ) -> None:
        self._session = session
        self._ctx = ctx
        self._repo = repo
        self._storage_repo = storage_repo
        self._config_repo = config_repo

    async def create_project(self, req: CreateProjectRequest) -> ProjectResponse:
        """
        Create a new project and its default StorageConfig in a single transaction.

        A StorageConfig row is always created alongside the project so the storage
        resolver has a row to read on the first upload. For managed mode the config
        holds no credentials — the platform defaults from settings are used.

        Raises:
            ConflictError: If a project with the same slug already exists.
        """
        existing = await self._repo.get_by_slug(req.slug, self._ctx.organization_id)
        if existing is not None:
            raise ConflictError("A project with this slug already exists in your organisation.")

        record = await self._repo.create(
            organization_id=self._ctx.organization_id,
            name=req.name,
            slug=req.slug,
            description=req.description,
            storage_mode=req.storage_mode,
            storage_provider=req.storage_provider,
        )

        # For managed projects: provision the bucket, then immediately probe it.
        # Status is set from the probe result so the storage card reflects reality
        # from the first page load. Bucket creation is idempotent on retry.
        managed_bucket_name: str | None = None
        storage_status = "pending_verification"
        last_verified_at = None

        if req.storage_mode == "managed":
            managed_bucket_name = await storage_resolver.provision_managed_bucket(
                record.id, req.storage_provider
            )
            probe_key = f"{self._ctx.organization_id}/{record.id}/.filenest-probe"
            try:
                probe = storage_resolver.build_managed_provider(
                    req.storage_provider, managed_bucket_name
                )
                await probe.upload(probe_key, b"filenest-probe", "text/plain")
                await probe.delete_object(probe_key)
                storage_status = "active"
                last_verified_at = datetime.now(UTC)
                logger.info(
                    "storage.probe_ok",
                    project_id=record.id,
                    bucket=managed_bucket_name,
                    organization_id=self._ctx.organization_id,
                )
            except Exception as exc:
                storage_status = "verification_failed"
                logger.warning(
                    "storage.probe_failed",
                    project_id=record.id,
                    bucket=managed_bucket_name,
                    error=str(exc),
                    organization_id=self._ctx.organization_id,
                )

        # Auto-create the default storage config in the same transaction.
        # BYOB configs start as pending_verification — credentials set later.
        # SSE is enabled by default for S3/R2/Azure/GCS (always-on); MinIO/RustFS
        # default to False and the user can toggle via the Security settings.
        sse_enabled = req.storage_provider.lower() in _SSE_DEFAULT_ENABLED
        await self._storage_repo.create(
            organization_id=self._ctx.organization_id,
            project_id=record.id,
            environment="production",
            storage_mode=req.storage_mode,
            provider=req.storage_provider,
            bucket_name=managed_bucket_name,
            status=storage_status,
            last_verified_at=last_verified_at,
            sse_enabled=sse_enabled,
        )

        # Auto-create the project config row with all defaults.
        # All restrictions are null (no limits) and all feature flags are off.
        await self._config_repo.create(
            organization_id=self._ctx.organization_id,
            project_id=record.id,
        )

        await self._session.commit()

        logger.info(
            "project.created",
            project_id=record.id,
            slug=record.slug,
            storage_mode=req.storage_mode,
            storage_provider=req.storage_provider,
            bucket_name=managed_bucket_name,
            storage_status=storage_status,
            organization_id=self._ctx.organization_id,
        )

        return self._to_response(record)

    async def get_project(self, project_id: str) -> ProjectResponse:
        """
        Return the full metadata for a single project.

        Raises:
            NotFoundError: If the project does not exist in this organisation.
        """
        record = await self._repo.get(project_id, self._ctx.organization_id)
        return self._to_response(record)

    async def list_projects(self, params: ProjectListParams) -> ProjectListResponse:
        """
        Return a page of projects matching the given filters, sort, and page params.

        Args:
            params: Validated query parameters from GET /v1/projects.
        """
        import math
        records, total = await self._repo.list(self._ctx.organization_id, params)
        items = [self._to_response(r) for r in records]
        return ProjectListResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=math.ceil(total / params.page_size) if total else 1,
        )

    async def update_project(self, project_id: str, req: UpdateProjectRequest) -> ProjectResponse:
        """
        Apply a partial update to a project.

        Only fields present (non-None) in the request body are written.

        Raises:
            NotFoundError: If the project does not exist.
        """
        record = await self._repo.update(
            project_id,
            self._ctx.organization_id,
            name=req.name,
            description=req.description,
            versioning_enabled=req.versioning_enabled,
            ocr_enabled=req.ocr_enabled,
        )
        await self._session.commit()

        logger.info(
            "project.updated",
            project_id=project_id,
            organization_id=self._ctx.organization_id,
        )

        return self._to_response(record)

    async def delete_project(self, project_id: str) -> None:
        """
        Soft-delete a project. Files and storage config are retained.

        Raises:
            NotFoundError: If the project does not exist.
        """
        await self._repo.soft_delete(project_id, self._ctx.organization_id)
        await self._session.commit()

        logger.info(
            "project.deleted",
            project_id=project_id,
            organization_id=self._ctx.organization_id,
        )

    def _to_response(self, record) -> ProjectResponse:
        return ProjectResponse(
            id=record.id,
            organization_id=record.organization_id,
            name=record.name,
            slug=record.slug,
            description=record.description,
            storage_mode=record.storage_mode,
            storage_provider=record.storage_provider,
            versioning_enabled=record.versioning_enabled,
            ocr_enabled=record.ocr_enabled,
            is_active=record.is_active,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )
