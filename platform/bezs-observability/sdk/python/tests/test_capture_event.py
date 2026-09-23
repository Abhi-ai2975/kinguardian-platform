"""Unit tests for CaptureEventUseCase."""
import pytest

from watcher_sdk.buffer import EventBuffer
from watcher_sdk.domain.event import EventInput
from watcher_sdk.usecases.capture_event import CaptureEventUseCase


def _make_event(**kwargs) -> EventInput:
    defaults = {
        "event_type": "log",
        "severity": "info",
        "message": "hello",
    }
    defaults.update(kwargs)
    return EventInput(**defaults)


def test_CaptureEvent_ValidEvent_PushedToBuffer():
    buf = EventBuffer()
    uc = CaptureEventUseCase(buf)

    uc.execute(_make_event())

    assert buf.size() == 1


def test_CaptureEvent_MultipleEvents_AllBuffered():
    buf = EventBuffer()
    uc = CaptureEventUseCase(buf)

    for _ in range(5):
        uc.execute(_make_event())

    assert buf.size() == 5


def test_CaptureEvent_EmptyMessage_RaisesValueError():
    buf = EventBuffer()
    uc = CaptureEventUseCase(buf)

    with pytest.raises(ValueError, match="message is required"):
        uc.execute(_make_event(message=""))


def test_CaptureEvent_InvalidEventType_RaisesValueError():
    buf = EventBuffer()
    uc = CaptureEventUseCase(buf)

    with pytest.raises(ValueError, match="invalid event_type"):
        uc.execute(_make_event(event_type="unknown"))


def test_CaptureEvent_InvalidSeverity_RaisesValueError():
    buf = EventBuffer()
    uc = CaptureEventUseCase(buf)

    with pytest.raises(ValueError, match="invalid severity"):
        uc.execute(_make_event(severity="verbose"))


def test_CaptureEvent_ValidationFailure_NothingBuffered():
    buf = EventBuffer()
    uc = CaptureEventUseCase(buf)

    with pytest.raises(ValueError):
        uc.execute(_make_event(message=""))

    assert buf.size() == 0


@pytest.mark.parametrize("event_type", ["audit", "log", "trace", "metric", "event"])
def test_CaptureEvent_AllValidEventTypes_Accepted(event_type):
    buf = EventBuffer()
    uc = CaptureEventUseCase(buf)

    uc.execute(_make_event(event_type=event_type))

    assert buf.size() == 1


@pytest.mark.parametrize("severity", ["debug", "info", "warn", "error", "critical"])
def test_CaptureEvent_AllValidSeverities_Accepted(severity):
    buf = EventBuffer()
    uc = CaptureEventUseCase(buf)

    uc.execute(_make_event(severity=severity))

    assert buf.size() == 1
