"""
app.di.dependencies.folder — FastAPI dependency for FolderService.

Enforces the same project-scoped token check and IP allowlist as the file
dependency before constructing the service.
"""
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.auth.ip_allowlist import check_ip_allowlist
from app.core.database import get_db
from app.repositories.file import FileRepository
from app.repositories.folder import FolderRepository
from app.repositories.project_config import ProjectConfigRepository
from app.services.folder import FolderService


async def get_folder_service(
    project_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> FolderService:
    """Construct a FolderService, enforcing project-scoped token and IP allowlist restrictions."""
    if ctx.project_id is not None and ctx.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PROJECT_MISMATCH",
                "message": "Token is scoped to a different project.",
            },
        )
    config_repo = ProjectConfigRepository(session)
    config = await config_repo.get_for_project(project_id, ctx.organization_id)
    check_ip_allowlist(config.allowed_ips, request)
    return FolderService(
        session=session,
        repo=FolderRepository(session),
        file_repo=FileRepository(session),
        ctx=ctx,
        project_id=project_id,
    )
