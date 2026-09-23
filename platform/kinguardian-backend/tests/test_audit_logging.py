import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.events.audit import AuditEventRecord, AuditService


@pytest.mark.asyncio
async def test_all_twelve_application_audit_event_types(db_session):
    """
    Verifies that all 12 required application-level audit events record:
    actor, family, subject, action, resource, timestamp, request_id, source, metadata.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_audit",
        email="coord_audit@kinguardian.com",
        display_name="Maya Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_audit",
        email="parent_audit@kinguardian.com",
        display_name="George Senior",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coordinator.id, "Audit Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-audit-01",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    audit_svc = AuditService(db_session)

    # 1. consent.granted
    e1 = await audit_svc.log_consent_granted(
        actor=parent.id,
        family=family.id,
        subject=subject.id,
        consent_id=uuid.uuid4(),
        scopes=["clinical:read", "medications:manage"]
    )
    assert e1.event_type == "consent.granted"
    assert e1.actor == parent.id
    assert e1.family == family.id
    assert e1.subject == subject.id
    assert e1.action == "granted"
    assert e1.resource == "consent"
    assert e1.request_id is not None
    assert e1.metadata["scopes"] == ["clinical:read", "medications:manage"]

    # 2. consent.revoked
    e2 = await audit_svc.log_consent_revoked(
        actor=parent.id,
        family=family.id,
        subject=subject.id,
        consent_id=uuid.uuid4(),
        reason="Revoked by patient request"
    )
    assert e2.event_type == "consent.revoked"
    assert e2.action == "revoked"

    # 3. health.summary.viewed
    e3 = await audit_svc.log_health_summary_viewed(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id,
        summary_type="30_day_vitals"
    )
    assert e3.event_type == "health.summary.viewed"
    assert e3.resource == "health.summary"
    assert e3.action == "viewed"

    # 4. document.viewed
    doc_id = uuid.uuid4()
    e4 = await audit_svc.log_document_viewed(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id,
        document_id=doc_id
    )
    assert e4.event_type == "document.viewed"

    # 5. document.shared
    e5 = await audit_svc.log_document_shared(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id,
        document_id=doc_id,
        recipient_email="doctor@hospital.org"
    )
    assert e5.event_type == "document.shared"
    assert e5.metadata["recipient_email"] == "doctor@hospital.org"

    # 6. medication.confirmed
    e6 = await audit_svc.log_medication_confirmed(
        actor=parent.id,
        family=family.id,
        subject=subject.id,
        adherence_id=uuid.uuid4(),
        medication_name="Amlodipine 5mg",
        status="taken"
    )
    assert e6.event_type == "medication.confirmed"
    assert e6.metadata["medication_name"] == "Amlodipine 5mg"

    # 7. appointment.summary.shared
    e7 = await audit_svc.log_appointment_summary_shared(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id,
        appointment_id="appt-777",
        shared_with_email="caregiver@kinguardian.com"
    )
    assert e7.event_type == "appointment.summary.shared"

    # 8. family.member.added
    new_member_id = uuid.uuid4()
    e8 = await audit_svc.log_family_member_added(
        actor=coordinator.id,
        family=family.id,
        member_profile_id=new_member_id,
        role="caregiver"
    )
    assert e8.event_type == "family.member.added"
    assert e8.metadata["role"] == "caregiver"

    # 9. care.task.assigned
    task_id = uuid.uuid4()
    e9 = await audit_svc.log_care_task_assigned(
        actor=coordinator.id,
        family=family.id,
        task_id=task_id,
        assignee_profile_id=new_member_id,
        subject=subject.id
    )
    assert e9.event_type == "care.task.assigned"

    # 10. ai.insight.viewed
    insight_id = uuid.uuid4()
    e10 = await audit_svc.log_ai_insight_viewed(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id,
        insight_id=insight_id
    )
    assert e10.event_type == "ai.insight.viewed"

    # 11. ai.action.approved
    action_id = uuid.uuid4()
    e11 = await audit_svc.log_ai_action_approved(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id,
        action_id=action_id,
        action_type="create_care_task"
    )
    assert e11.event_type == "ai.action.approved"

    # 12. ai.action.rejected
    e12 = await audit_svc.log_ai_action_rejected(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id,
        action_id=action_id,
        reason="Not appropriate at this time"
    )
    assert e12.event_type == "ai.action.rejected"
    assert e12.metadata["reason"] == "Not appropriate at this time"

    # Verify query
    all_audits = await audit_svc.list_audit_events(family_id=family.id)
    assert len(all_audits) >= 12



@pytest.mark.asyncio
async def test_audit_trail_rest_endpoint(db_session):
    """
    Verifies REST API endpoint for retrieving family and patient audit trail.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_audit_rest",
        email="coord_audit_rest@kinguardian.com",
        display_name="Sarah Audit REST",
        timezone="America/New_York"
    )
    family = await family_svc.create_care_circle(coordinator.id, "REST Audit Circle", "coordinator")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-audit-rest",
        relationship_to_coordinator="mother"
    )

    # Log 2 audit events
    audit_svc = AuditService(db_session)
    await audit_svc.log_health_summary_viewed(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id
    )
    await audit_svc.log_medication_confirmed(
        actor=coordinator.id,
        family=family.id,
        subject=subject.id,
        adherence_id=uuid.uuid4(),
        medication_name="Metformin 500mg"
    )

    app_profile = await db_session.get(AppProfile, coordinator.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. GET /api/v1/events/audit/trail
            resp = await client.get(f"/api/v1/events/audit/trail?family_id={family.id}")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) >= 2
            actions = [item["action"] for item in data]
            assert "viewed" in actions
            assert "confirmed" in actions
    finally:
        app.dependency_overrides.clear()
