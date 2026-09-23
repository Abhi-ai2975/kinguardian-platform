"""
app.services.project_config — Business logic for project configuration management.

Coordinates ProjectConfigRepository (DB) and handles the serialisation of list
fields to/from the comma-separated TEXT format stored in the database.

The service owns all translation between the external API representation
(list[str] | None) and the storage format ("a,b,c" | None).

Usage:
    svc = ProjectConfigService(session=session, repo=repo, ctx=ctx)
    result = await svc.get_config(project_id)
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.core.logging import get_logger
from app.errors import NotFoundError
from app.models.project_config import ProjectConfig
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.schemas.project_config import (
    ProjectConfigResponse,
    UpdateComplianceConfigRequest,
    UpdateProcessingConfigRequest,
    UpdateSecurityConfigRequest,
    UpdateUploadConfigRequest,
)

logger = get_logger(__name__)

# ── Helpers ──────────────────────────────────────────────────────────────────

_SENTINEL = ...  # used by update_allow_none to mean "not provided"


def _join(values: list[str] | None) -> str | None:
    """Serialise a list of strings to comma-separated TEXT for DB storage."""
    if values is None:
        return None
    return ",".join(v.strip() for v in values if v.strip()) or None


def _split(text: str | None) -> list[str] | None:
    """Deserialise a comma-separated TEXT column back to list[str]."""
    if not text:
        return None
    return [v.strip() for v in text.split(",") if v.strip()]


def _to_response(record: ProjectConfig) -> ProjectConfigResponse:
    """Map an ORM row to the API response schema, deserialising list fields."""
    return ProjectConfigResponse(
        id=record.id,
        organization_id=record.organization_id,
        project_id=record.project_id,
        # Upload
        max_file_size_bytes=record.max_file_size_bytes,
        allowed_mime_types=_split(record.allowed_mime_types),
        allowed_extensions=_split(record.allowed_extensions),
        max_files_per_request=record.max_files_per_request,
        # Security
        allowed_ips=_split(record.allowed_ips),
        allowed_origins=_split(record.allowed_origins),
        require_signed_urls=record.require_signed_urls,
        signed_url_ttl_seconds=record.signed_url_ttl_seconds,
        # Processing
        versioning_enabled=record.versioning_enabled,
        ocr_enabled=record.ocr_enabled,
        virus_scan_enabled=record.virus_scan_enabled,
        # Compliance
        retention_days=record.retention_days,
        worm_enabled=record.worm_enabled,
        legal_hold_enabled=record.legal_hold_enabled,
        data_residency=record.data_residency,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


# ── Service ───────────────────────────────────────────────────────────────────

class ProjectConfigService:
    """
    Orchestrates project configuration reads and updates for a single request.

    Args:
        session:             Active DB session (owns commit/rollback).
        repo:                ProjectConfigRepository bound to the same session.
        storage_config_repo: StorageConfigRepository — used to look up the project's
                             bucket when syncing CORS after allowed_origins changes.
        ctx:                 Resolved caller identity (organization_id required).
    """

    def __init__(
        self,
        session: AsyncSession,
        repo: ProjectConfigRepository,
        storage_config_repo: StorageConfigRepository,
        ctx: TenantContext,
    ) -> None:
        self._session = session
        self._repo = repo
        self._storage_config_repo = storage_config_repo
        self._ctx = ctx

    async def get_config(self, project_id: str) -> ProjectConfigResponse:
        """
        Return the full configuration for a project.

        Raises:
            NotFoundError: If no config row exists for this project.
        """
        record = await self._repo.get_for_project(project_id, self._ctx.organization_id)
        return _to_response(record)

    async def update_upload_config(
        self, project_id: str, req: UpdateUploadConfigRequest
    ) -> ProjectConfigResponse:
        """
        Partially update the upload restriction settings for a project.

        Fields omitted from the request body (None) preserve the existing value.
        To explicitly remove a restriction (e.g. clear the MIME allowlist), pass
        the field as an empty list — the service converts [] to None/null.

        Raises:
            NotFoundError: If no config row exists for this project.
        """
        allowed_mime: str | None | type(...) = _SENTINEL
        allowed_ext: str | None | type(...) = _SENTINEL

        if req.allowed_mime_types is not None:
            allowed_mime = _join(req.allowed_mime_types)  # [] → None (clear restriction)
        if req.allowed_extensions is not None:
            allowed_ext = _join(req.allowed_extensions)

        record = await self._repo.update_allow_none(
            project_id,
            self._ctx.organization_id,
            max_file_size_bytes=req.max_file_size_bytes if req.max_file_size_bytes is not None else _SENTINEL,
            allowed_mime_types=allowed_mime,
            allowed_extensions=allowed_ext,
            max_files_per_request=req.max_files_per_request if req.max_files_per_request is not None else _SENTINEL,
        )
        await self._session.commit()

        logger.info(
            "project_config.upload.updated",
            project_id=project_id,
            organization_id=self._ctx.organization_id,
        )
        return _to_response(record)

    async def update_security_config(
        self, project_id: str, req: UpdateSecurityConfigRequest
    ) -> ProjectConfigResponse:
        """
        Partially update the network security settings for a project.

        Pass an empty list for allowed_ips or allowed_origins to remove
        the restriction (stored as null — all IPs / origins are then allowed).

        Raises:
            NotFoundError: If no config row exists for this project.
        """
        allowed_ips: str | None | type(...) = _SENTINEL
        allowed_origins: str | None | type(...) = _SENTINEL

        if req.allowed_ips is not None:
            allowed_ips = _join(req.allowed_ips)
        if req.allowed_origins is not None:
            allowed_origins = _join(req.allowed_origins)

        record = await self._repo.update_allow_none(
            project_id,
            self._ctx.organization_id,
            allowed_ips=allowed_ips,
            allowed_origins=allowed_origins,
            require_signed_urls=req.require_signed_urls if req.require_signed_urls is not None else _SENTINEL,
            signed_url_ttl_seconds=req.signed_url_ttl_seconds if req.signed_url_ttl_seconds is not None else _SENTINEL,
        )
        await self._session.commit()

        # Sync CORS to the bucket whenever allowed_origins changes so that browsers
        # can PUT presigned URLs directly from the origins the developer configured.
        # null allowed_origins means "all origins" → use ["*"].
        if req.allowed_origins is not None:
            await self._sync_bucket_cors(project_id, record)

        logger.info(
            "project_config.security.updated",
            project_id=project_id,
            organization_id=self._ctx.organization_id,
        )
        return _to_response(record)

    async def _sync_bucket_cors(self, project_id: str, config: ProjectConfig) -> None:
        """
        Apply the project's allowed_origins to its storage bucket CORS policy.

        null allowed_origins → ["*"] (no restriction configured).
        Best-effort: logs a warning on failure but does not raise so the config
        update is not rolled back.
        """
        from app.storage.resolver import storage_resolver  # local import avoids circular

        origins = _split(config.allowed_origins) or ["*"]
        try:
            try:
                storage_cfg = await self._storage_config_repo.get_for_project(
                    project_id, self._ctx.organization_id
                )
                provider = storage_resolver.build_provider(storage_cfg)
            except NotFoundError:
                provider = await storage_resolver.get_provider(project_id)

            await provider.set_bucket_cors(origins)
            logger.info(
                "project_config.cors_synced",
                project_id=project_id,
                organization_id=self._ctx.organization_id,
                origins=origins,
            )
        except Exception as exc:
            logger.error(
                "project_config.cors_sync_failed",
                project_id=project_id,
                organization_id=self._ctx.organization_id,
                error=str(exc),
            )

    async def update_processing_config(
        self, project_id: str, req: UpdateProcessingConfigRequest
    ) -> ProjectConfigResponse:
        """
        Partially update the processing feature flags for a project.

        Raises:
            NotFoundError: If no config row exists for this project.
        """
        record = await self._repo.update(
            project_id,
            self._ctx.organization_id,
            versioning_enabled=req.versioning_enabled,
            ocr_enabled=req.ocr_enabled,
            virus_scan_enabled=req.virus_scan_enabled,
        )
        await self._session.commit()

        logger.info(
            "project_config.processing.updated",
            project_id=project_id,
            organization_id=self._ctx.organization_id,
        )
        return _to_response(record)

    async def update_compliance_config(
        self, project_id: str, req: UpdateComplianceConfigRequest
    ) -> ProjectConfigResponse:
        """
        Partially update the compliance settings for a project.

        Note: these fields are stored immediately but not enforced by the
        backend until Phase 8. The response reflects the saved values.

        Raises:
            NotFoundError: If no config row exists for this project.
        """
        record = await self._repo.update(
            project_id,
            self._ctx.organization_id,
            retention_days=req.retention_days,
            worm_enabled=req.worm_enabled,
            legal_hold_enabled=req.legal_hold_enabled,
            data_residency=req.data_residency,
        )
        await self._session.commit()

        logger.info(
            "project_config.compliance.updated",
            project_id=project_id,
            organization_id=self._ctx.organization_id,
        )
        return _to_response(record)
