"""
Ports layer — EventRepository interface.

Defines the contract for persisting events to storage.
The ClickHouse adapter implements this. Unit tests use a fake implementation.

Nothing in this file imports ClickHouse — it is a pure interface definition.
"""

from abc import ABC, abstractmethod

from src.domain.event import Event


class EventRepository(ABC):
    """
    Contract for persisting batches of events to the telemetry store.

    Use cases depend on this interface, not on ClickHouse directly.
    This makes the storage backend swappable without changing any use case code.
    """

    @abstractmethod
    def save_batch(self, events: list[Event]) -> None:
        """
        Persists a batch of events to the telemetry store.

        Uses bulk insert for performance — a single network round-trip
        for the entire batch rather than one INSERT per event.

        Raises an exception if the insert fails. The caller (use case) is
        responsible for deciding whether to retry — the repository does not
        swallow errors.
        """
        ...

    @abstractmethod
    def ping(self) -> bool:
        """
        Checks that the storage backend is reachable.
        Returns True if healthy, False otherwise.
        Used by health checks and startup validation.
        """
        ...
