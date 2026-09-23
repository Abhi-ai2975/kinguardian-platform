"""
app.services.storage_config — Business logic for storage configuration.

Handles reading a project's storage config and running the connectivity
verification probe (write + delete a test object against the provider).

Usage:
    svc = StorageConfigService(session=session, ctx=ctx)
    config = await svc.get_config(project_id)
    result = await svc.verify(project_id)
"""
import time
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.core.crypto import encrypt_storage_credentials
from app.core.logging import get_logger
from app.errors import ValidationError
from app.repositories.storage_config import StorageConfigRepository
from app.schemas.storage_config import StorageConfigResponse, StorageConfigUpdateRequest, StorageVerifyResponse, UpdateSseRequest
from app.storage.resolver import storage_resolver

logger = get_logger(__name__)

_PROBE_KEY_TEMPLATE = "{org}/{project}/.filenest-probe"
_S3_FAMILY = {"s3", "minio", "rustfs", "r2"}


def _build_byob_credentials(
    provider: str, req: StorageConfigUpdateRequest
) -> tuple[dict, str | None, str | None]:
    """
    Build the provider-specific credentials dict, SSE value, and KMS key from the request.

    Returns:
        (credentials_dict, server_side_encryption, kms_key_id)
        server_side_encryption and kms_key_id are None for Azure / GCS.

    Raises:
        ValidationError: If required credential fields are missing for the provider.
    """
    p = provider.lower()
    if p in _S3_FAMILY:
        if not req.access_key_id or not req.secret_access_key:
            raise ValidationError(
                "access_key_id and secret_access_key are required for S3-compatible providers",
                detail={"provider": provider},
            )
        creds: dict = {
            "access_key_id": req.access_key_id,
            "secret_access_key": req.secret_access_key,
        }
        sse: str | None = req.server_side_encryption
        kms: str | None = req.kms_key_id if sse == "aws:kms" else None
        if kms:
            creds["kms_key_id"] = kms
        return creds, sse, kms

    if p == "azure_blob":
        if not req.account_name or not req.account_key:
            raise ValidationError(
                "account_name and account_key are required for Azure Blob Storage",
                detail={"provider": provider},
            )
        return {"account_name": req.account_name, "account_key": req.account_key}, None, None

    if p == "gcs":
        if not req.credentials_json:
            raise ValidationError(
                "credentials_json is required for Google Cloud Storage",
                detail={"provider": provider},
            )
        return {"credentials_json": req.credentials_json}, None, None

    raise ValidationError(
        f"Unsupported provider: '{provider}'",
        detail={"provider": provider, "supported": list(_S3_FAMILY) + ["azure_blob", "gcs"]},
    )


