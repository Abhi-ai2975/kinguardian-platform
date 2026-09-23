"""
app.repositories.file_version — Database access layer for file_versions.

Every query includes organization_id + file_id to prevent cross-tenant leaks.
Rows are immutable once created — there are no update methods.

Usage:
    from app.repositories.file_version import FileVersionRepository
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import NotFoundError
from app.models.file_version import FileVersion


class FileVersionRepository:
    """Async repository for FileVersion reads and inserts. Rows are never updated."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs) -> FileVersion:
        """Insert a new FileVersion row and flush to get the DB-assigned id."""
        record = FileVersion(**kwargs)
        self._session.add(record)
        await self._session.flush()
        return record

    async def list(
        self, file_id: str, organization_id: str, project_id: str
    ) -> list[FileVersion]:
        """
        Return all versions for a file, newest first.

        Args:
            file_id:         Parent file UUID.
            organization_id: Owning organisation for tenant scope.
            project_id:      Project containing the file.
        """
        result = await self._session.execute(
            select(FileVersion)
            .where(
                FileVersion.file_id == file_id,
                FileVersion.organization_id == organization_id,
                FileVersion.project_id == project_id,
            )
            .order_by(FileVersion.version_number.desc())
        )
        return list(result.scalars().all())

    async def get(
        self, version_id: str, file_id: str, organization_id: str
    ) -> FileVersion:
        """
        Fetch a single version by its id.

        Raises:
            NotFoundError: If the version does not exist or belongs to a different file/org.
        """
        result = await self._session.execute(
            select(FileVersion).where(
                FileVersion.id == version_id,
                FileVersion.file_id == file_id,
                FileVersion.organization_id == organization_id,
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise NotFoundError(f"Version {version_id} not found for file {file_id}")
        return record
