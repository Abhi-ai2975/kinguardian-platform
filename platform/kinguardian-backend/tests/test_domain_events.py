import uuid
import pytest
from datetime import datetime, timezone
from app.domains.events.domain_events import (
    DomainEvent,
    event_bus,
    FamilyCreated,
    FamilyMemberAdded,
    CareRelationshipCreated,
    ConsentGranted,
    ConsentRevoked,
    MedicationScheduled,
    MedicationTaken,
    MedicationMissed,
    ParentCheckInSubmitted,
    ParentReportedUnwell,
    DocumentUploaded,
    DocumentProcessingCompleted,
    DocumentExtractionNeedsReview,
    AppointmentCreated,
    AppointmentCompleted,
    HealthTrendChanged,
    GuardianMomentCreated,
    CareTaskCreated,
    CareTaskAssigned,
    CareTaskCompleted,
    NotificationCreated,
    FamilyMessageSent,
    AIInsightCreated,
    AIActionRequested,
    AIActionApproved
)
from app.domains.events.services import EventService


def test_domain_event_structure_and_serialization():
    fid = uuid.uuid4()
    actor_id = uuid.uuid4()
    event = ParentCheckInSubmitted(
        family_id=fid,
        aggregate_id="subj-123",
        actor_profile_id=actor_id,
        payload={"feeling": "not_well", "notes": "Felt dizzy after lunch"}
    )

    d = event.to_dict()
    assert d["event_type"] == "subject.checkin.submitted"
    assert d["aggregate_type"] == "care_subject"
    assert d["aggregate_id"] == "subj-123"
    assert d["family_id"] == str(fid)
    assert d["actor_profile_id"] == str(actor_id)
    assert d["payload"]["feeling"] == "not_well"
    assert "event_id" in d
    assert "occurred_at" in d



def test_all_typed_domain_events():
    fid = uuid.uuid4()
    actor = uuid.uuid4()
    
    events = [
        FamilyCreated(family_id=fid, aggregate_id=str(fid), actor_profile_id=actor),
        FamilyMemberAdded(family_id=fid, aggregate_id=str(fid), actor_profile_id=actor),
        CareRelationshipCreated(family_id=fid, aggregate_id="subj-1", actor_profile_id=actor),
        ConsentGranted(family_id=fid, aggregate_id="consent-1", actor_profile_id=actor),
        ConsentRevoked(family_id=fid, aggregate_id="consent-1", actor_profile_id=actor),
        MedicationScheduled(family_id=fid, aggregate_id="med-1", actor_profile_id=actor),
        MedicationTaken(family_id=fid, aggregate_id="med-1", actor_profile_id=actor),
        MedicationMissed(family_id=fid, aggregate_id="med-1", actor_profile_id=actor),
        ParentCheckInSubmitted(family_id=fid, aggregate_id="subj-1", actor_profile_id=actor),
        ParentReportedUnwell(family_id=fid, aggregate_id="subj-1", actor_profile_id=actor),
        DocumentUploaded(family_id=fid, aggregate_id="doc-1", actor_profile_id=actor),
        DocumentProcessingCompleted(family_id=fid, aggregate_id="doc-1", actor_profile_id=actor),
        DocumentExtractionNeedsReview(family_id=fid, aggregate_id="ext-1", actor_profile_id=actor),
        AppointmentCreated(family_id=fid, aggregate_id="appt-1", actor_profile_id=actor),
        AppointmentCompleted(family_id=fid, aggregate_id="appt-1", actor_profile_id=actor),
        HealthTrendChanged(family_id=fid, aggregate_id="trend-1", actor_profile_id=actor),
        GuardianMomentCreated(family_id=fid, aggregate_id="moment-1", actor_profile_id=actor),
        CareTaskCreated(family_id=fid, aggregate_id="task-1", actor_profile_id=actor),
        CareTaskAssigned(family_id=fid, aggregate_id="task-1", actor_profile_id=actor),
        CareTaskCompleted(family_id=fid, aggregate_id="task-1", actor_profile_id=actor),
        NotificationCreated(family_id=fid, aggregate_id="notif-1", actor_profile_id=actor),
        FamilyMessageSent(family_id=fid, aggregate_id="msg-1", actor_profile_id=actor),
        AIInsightCreated(family_id=fid, aggregate_id="insight-1", actor_profile_id=actor),
        AIActionRequested(family_id=fid, aggregate_id="action-1", actor_profile_id=actor),
        AIActionApproved(family_id=fid, aggregate_id="action-1", actor_profile_id=actor)
    ]

    expected_types = [
        "family.created",
        "family.member.added",
        "care.relationship.created",
        "consent.granted",
        "consent.revoked",
        "medication.scheduled",
        "medication.taken",
        "medication.missed",
        "subject.checkin.submitted",
        "parent.reported.unwell",
        "document.uploaded",
        "document.processed",
        "document.extraction.needs_review",
        "appointment.preparation.created",
        "appointment.completed",
        "health.trend.changed",
        "guardian.moment.created",
        "care.task.created",
        "care.task.assigned",
        "care.task.completed",
        "notification.created",
        "family.message.sent",
        "insight.generated",
        "ai.action.requested",
        "ai.action.approved"
    ]

    for event, expected_type in zip(events, expected_types):
        assert event.event_type == expected_type
        d = event.to_dict()
        assert d["event_type"] == expected_type



