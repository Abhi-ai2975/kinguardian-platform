"""
app.repositories.storage_config — Database access layer for storage_configs.

Every query includes organization_id + project_id to prevent cross-tenant leaks.
No business logic here — conditionals belong in services.

Usage:
    from app.repositories.storage_config import StorageConfigRepository
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import NotFoundError
from app.models.storage_config import StorageConfig


class StorageConfigRepository:
    """Async repository for StorageConfig CRUD. All queries are tenant-scoped."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs) -> StorageConfig:
        """Insert a new StorageConfig row and flush to get the DB-assigned id."""
        record = StorageConfig(**kwargs)
        self._session.add(record)
        await self._session.flush()
        return record

    async def get_for_project(
        self, project_id: str, organization_id: str, environment: str = "production"
    ) -> StorageConfig:
        """
        Fetch the active storage config for a project+environment.

        Raises:
            NotFoundError: If no config exists.
        """
        result = await self._session.execute(
            select(StorageConfig).where(
                StorageConfig.project_id == project_id,
                StorageConfig.organization_id == organization_id,
                StorageConfig.environment == environment,
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise NotFoundError(f"No storage config found for project {project_id}")
        return record

    async def update(
        self,
        project_id: str,
        organization_id: str,
        *,
        bucket_name: str,
        region: str | None,
        endpoint_url: str | None,
        config_encrypted: bytes,
        server_side_encryption: str | None,
        kms_key_id: str | None,
    ) -> StorageConfig:
        """
        Write BYOB credential fields to an existing StorageConfig row.

        Sets status to pending_verification so the caller must run
        the verify probe before files can be uploaded.

        server_side_encryption is None for Azure Blob and GCS (SSE is always-on
        and not configurable). Only set for S3-family providers.

        Raises:
            NotFoundError: If no config exists for this project.
        """
        record = await self.get_for_project(project_id, organization_id)
        record.bucket_name = bucket_name
        record.region = region
        record.endpoint_url = endpoint_url
        record.config_encrypted = config_encrypted
        record.server_side_encryption = server_side_encryption
        record.kms_key_id = kms_key_id
        record.status = "pending_verification"
        return record

    async def update_status(
        self, project_id: str, organization_id: str, status: str, last_verified_at=None
    ) -> StorageConfig:
        """Update the verification status of a config."""
        record = await self.get_for_project(project_id, organization_id)
        record.status = status
        if last_verified_at is not None:
            record.last_verified_at = last_verified_at
        return record

    async def update_sse(
        self, project_id: str, organization_id: str, sse_enabled: bool
    ) -> StorageConfig:
        """
        Enable or disable server-side encryption for a project's storage config.

        Only meaningful for MinIO and RustFS — the caller (service layer) is
        responsible for validating provider eligibility before calling this.

        Raises:
            NotFoundError: If no config exists for this project.
        """
        record = await self.get_for_project(project_id, organization_id)
        record.sse_enabled = sse_enabled
        return record
