"""
app.di.dependencies.upload_token — FastAPI dependency for UploadTokenService.

Enforces project-scoped token matching before constructing the service.

Usage:
    from app.di.dependencies.upload_token import get_upload_token_service
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.core.database import get_db
from app.repositories.folder import FolderRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.upload_token import UploadTokenRepository
from app.services.upload_token import UploadTokenService


async def get_upload_token_service(
    project_id: str,
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> UploadTokenService:
    """Construct an UploadTokenService, enforcing project-scoped token restrictions."""
    if ctx.project_id is not None and ctx.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PROJECT_MISMATCH",
                "message": "Token is scoped to a different project.",
            },
        )
    return UploadTokenService(
        session=session,
        repo=UploadTokenRepository(session),
        ctx=ctx,
        folder_repo=FolderRepository(session),
        config_repo=ProjectConfigRepository(session),
    )
