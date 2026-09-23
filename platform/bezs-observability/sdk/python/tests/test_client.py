"""Integration-style tests for Client using a fake transport.

These tests wire the real Client internals but inject a FakeTransport
so no HTTP calls are made. They verify end-to-end event flow:
capture → buffer → flush → transport.
"""
import pytest

from watcher_sdk.buffer import EventBuffer
from watcher_sdk.client import Client
from watcher_sdk.domain.event import EventInput
from watcher_sdk.ports.transport import Transport
from watcher_sdk.usecases.capture_event import CaptureEventUseCase
from watcher_sdk.usecases.flush_buffer import FlushBufferUseCase


class FakeTransport(Transport):
    def __init__(self) -> None:
        self.sent: list[list[EventInput]] = []

    def send(self, events: list[EventInput]) -> None:
        self.sent.append(list(events))

    @property
    def total(self) -> int:
        return sum(len(b) for b in self.sent)


def _make_client(transport: FakeTransport) -> tuple[Client, FakeTransport]:
    """Build a Client wired to FakeTransport, bypassing HttpTransport."""
    buf = EventBuffer()
    capture_uc = CaptureEventUseCase(buf)
    flush_uc = FlushBufferUseCase(buf, transport)

    client = Client.__new__(Client)
    client._buffer = buf
    client._capture = capture_uc
    client._flush_uc = flush_uc

    # Install a no-op flusher so background thread doesn't interfere.
    class _NoOpFlusher:
        def start(self): pass
        def stop(self): flush_uc.execute()

    client._flusher = _NoOpFlusher()
    return client, transport


def test_Client_Audit_EventFlushedWithCorrectType():
    t = FakeTransport()
    client, _ = _make_client(t)

    client.audit("user.login", user_id="u1")
    client.flush()

    assert t.total == 1
    assert t.sent[0][0].event_type == "audit"
    assert t.sent[0][0].message == "user.login"
    assert t.sent[0][0].user_id == "u1"


def test_Client_Log_EventFlushedWithSeverity():
    t = FakeTransport()
    client, _ = _make_client(t)

    client.log("error", "db connection failed")
    client.flush()

    event = t.sent[0][0]
    assert event.event_type == "log"
    assert event.severity == "error"


def test_Client_Trace_EventHasTraceAndSpanId():
    t = FakeTransport()
    client, _ = _make_client(t)

    client.trace("db.query", trace_id="t1", span_id="s1", parent_span_id="s0")
    client.flush()

    event = t.sent[0][0]
    assert event.event_type == "trace"
    assert event.trace_id == "t1"
    assert event.span_id == "s1"
    assert event.parent_span_id == "s0"


def test_Client_Metric_EventHasPayload():
    t = FakeTransport()
    client, _ = _make_client(t)

    client.metric("api.latency", payload={"value": 42, "unit": "ms"})
    client.flush()

    event = t.sent[0][0]
    assert event.event_type == "metric"
    assert event.payload["value"] == 42


def test_Client_Event_GenericType():
    t = FakeTransport()
    client, _ = _make_client(t)

    client.event("security", "critical", "brute force detected", payload={"ip": "1.2.3.4"})
    client.flush()

    event = t.sent[0][0]
    assert event.event_type == "security"
    assert event.severity == "critical"


def test_Client_Shutdown_FlushesRemaining():
    t = FakeTransport()
    client, _ = _make_client(t)

    client.audit("before.shutdown")
    client.shutdown()

    assert t.total == 1


def test_Client_MissingApiKey_RaisesValueError():
    with pytest.raises(ValueError, match="api_key"):
        Client(api_key="", app_id="test")


def test_Client_MissingAppId_RaisesValueError():
    with pytest.raises(ValueError, match="app_id"):
        Client(api_key="wtch_key", app_id="")
