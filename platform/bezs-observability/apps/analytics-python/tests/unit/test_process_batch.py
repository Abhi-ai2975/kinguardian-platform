"""
Unit tests for the ProcessBatch use case.
All dependencies (consumer, repository) are faked — no Redis, no ClickHouse.
Tests follow: test_<use_case>_<condition>_<expected_behaviour>
"""

from __future__ import annotations

from src.domain.event import Event
from src.ports.consumer import StreamConsumer, StreamMessage
from src.ports.repository import EventRepository
from src.usecases.process_batch import ProcessBatchUseCase


# ── Fakes ─────────────────────────────────────────────────────────────────────

class FakeConsumer(StreamConsumer):
    """Records which message IDs were acknowledged."""

    def __init__(self) -> None:
        self.acknowledged: list[str] = []

    def read_batch(self, batch_size: int, block_ms: int) -> list[StreamMessage]:
        return []

    def acknowledge(self, message_ids: list[str]) -> None:
        self.acknowledged.extend(message_ids)

    def claim_pending(self, batch_size: int, min_idle_ms: int) -> list[StreamMessage]:
        return []


class FakeRepository(EventRepository):
    """Records which events were saved. Optionally raises on save_batch."""

    def __init__(self, raise_on_save: Exception | None = None) -> None:
        self.saved: list[Event] = []
        self._raise = raise_on_save

    def save_batch(self, events: list[Event]) -> None:
        if self._raise:
            raise self._raise
        self.saved.extend(events)

    def ping(self) -> bool:
        return True


def make_valid_message(msg_id: str = "1-0") -> StreamMessage:
    """Creates a valid stream message."""
    return StreamMessage(
        message_id=msg_id,
        fields={
            "organization_id": "org_test",
            "application_id": "billing-api",
            "environment": "production",
            "event_type": "audit",
            "severity": "info",
            "message": "test event",
            "timestamp": "2026-05-25T10:00:00+00:00",
            "ingested_at": "2026-05-25T10:00:01+00:00",
        },
    )


def make_invalid_message(msg_id: str = "99-0") -> StreamMessage:
    """Creates a malformed stream message (missing required fields)."""
    return StreamMessage(
        message_id=msg_id,
        fields={"message": "broken"},  # missing organization_id, event_type, etc.
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_process_batch_empty_messages_returns_zero_result():
    uc = ProcessBatchUseCase(FakeRepository())
    consumer = FakeConsumer()

    result = uc.execute(consumer, [])

    assert result.total == 0
    assert result.stored == 0
    assert result.skipped == 0
    assert result.acknowledged == 0


def test_process_batch_valid_message_is_stored():
    repo = FakeRepository()
    uc = ProcessBatchUseCase(repo)
    consumer = FakeConsumer()

    uc.execute(consumer, [make_valid_message()])

    assert len(repo.saved) == 1


def test_process_batch_valid_message_is_acknowledged():
    consumer = FakeConsumer()
    uc = ProcessBatchUseCase(FakeRepository())

    uc.execute(consumer, [make_valid_message("5-0")])

    assert "5-0" in consumer.acknowledged


def test_process_batch_invalid_message_is_skipped_not_stored():
    repo = FakeRepository()
    uc = ProcessBatchUseCase(repo)
    consumer = FakeConsumer()

    result = uc.execute(consumer, [make_invalid_message()])

    assert result.skipped == 1
    assert len(repo.saved) == 0


def test_process_batch_invalid_message_is_still_acknowledged():
    """Malformed messages must be ACK'd so they don't pollute the PEL forever."""
    consumer = FakeConsumer()
    uc = ProcessBatchUseCase(FakeRepository())

    uc.execute(consumer, [make_invalid_message("bad-1")])

    assert "bad-1" in consumer.acknowledged


def test_process_batch_mixed_valid_and_invalid():
    repo = FakeRepository()
    consumer = FakeConsumer()
    uc = ProcessBatchUseCase(repo)

    messages = [
        make_valid_message("1-0"),
        make_invalid_message("2-0"),
        make_valid_message("3-0"),
    ]

    result = uc.execute(consumer, messages)

    assert result.total == 3
    assert result.stored == 2
    assert result.skipped == 1
    assert result.acknowledged == 3
    assert len(repo.saved) == 2


def test_process_batch_repository_failure_does_not_acknowledge():
    """
    If ClickHouse insert fails, no messages should be ACK'd.
    They stay pending in Redis so the next run can retry.
    """
    repo = FakeRepository(raise_on_save=RuntimeError("clickhouse down"))
    consumer = FakeConsumer()
    uc = ProcessBatchUseCase(repo)

    try:
        uc.execute(consumer, [make_valid_message()])
    except RuntimeError:
        pass

    assert len(consumer.acknowledged) == 0


def test_process_batch_result_counts_are_accurate():
    repo = FakeRepository()
    consumer = FakeConsumer()
    uc = ProcessBatchUseCase(repo)

    messages = [make_valid_message(f"{i}-0") for i in range(10)]
    result = uc.execute(consumer, messages)

    assert result.total == 10
    assert result.stored == 10
    assert result.skipped == 0
    assert result.acknowledged == 10
