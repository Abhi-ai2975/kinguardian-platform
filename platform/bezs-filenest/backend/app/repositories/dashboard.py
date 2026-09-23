"""
app.repositories.dashboard — Aggregation queries for the dashboard endpoint.

All four query groups run in parallel via asyncio.gather() in DashboardService.
Every query is scoped to organization_id to prevent cross-tenant leaks.

Usage:
    repo = DashboardRepository(session)
    stats = await repo.get_stats(organization_id)
"""
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.models.project import Project


class DashboardRepository:
    """Read-only aggregation queries for the org-level dashboard."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_stats(self, organization_id: str) -> dict:
        """
        Return four headline counters for the org.

        Runs four COUNT/SUM queries individually; caller gathers them in parallel
        with the other repo methods.
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

    async def get_uploads_by_day(self, organization_id: str) -> list[dict]:
        """
        Return daily file-upload counts for the last 30 days.

        Only days with at least one upload are returned — the service/frontend
        fills in the zero days for a complete 30-day series.
        """
        since_30d = datetime.now(UTC) - timedelta(days=30)

        result = await self._session.execute(
            select(
                func.date(File.created_at).label("date"),
                func.count(File.id).label("count"),
            )
            .where(
                File.organization_id == organization_id,
                File.deleted_at.is_(None),
                File.created_at >= since_30d,
            )
            .group_by(func.date(File.created_at))
            .order_by(func.date(File.created_at))
        )
        return [{"date": str(row.date), "count": row.count} for row in result]

    async def get_storage_by_day(self, organization_id: str) -> list[dict]:
        """
        Return cumulative storage-byte totals per calendar day for the last 30 days.

        Each row's bytes value is the running total up to and including that day,
        so the area chart shows monotonically-increasing storage growth.
        """
        since_30d = datetime.now(UTC) - timedelta(days=30)

        result = await self._session.execute(
            select(
                func.date(File.created_at).label("date"),
                func.sum(File.size_bytes).label("bytes"),
            )
            .where(
                File.organization_id == organization_id,
                File.deleted_at.is_(None),
                File.created_at >= since_30d,
            )
            .group_by(func.date(File.created_at))
            .order_by(func.date(File.created_at))
        )

        rows = [{"date": str(row.date), "bytes": int(row.bytes or 0)} for row in result]
        cumulative = 0
        for row in rows:
            cumulative += row["bytes"]
            row["bytes"] = cumulative
        return rows

    async def get_status_distribution(self, organization_id: str) -> list[dict]:
        """Return file counts grouped by lifecycle status for the org."""
        result = await self._session.execute(
            select(
                File.status,
                func.count(File.id).label("count"),
            )
            .where(
                File.organization_id == organization_id,
                File.deleted_at.is_(None),
            )
            .group_by(File.status)
            .order_by(func.count(File.id).desc())
        )
        return [{"status": row.status, "count": row.count} for row in result]

    async def get_recent_files(self, organization_id: str, limit: int = 10) -> list[dict]:
        """
        Return the most-recently created files across all projects in the org.

        Joins to `projects` to include the human-readable project name alongside
        each file record.
        """
        result = await self._session.execute(
            select(File, Project.name.label("project_name"))
            .join(Project, File.project_id == Project.id)
            .where(
                File.organization_id == organization_id,
                File.deleted_at.is_(None),
            )
            .order_by(File.created_at.desc())
            .limit(limit)
        )
        return [
            {
                "id": row.File.id,
                "filename": row.File.filename,
                "project_id": row.File.project_id,
                "project_name": row.project_name,
                "status": row.File.status,
                "size_bytes": row.File.size_bytes,
                "created_at": row.File.created_at.isoformat(),
            }
            for row in result.all()
        ]
