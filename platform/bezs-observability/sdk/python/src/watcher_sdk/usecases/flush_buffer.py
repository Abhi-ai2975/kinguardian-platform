# Use case: drain the buffer and send the batch to the gateway via Transport.
# Runs on the background flusher thread — I/O allowed here.
from watcher_sdk.buffer import EventBuffer
from watcher_sdk.ports.transport import Transport


class FlushBufferUseCase:
    def __init__(self, buffer: EventBuffer, transport: Transport) -> None:
        self._buffer = buffer
        self._transport = transport

    def execute(self) -> int:
        """Drain the buffer and ship events. Returns the number of events sent."""
        events = self._buffer.drain()
        if not events:
            return 0
        self._transport.send(events)
        return len(events)
