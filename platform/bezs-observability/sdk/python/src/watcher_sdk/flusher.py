# Background daemon thread that triggers FlushBufferUseCase on two conditions:
#   1. Time-based: every `flush_interval` seconds
#   2. Size-based: whenever the buffer reaches `flush_at` events
# Daemon = killed automatically when the main process exits.
# Call stop() for a clean shutdown that flushes remaining events first.
import sys
import threading
import time

from watcher_sdk.usecases.flush_buffer import FlushBufferUseCase


class BackgroundFlusher:
    def __init__(
        self,
        flush_use_case: FlushBufferUseCase,
        flush_interval: float,
        flush_at: int,
        buffer,  # EventBuffer — kept as loose reference to check size
    ) -> None:
        self._flush = flush_use_case
        self._interval = flush_interval
        self._flush_at = flush_at
        self._buffer = buffer
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True, name="watcher-flusher")

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        """Signal the thread to stop, then flush any remaining events."""
        self._stop_event.set()
        self._thread.join(timeout=5)
        try:
            self._flush.execute()
        except Exception as exc:
            print(f"[watcher] final flush failed: {exc}", file=sys.stderr)

    def _run(self) -> None:
        last_flush = time.monotonic()
        while not self._stop_event.is_set():
            now = time.monotonic()
            size_trigger = self._buffer.size() >= self._flush_at
            time_trigger = (now - last_flush) >= self._interval

            if size_trigger or time_trigger:
                try:
                    self._flush.execute()
                except Exception as exc:
                    print(f"[watcher] flush error: {exc}", file=sys.stderr)
                last_flush = time.monotonic()

            # Sleep in short increments so stop_event is noticed promptly.
            self._stop_event.wait(timeout=min(0.05, self._interval))
