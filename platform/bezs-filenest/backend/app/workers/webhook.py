"""
app.workers.webhook — NATS push consumer that delivers events to customer webhook endpoints.

Subscribes to the FILENEST_EVENTS stream on `filenest.*.*.file.*` using a durable
push consumer named "webhook-workers". For every event:

  1. Parses org_id and project_id from the NATS subject.
  2. Loads all active webhooks for that project.
  3. For each webhook whose events list matches (or is empty = all), signs the
     payload with HMAC-SHA256 and POSTs to the customer URL.
  4. Records a WebhookDelivery row after each attempt.
  5. On failure, retries up to 3 times with exponential backoff:
     attempt 1 → 30s delay, attempt 2 → 60s delay, attempt 3 → 120s delay.
     After 3 failures the delivery is marked `failed` and no further retries occur.

HMAC-SHA256 signature format (same as Stripe webhooks):
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{json_body}"
    signature = hmac.new(secret.encode(), signed_payload.encode(), sha256).hexdigest()
    X-FileNest-Signature: t={timestamp},v1={signature}

Usage:
    from app.workers.webhook import WebhookWorker
    worker = WebhookWorker()
    task = worker.start()
    task.cancel(); await task   # graceful shutdown
"""
import asyncio
import hashlib
import hmac
import json
import time

import httpx

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.core.nats import get_js
from app.repositories.webhook import WebhookRepository

logger = get_logger(__name__)

_CONSUMER_DURABLE = "webhook-workers"
# Backoff delays in seconds for attempts 1, 2, 3
_RETRY_DELAYS = [30, 60, 120]
_MAX_ATTEMPTS = 3
_DELIVERY_TIMEOUT = 10.0   # HTTP POST timeout per delivery attempt


def _sign(secret: str, timestamp: int, body: str) -> str:
    """
    Produce a Stripe-style HMAC-SHA256 signature.

    signed_payload = f"{timestamp}.{body}"
    Returns the hex digest.
    """
    signed_payload = f"{timestamp}.{body}"
    return hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()


def _signature_header(secret: str, body: str) -> dict[str, str]:
    """Build the X-FileNest-Signature header value."""
    ts = int(time.time())
    sig = _sign(secret, ts, body)
    return {"X-FileNest-Signature": f"t={ts},v1={sig}"}


def _event_matches(webhook_events_str: str, event_type: str) -> bool:
    """
    Return True if the webhook subscribes to this event.

    Empty events_str means subscribe to all events.
    event_type is the last two segments of the NATS subject:
    e.g. "file.ready", "file.quarantined", "file.uploaded".
    """
    if not webhook_events_str:
        return True
    subscribed = {e.strip() for e in webhook_events_str.split(",") if e.strip()}
    return event_type in subscribed


