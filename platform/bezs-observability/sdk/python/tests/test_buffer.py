"""Unit tests for EventBuffer."""
from watcher_sdk.buffer import EventBuffer
from watcher_sdk.domain.event import EventInput


def _evt(msg: str = "x") -> EventInput:
    return EventInput(event_type="log", severity="info", message=msg)


def test_Buffer_Push_IncreasesSize():
    buf = EventBuffer()
    buf.push(_evt())
    assert buf.size() == 1


def test_Buffer_Drain_ReturnsAllEvents():
    buf = EventBuffer()
    buf.push(_evt("a"))
    buf.push(_evt("b"))

    events = buf.drain()

    assert len(events) == 2
    assert events[0].message == "a"
    assert events[1].message == "b"


def test_Buffer_Drain_ClearsBuffer():
    buf = EventBuffer()
    buf.push(_evt())
    buf.drain()
    assert buf.size() == 0


def test_Buffer_DrainEmpty_ReturnsEmptyList():
    buf = EventBuffer()
    assert buf.drain() == []


def test_Buffer_ExceedsMaxSize_DropsOldest():
    buf = EventBuffer(max_size=3)
    for i in range(5):
        buf.push(_evt(str(i)))

    events = buf.drain()

    # Should keep the newest 3: "2", "3", "4"
    assert len(events) == 3
    assert events[0].message == "2"
    assert events[2].message == "4"


def test_Buffer_AtExactMaxSize_DoesNotDrop():
    buf = EventBuffer(max_size=3)
    for i in range(3):
        buf.push(_evt(str(i)))

    assert buf.size() == 3
