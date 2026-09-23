"""
app.repositories.upload_token — DB access for upload_tokens table.

All queries are tenant-scoped by organization_id + project_id.
Token lookup by value is used by the auth layer to verify bearer tokens.

Usage:
    from app.repositories.upload_token import UploadTokenRepository
"""
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.upload_token import UploadToken


class UploadTokenRepository:
    """Async repository for UploadToken CRUD. All queries are tenant-scoped."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, **kwargs) -> UploadToken:
        """Insert a new UploadToken row and flush to get the DB-assigned id."""
        record = UploadToken(**kwargs)
        self._session.add(record)
        await self._session.flush()
        return record

    async def get_by_token(self, token: str) -> UploadToken | None:
        """
        Fetch an UploadToken by its token string value.

        Returns None if not found or expired. Does NOT enforce tenant scope —
        the caller (auth layer) trusts the token string itself as the credential.

        Args:
            token: The raw bearer token string starting with fn_upload_token_.

        Returns:
            The UploadToken row, or None if not found / expired.
        """
        now = datetime.now(UTC)
        result = await self._session.execute(
            select(UploadToken).where(
                UploadToken.token == token,
                UploadToken.expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def delete_expired(self, organization_id: str, project_id: str) -> int:
        """
        Prune expired tokens for a project. Returns the number deleted.

        Called opportunistically after token creation to keep the table lean.
        """
        from sqlalchemy import delete as sa_delete

        now = datetime.now(UTC)
        result = await self._session.execute(
            sa_delete(UploadToken).where(
                UploadToken.organization_id == organization_id,
                UploadToken.project_id == project_id,
                UploadToken.expires_at <= now,
            )
        )
        return result.rowcount