class WebhookWorker:
    """
    Durable push consumer that delivers NATS events to customer webhook URLs.

    Each NATS message triggers a delivery attempt to all matching active webhooks
    in the project. Failures are retried with exponential backoff up to max attempts.
    """

    def __init__(self) -> None:
        self._http = httpx.AsyncClient(timeout=_DELIVERY_TIMEOUT)

    def start(self) -> asyncio.Task:
        """Spawn the worker as a named asyncio.Task and return it."""
        return asyncio.create_task(self._run(), name="webhook-worker")

    async def _run(self) -> None:
        js = get_js()
        logger.info("webhook_worker.starting", consumer=_CONSUMER_DURABLE)

        async def _on_message(msg) -> None:
            asyncio.create_task(self._handle(msg))

        try:
            sub = await js.subscribe(
                subject="filenest.*.*.file.*",
                durable=_CONSUMER_DURABLE,
                stream=settings.nats_stream_name,
                cb=_on_message,
                manual_ack=True,
            )
        except Exception as exc:
            logger.error("webhook_worker.subscribe_failed", error=str(exc))
            return

        logger.info("webhook_worker.started", consumer=_CONSUMER_DURABLE)

        try:
            while True:
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info("webhook_worker.stopping")
            await sub.unsubscribe()
            await self._http.aclose()

    async def _handle(self, msg) -> None:
        """Dispatch a single NATS message to all matching active webhooks."""
        try:
            # Subject format: filenest.<org_id>.<project_id>.file.<event>
            parts = msg.subject.split(".")
            organization_id = parts[1]
            project_id = parts[2]
            # "file.ready", "file.quarantined", etc.
            event_type = f"{parts[3]}.{parts[4]}"

            payload_str = msg.data.decode()

            logger.info(
                "webhook_worker.received",
                subject=msg.subject,
                event_type=event_type,
                organization_id=organization_id,
                project_id=project_id,
            )

            async with AsyncSessionLocal() as session:
                repo = WebhookRepository(session)
                webhooks = await repo.list_active_for_project(organization_id, project_id)

            matching = [w for w in webhooks if _event_matches(w.events, event_type)]

            if not matching:
                await msg.ack()
                return

            # Deliver to each matching webhook independently
            tasks = [
                asyncio.create_task(
                    self._deliver_with_retry(
                        webhook_id=w.id,
                        url=w.url,
                        signing_secret=w.signing_secret,
                        organization_id=organization_id,
                        project_id=project_id,
                        event_type=event_type,
                        payload_str=payload_str,
                    )
                )
                for w in matching
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
            await msg.ack()

        except Exception as exc:
            logger.error(
                "webhook_worker.handle_error",
                subject=msg.subject,
                error=str(exc),
            )
            try:
                await msg.nak()
            except Exception:
                pass

    async def _deliver_with_retry(
        self,
        *,
        webhook_id: str,
        url: str,
        signing_secret: str,
        organization_id: str,
        project_id: str,
        event_type: str,
        payload_str: str,
    ) -> None:
        """
        Attempt delivery up to _MAX_ATTEMPTS times with exponential backoff.

        Records a WebhookDelivery row after each attempt (success or failure).
        On success, stops retrying. On exhausted retries, records status=failed.
        """
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            headers = _signature_header(signing_secret, payload_str)
            headers["Content-Type"] = "application/json"

            status = "pending"
            response_status_code: int | None = None
            response_body: str | None = None

            try:
                resp = await self._http.post(url, content=payload_str.encode(), headers=headers)
                response_status_code = resp.status_code
                response_body = resp.text[:2000]  # cap storage to avoid bloat

                if 200 <= resp.status_code < 300:
                    status = "success"
                else:
                    status = "failed"
            except Exception as exc:
                status = "failed"
                response_body = str(exc)[:500]

            is_last_attempt = attempt >= _MAX_ATTEMPTS
            next_retry_at = None

            if status == "failed" and not is_last_attempt:
                from datetime import UTC, datetime, timedelta
                delay = _RETRY_DELAYS[attempt - 1]
                next_retry_at = datetime.now(UTC) + timedelta(seconds=delay)

            async with AsyncSessionLocal() as session:
                repo = WebhookRepository(session)
                await repo.create_delivery(
                    webhook_id=webhook_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    event_type=event_type,
                    payload_json=payload_str,
                    status=status,
                    attempt_count=attempt,
                    response_status_code=response_status_code,
                    response_body=response_body,
                    next_retry_at=next_retry_at,
                )
                await session.commit()

            logger.info(
                "webhook_worker.delivery",
                webhook_id=webhook_id,
                url=url,
                event_type=event_type,
                attempt=attempt,
                status=status,
                response_status_code=response_status_code,
                organization_id=organization_id,
                project_id=project_id,
            )

            if status == "success":
                return

            if not is_last_attempt:
                await asyncio.sleep(_RETRY_DELAYS[attempt - 1])

        logger.warning(
            "webhook_worker.delivery_exhausted",
            webhook_id=webhook_id,
            event_type=event_type,
            organization_id=organization_id,
            project_id=project_id,
        )
