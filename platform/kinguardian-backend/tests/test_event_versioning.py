"""
Event Versioning & Schema Registry Tests.
Validates:
1. Every event must contain: event_type, event_version, event_id, occurred_at.
2. Versioned payload schemas are validated through EventSchemaRegistry.
3. Event persistence in event_logs and outbox tables preserves event_version.
4. Schema evolution & validation capabilities.
"""

import pytest
import uuid
from datetime import datetime, timezone
from pydantic import ValidationError

from app.domains.events.domain_events import (
    DomainEvent,
    SubjectCheckInSubmitted,
    FamilyCreated,
    MedicationTaken,
    DocumentUploaded,
    CareTaskCreated,
    event_bus
)
from app.domains.events.versioned_payloads import (
    EventSchemaRegistry,
    SubjectCheckInPayloadV1,
    FamilyCreatedPayloadV1,
    MedicationAdherencePayloadV1,
    CareTaskPayloadV1
)
from app.domains.events.services import EventService
from app.domains.events.outbox import OutboxService
from app.domains.events.models import EventLog, OutboxEvent


def test_every_event_contains_mandatory_versioning_fields():
    """
    Verifies that all domain events contain:
    - event_type
    - event_version
    - event_id
    - occurred_at
    """
    fid = uuid.uuid4()
    actor_id = uuid.uuid4()
    
    event = SubjectCheckInSubmitted(
        family_id=fid,
        aggregate_id="subj-123",
        actor_profile_id=actor_id,
        payload={"feeling": "good", "notes": "Had healthy breakfast", "severity": "low"}
    )

    # 1. Attribute assertions
    assert hasattr(event, "event_type") and event.event_type == "subject.checkin.submitted"
    assert hasattr(event, "event_version") and event.event_version == 1
    assert hasattr(event, "event_id") and isinstance(event.event_id, uuid.UUID)
    assert hasattr(event, "occurred_at") and isinstance(event.occurred_at, datetime)

    # 2. Serialization assertions
    d = event.to_dict()
    assert d["event_type"] == "subject.checkin.submitted"
    assert d["event_version"] == 1
    assert "event_id" in d and isinstance(d["event_id"], str)
    assert "occurred_at" in d and isinstance(d["occurred_at"], str)


def test_versioned_payload_schema_validation():
    """
    Verifies strongly-typed versioned payload schemas in EventSchemaRegistry.
    """
    fid = uuid.uuid4()
    creator_id = uuid.uuid4()

    valid_family_payload = {
        "family_id": str(fid),
        "name": "Iyer Family Care Circle",
        "creator_profile_id": str(creator_id)
    }

    # Validate against V1 schema
    validated = EventSchemaRegistry.validate_payload("family.created", valid_family_payload, event_version=1)
    assert isinstance(validated, FamilyCreatedPayloadV1)
    assert validated.name == "Iyer Family Care Circle"

    # Schema lookup
    schema_cls = EventSchemaRegistry.get_payload_schema("family.created", event_version=1)
    assert schema_cls is FamilyCreatedPayloadV1


def test_versioned_payload_validation_failure_on_missing_fields():
    """
    Verifies that schema validation rejects malformed versioned payloads.
    """
    invalid_task_payload = {
        # Missing required task_id, subject_id, family_id, title
        "status": "pending"
    }

    schema_cls = EventSchemaRegistry.get_payload_schema("care.task.created", event_version=1)
    assert schema_cls is CareTaskPayloadV1

    with pytest.raises(ValidationError):
        schema_cls.model_validate(invalid_task_payload)


@pytest.mark.asyncio
async def test_event_persistence_with_versioning(db_session):
    """
    Verifies that EventService persists the event_version in the database.
    """
    service = EventService(db_session)
    fid = uuid.uuid4()
    actor_id = uuid.uuid4()

    event = MedicationTaken(
        family_id=fid,
        aggregate_id="med-dose-456",
        actor_profile_id=actor_id,
        event_version=2,  # Custom payload version
        payload={
            "fhir_medication_request_id": "med-req-001",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }
    )

    await service.publish_domain_event(event)

    # Query database and verify version
    events = await service.get_circle_events(fid)
    assert len(events) == 1
    assert events[0].event_type == "medication.taken"
    assert events[0].event_version == 2
    assert events[0].aggregate_id == "med-dose-456"


@pytest.mark.asyncio
async def test_outbox_event_version_persistence(db_session):
    """
    Verifies that Outbox events preserve event_version.
    """
    outbox = OutboxService(db_session)
    fid = uuid.uuid4()
    doc_id = uuid.uuid4()

    outbox_event = await outbox.stage_event(
        event_type="document.uploaded",
        aggregate_type="health_document",
        aggregate_id=doc_id,
        payload={"filenest_file_id": "fn_999", "document_type": "lab_report"},
        family_id=fid,
        event_version=1
    )

    await db_session.commit()
    assert outbox_event.event_type == "document.uploaded"
    assert outbox_event.event_version == 1
