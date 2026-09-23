import json
import uuid
import inspect
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging import get_logger
from app.domains.events.domain_events import DomainEvent
from app.domains.events.interfaces import EventPublisher, EventConsumer, EventHandler, EventHandlerType

logger = get_logger(__name__)


class InMemoryEventBus(EventPublisher, EventConsumer):
    """
    In-memory implementation of EventPublisher and EventConsumer.
    Ideal for unit tests, local development, and decoupled execution without external dependencies.
    """
    def __init__(self):
        self._handlers: Dict[str, List[EventHandlerType]] = {}
        self._is_running: bool = False

    async def publish(self, event: DomainEvent) -> None:
        handlers = self._handlers.get(event.event_type, [])
        # Also support wildcard '*' subscriptions
        handlers = handlers + self._handlers.get("*", [])
        
        for handler in handlers:
            try:
                if isinstance(handler, EventHandler):
                    await handler.handle(event)
                elif inspect.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as ex:
                logger.error(f"Error executing handler {handler} for event {event.event_type}: {ex}")

    async def publish_batch(self, events: List[DomainEvent]) -> None:
        for event in events:
            await self.publish(event)

    async def subscribe(self, event_type: str, handler: EventHandlerType) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def start(self) -> None:
        self._is_running = True
        logger.info("InMemoryEventBus started")

    async def stop(self) -> None:
        self._is_running = False
        logger.info("InMemoryEventBus stopped")

    def clear(self) -> None:
        self._handlers.clear()


class NatsJetStreamEventBus(EventPublisher, EventConsumer):
    """
    Production-grade NATS JetStream EventPublisher and EventConsumer.
    Aligns with existing FileNest NATS JetStream streaming architecture.
    """
    def __init__(
        self,
        nats_url: Optional[str] = None,
        stream_name: Optional[str] = None,
        subject_prefix: str = "kinguardian"
    ):
        self.nats_url = nats_url or settings.NATS_URL
        self.stream_name = stream_name or settings.NATS_STREAM_NAME
        self.subject_prefix = subject_prefix
        
        self._nc = None
        self._js = None
        self._handlers: Dict[str, List[EventHandlerType]] = {}
        self._subscriptions: List[Any] = []
        self._is_running: bool = False

    async def _ensure_connection(self) -> None:
        if self._nc is None or self._nc.is_closed:
            import nats
            import nats.js.errors

            self._nc = await nats.connect(
                servers=[self.nats_url],
                name="kinguardian-event-bus",
                reconnect_time_wait=2,
                max_reconnect_attempts=-1
            )
            self._js = self._nc.jetstream()

            try:
                await self._js.stream_info(self.stream_name)
            except nats.js.errors.NotFoundError:
                await self._js.add_stream(
                    name=self.stream_name,
                    subjects=[f"{self.subject_prefix}.>"]
                )
                logger.info(f"Created NATS JetStream: {self.stream_name}")

    async def publish(self, event: DomainEvent) -> None:
        await self._ensure_connection()
        subject = f"{self.subject_prefix}.{event.event_type}"
        payload_bytes = json.dumps(event.to_dict()).encode("utf-8")
        
        await self._js.publish(subject, payload_bytes)
        logger.debug(f"Published event {event.event_type} to NATS JetStream {subject}")

    async def publish_batch(self, events: List[DomainEvent]) -> None:
        for event in events:
            await self.publish(event)

    async def subscribe(self, event_type: str, handler: EventHandlerType) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

        if self._is_running:
            await self._create_nats_subscription(event_type)

    async def _create_nats_subscription(self, event_type: str) -> None:
        await self._ensure_connection()
        subject = f"{self.subject_prefix}.{event_type}" if event_type != "*" else f"{self.subject_prefix}.>"

        async def msg_handler(msg):
            try:
                data = json.loads(msg.data.decode("utf-8"))
                
                # Reconstruct DomainEvent
                event = DomainEvent(
                    event_id=uuid.UUID(data["event_id"]) if "event_id" in data else uuid.uuid4(),
                    event_type=data.get("event_type", event_type),
                    occurred_at=datetime.fromisoformat(data["occurred_at"]) if "occurred_at" in data else datetime.now(timezone.utc),
                    aggregate_type=data.get("aggregate_type", "unknown"),
                    aggregate_id=data.get("aggregate_id", ""),
                    family_id=uuid.UUID(data["family_id"]) if data.get("family_id") else None,
                    actor_profile_id=uuid.UUID(data["actor_profile_id"]) if data.get("actor_profile_id") else None,
                    payload=data.get("payload", {})
                )

                handlers = self._handlers.get(event.event_type, []) + self._handlers.get("*", [])
                for h in handlers:
                    if isinstance(h, EventHandler):
                        await h.handle(event)
                    elif inspect.iscoroutinefunction(h):
                        await h(event)
                    else:
                        h(event)

                await msg.ack()
            except Exception as ex:
                logger.error(f"Error handling NATS message on {subject}: {ex}")

        sub = await self._js.subscribe(subject, cb=msg_handler)
        self._subscriptions.append(sub)

    async def start(self) -> None:
        self._is_running = True
        await self._ensure_connection()
        for event_type in self._handlers.keys():
            await self._create_nats_subscription(event_type)
        logger.info("NatsJetStreamEventBus started")

    async def stop(self) -> None:
        self._is_running = False
        for sub in self._subscriptions:
            await sub.unsubscribe()
        self._subscriptions.clear()
        
        if self._nc is not None and not self._nc.is_closed:
            await self._nc.close()
        self._nc = None
        self._js = None
        logger.info("NatsJetStreamEventBus stopped")


# Default global instance
_default_bus: Optional[EventPublisher] = None


def get_event_bus() -> InMemoryEventBus | NatsJetStreamEventBus:
    global _default_bus
    if _default_bus is None:
        if settings.EVENT_BUS_TYPE == "nats":
            _default_bus = NatsJetStreamEventBus()
        else:
            _default_bus = InMemoryEventBus()
    return _default_bus
