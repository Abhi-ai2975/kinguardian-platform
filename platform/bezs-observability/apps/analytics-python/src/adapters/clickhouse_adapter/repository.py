"""
Adapter — ClickHouse event repository implementing the EventRepository port.

Uses clickhouse-connect (official Python driver) to bulk insert events
into the watcher.events table via HTTP interface on port 8123.

Bulk insert is critical for performance — one INSERT per event would be
extremely slow in ClickHouse due to its columnar merge-tree architecture.
Always batch, never insert one row at a time.
"""

from __future__ import annotations

import logging
from typing import Any

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from src.domain.event import Event
from src.ports.repository import EventRepository

logger = logging.getLogger(__name__)

# Column names in the exact order expected by the INSERT statement.
# Must match the tuple returned by Event.to_clickhouse_row().
_COLUMNS = [
    "organization_id",
    "application_id",
    "environment",
    "event_type",
    "severity",
    "message",
    "source",
    "service_name",
    "timestamp",
    "trace_id",
    "span_id",
    "parent_span_id",
    "user_id",
    "session_id",
    "payload",
    "ingested_at",
    "sdk_version",
    "runtime",
    "ip_address",
    "region",
]


class ClickHouseEventRepository(EventRepository):
    """
    Implements EventRepository by bulk-inserting events into ClickHouse.

    Uses the HTTP interface (port 8123) via clickhouse-connect.
    One INSERT call per batch — never one row at a time.
    """

    def __init__(self, client: Client) -> None:
        """
        Args:
            client: A connected clickhouse-connect Client instance.
                    Created in main.py and injected here.
        """
        self._client = client

    def save_batch(self, events: list[Event]) -> None:
        """
        Bulk inserts a batch of events into watcher.events.

        Converts each Event to a tuple row via to_clickhouse_row(),
        then sends a single INSERT with all rows. ClickHouse's MergeTree
        engine is optimized for exactly this pattern.

        Raises ClickHouseError on failure — the caller (use case) handles retry.
        """
        if not events:
            return

        # Build the data matrix: list of rows, each row is a tuple of values
        data: list[tuple[Any, ...]] = [event.to_clickhouse_row() for event in events]

        self._client.insert(
            table="watcher.events",
            data=data,
            column_names=_COLUMNS,
        )

        logger.debug("clickhouse: inserted %d events", len(events))

    def ping(self) -> bool:
        """
        Checks ClickHouse connectivity with a lightweight query.
        Returns True if the server responds, False on any error.
        """
        try:
            self._client.ping()
            return True
        except Exception as exc:
            logger.warning("clickhouse: ping failed: %s", exc)
            return False
