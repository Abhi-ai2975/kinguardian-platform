"""
app.repositories.usage — Aggregation queries for the usage endpoint.

Provides org-level stats and per-project storage/file breakdowns.
All queries are scoped to organization_id to prevent cross-tenant leaks.

Usage:
    repo = UsageRepository(session)
    stats = await repo.get_stats(organization_id)
    projects = await repo.get_project_breakdown(organization_id)
"""
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.models.project import Project


class UsageRepository:
    """Read-only aggregation queries for the org usage page."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_stats(self, organization_id: str) -> dict:
        """
        Return headline counters: total files, storage bytes, projects, and
        files uploaded in the last 30 days.
        """
        since_30d = datetime.now(UTC) - timedelta(days=30)

        total_files = await self._session.scalar(
            select(func.count(File.id)).where(
                File.organization_id == organization_id,
                File.deleted_at.is_(None),
            )
        )

        total_storage = await self._session.scalar(
            select(func.coalesce(func.sum(File.size_bytes), 0)).where(
                File.organization_id == organization_id,
                File.deleted_at.is_(None),
            )
        )

        files_30d = await self._session.scalar(
            select(func.count(File.id)).where(
                File.organization_id == organization_id,
                File.deleted_at.is_(None),
                File.created_at >= since_30d,
            )
        )

        active_projects = await self._session.scalar(
            select(func.count(Project.id)).where(
                Project.organization_id == organization_id,
                Project.deleted_at.is_(None),
            )
        )

        return {
            "total_files": total_files or 0,
            "total_storage_bytes": int(total_storage or 0),
            "files_uploaded_30d": files_30d or 0,
            "active_projects": active_projects or 0,
        }

    async def get_project_breakdown(self, organization_id: str) -> list[dict]:
        """
        Return per-project storage_bytes and file_count for all active projects
        in the org, sorted by storage usage descending.

        Projects with zero files are included via LEFT JOIN so admins can see
        newly created projects that haven't received any uploads yet.
        """
        result = await self._session.execute(
            select(
                Project.id.label("project_id"),
                Project.name,
                func.coalesce(func.sum(File.size_bytes), 0).label("storage_bytes"),
                func.count(File.id).label("file_count"),
            )
            .outerjoin(
                File,
                (File.project_id == Project.id) & File.deleted_at.is_(None),
            )
            .where(
                Project.organization_id == organization_id,
                Project.deleted_at.is_(None),
            )
            .group_by(Project.id, Project.name)
            .order_by(func.coalesce(func.sum(File.size_bytes), 0).desc())
        )

        return [
            {
                "project_id": str(row.project_id),
                "name": row.name,
                "storage_bytes": int(row.storage_bytes),
                "file_count": int(row.file_count),
            }
            for row in result.all()
        ]
