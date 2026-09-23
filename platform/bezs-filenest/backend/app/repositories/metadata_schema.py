"""
app.repositories.metadata_schema — Database access layer for metadata_schemas.

Manages versioned JSON Schema definitions for a project. At most one schema
is active per project at any time. All queries are scoped to organization_id
+ project_id to prevent cross-tenant leaks.

Usage:
    from app.repositories.metadata_schema import MetadataSchemaRepository
"""
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.metadata_schema import MetadataSchema


class MetadataSchemaRepository:
    """Async repository for MetadataSchema CRUD. All queries are tenant-scoped."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_max_version(self, project_id: str, organization_id: str) -> int:
        """
        Return the highest version number for the project, or 0 if none exist yet.

        Used to calculate the next version number on schema creation.
        """
        result = await self._session.execute(
            select(MetadataSchema.version)
            .where(
                MetadataSchema.project_id == project_id,
                MetadataSchema.organization_id == organization_id,
            )
            .order_by(MetadataSchema.version.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        return row or 0

    async def deactivate_all(self, project_id: str, organization_id: str) -> None:
        """
        Mark all existing schemas for this project as inactive.

        Called before creating a new schema so only one is active at a time.
        """
        await self._session.execute(
            update(MetadataSchema)
            .where(
                MetadataSchema.project_id == project_id,
                MetadataSchema.organization_id == organization_id,
                MetadataSchema.is_active.is_(True),
            )
            .values(is_active=False)
        )

    async def create(
        self,
        project_id: str,
        organization_id: str,
        version: int,
        schema_json: str,
    ) -> MetadataSchema:
        """
        Insert a new MetadataSchema row and flush to get the DB-assigned id.

        Callers must call deactivate_all() first within the same transaction
        to ensure only one active schema exists per project.
        """
        record = MetadataSchema(
            project_id=project_id,
            organization_id=organization_id,
            version=version,
            schema_json=schema_json,
            is_active=True,
        )
        self._session.add(record)
        await self._session.flush()
        return record

    async def get_active(
        self, project_id: str, organization_id: str
    ) -> MetadataSchema | None:
        """
        Return the currently active schema for a project, or None if none exists.

        Used by MetadataService to validate metadata before writes.
        """
        result = await self._session.execute(
            select(MetadataSchema).where(
                MetadataSchema.project_id == project_id,
                MetadataSchema.organization_id == organization_id,
                MetadataSchema.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self, project_id: str, organization_id: str
    ) -> list[MetadataSchema]:
        """
        Return all schema versions for a project, newest first.
        """
        result = await self._session.execute(
            select(MetadataSchema)
            .where(
                MetadataSchema.project_id == project_id,
                MetadataSchema.organization_id == organization_id,
            )
            .order_by(MetadataSchema.version.desc())
        )
        return list(result.scalars().all())
