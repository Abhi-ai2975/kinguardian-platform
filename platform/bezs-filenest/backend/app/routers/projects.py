"""
app.routers.projects — HTTP handlers for project management.

Routes are thin: validate input, call ProjectService, return typed response.

Routes registered at /v1 prefix:
    POST   /v1/projects              create a new project
    GET    /v1/projects              list projects for the caller's organisation
    GET    /v1/projects/{id}         get a single project
    PATCH  /v1/projects/{id}         update mutable project fields
    DELETE /v1/projects/{id}         soft-delete a project
"""
from fastapi import APIRouter, Depends

from app.auth import require_scope
from app.di.dependencies.project import get_project_service
from app.schemas.project import (
    CreateProjectRequest,
    ProjectListParams,
    ProjectListResponse,
    ProjectResponse,
    UpdateProjectRequest,
)
from app.services.project import ProjectService

router = APIRouter(tags=["Projects"])


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: CreateProjectRequest,
    svc: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Create a new project in the caller's organisation. Scope: projects:update."""
    require_scope(svc._ctx, "projects:update")
    return await svc.create_project(body)


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    params: ProjectListParams = Depends(),
    svc: ProjectService = Depends(get_project_service),
) -> ProjectListResponse:
    """
    List projects in the caller's organisation with pagination, filtering, and sorting.

    Query params: page, page_size, sort_by, sort_dir, search, storage_provider, storage_mode.
    Scope: projects:read.
    """
    require_scope(svc._ctx, "projects:read")
    return await svc.list_projects(params)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    svc: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Fetch a single project by ID. Scope: projects:read."""
    require_scope(svc._ctx, "projects:read")
    return await svc.get_project(project_id)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: UpdateProjectRequest,
    svc: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Update mutable project fields (name, description, feature flags). Scope: projects:update."""
    require_scope(svc._ctx, "projects:update")
    return await svc.update_project(project_id, body)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    svc: ProjectService = Depends(get_project_service),
) -> None:
    """Soft-delete a project. Files and storage config are retained. Scope: projects:update."""
    require_scope(svc._ctx, "projects:update")
    await svc.delete_project(project_id)
