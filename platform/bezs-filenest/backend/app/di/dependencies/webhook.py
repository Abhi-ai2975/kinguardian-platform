"""
app.di.dependencies.webhook — FastAPI dependency for WebhookService.

Validates project_id scope on project-scoped tokens before constructing
the service. Raises 403 if the token is locked to a different project.
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import TenantContext, authenticate_request
from app.core.database import get_db
from app.repositories.webhook import WebhookRepository
from app.services.webhook import WebhookService


def get_webhook_service(
    project_id: str,
    session: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(authenticate_request),
) -> WebhookService:
    """Construct a WebhookService, enforcing project-scoped token restrictions."""
    if ctx.project_id is not None and ctx.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PROJECT_MISMATCH",
                "message": "Token is scoped to a different project.",
            },
        )
    return WebhookService(
        session=session,
        repo=WebhookRepository(session),
        ctx=ctx,
        project_id=project_id,
    )
