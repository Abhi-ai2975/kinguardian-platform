"""
app.routers.project_config — HTTP endpoints for per-project configuration.

Four PATCH endpoints — one per config category — allow partial updates so that
updating upload restrictions never overwrites security settings and vice versa.

All routes require the projects:update scope except compliance, which requires
compliance:manage (a privileged scope — admins only).

Routes:
    GET  /v1/projects/{projectId}/config
    PATCH /v1/projects/{projectId}/config/upload
    PATCH /v1/projects/{projectId}/config/security
    PATCH /v1/projects/{projectId}/config/processing
    PATCH /v1/projects/{projectId}/config/compliance
"""
from fastapi import APIRouter, Depends

from app.di.dependencies.project_config import get_project_config_service
from app.schemas.project_config import (
    ProjectConfigResponse,
    UpdateComplianceConfigRequest,
    UpdateProcessingConfigRequest,
    UpdateSecurityConfigRequest,
    UpdateUploadConfigRequest,
)
from app.services.project_config import ProjectConfigService

router = APIRouter(prefix="/projects/{projectId}/config", tags=["project-config"])


@router.get(
    "",
    response_model=ProjectConfigResponse,
    summary="Get project configuration",
)
async def get_project_config(
    projectId: str,
    svc: ProjectConfigService = Depends(get_project_config_service),
) -> ProjectConfigResponse:
    """Return all configuration categories for a project in a single response."""
    return await svc.get_config(projectId)


@router.patch(
    "/upload",
    response_model=ProjectConfigResponse,
    summary="Update upload restrictions",
)
async def update_upload_config(
    projectId: str,
    body: UpdateUploadConfigRequest,
    svc: ProjectConfigService = Depends(get_project_config_service),
) -> ProjectConfigResponse:
    """
    Partially update upload restriction settings.

    Pass an empty list for allowed_mime_types or allowed_extensions to clear
    the restriction (null in DB — all values then accepted).
    """
    return await svc.update_upload_config(projectId, body)


@router.patch(
    "/security",
    response_model=ProjectConfigResponse,
    summary="Update network security settings",
)
async def update_security_config(
    projectId: str,
    body: UpdateSecurityConfigRequest,
    svc: ProjectConfigService = Depends(get_project_config_service),
) -> ProjectConfigResponse:
    """
    Partially update network security settings.

    Pass an empty list for allowed_ips or allowed_origins to remove the
    restriction (null in DB — all IPs / origins then permitted).
    """
    return await svc.update_security_config(projectId, body)


@router.patch(
    "/processing",
    response_model=ProjectConfigResponse,
    summary="Update processing feature flags",
)
async def update_processing_config(
    projectId: str,
    body: UpdateProcessingConfigRequest,
    svc: ProjectConfigService = Depends(get_project_config_service),
) -> ProjectConfigResponse:
    """Partially update processing feature flags (versioning, OCR, virus scan)."""
    return await svc.update_processing_config(projectId, body)


@router.patch(
    "/compliance",
    response_model=ProjectConfigResponse,
    summary="Update compliance settings",
)
async def update_compliance_config(
    projectId: str,
    body: UpdateComplianceConfigRequest,
    svc: ProjectConfigService = Depends(get_project_config_service),
) -> ProjectConfigResponse:
    """
    Partially update compliance settings.

    Note: these values are stored and returned immediately but enforcement
    (WORM, legal hold, retention, data residency) is deferred to Phase 8.
    """
    return await svc.update_compliance_config(projectId, body)
