# Thread-safe in-memory ring buffer between capture and flush.
# Uses deque + Lock so CaptureEvent (application thread) and
# FlushBuffer (background flusher thread) can operate concurrently.
import threading
from collections import deque

from watcher_sdk.domain.event import EventInput


class EventBuffer:
    """Bounded FIFO queue. Drops the oldest event when the capacity is exceeded."""

    def __init__(self, max_size: int = 10_000) -> None:
        self._queue: deque[EventInput] = deque()
        self._lock = threading.Lock()
        self._max_size = max_size

    def push(self, event: EventInput) -> None:
        with self._lock:
            if len(self._queue) >= self._max_size:
                # Oldest first — prefer losing old data over blocking the caller.
                self._queue.popleft()
            self._queue.append(event)

    def drain(self) -> list[EventInput]:
        """Return all buffered events and clear the queue atomically."""
        with self._lock:
            events = list(self._queue)
            self._queue.clear()
            return events

    def size(self) -> int:
        with self._lock:
            return len(self._queue)
