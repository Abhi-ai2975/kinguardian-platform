"""
app.routers.webhooks — HTTP handlers for webhook management.

Routes registered at /v1 prefix:
    POST   /v1/projects/{project_id}/webhooks                              create webhook
    GET    /v1/projects/{project_id}/webhooks                              list webhooks
    PUT    /v1/projects/{project_id}/webhooks/{webhook_id}                 update webhook
    DELETE /v1/projects/{project_id}/webhooks/{webhook_id}                 delete webhook
    GET    /v1/projects/{project_id}/webhooks/{webhook_id}/deliveries      list deliveries
"""
from fastapi import APIRouter, Depends, Query

from app.auth import require_scope
from app.di.dependencies.webhook import get_webhook_service
from app.schemas.webhook import (
    WebhookCreateRequest,
    WebhookDeliveryListResponse,
    WebhookListResponse,
    WebhookResponse,
    WebhookUpdateRequest,
)
from app.services.webhook import WebhookService

router = APIRouter(tags=["Webhooks"])


@router.post(
    "/projects/{project_id}/webhooks",
    response_model=WebhookResponse,
    status_code=201,
)
async def create_webhook(
    project_id: str,
    body: WebhookCreateRequest,
    svc: WebhookService = Depends(get_webhook_service),
) -> WebhookResponse:
    """Create a webhook endpoint. Returns signing_secret once — store it safely. Scope: webhooks:write."""
    require_scope(svc._ctx, "webhooks:write")
    return await svc.create(body)


@router.get(
    "/projects/{project_id}/webhooks",
    response_model=WebhookListResponse,
)
async def list_webhooks(
    project_id: str,
    svc: WebhookService = Depends(get_webhook_service),
) -> WebhookListResponse:
    """List all webhook endpoints for the project. Scope: webhooks:read."""
    require_scope(svc._ctx, "webhooks:read")
    return await svc.list()


@router.put(
    "/projects/{project_id}/webhooks/{webhook_id}",
    response_model=WebhookResponse,
)
async def update_webhook(
    project_id: str,
    webhook_id: str,
    body: WebhookUpdateRequest,
    svc: WebhookService = Depends(get_webhook_service),
) -> WebhookResponse:
    """Update url, events, or is_active on a webhook. Scope: webhooks:write."""
    require_scope(svc._ctx, "webhooks:write")
    return await svc.update(webhook_id, body)


@router.delete(
    "/projects/{project_id}/webhooks/{webhook_id}",
    status_code=204,
)
async def delete_webhook(
    project_id: str,
    webhook_id: str,
    svc: WebhookService = Depends(get_webhook_service),
) -> None:
    """Permanently delete a webhook endpoint. Scope: webhooks:write."""
    require_scope(svc._ctx, "webhooks:write")
    await svc.delete(webhook_id)


@router.get(
    "/projects/{project_id}/webhooks/{webhook_id}/deliveries",
    response_model=WebhookDeliveryListResponse,
)
async def list_deliveries(
    project_id: str,
    webhook_id: str,
    limit: int = Query(50, ge=1, le=200, description="Maximum number of delivery records to return"),
    svc: WebhookService = Depends(get_webhook_service),
) -> WebhookDeliveryListResponse:
    """List recent delivery attempts for a webhook, newest first. Scope: webhooks:read."""
    require_scope(svc._ctx, "webhooks:read")
    return await svc.list_deliveries(webhook_id, limit=limit)
