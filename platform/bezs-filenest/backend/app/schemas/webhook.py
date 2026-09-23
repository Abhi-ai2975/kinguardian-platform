"""app.schemas.webhook — Pydantic request/response models for webhooks and deliveries."""
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class WebhookCreateRequest(BaseModel):
    """Body for creating a new webhook endpoint."""
    url: str = Field(..., description="HTTPS URL that will receive signed event payloads")
    events: list[str] = Field(
        default_factory=list,
        description="Event types to subscribe to (empty = all events). "
                    "Example: ['file.ready', 'file.quarantined']",
    )
    is_active: bool = True


class WebhookUpdateRequest(BaseModel):
    """Body for updating an existing webhook. All fields are optional."""
    url: str | None = None
    events: list[str] | None = None
    is_active: bool | None = None


class WebhookResponse(BaseModel):
    """Webhook endpoint metadata. signing_secret is only included on creation."""
    id: str
    organization_id: str
    project_id: str
    url: str
    events: list[str]
    is_active: bool
    signing_secret: str | None = None  # shown once, on creation only
    created_at: datetime
    updated_at: datetime


class WebhookListResponse(BaseModel):
    """List of webhooks for a project."""
    items: list[WebhookResponse]
    total: int


class WebhookDeliveryResponse(BaseModel):
    """Single delivery attempt record."""
    id: str
    webhook_id: str
    event_type: str
    status: str
    attempt_count: int
    response_status_code: int | None
    response_body: str | None
    next_retry_at: datetime | None
    created_at: datetime


class WebhookDeliveryListResponse(BaseModel):
    """List of delivery attempts for a webhook."""
    items: list[WebhookDeliveryResponse]
    total: int
