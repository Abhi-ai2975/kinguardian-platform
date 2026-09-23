# Port: what the use cases need from the network layer.
# Use cases depend on this interface, not on HttpTransport.
# Tests inject FakeTransport — no HTTP calls needed.
from abc import ABC, abstractmethod

from watcher_sdk.domain.event import EventInput


class Transport(ABC):
    """Delivers a batch of events to the gateway."""

    @abstractmethod
    def send(self, events: list[EventInput]) -> None:
        """Send events to the gateway. Raise on unrecoverable failure."""
