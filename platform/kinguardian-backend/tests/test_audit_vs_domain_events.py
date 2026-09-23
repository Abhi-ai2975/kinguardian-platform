"""
Audit Events vs Domain Events Architectural Distinction Tests.

Validates the clear distinction:
1. Domain Event: Used to drive application behavior, state transitions, async workflows, and notifications.
2. Audit Event: Used to record WHO did WHAT, WHEN, and to WHICH RESOURCE for compliance & forensics.
3. Dual-Generation: A single user action can generate both independently without collision.
"""

import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

from app.domains.events.domain_events import (
    DomainEvent,
    SubjectCheckInSubmitted,
    MedicationTaken,
    ConsentGranted,
    event_bus
)
from app.domains.events.event_contracts import AuditEvent
from app.domains.events.services import EventService


def test_domain_event_contract_drives_behavior():
    """
    Verifies that Domain Events encapsulate application state and are designed
    to be consumed by reactive business logic subscribers.
    """
    fid = uuid.uuid4()
    parent_id = uuid.uuid4()

    # Domain event conveys state mutation for downstream reaction
    domain_event = SubjectCheckInSubmitted(
        family_id=fid,
        aggregate_id="subj-99",
        actor_profile_id=parent_id,
        payload={"feeling": "not_well", "notes": "Felt fatigued after morning walk", "severity": "medium"}
    )

    # Domain event properties drive workflow routing
    assert domain_event.event_type == "subject.checkin.submitted"
    assert domain_event.aggregate_type == "care_subject"
    assert domain_event.payload["severity"] == "medium"


def test_audit_event_contract_records_forensic_trail():
    """
    Verifies that Audit Events record WHO did WHAT to WHICH resource with forensic context.
    """
    fid = uuid.uuid4()
    parent_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    audit_event = AuditEvent(
        actor_profile_id=parent_id,
        actor_role="parent",
        action="checkin.created",
        target_resource_type="care_subject",
        target_resource_id=str(subject_id),
        family_id=fid,
        subject_id=subject_id,
        status="SUCCESS",
        ip_address="203.0.113.45",
        user_agent="KinGuardian-Android/2.4.0",
        changes_diff={"feeling": "not_well", "notes": "Felt fatigued after morning walk"}
    )

    audit_dict = audit_event.to_audit_dict()
    assert audit_dict["actor_profile_id"] == str(parent_id)
    assert audit_dict["actor_role"] == "parent"
    assert audit_dict["action"] == "checkin.created"
    assert audit_dict["target_resource_type"] == "care_subject"
    assert audit_dict["target_resource_id"] == str(subject_id)
    assert audit_dict["ip_address"] == "203.0.113.45"
    assert audit_dict["status"] == "SUCCESS"


@pytest.mark.asyncio
async def test_single_action_generates_both_domain_and_audit_events(db_session):
    """
    Verifies that a single business operation (e.g. parent check-in)
    generates BOTH:
    1. A Domain Event -> Triggers real-time application reactive handlers (e.g. coordinator notification)
    2. An Audit Event -> Persisted into immutable audit storage for legal and compliance auditability
    """
    event_bus.clear()
    
    # 1. Setup reactive domain event subscriber (drives application behavior)
    behavior_reactions = []
    
    async def coordinator_alert_handler(evt: DomainEvent):
        behavior_reactions.append(f"Notified Coordinator of {evt.event_type} for aggregate {evt.aggregate_id}")

    event_bus.subscribe("subject.checkin.submitted", coordinator_alert_handler)

    service = EventService(db_session)
    fid = uuid.uuid4()
    parent_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    # ── Action: Parent logs checkin feeling unwell ─────────────────────────────
    
    # A. Emit Domain Event (Behavioral Trigger)
    domain_event = SubjectCheckInSubmitted(
        family_id=fid,
        aggregate_id=str(subject_id),
        actor_profile_id=parent_id,
        payload={"feeling": "not_well", "requires_followup": True}
    )
    await event_bus.publish(domain_event)

    # B. Record Compliance Audit Event (Forensic History)
    audit_event = AuditEvent(
        actor_profile_id=parent_id,
        actor_role="parent",
        action="checkin.created",
        target_resource_type="care_subject",
        target_resource_id=str(subject_id),
        family_id=fid,
        subject_id=subject_id,
        ip_address="49.37.150.12",
        user_agent="KinGuardian-iOS/1.9.0",
        changes_diff={"feeling": "not_well"}
    )
    audit_record = await service.record_audit_event(
        audit_event,
        parent_tz="Asia/Kolkata",
        coordinator_tz="America/New_York"
    )

    # ── Assertions ────────────────────────────────────────────────────────────

    # 1. Behavioral Domain Event drove application reaction
    assert len(behavior_reactions) == 1
    assert "Notified Coordinator of subject.checkin.submitted" in behavior_reactions[0]

    # 2. Forensic Audit Event recorded in immutable store with dual timestamps
    assert audit_record.event_type == "audit.checkin.created"
    assert audit_record.actor_profile_id == parent_id
    assert audit_record.payload["ip_address"] == "49.37.150.12"
    assert audit_record.parent_timezone_timestamp is not None
    assert audit_record.coordinator_timezone_timestamp is not None
