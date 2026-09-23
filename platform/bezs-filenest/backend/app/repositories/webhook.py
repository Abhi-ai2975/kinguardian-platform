"""
app.repositories.webhook — Database access layer for webhooks and webhook deliveries.

All webhook queries include organization_id + project_id.
Delivery queries are scoped to webhook_id + organization_id.

Usage:
    from app.repositories.webhook import WebhookRepository
"""
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import NotFoundError
from app.models.webhook import Webhook, WebhookDelivery


class WebhookRepository:
    """Async repository for Webhook and WebhookDelivery CRUD. All queries are tenant-scoped."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        organization_id: str,
        project_id: str,
        url: str,
        events: str,
        signing_secret: str,
        is_active: bool = True,
    ) -> Webhook:
        """Insert a new Webhook row and flush to get the DB-assigned id."""
        webhook = Webhook(
            organization_id=organization_id,
            project_id=project_id,
            url=url,
            events=events,
            signing_secret=signing_secret,
            is_active=is_active,
        )
        self._session.add(webhook)
        await self._session.flush()
        return webhook

    async def get(self, webhook_id: str, organization_id: str, project_id: str) -> Webhook:
        """
        Fetch a webhook by ID within the caller's tenant scope.

        Raises:
            NotFoundError: If the webhook does not exist in this project.
        """
        result = await self._session.execute(
            select(Webhook).where(
                Webhook.id == webhook_id,
                Webhook.organization_id == organization_id,
                Webhook.project_id == project_id,
            )
        )
        webhook = result.scalar_one_or_none()
        if webhook is None:
            raise NotFoundError(f"Webhook {webhook_id} not found")
        return webhook

    async def list(self, organization_id: str, project_id: str) -> list[Webhook]:
        """Return all webhooks for a project, newest first."""
        result = await self._session.execute(
            select(Webhook)
            .where(
                Webhook.organization_id == organization_id,
                Webhook.project_id == project_id,
            )
            .order_by(Webhook.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_active_for_project(self, organization_id: str, project_id: str) -> list[Webhook]:
        """Return only active webhooks for use during event delivery."""
        result = await self._session.execute(
            select(Webhook).where(
                Webhook.organization_id == organization_id,
                Webhook.project_id == project_id,
                Webhook.is_active.is_(True),
            )
        )
        return list(result.scalars().all())

    async def delete(self, webhook_id: str, organization_id: str, project_id: str) -> Webhook:
        """
        Hard-delete a webhook row.

        Raises:
            NotFoundError: If the webhook does not exist.
        """
        webhook = await self.get(webhook_id, organization_id, project_id)
        await self._session.delete(webhook)
        return webhook

    async def create_delivery(
        self,
        *,
        webhook_id: str,
        organization_id: str,
        project_id: str,
        event_type: str,
        payload_json: str,
        status: str = "pending",
        attempt_count: int = 1,
        response_status_code: int | None = None,
        response_body: str | None = None,
        next_retry_at: datetime | None = None,
    ) -> WebhookDelivery:
        """Insert a WebhookDelivery row and flush to get its id."""
        delivery = WebhookDelivery(
            webhook_id=webhook_id,
            organization_id=organization_id,
            project_id=project_id,
            event_type=event_type,
            payload_json=payload_json,
            status=status,
            attempt_count=attempt_count,
            response_status_code=response_status_code,
            response_body=response_body,
            next_retry_at=next_retry_at,
        )
        self._session.add(delivery)
        await self._session.flush()
        return delivery

    async def list_deliveries(
        self,
        webhook_id: str,
        organization_id: str,
        *,
        limit: int = 50,
    ) -> list[WebhookDelivery]:
        """Return the most recent delivery attempts for a webhook, newest first."""
        result = await self._session.execute(
            select(WebhookDelivery)
            .where(
                WebhookDelivery.webhook_id == webhook_id,
                WebhookDelivery.organization_id == organization_id,
            )
            .order_by(WebhookDelivery.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
