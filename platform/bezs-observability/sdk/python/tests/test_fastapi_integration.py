"""Tests for FastAPI auto-instrumentation middleware."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from watcher_sdk.buffer import EventBuffer
from watcher_sdk.client import Client
from watcher_sdk.domain.event import EventInput
from watcher_sdk.integrations.fastapi import instrument
from watcher_sdk.ports.transport import Transport
from watcher_sdk.usecases.capture_event import CaptureEventUseCase
from watcher_sdk.usecases.flush_buffer import FlushBufferUseCase


class FakeTransport(Transport):
    def __init__(self) -> None:
        self.sent: list[EventInput] = []

    def send(self, events: list[EventInput]) -> None:
        self.sent.extend(events)


def _make_app(route: str = "/ping") -> tuple[FastAPI, FakeTransport, FlushBufferUseCase]:
    """Build a FastAPI app instrumented with a fake transport."""
    buf = EventBuffer()
    t = FakeTransport()
    capture_uc = CaptureEventUseCase(buf)
    flush_uc = FlushBufferUseCase(buf, t)

    client = Client.__new__(Client)
    client._buffer = buf
    client._capture = capture_uc
    client._flush_uc = flush_uc

    class _NoOpFlusher:
        def start(self): pass
        def stop(self): pass

    client._flusher = _NoOpFlusher()

    app = FastAPI()

    @app.get(route)
    def handler():
        return {"ok": True}

    instrument(app, client)
    return app, t, flush_uc


def test_FastAPI_Request_ProducesOneTraceEvent():
    app, transport, flush_uc = _make_app("/ping")

    TestClient(app).get("/ping")
    flush_uc.execute()

    assert len(transport.sent) == 1
    assert transport.sent[0].event_type == "trace"


def test_FastAPI_TraceEvent_HasCorrectMethodPathStatus():
    app, transport, flush_uc = _make_app("/health")

    TestClient(app).get("/health")
    flush_uc.execute()

    evt = transport.sent[0]
    assert evt.payload["method"] == "GET"
    assert evt.payload["path"] == "/health"
    assert evt.payload["status_code"] == 200


def test_FastAPI_TraceEvent_HasDurationMs():
    app, transport, flush_uc = _make_app("/ping")

    TestClient(app).get("/ping")
    flush_uc.execute()

    assert "duration_ms" in transport.sent[0].payload


def test_FastAPI_TraceId_PropagatedFromHeader():
    app, transport, flush_uc = _make_app("/echo")

    TestClient(app).get("/echo", headers={"x-trace-id": "my-trace-123"})
    flush_uc.execute()

    assert transport.sent[0].trace_id == "my-trace-123"


def test_FastAPI_MissingTraceIdHeader_GeneratesFreshUUID():
    app, transport, flush_uc = _make_app("/x")

    TestClient(app).get("/x")
    flush_uc.execute()

    trace_id = transport.sent[0].trace_id
    assert trace_id != ""
    assert len(trace_id) == 36  # UUID4 format


def test_FastAPI_MultipleRequests_ProduceMultipleTraceEvents():
    app, transport, flush_uc = _make_app("/ping")
    http = TestClient(app)

    http.get("/ping")
    http.get("/ping")
    http.get("/ping")
    flush_uc.execute()

    assert len(transport.sent) == 3
