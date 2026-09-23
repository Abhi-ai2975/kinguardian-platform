"""
app.di.dependencies.usage — FastAPI dependency for UsageService.

Bridges per-request FastAPI dependencies (session + auth context) with
UsageService construction.

Usage:
    svc: UsageService = Depends(get_usage_service)
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.core.database import get_db
from app.repositories.usage import UsageRepository
from app.services.usage import UsageService


def get_usage_service(
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> UsageService:
    """Construct a UsageService with a fresh session and resolved auth context."""
    return UsageService(
        session=session,
        repo=UsageRepository(session),
        ctx=ctx,
    )