class StorageConfigService:
    """
    Handles storage configuration reads and connectivity verification.

    Args:
        session: Active DB session.
        ctx:     Resolved caller identity.
    """

    def __init__(
        self,
        session: AsyncSession,
        repo: StorageConfigRepository,
        ctx: TenantContext,
    ) -> None:
        self._session = session
        self._ctx = ctx
        self._repo = repo

    async def update_config(self, project_id: str, req: StorageConfigUpdateRequest) -> StorageConfigResponse:
        """
        Save BYOB credentials for a project's storage configuration.

        Fetches the existing config to determine the provider, then builds the
        correct provider-specific credentials dict before AES-256-GCM encryption.
        After saving, status is set to pending_verification — call verify() to promote.

        Raises:
            NotFoundError:  If no storage config exists for the project.
            ValidationError: If required credential fields are missing for the provider.
            StorageError:   If STORAGE_ENCRYPTION_KEY is missing or invalid.
        """
        existing = await self._repo.get_for_project(project_id, self._ctx.organization_id)
        creds, sse, kms = _build_byob_credentials(existing.provider, req)
        config_encrypted = encrypt_storage_credentials(creds)

        record = await self._repo.update(
            project_id,
            self._ctx.organization_id,
            bucket_name=req.bucket_name,
            region=req.region,
            endpoint_url=req.endpoint_url,
            config_encrypted=config_encrypted,
            server_side_encryption=sse,
            kms_key_id=kms,
        )
        await self._session.commit()

        logger.info(
            "storage_config.updated",
            project_id=project_id,
            organization_id=self._ctx.organization_id,
            provider=record.provider,
        )

        return self._to_response(record)

    async def get_config(self, project_id: str) -> StorageConfigResponse:
        """
        Return the non-sensitive storage configuration for a project.

        Raises:
            NotFoundError: If no storage config exists for the project.
        """
        record = await self._repo.get_for_project(project_id, self._ctx.organization_id)
        return self._to_response(record)

    async def verify(self, project_id: str) -> StorageVerifyResponse:
        """
        Probe the project's storage provider by writing and deleting a test object.

        Updates the config's status and last_verified_at on success.

        Returns:
            StorageVerifyResponse with ok=True and latency_ms on success,
            or ok=False and an error message on failure.
        """
        probe_key = _PROBE_KEY_TEMPLATE.format(
            org=self._ctx.organization_id, project=project_id
        )

        record = await self._repo.get_for_project(project_id, self._ctx.organization_id)
        provider = storage_resolver.build_provider(record)

        start = time.monotonic()
        try:
            await provider.upload(probe_key, b"filenest-probe", "text/plain")
            await provider.delete_object(probe_key)
            latency_ms = (time.monotonic() - start) * 1000

            await self._repo.update_status(
                project_id,
                self._ctx.organization_id,
                status="active",
                last_verified_at=datetime.now(UTC),
            )
            await self._session.commit()

            logger.info(
                "storage.verified",
                project_id=project_id,
                latency_ms=round(latency_ms, 1),
                organization_id=self._ctx.organization_id,
            )

            return StorageVerifyResponse(ok=True, latency_ms=round(latency_ms, 1))

        except Exception as exc:
            latency_ms = (time.monotonic() - start) * 1000
            error_msg = str(exc)

            await self._repo.update_status(
                project_id,
                self._ctx.organization_id,
                status="verification_failed",
            )
            await self._session.commit()

            logger.warning(
                "storage.verify_failed",
                project_id=project_id,
                error=error_msg,
                organization_id=self._ctx.organization_id,
            )

            return StorageVerifyResponse(ok=False, latency_ms=round(latency_ms, 1), error=error_msg)

    async def update_sse(self, project_id: str, req: UpdateSseRequest) -> StorageConfigResponse:
        """
        Enable or disable SSE for a MinIO or RustFS project.

        Sends ServerSideEncryption: AES256 on every PUT when enabled. The MinIO or
        RustFS server must have its KMS key configured (MINIO_KMS_SECRET_KEY /
        RUSTFS_KMS_SECRET_KEY) for encryption to take effect.

        S3, R2, Azure, and GCS use always-on encryption not configurable via FileNest.

        Raises:
            ValidationError: If the project's provider does not support toggling SSE.
            NotFoundError:   If no storage config exists for the project.
        """
        existing = await self._repo.get_for_project(project_id, self._ctx.organization_id)
        if existing.provider not in ("minio", "rustfs"):
            raise ValidationError(
                "SSE can only be toggled for MinIO and RustFS projects",
                detail={"provider": existing.provider},
            )
        record = await self._repo.update_sse(
            project_id, self._ctx.organization_id, req.sse_enabled
        )
        await self._session.commit()

        logger.info(
            "storage.sse_updated",
            project_id=project_id,
            sse_enabled=req.sse_enabled,
            organization_id=self._ctx.organization_id,
        )

        return self._to_response(record)

    def _to_response(self, record) -> StorageConfigResponse:
        return StorageConfigResponse(
            project_id=record.project_id,
            environment=record.environment,
            storage_mode=record.storage_mode,
            provider=record.provider,
            region=record.region,
            bucket_name=record.bucket_name,
            endpoint_url=record.endpoint_url,
            server_side_encryption=record.server_side_encryption,
            sse_enabled=record.sse_enabled,
            status=record.status,
            last_verified_at=record.last_verified_at,
        )
