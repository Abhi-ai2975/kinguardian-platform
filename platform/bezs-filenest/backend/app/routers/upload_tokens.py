"""
app.routers.upload_tokens — HTTP handlers for upload token management.

Routes registered at /v1 prefix:
    POST /v1/projects/{project_id}/upload-tokens     create a short-lived upload token

Upload tokens let browser clients call the file upload endpoints without
holding the project's full API key. The browser-facing @filenest/react
SDK fetches a token from the host app's /api/filenest-token route handler
(which calls this endpoint server-to-server), caches it, and uses it as
a Bearer token for all upload requests.
"""
from fastapi import APIRouter, Depends

from app.auth import require_scope
from app.di.dependencies.upload_token import get_upload_token_service
from app.schemas.upload_token import CreateUploadTokenRequest, UploadTokenResponse
from app.services.upload_token import UploadTokenService

router = APIRouter(tags=["Upload Tokens"])


@router.post(
    "/projects/{project_id}/upload-tokens",
    response_model=UploadTokenResponse,
    status_code=201,
)
async def create_upload_token(
    project_id: str,
    body: CreateUploadTokenRequest,
    svc: UploadTokenService = Depends(get_upload_token_service),
) -> UploadTokenResponse:
    """
    Issue a short-lived upload token for browser clients. Scope: upload_tokens:create.

    The token is returned to the browser via the host app's token endpoint
    (e.g. /api/filenest-token) and used as a Bearer token for file upload
    requests. It encodes constraints that the backend enforces at upload time.

    Args:
        project_id: Project to issue the token for.
        body:       Constraints (max_size, allowed_mime_types, max_files) and TTL.

    Returns:
        UploadTokenResponse with the token string, expiry, and constraints.
    """
    require_scope(svc._ctx, ["upload_tokens:create", "files:upload", "files:read"])
    return await svc.create(project_id, body)
