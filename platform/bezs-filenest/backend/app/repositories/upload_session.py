"""
app.repositories.upload_session — Database access layer for upload_sessions.

Every query includes organization_id to prevent cross-tenant leaks.

Usage:
    from app.repositories.upload_session import UploadSessionRepository
"""
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import NotFoundError
from app.models.upload_session import UploadSession


class UploadSessionRepository:
    """Async repository for UploadSession CRUD. All queries are tenant-scoped."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs) -> UploadSession:
        """Insert a new UploadSession row and flush to get the DB-assigned id."""
        record = UploadSession(**kwargs)
        self._session.add(record)
        await self._session.flush()
        return record

    async def get(self, session_id: str, organization_id: str) -> UploadSession:
        """
        Fetch an upload session by id within the caller's tenant scope.

        Raises:
            NotFoundError: If the session does not exist.
        """
        result = await self._session.execute(
            select(UploadSession).where(
                UploadSession.id == session_id,
                UploadSession.organization_id == organization_id,
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise NotFoundError(f"Upload session {session_id} not found")
        return record

    async def mark_completed(self, session_id: str, part_count: int) -> UploadSession:
        """
        Transition an upload session to completed status.

        Raises:
            NotFoundError: If the session does not exist.
        """
        record = await self._session.get(UploadSession, session_id)
        if record is None:
            raise NotFoundError(f"Upload session {session_id} not found")
        record.status = "completed"
        record.part_count = part_count
        return record

    async def mark_aborted(self, session_id: str) -> UploadSession:
        """
        Transition an upload session to aborted status.

        Raises:
            NotFoundError: If the session does not exist.
        """
        record = await self._session.get(UploadSession, session_id)
        if record is None:
            raise NotFoundError(f"Upload session {session_id} not found")
        record.status = "aborted"
        return record
