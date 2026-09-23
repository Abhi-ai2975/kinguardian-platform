"""
app.services.dashboard — Business logic for the organisation dashboard.

Runs all four DashboardRepository query groups in parallel via asyncio.gather()
and assembles the DashboardResponse. No storage calls, no outbox writes.

Usage:
    svc = DashboardService(session=session, repo=repo, ctx=ctx)
    data = await svc.get_dashboard()
"""
import asyncio

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.repositories.dashboard import DashboardRepository
from app.schemas.dashboard import (
    DashboardResponse,
    DashboardStats,
    RecentFile,
    StatusCount,
    StorageByDay,
    UploadsByDay,
)

logger = structlog.get_logger()


class DashboardService:
    """Assembles the full dashboard payload from parallel DB aggregation queries."""

    def __init__(
        self,
        session: AsyncSession,
        repo: DashboardRepository,
        ctx: TenantContext,
    ) -> None:
        self._session = session
        self._repo = repo
        self._ctx = ctx

    async def get_dashboard(self) -> DashboardResponse:
        """
        Fetch all dashboard data for the caller's active organisation.

        Runs stats, uploads_by_day, storage_by_day, status_distribution, and
        recent_files queries in parallel then assembles a single response object.
        """
        org_id = self._ctx.organization_id

        stats_raw, uploads_raw, storage_raw, status_raw, recent_raw = await asyncio.gather(
            self._repo.get_stats(org_id),
            self._repo.get_uploads_by_day(org_id),
            self._repo.get_storage_by_day(org_id),
            self._repo.get_status_distribution(org_id),
            self._repo.get_recent_files(org_id),
        )

        logger.info(
            "dashboard.fetched",
            organization_id=org_id,
            total_files=stats_raw["total_files"],
        )

        return DashboardResponse(
            stats=DashboardStats(**stats_raw),
            uploads_by_day=[UploadsByDay(**r) for r in uploads_raw],
            storage_by_day=[StorageByDay(**r) for r in storage_raw],
            status_distribution=[StatusCount(**r) for r in status_raw],
            recent_files=[RecentFile(**r) for r in recent_raw],
        )
