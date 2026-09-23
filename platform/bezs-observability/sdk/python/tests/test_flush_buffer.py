"""Unit tests for FlushBufferUseCase."""
import pytest

from watcher_sdk.buffer import EventBuffer
from watcher_sdk.domain.event import EventInput
from watcher_sdk.ports.transport import Transport
from watcher_sdk.usecases.flush_buffer import FlushBufferUseCase


class FakeTransport(Transport):
    def __init__(self) -> None:
        self.sent: list[list[EventInput]] = []
        self.raise_on_send: Exception | None = None

    def send(self, events: list[EventInput]) -> None:
        if self.raise_on_send:
            raise self.raise_on_send
        self.sent.append(events)


def _push(buf: EventBuffer, n: int) -> None:
    for i in range(n):
        buf.push(EventInput(event_type="log", severity="info", message=f"msg-{i}"))


def test_FlushBuffer_WithEvents_SendsToTransport():
    buf = EventBuffer()
    transport = FakeTransport()
    uc = FlushBufferUseCase(buf, transport)
    _push(buf, 3)

    count = uc.execute()

    assert count == 3
    assert len(transport.sent) == 1
    assert len(transport.sent[0]) == 3


def test_FlushBuffer_EmptyBuffer_DoesNotCallTransport():
    buf = EventBuffer()
    transport = FakeTransport()
    uc = FlushBufferUseCase(buf, transport)

    count = uc.execute()

    assert count == 0
    assert len(transport.sent) == 0


def test_FlushBuffer_AfterFlush_BufferIsEmpty():
    buf = EventBuffer()
    transport = FakeTransport()
    uc = FlushBufferUseCase(buf, transport)
    _push(buf, 5)

    uc.execute()

    assert buf.size() == 0


def test_FlushBuffer_TransportFailure_RaisesException():
    buf = EventBuffer()
    transport = FakeTransport()
    transport.raise_on_send = OSError("connection refused")
    uc = FlushBufferUseCase(buf, transport)
    _push(buf, 2)

    with pytest.raises(OSError):
        uc.execute()


def test_FlushBuffer_CalledTwice_SecondCallSendsNothing():
    buf = EventBuffer()
    transport = FakeTransport()
    uc = FlushBufferUseCase(buf, transport)
    _push(buf, 3)

    uc.execute()
    count = uc.execute()

    assert count == 0
    assert len(transport.sent) == 1
