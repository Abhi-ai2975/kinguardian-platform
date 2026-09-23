"""
Ports layer — RetentionRepository interface.

Defines the contract for purging stale events from the telemetry store.
The ClickHouse adapter implements this. Unit tests use a fake implementation.

Nothing in this file imports ClickHouse — it is a pure interface definition.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime


class RetentionRepository(ABC):
    """
    Contract for deleting events that have exceeded an org's retention window.

    Use cases depend on this interface, not on ClickHouse directly.
    This makes the storage backend swappable without changing any use case code.
    """

    @abstractmethod
    def purge_before(self, org_id: str, cutoff: datetime) -> None:
        """
        Deletes all events for the given org whose timestamp is older than cutoff.

        Uses an async ClickHouse mutation (ALTER TABLE … DELETE) which is
        eventually consistent — rows may not disappear immediately but will
        be removed during the next MergeTree merge pass.

        Raises an exception on failure. The caller decides whether to retry.
        """
        ...
