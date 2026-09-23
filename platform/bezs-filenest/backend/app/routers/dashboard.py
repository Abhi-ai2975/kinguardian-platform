"""
app.routers.dashboard — HTTP handler for the organisation dashboard.

Routes registered at /v1 prefix:
    GET /v1/dashboard   — returns aggregated stats for the caller's active org

The organisation ID comes from the auth token's activeOrganizationId claim —
no org ID is passed in the URL.
"""
from fastapi import APIRouter, Depends

from app.auth import require_scope
from app.di.dependencies.dashboard import get_dashboard_service
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import DashboardService

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    svc: DashboardService = Depends(get_dashboard_service),
) -> DashboardResponse:
    """
    Return aggregated dashboard data for the caller's active organisation.

    Scope: projects:read
    Response: stats + 30-day time-series + status distribution + recent files
    """
    require_scope(svc._ctx, "projects:read")
    return await svc.get_dashboard()
