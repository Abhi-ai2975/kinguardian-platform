import uuid
from typing import List, Optional, Callable, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.domains.events.models import OutboxEvent
from app.domains.events.domain_events import DomainEvent, event_bus

logger = get_logger(__name__)


class OutboxService:
    """
    Manages transactional outbox events and worker publishing.
    Ensures business mutations and outbox records are written atomically in the same DB transaction.
    """
    def __init__(self, session: AsyncSession):
        self.session = session

    async def stage_event(
        self,
        event_type: str,
        aggregate_type: str,
        aggregate_id: uuid.UUID,
        payload: dict,
        family_id: Optional[uuid.UUID] = None,
        available_at: Optional[datetime] = None,
        event_version: int = 1
    ) -> OutboxEvent:
        """
        Add an outbox event to the current transaction without committing,
        so it commits atomically with the surrounding business mutation.
        """
        now = datetime.now(timezone.utc)
        outbox_entry = OutboxEvent(
            event_type=event_type,
            event_version=event_version,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            family_id=family_id,
            payload=payload,
            status="pending",
            attempt_count=0,
            available_at=available_at or now
        )
        self.session.add(outbox_entry)
        await self.session.flush()
        return outbox_entry

    async def stage_domain_event(
        self,
        event: DomainEvent,
        available_at: Optional[datetime] = None
    ) -> OutboxEvent:
        """
        Stage a DomainEvent object into the outbox.
        """
        agg_id = uuid.UUID(str(event.aggregate_id)) if isinstance(event.aggregate_id, uuid.UUID) else uuid.UUID(str(event.aggregate_id)) if len(str(event.aggregate_id)) == 36 and "-" in str(event.aggregate_id) else uuid.uuid5(uuid.NAMESPACE_DNS, str(event.aggregate_id))
        
        return await self.stage_event(
            event_type=event.event_type,
            event_version=event.event_version,
            aggregate_type=event.aggregate_type,
            aggregate_id=agg_id,
            payload=event.to_dict(),
            family_id=event.family_id,
            available_at=available_at
        )


    async def fetch_pending_events(
        self,
        batch_size: int = 50
    ) -> List[OutboxEvent]:
        """
        Fetch pending outbox events that are ready to be published.
        """
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(OutboxEvent)
            .where(
                and_(
                    OutboxEvent.status == "pending",
                    OutboxEvent.available_at <= now
                )
            )
            .order_by(OutboxEvent.created_at.asc())
            .limit(batch_size)
        )
        return list(result.scalars().all())

    async def mark_published(self, event_id: uuid.UUID) -> None:
        """
        Mark an outbox event as successfully published.
        """
        result = await self.session.execute(
            select(OutboxEvent).where(OutboxEvent.id == event_id)
        )
        event = result.scalar_one_or_none()
        if event:
            event.status = "published"
            event.published_at = datetime.now(timezone.utc)
            await self.session.flush()

    async def mark_failed(
        self,
        event_id: uuid.UUID,
        error_message: str,
        max_retries: int = 5,
        backoff_seconds: int = 10
    ) -> None:
        """
        Record delivery failure, increment attempt count, and schedule next retry or mark failed.
        """
        result = await self.session.execute(
            select(OutboxEvent).where(OutboxEvent.id == event_id)
        )
        event = result.scalar_one_or_none()
        if event:
            event.attempt_count += 1
            event.last_error = error_message
            if event.attempt_count >= max_retries:
                event.status = "failed"
            else:
                event.status = "pending"
                # Exponential backoff
                retry_delay = backoff_seconds * (2 ** (event.attempt_count - 1))
                event.available_at = datetime.now(timezone.utc) + timedelta(seconds=retry_delay)
            await self.session.flush()

    async def process_outbox_batch(
        self,
        batch_size: int = 50,
        publisher: Optional[Callable[[OutboxEvent], Any]] = None
    ) -> int:
        """
        Worker task to process and publish a batch of pending outbox events.
        """
        events = await self.fetch_pending_events(batch_size=batch_size)
        published_count = 0

        for event in events:
            try:
                if publisher:
                    import inspect
                    if inspect.iscoroutinefunction(publisher):
                        await publisher(event)
                    else:
                        publisher(event)
                else:
                    # Default: publish payload through DomainEventBus
                    # Construct generic DomainEvent
                    domain_event = DomainEvent(
                        event_id=event.id,
                        event_type=event.event_type,
                        aggregate_type=event.aggregate_type,
                        aggregate_id=str(event.aggregate_id),
                        family_id=event.family_id,
                        payload=event.payload.get("payload", event.payload) if isinstance(event.payload, dict) else {}
                    )
                    await event_bus.publish(domain_event)

                await self.mark_published(event.id)
                published_count += 1
            except Exception as ex:
                logger.error(f"Failed to publish outbox event {event.id}: {ex}")
                await self.mark_failed(event.id, str(ex))

        await self.session.commit()
        return published_count
