"""
app.routers.folders — HTTP handlers for folder management and file move.

All routes are project-scoped. project_id comes from the URL path.

Routes registered at /v1 prefix:
    POST   /v1/projects/{project_id}/folders                            create folder
    GET    /v1/projects/{project_id}/folders                            list folders (optional ?name= filter)
    GET    /v1/projects/{project_id}/folders/by-path                    resolve path → folder
    POST   /v1/projects/{project_id}/folders/ensure-path                idempotent path creation
    GET    /v1/projects/{project_id}/folders/{folder_id}                get single folder
    GET    /v1/projects/{project_id}/folders/{folder_id}/files          list files in folder
    DELETE /v1/projects/{project_id}/folders/{folder_id}                soft-delete folder
    POST   /v1/projects/{project_id}/files/{file_id}/move               move file to folder

Route ordering note: /by-path and /ensure-path are registered before /{folder_id} so
FastAPI does not treat those literal strings as folder IDs.
"""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import require_scope
from app.di.dependencies.file import get_file_service
from app.di.dependencies.folder import get_folder_service
from app.schemas.file import FileListResponse, MoveFileRequest, FileResponse
from app.schemas.folder import (
    DeleteFolderResponse,
    EnsurePathRequest,
    FolderCreateRequest,
    FolderListResponse,
    FolderResponse,
)
from app.services.file import FileService
from app.services.folder import FolderService

router = APIRouter(tags=["Folders"])


@router.post(
    "/projects/{project_id}/folders",
    response_model=FolderResponse,
    status_code=201,
)
async def create_folder(
    project_id: str,
    body: FolderCreateRequest,
    svc: FolderService = Depends(get_folder_service),
) -> FolderResponse:
    """Create a new folder (optionally nested). Scope: folders:write."""
    require_scope(svc._ctx, "folders:write")
    return await svc.create_folder(body)


@router.get("/projects/{project_id}/folders", response_model=FolderListResponse)
async def list_folders(
    project_id: str,
    name: str | None = Query(None, description="Filter folders by exact name match."),
    svc: FolderService = Depends(get_folder_service),
) -> FolderListResponse:
    """List all folders in the project, ordered by path. Scope: folders:read."""
    require_scope(svc._ctx, "folders:read")
    return await svc.list_folders(name=name)


@router.get("/projects/{project_id}/folders/by-path", response_model=FolderResponse)
async def get_folder_by_path(
    project_id: str,
    path: str = Query(..., description="Slash-separated path, e.g. 'john_doe/uploads'."),
    svc: FolderService = Depends(get_folder_service),
) -> FolderResponse:
    """Resolve a slash-separated path to the matching folder. Returns 404 if the path does not exist. Scope: folders:read."""
    require_scope(svc._ctx, "folders:read")
    return await svc.get_by_path(path)


@router.post(
    "/projects/{project_id}/folders/ensure-path",
    response_model=FolderResponse,
    status_code=200,
)
async def ensure_folder_path(
    project_id: str,
    body: EnsurePathRequest,
    svc: FolderService = Depends(get_folder_service),
) -> FolderResponse:
    """
    Idempotently create every missing segment of a path and return the leaf folder.

    If the full path already exists, the existing leaf folder is returned (HTTP 200).
    Missing intermediate segments are created automatically.
    Scope: folders:write.
    """
    require_scope(svc._ctx, "folders:write")
    return await svc.ensure_path(body)


@router.get("/projects/{project_id}/folders/{folder_id}", response_model=FolderResponse)
async def get_folder(
    project_id: str,
    folder_id: str,
    svc: FolderService = Depends(get_folder_service),
) -> FolderResponse:
    """Fetch a single folder by ID. Scope: folders:read."""
    require_scope(svc._ctx, "folders:read")
    return await svc.get_folder(folder_id)


@router.get(
    "/projects/{project_id}/folders/{folder_id}/files",
    response_model=FileListResponse,
)
async def list_folder_files(
    project_id: str,
    folder_id: str,
    q: str | None = Query(None, description="Filename substring search (case-insensitive)"),
    tags: list[str] = Query(default=[], description="File must have ALL these tags — repeat: ?tags=a&tags=b"),
    category: str | None = Query(None, description="Exact category match"),
    status: str | None = Query(None, description="Exact status match"),
    date_from: datetime | None = Query(None, description="created_at >= date_from (ISO 8601)"),
    date_to: datetime | None = Query(None, description="created_at <= date_to (ISO 8601)"),
    size_min: int | None = Query(None, ge=0, description="size_bytes >= size_min"),
    size_max: int | None = Query(None, ge=0, description="size_bytes <= size_max"),
    metadata: str | None = Query(None, description='JSONB containment filter as JSON string'),
    limit: int = Query(50, ge=1, le=200, description="Page size"),
    offset: int = Query(0, ge=0, description="Records to skip — for page-table navigation (ignored when cursor is set)"),
    cursor: str | None = Query(None, description="Last file id from previous page — for infinite scroll (takes priority over offset)"),
    svc: FolderService = Depends(get_folder_service),
) -> FileListResponse:
    """Return files inside a specific folder, paginated with optional filters. Scope: folders:read."""
    require_scope(svc._ctx, "folders:read")

    metadata_filter = None
    if metadata:
        try:
            metadata_filter = json.loads(metadata)
            if not isinstance(metadata_filter, dict):
                raise ValueError
        except (ValueError, json.JSONDecodeError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "INVALID_METADATA_FILTER", "message": "metadata must be a valid JSON object string"},
            )

    return await svc.list_folder_files(
        folder_id,
        q=q,
        tags=tags or None,
        category=category,
        status=status,
        date_from=date_from,
        date_to=date_to,
        size_min=size_min,
        size_max=size_max,
        metadata_filter=metadata_filter,
        limit=limit,
        offset=offset,
        cursor=cursor,
    )


@router.delete(
    "/projects/{project_id}/folders/{folder_id}",
    response_model=DeleteFolderResponse,
)
async def delete_folder(
    project_id: str,
    folder_id: str,
    svc: FolderService = Depends(get_folder_service),
) -> DeleteFolderResponse:
    """Soft-delete a folder. Fails with 409 if it contains files or subfolders. Scope: folders:write."""
    require_scope(svc._ctx, "folders:write")
    return await svc.delete_folder(folder_id)


@router.post(
    "/projects/{project_id}/files/{file_id}/move",
    response_model=FileResponse,
)
async def move_file(
    project_id: str,
    file_id: str,
    body: MoveFileRequest,
    svc: FileService = Depends(get_file_service),
) -> FileResponse:
    """Move a file to a different folder, or to the root when folder_id is null. Scope: folders:write."""
    require_scope(svc._ctx, "folders:write")
    return await svc.move_file(file_id, body)
