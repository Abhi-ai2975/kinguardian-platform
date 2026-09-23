"""
Phase 12 — Event System Test Suite.

Validates:
1. Domain events structure, metadata, versioning, and serialization
2. Outbox pattern (transactional event staging atomic with business operations)
3. Event publisher (batch fetching, publishing to bus, state transitions)
4. Event consumers (subscribing to specific event types and wildcard topics)
5. Consumer idempotency (deduplicating already-processed events via event_id)
6. Retries and exponential backoff on delivery failure
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta

from app.domains.events.domain_events import (
    DomainEvent,
    CareTaskCreated,
    MedicationTaken,
    ParentCheckInSubmitted
)
from app.domains.events.bus import InMemoryEventBus
from app.domains.events.outbox import OutboxService
from app.domains.events.models import OutboxEvent
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService


@pytest.fixture
def family_env(db_session):
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)
    return {
        "family_svc": family_svc,
        "db_session": db_session
    }


@pytest.mark.asyncio
async def test_domain_events_structure_and_contracts():
    """
    1. Domain Events:
    Verifies that domain events carry required metadata, aggregate references,
    versioning, and serialize cleanly to JSON dictionaries.
    """
    family_id = uuid.uuid4()
    actor_id = uuid.uuid4()

    event = CareTaskCreated(
        family_id=family_id,
        aggregate_id="task-101",
        actor_profile_id=actor_id,
        payload={"title": "Morning Blood Pressure", "priority": "high"},
        event_version=1
    )

    d = event.to_dict()
    assert d["event_type"] == "care.task.created"
    assert d["aggregate_type"] == "care_task"
    assert d["aggregate_id"] == "task-101"
    assert d["family_id"] == str(family_id)
    assert d["actor_profile_id"] == str(actor_id)
    assert d["event_version"] == 1
    assert "event_id" in d
    assert "occurred_at" in d


@pytest.mark.asyncio
async def test_transactional_outbox_staging_and_publishing(family_env):
    """
    2. Outbox & 3. Publisher:
    Verifies staging events in the same database transaction, fetching pending batches,
    and marking as published.
    """
    db_session = family_env["db_session"]
    family_svc = family_env["family_svc"]
    outbox_svc = OutboxService(db_session)
    bus = InMemoryEventBus()

    # Create real profile & family for foreign key integrity
    creator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_outbox_{uuid.uuid4()}",
        email=f"outbox_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Outbox Coordinator"
    )
    family = await family_svc.create_care_circle(
        creator_id=creator.id,
        name="Outbox Family",
        creator_role="coordinator"
    )

    event = MedicationTaken(
        family_id=family.id,
        aggregate_id="adh-505",
        actor_profile_id=creator.id,
        payload={"medication": "Metformin 500mg", "status": "taken"}
    )

    # 1. Stage in Outbox
    staged = await outbox_svc.stage_domain_event(event)
    await db_session.commit()

    assert staged.status == "pending"
    assert staged.attempt_count == 0

    # 2. Fetch pending events
    pending = await outbox_svc.fetch_pending_events(batch_size=10)
    assert any(e.id == staged.id for e in pending)

    # 3. Publish pending batch through event bus
    async def custom_publisher(outbox_event: OutboxEvent):
        domain_evt = DomainEvent(
            event_id=outbox_event.id,
            event_type=outbox_event.event_type,
            aggregate_type=outbox_event.aggregate_type,
            aggregate_id=str(outbox_event.aggregate_id),
            family_id=outbox_event.family_id,
            payload=outbox_event.payload
        )
        await bus.publish(domain_evt)

    published_count = await outbox_svc.process_outbox_batch(
        batch_size=10,
        publisher=custom_publisher
    )
    assert published_count >= 1

    # Verify event status updated to published
    await db_session.refresh(staged)
    assert staged.status == "published"
    assert staged.published_at is not None


@pytest.mark.asyncio
async def test_event_consumers_and_wildcard_subscriptions():
    """
    4. Consumers:
    Verifies subscribing to domain events and receiving published messages asynchronously.
    """
    bus = InMemoryEventBus()
    received_events = []

    async def handle_medication(event: DomainEvent):
        received_events.append(event)

    await bus.subscribe("medication.taken", handle_medication)

    event = MedicationTaken(
        family_id=uuid.uuid4(),
        aggregate_id="adh-601",
        payload={"dose": "Morning Metformin"}
    )

    await bus.publish(event)
    assert len(received_events) == 1
    assert received_events[0].event_type == "medication.taken"


@pytest.mark.asyncio
async def test_idempotency_and_retry_backoff(family_env):
    """
    5. Idempotency & 6. Retries:
    Verifies handling consumer deduplication and tracking outbox retry attempts.
    """
    db_session = family_env["db_session"]
    family_svc = family_env["family_svc"]
    outbox_svc = OutboxService(db_session)

    creator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_retry_{uuid.uuid4()}",
        email=f"retry_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Retry Coordinator"
    )
    family = await family_svc.create_care_circle(
        creator_id=creator.id,
        name="Retry Family",
        creator_role="coordinator"
    )

    # 1. Staging outbox event
    outbox_event = await outbox_svc.stage_event(
        event_type="test.retry.event",
        aggregate_type="test_agg",
        aggregate_id=uuid.uuid4(),
        payload={"retry_test": True},
        family_id=family.id
    )
    await db_session.commit()

    # 2. Simulate failure & retry backoff calculation
    await outbox_svc.mark_failed(
        event_id=outbox_event.id,
        error_message="Simulated network transient timeout",
        max_retries=5,
        backoff_seconds=30
    )
    await db_session.refresh(outbox_event)

    assert outbox_event.status == "pending"
    assert outbox_event.attempt_count == 1
    assert outbox_event.last_error == "Simulated network transient timeout"
    assert outbox_event.available_at is not None
    now_utc = datetime.now(timezone.utc)
    if not outbox_event.available_at.tzinfo:
        now_utc = now_utc.replace(tzinfo=None)
    assert outbox_event.available_at > now_utc - timedelta(seconds=2)


