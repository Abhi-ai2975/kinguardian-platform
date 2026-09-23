"""
app.di.dependencies.dashboard — FastAPI dependency for DashboardService.

Bridges per-request FastAPI dependencies (session + auth context) with
DashboardService construction.

Usage:
    svc: DashboardService = Depends(get_dashboard_service)
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.core.database import get_db
from app.repositories.dashboard import DashboardRepository
from app.services.dashboard import DashboardService


def get_dashboard_service(
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> DashboardService:
    """Construct a DashboardService with a fresh session and resolved auth context."""
    return DashboardService(
        session=session,
        repo=DashboardRepository(session),
        ctx=ctx,
    )
