"""
app.di.dependencies.file — FastAPI dependency for FileService.

Validates project_id scope on project-scoped tokens and enforces the project's
IP allowlist before constructing the service. Raises 403 on either violation.
"""
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.auth.ip_allowlist import check_ip_allowlist
from app.core.database import get_db
from app.core.messaging import TransactionalOutboxPublisher
from app.repositories.file import FileRepository
from app.repositories.file_version import FileVersionRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.services.file import FileService


async def get_file_service(
    project_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> FileService:
    """Construct a FileService, enforcing project-scoped token and IP allowlist restrictions."""
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
    return FileService(
        session=session,
        repo=FileRepository(session),
        version_repo=FileVersionRepository(session),
        config_repo=config_repo,
        storage_config_repo=StorageConfigRepository(session),
        outbox=TransactionalOutboxPublisher(session),
        ctx=ctx,
        project_id=project_id,
    )
