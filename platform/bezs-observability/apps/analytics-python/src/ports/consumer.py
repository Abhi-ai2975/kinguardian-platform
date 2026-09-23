"""
Ports layer — StreamConsumer interface.

Defines the contract that use cases depend on for reading events from a queue.
The Redis Streams adapter implements this. Unit tests use a fake implementation.

Nothing in this file imports Redis — it is a pure interface definition.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class StreamMessage:
    """
    A single message read from a stream, including the ID needed for ACK.

    The message_id is the Redis Streams auto-generated ID (e.g. "1716825600000-0").
    It must be passed back to acknowledge() after successful processing so Redis
    knows the message has been handled and removes it from the PEL.
    """
    message_id: str
    fields: dict[str, str]  # flat string map as stored in Redis Streams


class StreamConsumer(ABC):
    """
    Contract for reading batches of messages from a stream queue.

    The use case depends on this interface, not on Redis directly.
    This allows unit tests to inject a fake consumer without needing
    a live Redis instance.
    """

    @abstractmethod
    def read_batch(self, batch_size: int, block_ms: int) -> list[StreamMessage]:
        """
        Reads up to batch_size messages from the stream.

        Blocks for up to block_ms milliseconds waiting for messages if the
        stream is empty. Returns an empty list if no messages arrive before
        the timeout — the caller should loop and retry.

        Does NOT acknowledge messages — call acknowledge() after processing.
        """
        ...

    @abstractmethod
    def acknowledge(self, message_ids: list[str]) -> None:
        """
        Acknowledges that the given messages have been successfully processed.

        Must be called ONLY after the events have been persisted to ClickHouse.
        If the worker crashes before calling this, the messages remain in the
        PEL and will be redelivered on restart (at-least-once delivery).
        """
        ...

    @abstractmethod
    def claim_pending(self, batch_size: int, min_idle_ms: int) -> list[StreamMessage]:
        """
        Claims pending messages that have been idle for at least min_idle_ms.

        Called on worker startup to recover messages that were read but never
        acknowledged (e.g. worker crashed mid-batch). This ensures no events
        are lost across restarts.
        """
        ...
