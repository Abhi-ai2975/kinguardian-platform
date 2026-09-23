"""
filenest.namespaces.webhooks — Webhook management and signature verification.

Usage:
    from filenest import FileNest

    fn = FileNest(api_key="fn_live_...", project_id="proj_...")

    # Create a webhook
    wh = fn.webhooks.create(
        name="prod-receiver",
        url="https://app.example.com/webhooks/filenest",
        events=["file.uploaded", "file.processed"],
    )
    # Store wh["signing_secret"] — shown only once.

    # Verify an incoming webhook payload
    is_valid = fn.webhooks.verify(raw_body, signature_header, signing_secret)

    # Standalone helper (no client needed)
    from filenest.namespaces.webhooks import verify_webhook_signature
    is_valid = verify_webhook_signature(raw_body, signature, secret)
"""

from __future__ import annotations

import hashlib
import hmac
from typing import Any


# ── Standalone helper ────────────────────────────────────────────────────────

def verify_webhook_signature(body: bytes, signature: str, secret: str) -> bool:
    """
    Verify an incoming webhook payload using HMAC-SHA256.

    Args:
        body:      Raw request body bytes (before JSON parsing).
        signature: Value of the ``x-filenest-signature`` header.
        secret:    Webhook signing secret from the console.

    Returns:
        True if the signature is valid; False otherwise.
    """
    sig = signature.removeprefix("sha256=")
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


# ── Sync namespace ───────────────────────────────────────────────────────────

class WebhooksNamespace:
    """Synchronous webhook operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    def create(
        self,
        *,
        name: str,
        url: str,
        events: list[str],
        is_active: bool = True,
    ) -> dict:
        """
        Create a webhook endpoint.

        The response includes ``signing_secret`` — store it safely, it is shown only once.

        Args:
            name:      Display name for the endpoint.
            url:       HTTPS URL that will receive POST payloads.
            events:    List of event types to subscribe to, e.g. ``["file.uploaded"]``.
            is_active: Whether the webhook is active immediately. Default: True.

        Returns:
            Webhook record dict including ``signing_secret``.
        """
        return self._http.post(
            f"/v1/projects/{self._project_id}/webhooks",
            json={"name": name, "url": url, "events": events, "is_active": is_active},
        )

    def list(self) -> dict:
        """
        List all webhook endpoints for the project.

        Returns:
            Dict with ``items`` list of webhook records.
        """
        return self._http.get(f"/v1/projects/{self._project_id}/webhooks")

    def get(self, webhook_id: str) -> dict:
        """
        Fetch a single webhook by ID.

        Args:
            webhook_id: Webhook ID.

        Returns:
            Webhook record dict.
        """
        return self._http.get(f"/v1/projects/{self._project_id}/webhooks/{webhook_id}")

    def update(
        self,
        webhook_id: str,
        *,
        name: str | None = None,
        url: str | None = None,
        events: list[str] | None = None,
        is_active: bool | None = None,
    ) -> dict:
        """
        Update a webhook endpoint.

        All fields are optional — only supplied fields are changed.

        Args:
            webhook_id: Webhook to update.
            name:       New display name.
            url:        New delivery URL.
            events:     New event subscription list (replaces the existing list).
            is_active:  Enable or disable the webhook.

        Returns:
            Updated webhook record dict.
        """
        body = {k: v for k, v in {
            "name": name,
            "url": url,
            "events": events,
            "is_active": is_active,
        }.items() if v is not None}
        return self._http.put(
            f"/v1/projects/{self._project_id}/webhooks/{webhook_id}",
            json=body,
        )

    def delete(self, webhook_id: str) -> None:
        """
        Permanently delete a webhook endpoint.

        Args:
            webhook_id: Webhook to delete.
        """
        self._http.delete(f"/v1/projects/{self._project_id}/webhooks/{webhook_id}")

    def list_deliveries(self, webhook_id: str, *, limit: int = 50) -> dict:
        """
        List recent delivery attempts for a webhook, newest first.

        Args:
            webhook_id: Webhook ID.
            limit:      Maximum records to return (1–200). Default: 50.

        Returns:
            Dict with ``items`` list of delivery records.
        """
        return self._http.get(
            f"/v1/projects/{self._project_id}/webhooks/{webhook_id}/deliveries",
            params={"limit": limit},
        )

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        """
        Verify an incoming webhook payload using HMAC-SHA256.

        Args:
            body:      Raw request body bytes (before JSON parsing).
            signature: Value of the ``x-filenest-signature`` header.
            secret:    Signing secret from the webhook record.

        Returns:
            True if the signature is valid; False otherwise.
        """
        return verify_webhook_signature(body, signature, secret)


# ── Async namespace ──────────────────────────────────────────────────────────

class AsyncWebhooksNamespace:
    """Asynchronous webhook operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    async def create(
        self,
        *,
        name: str,
        url: str,
        events: list[str],
        is_active: bool = True,
    ) -> dict:
        """Create a webhook endpoint (async). See WebhooksNamespace.create for full docs."""
        return await self._http.post(
            f"/v1/projects/{self._project_id}/webhooks",
            json={"name": name, "url": url, "events": events, "is_active": is_active},
        )

    async def list(self) -> dict:
        """List all webhook endpoints (async)."""
        return await self._http.get(f"/v1/projects/{self._project_id}/webhooks")

    async def get(self, webhook_id: str) -> dict:
        """Fetch a single webhook by ID (async)."""
        return await self._http.get(f"/v1/projects/{self._project_id}/webhooks/{webhook_id}")

    async def update(
        self,
        webhook_id: str,
        *,
        name: str | None = None,
        url: str | None = None,
        events: list[str] | None = None,
        is_active: bool | None = None,
    ) -> dict:
        """Update a webhook endpoint (async). See WebhooksNamespace.update for full docs."""
        body = {k: v for k, v in {
            "name": name,
            "url": url,
            "events": events,
            "is_active": is_active,
        }.items() if v is not None}
        return await self._http.put(
            f"/v1/projects/{self._project_id}/webhooks/{webhook_id}",
            json=body,
        )

    async def delete(self, webhook_id: str) -> None:
        """Permanently delete a webhook endpoint (async)."""
        await self._http.delete(f"/v1/projects/{self._project_id}/webhooks/{webhook_id}")

    async def list_deliveries(self, webhook_id: str, *, limit: int = 50) -> dict:
        """List recent delivery attempts (async). See WebhooksNamespace.list_deliveries for full docs."""
        return await self._http.get(
            f"/v1/projects/{self._project_id}/webhooks/{webhook_id}/deliveries",
            params={"limit": limit},
        )

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        """Verify an incoming webhook payload using HMAC-SHA256 (sync — no I/O needed)."""
        return verify_webhook_signature(body, signature, secret)
