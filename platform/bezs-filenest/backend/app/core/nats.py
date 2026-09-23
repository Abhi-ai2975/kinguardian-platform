"""
app.core.nats — NATS JetStream client singleton.

Manages a single async NATS connection for the application lifetime. The
JetStream context it exposes is used by:
  - OutboxWorker  — publishes outbox_messages rows to the FILENEST_EVENTS stream
  - ProcessingWorker (Phase 2, Step 4) — pull-consumes file.uploaded events
  - WebhookWorker (Phase 2, Step 7)   — pull-consumes file.* events

Call `connect()` in the FastAPI lifespan before starting any workers.
Call `disconnect()` during shutdown after workers have been cancelled.

Usage:
    from app.core import nats as nats_core

    await nats_core.connect()
    js = nats_core.get_js()
    await js.publish("filenest.org1.proj1.file.uploaded", b"{...}")
    await nats_core.disconnect()
"""
import nats
import nats.js.errors

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Module-level singletons — set by connect(), cleared by disconnect().
_nc: nats.aio.client.Client | None = None
_js: nats.js.client.JetStreamContext | None = None


async def connect() -> None:
    """
    Open the NATS connection and ensure the FILENEST_EVENTS stream exists.

    Configured with unlimited reconnect attempts so transient NATS restarts
    do not crash the application. The OutboxWorker handles unavailability
    gracefully by catching publish errors and retrying next cycle.

    Raises:
        Exception: If the initial connection or stream setup fails.
    """
    global _nc, _js

    _nc = await nats.connect(
        servers=[settings.nats_url],
        name="filenest-backend",
        reconnect_time_wait=2,
        max_reconnect_attempts=-1,  # retry forever on disconnect
        error_cb=_on_error,
        disconnected_cb=_on_disconnect,
        reconnected_cb=_on_reconnect,
    )
    _js = _nc.jetstream()
    await _ensure_stream()

    logger.info("nats.connected", url=settings.nats_url, stream=settings.nats_stream_name)


async def disconnect() -> None:
    """Drain in-flight messages and close the connection gracefully."""
    global _nc, _js
    if _nc is not None and not _nc.is_closed:
        await _nc.close()
    _nc = None
    _js = None
    logger.info("nats.disconnected")


def get_js() -> nats.js.client.JetStreamContext:
    """
    Return the active JetStream context.

    Raises:
        RuntimeError: If called before connect().
    """
    if _js is None:
        raise RuntimeError("NATS JetStream not available — call connect() first")
    return _js


def get_nc() -> nats.aio.client.Client:
    """
    Return the active NATS client.

    Raises:
        RuntimeError: If called before connect().
    """
    if _nc is None:
        raise RuntimeError("NATS not connected — call connect() first")
    return _nc


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _ensure_stream() -> None:
    """
    Create the FILENEST_EVENTS stream if it does not already exist.

    Stream configuration:
    - subjects: filenest.>  (matches all tenant/project event subjects)
    - max_age:  7 days      (messages older than 7 days are discarded)
    - retention: LIMITS     (default — messages kept until max_age is hit)

    Consumer groups (created per-worker, not here):
    - processing-workers  — durable pull consumer for file.uploaded
    - webhook-workers     — durable pull consumer for file.*
    """
    js = _js
    stream_name = settings.nats_stream_name

    try:
        info = await js.stream_info(stream_name)
        logger.info(
            "nats.stream_exists",
            stream=stream_name,
            messages=info.state.messages,
        )
    except nats.js.errors.NotFoundError:
        await js.add_stream(
            name=stream_name,
            subjects=["filenest.>"],
        )
        logger.info("nats.stream_created", stream=stream_name)


async def _on_error(exc: Exception) -> None:
    logger.error("nats.error", error=str(exc))


async def _on_disconnect() -> None:
    logger.warning("nats.disconnected_unexpectedly")


async def _on_reconnect() -> None:
    logger.info("nats.reconnected")
