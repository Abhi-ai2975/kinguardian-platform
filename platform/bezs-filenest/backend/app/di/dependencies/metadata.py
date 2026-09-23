"""
app.di.dependencies.metadata — FastAPI dependency for MetadataService.

Enforces project-scoped token and IP allowlist restrictions before
constructing the service, matching the pattern used by get_file_service.
"""
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.auth.ip_allowlist import check_ip_allowlist
from app.core.database import get_db
from app.repositories.file import FileRepository
from app.repositories.metadata_schema import MetadataSchemaRepository
from app.repositories.project_config import ProjectConfigRepository
from app.services.metadata import MetadataService


async def get_metadata_service(
    project_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> MetadataService:
    """Construct a MetadataService, enforcing project-scoped token and IP allowlist."""
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
    return MetadataService(
        session=session,
        file_repo=FileRepository(session),
        schema_repo=MetadataSchemaRepository(session),
        config_repo=config_repo,
        ctx=ctx,
        project_id=project_id,
    )
