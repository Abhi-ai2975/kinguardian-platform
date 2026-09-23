"""
app.routers.usage — HTTP handler for the org usage endpoint.

Routes registered at /v1 prefix:
    GET /v1/usage   — returns org-level stats and per-project breakdown

The organisation ID comes from the auth token's activeOrganizationId claim —
no org ID is passed in the URL.
"""
from fastapi import APIRouter, Depends

from app.auth import require_scope
from app.di.dependencies.usage import get_usage_service
from app.schemas.usage import UsageResponse
from app.services.usage import UsageService

router = APIRouter(tags=["Usage"])


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    svc: UsageService = Depends(get_usage_service),
) -> UsageResponse:
    """
    Return org-level usage stats and per-project storage breakdown.

    Scope: projects:read
    Response: headline counters + list of projects with storage_bytes and file_count
    """
    require_scope(svc._ctx, "projects:read")
    return await svc.get_usage()
