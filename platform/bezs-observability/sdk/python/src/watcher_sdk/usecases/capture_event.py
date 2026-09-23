# Use case: validate caller input and put one event into the buffer.
# Runs on the application thread — must be fast (no I/O).
from watcher_sdk.buffer import EventBuffer
from watcher_sdk.domain.event import EventInput

_VALID_EVENT_TYPES = {"audit", "log", "trace", "metric", "event", "security", "ai", "system", "infrastructure"}
_VALID_SEVERITIES = {"debug", "info", "warn", "error", "critical"}


class CaptureEventUseCase:
    def __init__(self, buffer: EventBuffer) -> None:
        self._buffer = buffer

    def execute(self, event: EventInput) -> None:
        _validate(event)
        self._buffer.push(event)


def _validate(event: EventInput) -> None:
    if not event.message:
        raise ValueError("message is required")
    if event.event_type not in _VALID_EVENT_TYPES:
        raise ValueError(f"invalid event_type '{event.event_type}'; valid: {_VALID_EVENT_TYPES}")
    if event.severity not in _VALID_SEVERITIES:
        raise ValueError(f"invalid severity '{event.severity}'; valid: {_VALID_SEVERITIES}")
