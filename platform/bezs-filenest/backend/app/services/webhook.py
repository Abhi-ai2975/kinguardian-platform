"""
app.services.webhook — Business logic for webhook management.

Handles CRUD for customer webhook endpoints and delivery history reads.
All signing-secret generation happens here; the secret is returned only
once (on create) and never stored in plaintext beyond this request's
response envelope.

The actual delivery and retry logic lives in WebhookWorker
(app.workers.webhook) which runs as a background NATS pull consumer.

Usage:
    svc = WebhookService(session=session, repo=repo, ctx=ctx, project_id=project_id)
    result = await svc.create(req)
"""
import secrets

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import TenantContext
from app.repositories.webhook import WebhookRepository
from app.schemas.webhook import (
    WebhookCreateRequest,
    WebhookDeliveryListResponse,
    WebhookDeliveryResponse,
    WebhookListResponse,
    WebhookResponse,
    WebhookUpdateRequest,
)


def _events_to_str(events: list[str]) -> str:
    """Convert a list of event type strings to the comma-separated DB format."""
    return ",".join(e.strip() for e in events if e.strip())


def _str_to_events(events_str: str) -> list[str]:
    """Convert the comma-separated DB format back to a list."""
    if not events_str:
        return []
    return [e.strip() for e in events_str.split(",") if e.strip()]


class WebhookService:
    """
    Orchestrates webhook CRUD for a single request.

    Args:
        session:    Active DB session.
        repo:       WebhookRepository for all DB access.
        ctx:        Resolved caller identity.
        project_id: Project UUID from the URL path parameter.
    """

    def __init__(
        self,
        session: AsyncSession,
        repo: WebhookRepository,
        ctx: TenantContext,
        project_id: str,
    ) -> None:
        self._session = session
        self._repo = repo
        self._ctx = ctx
        self._project_id = project_id

    async def create(self, req: WebhookCreateRequest) -> WebhookResponse:
        """
        Create a new webhook endpoint.

        Generates a cryptographically secure 32-byte signing secret. The secret
        is included in the response exactly once; store it safely — it cannot
        be retrieved again.

        Returns:
            WebhookResponse with signing_secret populated.
        """
        secret = secrets.token_hex(32)  # 64-char hex string, 256 bits entropy
        events_str = _events_to_str(req.events)

        webhook = await self._repo.create(
            organization_id=self._ctx.organization_id,
            project_id=self._project_id,
            url=req.url,
            events=events_str,
            signing_secret=secret,
            is_active=req.is_active,
        )
        await self._session.commit()

        response = self._to_response(webhook)
        # Include secret only on creation
        response.signing_secret = secret
        return response

    async def list(self) -> WebhookListResponse:
        """Return all webhooks for the project. signing_secret is never returned on list."""
        webhooks = await self._repo.list(self._ctx.organization_id, self._project_id)
        items = [self._to_response(w) for w in webhooks]
        return WebhookListResponse(items=items, total=len(items))

    async def update(self, webhook_id: str, req: WebhookUpdateRequest) -> WebhookResponse:
        """
        Update url, events, or is_active on an existing webhook.

        Only fields present in the request body are mutated.

        Raises:
            NotFoundError: If webhook_id does not belong to this project.
        """
        webhook = await self._repo.get(webhook_id, self._ctx.organization_id, self._project_id)

        if req.url is not None:
            webhook.url = req.url
        if req.events is not None:
            webhook.events = _events_to_str(req.events)
        if req.is_active is not None:
            webhook.is_active = req.is_active

        await self._session.commit()
        return self._to_response(webhook)

    async def delete(self, webhook_id: str) -> None:
        """
        Permanently delete a webhook endpoint.

        Raises:
            NotFoundError: If webhook_id does not belong to this project.
        """
        await self._repo.delete(webhook_id, self._ctx.organization_id, self._project_id)
        await self._session.commit()

    async def list_deliveries(
        self, webhook_id: str, *, limit: int = 50
    ) -> WebhookDeliveryListResponse:
        """
        Return recent delivery attempts for a webhook, newest first.

        Raises:
            NotFoundError: If webhook_id does not belong to this project.
        """
        # Verify the webhook belongs to this project before listing deliveries
        await self._repo.get(webhook_id, self._ctx.organization_id, self._project_id)
        deliveries = await self._repo.list_deliveries(
            webhook_id, self._ctx.organization_id, limit=limit
        )
        items = [
            WebhookDeliveryResponse(
                id=d.id,
                webhook_id=d.webhook_id,
                event_type=d.event_type,
                status=d.status,
                attempt_count=d.attempt_count,
                response_status_code=d.response_status_code,
                response_body=d.response_body,
                next_retry_at=d.next_retry_at,
                created_at=d.created_at,
            )
            for d in deliveries
        ]
        return WebhookDeliveryListResponse(items=items, total=len(items))

    def _to_response(self, webhook) -> WebhookResponse:
        return WebhookResponse(
            id=webhook.id,
            organization_id=webhook.organization_id,
            project_id=webhook.project_id,
            url=webhook.url,
            events=_str_to_events(webhook.events),
            is_active=webhook.is_active,
            signing_secret=None,  # callers set this explicitly on create
            created_at=webhook.created_at,
            updated_at=webhook.updated_at,
        )
