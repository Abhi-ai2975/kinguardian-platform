"""
app.di.dependencies.project_config — FastAPI dependency for ProjectConfigService.

Constructs a ProjectConfigService per request with a shared AsyncSession so that
any future cross-service writes (e.g. syncing processing flags back to Project)
remain atomic within a single transaction.
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.core.database import get_db
from app.repositories.project_config import ProjectConfigRepository
from app.repositories.storage_config import StorageConfigRepository
from app.services.project_config import ProjectConfigService


def get_project_config_service(
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> ProjectConfigService:
    """Construct a ProjectConfigService for the current request."""
    return ProjectConfigService(
        session=session,
        repo=ProjectConfigRepository(session),
        storage_config_repo=StorageConfigRepository(session),
        ctx=ctx,
    )
