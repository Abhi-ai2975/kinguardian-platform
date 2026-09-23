# Public façade — the only class application developers import.
# EVENT_TYPE_AI is exported for callers that prefer the constant over the literal string.
# Wires all layers together and exposes a simple, typed API.
# All methods are thread-safe: application threads only touch the buffer
# through CaptureEventUseCase which holds a lock internally.
from typing import Any

from watcher_sdk.adapters.http_transport import HttpTransport
from watcher_sdk.buffer import EventBuffer
from watcher_sdk.domain.event import EventInput
from watcher_sdk.flusher import BackgroundFlusher
from watcher_sdk.usecases.capture_event import CaptureEventUseCase
from watcher_sdk.usecases.flush_buffer import FlushBufferUseCase


EVENT_TYPE_AI = "ai"


class Client:
    """
    Thread-safe client for sending telemetry to the Watcher24 gateway.

    Create one instance per application process and reuse it for the lifetime
    of the process. Call shutdown() before the process exits.
    """

    def __init__(
        self,
        *,
        api_key: str,
        app_id: str = "",
        service_name: str = "",
        environment: str = "production",
        gateway_url: str | None = None,  # None = use production default (https://ingest.watcher24.io)
        flush_interval: float = 0.5,
        flush_at: int = 100,
        max_buffer: int = 10_000,
    ) -> None:
        """
        app_id is optional — app-scoped keys and all public tokens (wpub_) don't
        need it; the gateway resolves the application from the key itself.
        Only pass app_id if you are using a legacy org-level key with no app linked.

        service_name is an optional developer-set label for the sending component
        (e.g. "payment-api", "auth-worker", "ai-agent"). Stored in ClickHouse
        for filtering. Can be any string — not validated.
        """
        if not api_key:
            raise ValueError("api_key is required")

        self._buffer = EventBuffer(max_size=max_buffer)
        transport = HttpTransport(
            gateway_url=gateway_url,
            api_key=api_key,
            app_id=app_id,
            service_name=service_name,
            environment=environment,
        )
        self._capture = CaptureEventUseCase(self._buffer)
        flush_uc = FlushBufferUseCase(self._buffer, transport)
        self._flusher = BackgroundFlusher(
            flush_use_case=flush_uc,
            flush_interval=flush_interval,
            flush_at=flush_at,
            buffer=self._buffer,
        )
        self._flush_uc = flush_uc
        self._flusher.start()

    # ------------------------------------------------------------------
    # Typed helpers
    # ------------------------------------------------------------------

    def audit(
        self,
        message: str,
        *,
        user_id: str = "",
        session_id: str = "",
        trace_id: str = "",
        span_id: str = "",
        payload: dict[str, Any] | None = None,
    ) -> None:
        """Capture an audit event — user actions, compliance trail, security events."""
        self._capture.execute(EventInput(
            event_type="audit",
            severity="info",
            message=message,
            user_id=user_id,
            session_id=session_id,
            trace_id=trace_id,
            span_id=span_id,
            payload=payload or {},
        ))

    def log(
        self,
        severity: str,
        message: str,
        *,
        trace_id: str = "",
        span_id: str = "",
        payload: dict[str, Any] | None = None,
    ) -> None:
        """Capture an application log event."""
        self._capture.execute(EventInput(
            event_type="log",
            severity=severity,
            message=message,
            trace_id=trace_id,
            span_id=span_id,
            payload=payload or {},
        ))

    def trace(
        self,
        message: str,
        *,
        trace_id: str = "",
        span_id: str = "",
        parent_span_id: str = "",
        payload: dict[str, Any] | None = None,
    ) -> None:
        """Capture a distributed trace span."""
        self._capture.execute(EventInput(
            event_type="trace",
            severity="info",
            message=message,
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            payload=payload or {},
        ))

    def metric(
        self,
        message: str,
        *,
        payload: dict[str, Any] | None = None,
    ) -> None:
        """Capture a metric data point. Put the numeric value in payload."""
        self._capture.execute(EventInput(
            event_type="metric",
            severity="info",
            message=message,
            payload=payload or {},
        ))

    def ai(
        self,
        severity: str,
        message: str,
        *,
        trace_id: str = "",
        span_id: str = "",
        parent_span_id: str = "",
        payload: dict[str, Any] | None = None,
    ) -> None:
        """Capture an AI agent event — LLM calls, tool calls, workflow steps, evals.

        Always include a structured payload with a 'kind' field so the console
        can display AI-specific columns (model, tokens, cost, latency).
        """
        self._capture.execute(EventInput(
            event_type="ai",
            severity=severity,
            message=message,
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            payload=payload or {},
        ))

    def event(
        self,
        event_type: str,
        severity: str,
        message: str,
        *,
        user_id: str = "",
        session_id: str = "",
        trace_id: str = "",
        span_id: str = "",
        parent_span_id: str = "",
        payload: dict[str, Any] | None = None,
    ) -> None:
        """Generic capture — use when the typed helpers don't fit."""
        self._capture.execute(EventInput(
            event_type=event_type,
            severity=severity,
            message=message,
            user_id=user_id,
            session_id=session_id,
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            payload=payload or {},
        ))

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def flush(self) -> None:
        """Immediately send all buffered events. Blocks until complete."""
        self._flush_uc.execute()

    def shutdown(self) -> None:
        """Flush remaining events and stop the background flusher thread."""
        self._flusher.stop()
