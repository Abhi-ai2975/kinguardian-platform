"""
app.di.dependencies.project — FastAPI dependency for ProjectService.

Bridges per-request FastAPI dependencies (session + auth context) with service
construction. Repos share the same session so project + storage_config writes
are atomic within a single transaction.
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.core.database import get_db
from app.repositories.project import ProjectRepository
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.services.project import ProjectService


def get_project_service(
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> ProjectService:
    """Construct a ProjectService with a shared session for atomic project + storage_config + project_config writes."""
    return ProjectService(
        session=session,
        repo=ProjectRepository(session),
        storage_repo=StorageConfigRepository(session),
        config_repo=ProjectConfigRepository(session),
        ctx=ctx,
    )
