"""
app.repositories.project_config — Database access layer for project_configs.

Every query includes organization_id to prevent cross-tenant leaks.
The project_id UNIQUE constraint guarantees at most one config row per project.

Comma-separated TEXT columns are stored and returned as plain strings here.
The service layer is responsible for splitting them into lists and joining them
back before writes.

Usage:
    from app.repositories.project_config import ProjectConfigRepository
"""
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import NotFoundError
from app.models.project_config import ProjectConfig


class ProjectConfigRepository:
    """
    Async repository for ProjectConfig CRUD. All reads are scoped to organization_id.

    The create() method is called exclusively by ProjectService.create_project()
    to ensure the config row always exists alongside the parent project.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs) -> ProjectConfig:
        """
        Insert a new ProjectConfig row and flush to get the DB-assigned id.

        Called once per project at creation time. Callers must not call commit()
        here — the owning ProjectService commits the whole transaction after both
        the Project and ProjectConfig rows are flushed.

        Args:
            kwargs: Column values. At minimum: organization_id, project_id.
        """
        record = ProjectConfig(**kwargs)
        self._session.add(record)
        await self._session.flush()
        return record

    async def get_for_project(
        self, project_id: str, organization_id: str
    ) -> ProjectConfig:
        """
        Fetch the config row for a project within the caller's organisation.

        Raises:
            NotFoundError: If no config row exists for this project.
        """
        result = await self._session.execute(
            select(ProjectConfig).where(
                ProjectConfig.project_id == project_id,
                ProjectConfig.organization_id == organization_id,
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise NotFoundError(f"No config found for project {project_id}")
        return record

    async def update(
        self, project_id: str, organization_id: str, **fields
    ) -> ProjectConfig:
        """
        Apply a partial update to a project config row.

        Only non-None kwargs are written; existing values are preserved for
        omitted fields. The updated_at timestamp is always refreshed.

        Args:
            fields: Column keyword arguments. Values of None are skipped.

        Raises:
            NotFoundError: If no config row exists for this project.
        """
        record = await self.get_for_project(project_id, organization_id)
        for key, value in fields.items():
            if value is not None:
                setattr(record, key, value)
        record.updated_at = datetime.now(UTC)
        return record

    async def update_allow_none(
        self, project_id: str, organization_id: str, **fields
    ) -> ProjectConfig:
        """
        Apply a partial update where explicit None values ARE written to the DB.

        Used for clearing restrictions (e.g. setting allowed_ips=None to remove
        an IP allowlist). The sentinel value `...` (Ellipsis) is used to mean
        "not provided" so that callers can distinguish "clear this field" from
        "leave this field untouched".

        Args:
            fields: Column keyword arguments. Ellipsis values are skipped;
                    None values clear the column.

        Raises:
            NotFoundError: If no config row exists for this project.
        """
        record = await self.get_for_project(project_id, organization_id)
        for key, value in fields.items():
            if value is not ...:
                setattr(record, key, value)
        record.updated_at = datetime.now(UTC)
        return record
