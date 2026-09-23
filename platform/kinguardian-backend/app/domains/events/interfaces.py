import abc
from typing import Callable, Union, List, Any
from app.domains.events.domain_events import DomainEvent


class EventHandler(abc.ABC):
    """
    Abstract interface for domain event handlers.
    """
    @abc.abstractmethod
    async def handle(self, event: DomainEvent) -> None:
        pass


EventHandlerType = Union[EventHandler, Callable[[DomainEvent], Any]]


class EventPublisher(abc.ABC):
    """
    Abstract interface for publishing domain events.
    Decouples domain and application logic from physical message brokers.
    """
    @abc.abstractmethod
    async def publish(self, event: DomainEvent) -> None:
        pass

    @abc.abstractmethod
    async def publish_batch(self, events: List[DomainEvent]) -> None:
        pass


class EventConsumer(abc.ABC):
    """
    Abstract interface for consuming domain events.
    """
    @abc.abstractmethod
    async def subscribe(self, event_type: str, handler: EventHandlerType) -> None:
        pass

    @abc.abstractmethod
    async def start(self) -> None:
        pass

    @abc.abstractmethod
    async def stop(self) -> None:
        pass
