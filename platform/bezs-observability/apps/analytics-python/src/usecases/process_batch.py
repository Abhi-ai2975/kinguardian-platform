"""
Use case — ProcessBatch.

This is the core business logic of the worker: take a batch of raw stream
messages, parse them into domain Events, and persist them to storage.

Depends only on port interfaces (StreamConsumer, EventRepository).
Has no knowledge of Redis, ClickHouse, or any infrastructure technology.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from pydantic import ValidationError

from src.domain.event import Event
from src.ports.consumer import StreamConsumer, StreamMessage
from src.ports.repository import EventRepository

logger = logging.getLogger(__name__)


@dataclass
class ProcessBatchResult:
    """
    Summary of what happened during a single batch processing run.
    Useful for logging, metrics, and debugging.
    """
    total: int       # messages read from stream
    stored: int      # events successfully stored in ClickHouse
    skipped: int     # messages that failed to parse (invalid schema)
    acknowledged: int  # messages ACK'd back to Redis


class ProcessBatchUseCase:
    """
    Orchestrates the full lifecycle of a batch of stream messages:
      1. Parse raw stream fields → Event domain objects
      2. Skip and log any messages that fail validation
      3. Bulk insert valid events into storage
      4. Acknowledge all messages back to the stream (only if insert succeeds)

    The ACK happens AFTER the insert. If the insert fails, no ACK is sent —
    the messages stay pending in Redis and will be reprocessed on retry.
    This gives us at-least-once delivery semantics.
    """

    def __init__(self, repository: EventRepository) -> None:
        # Repository is injected via port interface — use case has no idea
        # whether this is ClickHouse, Postgres, or an in-memory fake.
        self._repository = repository

    def execute(
        self,
        consumer: StreamConsumer,
        messages: list[StreamMessage],
    ) -> ProcessBatchResult:
        """
        Processes a batch of stream messages end-to-end.

        Args:
            consumer: The stream consumer used to ACK messages after success.
            messages: The raw messages read from Redis Streams.

        Returns:
            A ProcessBatchResult summary of what happened.
        """
        if not messages:
            return ProcessBatchResult(total=0, stored=0, skipped=0, acknowledged=0)

        # ── Step 1: Parse stream fields into domain Event objects ─────────────
        valid_events: list[Event] = []
        valid_ids: list[str] = []
        skipped_ids: list[str] = []

        for msg in messages:
            try:
                event = Event.from_stream_fields(msg.fields)
                valid_events.append(event)
                valid_ids.append(msg.message_id)
            except (ValidationError, ValueError) as exc:
                # Log and skip malformed messages — don't let one bad event
                # block the entire batch. The message ID is still ACK'd so
                # it doesn't pollute the PEL forever.
                logger.warning(
                    "process_batch: skipping malformed message %s: %s",
                    msg.message_id,
                    exc,
                )
                skipped_ids.append(msg.message_id)

        # ── Step 2: Bulk insert valid events into storage ─────────────────────
        if valid_events:
            # This raises on failure — do NOT ACK if storage fails.
            # The exception propagates to the worker's consume loop which
            # will sleep and retry the batch.
            self._repository.save_batch(valid_events)

        # ── Step 3: ACK all messages (valid + skipped) ────────────────────────
        # Skipped messages are ACK'd too — retrying a structurally invalid
        # message would fail again and pollute the PEL indefinitely.
        all_ids = valid_ids + skipped_ids
        if all_ids:
            consumer.acknowledge(all_ids)

        return ProcessBatchResult(
            total=len(messages),
            stored=len(valid_events),
            skipped=len(skipped_ids),
            acknowledged=len(all_ids),
        )
