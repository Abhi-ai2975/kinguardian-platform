"""
app.services.usage — Business logic for the usage endpoint.

Runs stats and project-breakdown queries in parallel via asyncio.gather()
and assembles a UsageResponse. No storage calls, no outbox writes.

Usage:
    svc = UsageService(session=session, repo=repo, ctx=ctx)
    data = await svc.get_usage()
"""
import asyncio

import structlog

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.repositories.usage import UsageRepository
from app.schemas.usage import ProjectUsageItem, UsageResponse, UsageStats

logger = structlog.get_logger()


class UsageService:
    """Assembles the full usage payload from parallel DB aggregation queries."""

    def __init__(
        self,
        session: AsyncSession,
        repo: UsageRepository,
        ctx: TenantContext,
    ) -> None:
        self._session = session
        self._repo = repo
        self._ctx = ctx

    async def get_usage(self) -> UsageResponse:
        """
        Fetch org-level stats and per-project breakdown for the caller's org.

        Runs both queries in parallel then assembles a single response object.
        """
        org_id = self._ctx.organization_id

        stats_raw, projects_raw = await asyncio.gather(
            self._repo.get_stats(org_id),
            self._repo.get_project_breakdown(org_id),
        )

        logger.info(
            "usage.fetched",
            organization_id=org_id,
            total_files=stats_raw["total_files"],
            project_count=len(projects_raw),
        )

        return UsageResponse(
            stats=UsageStats(**stats_raw),
            projects=[ProjectUsageItem(**p) for p in projects_raw],
        )
