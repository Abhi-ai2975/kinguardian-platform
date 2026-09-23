"""
app.routers.metadata — HTTP handlers for metadata schemas and file metadata.

Routes registered at /v1 prefix:
    POST  /v1/projects/{project_id}/metadata-schemas               define a new schema version
    GET   /v1/projects/{project_id}/metadata-schemas               list all schema versions
    PUT   /v1/projects/{project_id}/files/{file_id}/metadata       replace entire metadata
    PATCH /v1/projects/{project_id}/files/{file_id}/metadata       merge/update specific keys
"""
from fastapi import APIRouter, Depends

from app.auth import require_scope
from app.di.dependencies.metadata import get_metadata_service
from app.schemas.metadata import (
    MetadataMergeRequest,
    MetadataResponse,
    MetadataSchemaCreateRequest,
    MetadataSchemaListResponse,
    MetadataSchemaResponse,
    MetadataUpdateRequest,
)
from app.services.metadata import MetadataService

router = APIRouter(tags=["Metadata"])


@router.post(
    "/projects/{project_id}/metadata-schemas",
    response_model=MetadataSchemaResponse,
    status_code=201,
)
async def create_schema(
    project_id: str,
    body: MetadataSchemaCreateRequest,
    svc: MetadataService = Depends(get_metadata_service),
) -> MetadataSchemaResponse:
    """
    Define a new metadata schema for the project.

    Deactivates all previous schema versions. The new schema is validated
    against file metadata on every write when enforce_schema = True in
    project settings. Scope: projects:update.
    """
    require_scope(svc._ctx, "projects:update")
    return await svc.create_schema(body)


@router.get(
    "/projects/{project_id}/metadata-schemas",
    response_model=MetadataSchemaListResponse,
)
async def list_schemas(
    project_id: str,
    svc: MetadataService = Depends(get_metadata_service),
) -> MetadataSchemaListResponse:
    """List all metadata schema versions for the project, newest first. Scope: projects:read."""
    require_scope(svc._ctx, "projects:read")
    return await svc.list_schemas()


@router.put(
    "/projects/{project_id}/files/{file_id}/metadata",
    response_model=MetadataResponse,
)
async def update_metadata(
    project_id: str,
    file_id: str,
    body: MetadataUpdateRequest,
    svc: MetadataService = Depends(get_metadata_service),
) -> MetadataResponse:
    """
    Replace the entire metadata object on a file.

    Overwrites all existing keys. Validated against the active schema when
    enforce_schema = True. Scope: files:update_metadata.
    """
    require_scope(svc._ctx, "files:update_metadata")
    return await svc.update_metadata(file_id, body)


@router.patch(
    "/projects/{project_id}/files/{file_id}/metadata",
    response_model=MetadataResponse,
)
async def merge_metadata(
    project_id: str,
    file_id: str,
    body: MetadataMergeRequest,
    svc: MetadataService = Depends(get_metadata_service),
) -> MetadataResponse:
    """
    Merge specific keys into a file's existing metadata.

    Only the provided keys are updated; all other existing keys are preserved.
    The merged result is validated against the active schema when enforce_schema = True.
    Scope: files:update_metadata.
    """
    require_scope(svc._ctx, "files:update_metadata")
    return await svc.merge_metadata(file_id, body)
