import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.redis import redis_service
from app.domains.events.models import EventLog, OutboxEvent
from app.domains.family.infrastructure.models import (
    MedicationAdherenceEvent,
    CareSubject,
    Family,
    Notification
)

logger = get_logger(__name__)


class TransactionCoordinatorService:
    """
    Coordinates domain operations with strict transactional boundaries.

    CRITICAL ARCHITECTURAL INVARIANT:
    --------------------------------
    Never publish an external event before the database transaction is safely committed.

    Transaction Boundary Pattern (e.g. Parent Medication Confirmation):
    BEGIN
      1. update medication adherence state (MedicationAdherenceEvent -> taken)
      2. create health event projection (EventLog -> medication.confirmed)
      3. create outbox event (OutboxEvent -> medication.taken, status=pending)
    COMMIT

    Then asynchronously (after safe database commit):
      MedicationTaken Event
           ↓
      Notification dispatch to Care Coordinator
           ↓
      Coordinator dashboard refresh (Redis family summary invalidation)
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def confirm_parent_medication(
        self,
        actor_id: uuid.UUID,
        adherence_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        medication_name: str,
        dosage: str,
        scheduled_at: datetime
    ) -> Tuple[MedicationAdherenceEvent, OutboxEvent]:
        """
        Executes atomic in-transaction mutations:
        1. Updates medication adherence to 'taken'
        2. Creates event_logs health event projection
        3. Creates outbox_events record for asynchronous publishing
        Commits all 3 changes atomically.
        """
        utc_now = datetime.now(timezone.utc)

        # 1. Update Medication Adherence Event
        stmt = select(MedicationAdherenceEvent).where(MedicationAdherenceEvent.id == adherence_id)
        result = await self.session.execute(stmt)
        adherence = result.scalars().first()

        if not adherence:
            # Create if not pre-populated
            adherence = MedicationAdherenceEvent(
                id=adherence_id,
                subject_id=subject_id,
                fhir_medication_request_id=f"med_req_{uuid.uuid4().hex[:8]}",
                scheduled_at=scheduled_at,
                status="taken",
                confirmed_at=utc_now,
                confirmed_by_profile_id=actor_id,
                source="parent_app"
            )
            self.session.add(adherence)
        else:
            adherence.status = "taken"
            adherence.confirmed_at = utc_now
            adherence.confirmed_by_profile_id = actor_id


        # 2. Create Health Event Projection (event_logs)
        projection_payload = {
            "adherence_id": str(adherence_id),
            "medication_name": medication_name,
            "dosage": dosage,
            "scheduled_at": scheduled_at.isoformat(),
            "confirmed_at": utc_now.isoformat(),
            "status": "taken"
        }
        event_log = EventLog(
            id=uuid.uuid4(),
            family_id=family_id,
            event_type="medication.confirmed",
            aggregate_type="MedicationAdherenceEvent",
            aggregate_id=str(adherence_id),
            actor_profile_id=actor_id,
            payload=projection_payload,
            utc_timestamp=utc_now
        )
        self.session.add(event_log)

        # 3. Create Outbox Event (outbox_events)
        outbox_payload = {
            "event_name": "MedicationTaken",
            "adherence_id": str(adherence_id),
            "family_id": str(family_id),
            "subject_id": str(subject_id),
            "actor_id": str(actor_id),
            "medication_name": medication_name,
            "dosage": dosage,
            "confirmed_at": utc_now.isoformat()
        }
        outbox_event = OutboxEvent(
            id=uuid.uuid4(),
            event_type="medication.taken",
            aggregate_type="MedicationAdherenceEvent",
            aggregate_id=adherence_id,
            family_id=family_id,
            payload=outbox_payload,
            status="pending",
            attempt_count=0,
            available_at=utc_now,
            created_at=utc_now
        )
        self.session.add(outbox_event)

        # Safe Atomic Commit
        await self.session.commit()
        logger.info(
            f"Transaction safely committed for medication {adherence_id}. Outbox event {outbox_event.id} queued."
        )

        return adherence, outbox_event

    async def execute_asynchronous_medication_workflow(
        self,
        outbox_event: OutboxEvent
    ) -> Dict[str, Any]:
        """
        Asynchronous post-commit pipeline:
        1. Dispatches MedicationTaken event
        2. Creates Notification for Coordinator
        3. Invalidates Redis family summary cache for coordinator dashboard refresh
        4. Marks OutboxEvent as 'published'
        """
        payload = outbox_event.payload
        family_id = uuid.UUID(payload["family_id"])
        subject_id = uuid.UUID(payload["subject_id"])
        med_name = payload["medication_name"]

        # 1. Notification creation for Coordinator
        notification = Notification(
            id=uuid.uuid4(),
            recipient_profile_id=uuid.UUID(payload["actor_id"]),
            family_id=family_id,
            subject_id=subject_id,
            type="medication_taken",
            title="Medication Confirmed",
            body=f"Parent confirmed dose of {med_name}.",
            priority="normal",
            read_at=None,
            created_at=datetime.now(timezone.utc)
        )

        self.session.add(notification)

        # 2. Invalidate Coordinator Dashboard Redis Cache
        redis_service.invalidate_family_summary(family_id)

        # 3. Mark Outbox as Published
        outbox_event.status = "published"
        outbox_event.published_at = datetime.now(timezone.utc)

        await self.session.commit()

        logger.info(
            f"Asynchronous medication workflow completed for outbox {outbox_event.id}. Notification generated and dashboard cache invalidated."
        )

        return {
            "outbox_status": "published",
            "notification_id": str(notification.id),
            "dashboard_refreshed": True
        }
