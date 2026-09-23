import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.core.redis import redis_service
from app.domains.events.models import EventLog, OutboxEvent
from app.domains.family.infrastructure.models import (
    MedicationAdherenceEvent,
    Notification,
    CareSubject,
    Family,
    AppProfile
)
from app.domains.family.application.transaction_coordinator import TransactionCoordinatorService


@pytest.mark.asyncio
async def test_medication_confirmation_transaction_boundary(db_session):
    """
    Verifies that Parent Medication Confirmation commits adherence, health projection,
    and outbox event within a single atomic database transaction.
    """
    coordinator = TransactionCoordinatorService(db_session)

    # 1. Setup Profile, Family, and Subject
    profile = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email=f"parent_{uuid.uuid4().hex[:6]}@example.com", display_name="Ramesh Sharma")
    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=profile.id)

    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, fhir_patient_id=f"fhir_{uuid.uuid4().hex}")

    db_session.add_all([profile, family, subject])
    await db_session.commit()

    adherence_id = uuid.uuid4()
    scheduled_at = datetime.now(timezone.utc)

    # 2. Execute Transaction Boundary
    adherence, outbox_event = await coordinator.confirm_parent_medication(
        actor_id=profile.id,
        adherence_id=adherence_id,
        family_id=family.id,
        subject_id=subject.id,
        medication_name="Metformin 500mg",
        dosage="1 tablet with breakfast",
        scheduled_at=scheduled_at
    )

    # 3. Verify Atomic In-Transaction Invariants
    assert adherence.status == "taken"
    assert adherence.confirmed_at is not None

    # Verify Health Event Projection was created
    ev_stmt = select(EventLog).where(EventLog.aggregate_id == str(adherence_id))
    ev_res = await db_session.execute(ev_stmt)
    event_log = ev_res.scalars().first()
    assert event_log is not None
    assert event_log.event_type == "medication.confirmed"
    assert event_log.payload["medication_name"] == "Metformin 500mg"

    # Verify Outbox Event was created with pending status (not yet published externally)
    outbox_stmt = select(OutboxEvent).where(OutboxEvent.aggregate_id == adherence_id)
    outbox_res = await db_session.execute(outbox_stmt)
    outbox = outbox_res.scalars().first()
    assert outbox is not None
    assert outbox.status == "pending"
    assert outbox.published_at is None
    assert outbox.payload["event_name"] == "MedicationTaken"


@pytest.mark.asyncio
async def test_asynchronous_outbox_workflow_and_dashboard_refresh(db_session):
    """
    Verifies that post-commit asynchronous processing:
    1. Dispatches MedicationTaken
    2. Generates Notification for Coordinator
    3. Invalidates Redis family summary cache for coordinator dashboard refresh
    4. Marks outbox event as published
    """
    coordinator = TransactionCoordinatorService(db_session)

    # 1. Setup entities
    profile = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email=f"coord_{uuid.uuid4().hex[:6]}@example.com", display_name="Aarav Sharma")
    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=profile.id)

    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, fhir_patient_id=f"fhir_{uuid.uuid4().hex}")

    db_session.add_all([profile, family, subject])
    await db_session.commit()


    # Pre-populate Redis Family Summary Cache
    redis_service.set_family_summary(family.id, {"active_tasks": 5, "last_med": "pending"})
    assert redis_service.get_family_summary(family.id) is not None

    # 2. In-Transaction Commit
    adherence_id = uuid.uuid4()
    _, outbox_event = await coordinator.confirm_parent_medication(
        actor_id=profile.id,
        adherence_id=adherence_id,
        family_id=family.id,
        subject_id=subject.id,
        medication_name="Amlodipine 5mg",
        dosage="1 tablet at 9am",
        scheduled_at=datetime.now(timezone.utc)
    )

    # 3. Asynchronous Post-Commit Execution
    result = await coordinator.execute_asynchronous_medication_workflow(outbox_event)

    assert result["outbox_status"] == "published"
    assert result["dashboard_refreshed"] is True

    # Verify Notification was created
    notif_stmt = select(Notification).where(Notification.family_id == family.id)
    notif_res = await db_session.execute(notif_stmt)
    notifications = notif_res.scalars().all()
    assert len(notifications) > 0
    assert "Parent confirmed dose" in notifications[0].body

    # Verify Redis Family Summary Cache was invalidated for dashboard refresh
    assert redis_service.get_family_summary(family.id) is None


@pytest.mark.asyncio
async def test_never_publish_external_event_on_transaction_rollback(db_session, monkeypatch):
    """
    Verifies that if a transaction fails before commit, no outbox event is persisted,
    and no external notification/event is ever dispatched.
    """
    profile = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex}", email=f"parent_{uuid.uuid4().hex[:6]}@example.com", display_name="Ramesh Sharma")
    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=profile.id)
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, fhir_patient_id=f"fhir_{uuid.uuid4().hex}")
    db_session.add_all([profile, family, subject])
    await db_session.commit()

    adherence_id = uuid.uuid4()
    coordinator = TransactionCoordinatorService(db_session)

    # Simulate database disk/connection failure during commit
    async def _failing_commit():
        await db_session.rollback()
        raise RuntimeError("Simulated Database I/O Failure during commit")

    monkeypatch.setattr(db_session, "commit", _failing_commit)

    with pytest.raises(RuntimeError, match="Simulated Database I/O Failure"):
        await coordinator.confirm_parent_medication(
            actor_id=profile.id,
            adherence_id=adherence_id,
            family_id=family.id,
            subject_id=subject.id,
            medication_name="Atorvastatin",
            dosage="20mg",
            scheduled_at=datetime.now(timezone.utc)
        )

    # Rolled back -> Zero outbox events exist in the database
    # Restore commit
    monkeypatch.undo()
    outbox_stmt = select(OutboxEvent).where(OutboxEvent.aggregate_id == adherence_id)
    outbox_res = await db_session.execute(outbox_stmt)
    assert outbox_res.scalars().first() is None

