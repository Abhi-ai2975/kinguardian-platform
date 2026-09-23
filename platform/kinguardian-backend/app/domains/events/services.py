import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.core.timezone import format_dual_timezone
from app.domains.family.domain.interfaces import IEventLogger
from app.domains.events.models import EventLog
from app.domains.events.domain_events import DomainEvent, event_bus
from app.domains.events.event_contracts import AuditEvent

logger = get_logger(__name__)



class EventService(IEventLogger):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def log_event(
        self,
        care_circle_id: Optional[uuid.UUID],
        event_type: str,
        payload: dict,
        parent_tz: str = "Asia/Kolkata",
        coordinator_tz: str = "America/New_York",
        aggregate_type: Optional[str] = None,
        aggregate_id: Optional[str] = None,
        actor_profile_id: Optional[uuid.UUID] = None,
        event_version: int = 1
    ) -> None:
        utc_now = datetime.now(timezone.utc)
        
        # Calculate dual time representation
        tz_info = format_dual_timezone(
            utc_dt=utc_now,
            parent_tz_str=parent_tz,
            coordinator_tz_str=coordinator_tz
        )
        
        event = EventLog(
            family_id=care_circle_id,
            event_type=event_type,
            event_version=event_version,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            actor_profile_id=actor_profile_id,
            payload=payload,
            utc_timestamp=utc_now,
            parent_timezone_timestamp=tz_info["parent_local_time"],
            coordinator_timezone_timestamp=tz_info["coordinator_local_time"]
        )
        
        self.session.add(event)
        await self.session.commit()
        
        # Structured log output for ingestion by watcher24 (bezs-observability)
        logger.info(
            f"Audit log created: {event_type} (v{event_version})",
            extra={
                "event_type": event_type,
                "event_version": event_version,
                "family_id": str(care_circle_id) if care_circle_id else None,
                "aggregate_type": aggregate_type,
                "aggregate_id": aggregate_id,
                "actor_profile_id": str(actor_profile_id) if actor_profile_id else None,
                "parent_local_time": tz_info["parent_local_time"],
                "coordinator_local_time": tz_info["coordinator_local_time"]
            }
        )

    async def publish_domain_event(
        self,
        event: DomainEvent,
        parent_tz: str = "Asia/Kolkata",
        coordinator_tz: str = "America/New_York"
    ) -> None:
        """
        Record and publish a domain event through the event bus and persist to event_logs.
        """
        await self.log_event(
            care_circle_id=event.family_id,
            event_type=event.event_type,
            payload=event.payload,
            parent_tz=parent_tz,
            coordinator_tz=coordinator_tz,
            aggregate_type=event.aggregate_type,
            aggregate_id=event.aggregate_id,
            actor_profile_id=event.actor_profile_id,
            event_version=event.event_version
        )
        await event_bus.publish(event)


    async def record_audit_event(
        self,
        audit_event: "AuditEvent",
        parent_tz: str = "Asia/Kolkata",
        coordinator_tz: str = "America/New_York"
    ) -> EventLog:
        """
        Records an immutable compliance/forensic audit event (who did what, when, to which resource).
        """
        utc_now = datetime.now(timezone.utc)
        tz_info = format_dual_timezone(
            utc_dt=utc_now,
            parent_tz_str=parent_tz,
            coordinator_tz_str=coordinator_tz
        )

        db_entry = EventLog(
            id=audit_event.audit_id,
            family_id=audit_event.family_id,
            event_type=f"audit.{audit_event.action}",
            event_version=1,
            aggregate_type=audit_event.target_resource_type,
            aggregate_id=audit_event.target_resource_id,
            actor_profile_id=audit_event.actor_profile_id,
            payload=audit_event.to_audit_dict(),
            utc_timestamp=utc_now,
            parent_timezone_timestamp=tz_info["parent_local_time"],
            coordinator_timezone_timestamp=tz_info["coordinator_local_time"]
        )

        self.session.add(db_entry)
        await self.session.commit()

        logger.info(
            f"Compliance Audit Event recorded: actor={audit_event.actor_profile_id} action={audit_event.action} resource={audit_event.target_resource_type}/{audit_event.target_resource_id}",
            extra=audit_event.to_audit_dict()
        )
        return db_entry

    async def get_circle_events(self, family_id: uuid.UUID) -> List[EventLog]:
        result = await self.session.execute(
            select(EventLog)
            .where(EventLog.family_id == family_id)
            .order_by(EventLog.utc_timestamp.desc())
        )
        return list(result.scalars().all())

