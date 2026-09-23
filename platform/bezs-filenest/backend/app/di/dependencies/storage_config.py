"""
app.di.dependencies.storage_config — FastAPI dependency for StorageConfigService.

Constructs the service with a request-scoped session and authenticated tenant
context. Called by storage router endpoints.
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.core.database import get_db
from app.repositories.storage_config import StorageConfigRepository
from app.services.storage_config import StorageConfigService


def get_storage_config_service(
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> StorageConfigService:
    """Construct a StorageConfigService with injected repo and auth context."""
    return StorageConfigService(
        session=session,
        repo=StorageConfigRepository(session),
        ctx=ctx,
    )