@pytest.mark.asyncio
async def test_domain_event_bus_and_persistence(db_session):
    event_bus.clear()
    
    received_events = []

    async def handler(evt: DomainEvent):
        received_events.append(evt)

    event_bus.subscribe("guardian.moment.created", handler)

    service = EventService(db_session)
    fid = uuid.uuid4()
    
    event = GuardianMomentCreated(
        family_id=fid,
        aggregate_id="moment-99",
        actor_profile_id=uuid.uuid4(),
        payload={"trigger": "activity_drop_5_days", "severity": "medium"}
    )

    await service.publish_domain_event(event)

    assert len(received_events) == 1
    assert received_events[0].aggregate_id == "moment-99"

    # Verify event logged in database
    logs = await service.get_circle_events(fid)
    assert len(logs) == 1
    assert logs[0].event_type == "guardian.moment.created"
    assert logs[0].aggregate_type == "ai_insight"
    assert logs[0].aggregate_id == "moment-99"



@pytest.mark.asyncio
async def test_transactional_outbox_pattern(db_session):
    from app.domains.family.infrastructure.models import Family
    from app.domains.events.outbox import OutboxService
    
    outbox = OutboxService(db_session)
    fid = uuid.uuid4()
    
    # 1. Simulate single atomic transaction writing business mutation + outbox event
    family = Family(id=fid, name="Ramesh Care Group")
    db_session.add(family)
    
    # Stage outbox event in the same transaction
    await outbox.stage_event(
        event_type="family.created",
        aggregate_type="family",
        aggregate_id=fid,
        payload={"family_id": str(fid), "name": "Ramesh Care Group"},
        family_id=fid
    )
    
    # Commit business mutation + outbox atomically
    await db_session.commit()
    
    # 2. Fetch pending events
    pending = await outbox.fetch_pending_events()
    assert len(pending) == 1
    assert pending[0].event_type == "family.created"
    assert pending[0].status == "pending"
    assert pending[0].aggregate_id == fid
    
    # 3. Process outbox batch using worker publisher
    published_events = []
    
    async def worker_publisher(evt):
        published_events.append(evt)
        
    count = await outbox.process_outbox_batch(batch_size=10, publisher=worker_publisher)
    assert count == 1
    assert len(published_events) == 1
    
    # 4. Verify outbox state is now published
    remaining_pending = await outbox.fetch_pending_events()
    assert len(remaining_pending) == 0


@pytest.mark.asyncio
async def test_event_bus_publisher_consumer_handler():
    from app.domains.events.interfaces import EventHandler, EventPublisher, EventConsumer
    from app.domains.events.bus import InMemoryEventBus
    
    bus = InMemoryEventBus()
    
    # Custom typed EventHandler class
    handled_events = []
    
    class MedicationAlertHandler(EventHandler):
        async def handle(self, event: DomainEvent) -> None:
            handled_events.append(event)
            
    # Verify class implements interface
    assert issubclass(MedicationAlertHandler, EventHandler)
    assert isinstance(bus, EventPublisher)
    assert isinstance(bus, EventConsumer)
    
    handler = MedicationAlertHandler()
    await bus.subscribe("medication.missed", handler)
    await bus.start()
    
    # Publish domain event
    fid = uuid.uuid4()
    med_event = MedicationMissed(
        family_id=fid,
        aggregate_id="med-req-456",
        actor_profile_id=uuid.uuid4(),
        payload={"medication": "Metformin 500mg", "scheduled_time": "20:00"}
    )
    
    await bus.publish(med_event)
    
    assert len(handled_events) == 1
    assert handled_events[0].event_type == "medication.missed"
    assert handled_events[0].aggregate_id == "med-req-456"
    assert handled_events[0].payload["medication"] == "Metformin 500mg"
    
    await bus.stop()


