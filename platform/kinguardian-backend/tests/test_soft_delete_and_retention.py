import pytest
import uuid
from datetime import datetime, timezone

from app.domains.family.infrastructure.models import (
    CareSubject,
    CareTask,
    HealthDocument,
    Consent,
    MedicationAdherenceEvent
)
from app.domains.events.models import EventLog, OutboxEvent
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.retention import RetentionPolicyService, ImmutabilityViolationError


def test_immutable_entities_deletion_forbidden():
    """
    Verifies that clinical references, audit records, consent history, and event history
    are strictly forbidden from physical deletion.
    """
    immutable_entities = [
        "audit_events",
        "event_logs",
        "medication_adherence_events",
        "consents",
        "consent_history",
        "clinical_observations",
        "fhir_references",
        "outbox_events"
    ]

    for entity in immutable_entities:
        with pytest.raises(ImmutabilityViolationError) as exc:
            RetentionPolicyService.assert_deletion_permitted(entity)
        assert "strictly forbidden" in exc.value.detail
        assert entity in exc.value.detail

    # Permitted soft-deletable entities do not raise
    RetentionPolicyService.assert_deletion_permitted("care_subjects")
    RetentionPolicyService.assert_deletion_permitted("care_tasks")
    RetentionPolicyService.assert_deletion_permitted("health_documents")


@pytest.mark.asyncio
async def test_meaningful_business_soft_deletions_and_audit_trail(db_session):
    """
    Verifies soft deletion on CareSubject, CareTask, and HealthDocument,
    confirming deleted_at is set, status updated, and audit events recorded.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_retention",
        email="coord_retention@kinguardian.com",
        display_name="Maya Retention"
    )
    family = await family_svc.create_care_circle(coordinator.id, "Retention Circle", "coordinator")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-retention-01",
        relationship_to_coordinator="mother"
    )

    # 1. Soft delete CareSubject
    deactivated_subj = await RetentionPolicyService.soft_delete_care_subject(
        session=db_session,
        subject_id=subject.id,
        actor_id=coordinator.id,
        family_id=family.id,
        reason="Family relocated"
    )
    assert deactivated_subj.status == "inactive"
    assert deactivated_subj.deleted_at is not None

    # 2. Soft delete CareTask
    task = await family_svc.add_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coordinator.id,
        title="Schedule Cardiology Consult",
        description="Check heart rate and review ECG",
        category="appointment",
        priority="high",
        due_at=datetime.now(timezone.utc)
    )

    cancelled_task = await RetentionPolicyService.soft_delete_care_task(
        session=db_session,
        task_id=task.id,
        actor_id=coordinator.id,
        family_id=family.id,
        reason="Cardiologist already visited"
    )
    assert cancelled_task.status == "cancelled"
    assert cancelled_task.deleted_at is not None

    # 3. Soft delete HealthDocument (archive)
    doc = HealthDocument(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        filenest_file_id="filenest_retention_123",
        document_type="lab_report",
        status="active",
        source_profile_id=coordinator.id
    )
    db_session.add(doc)
    await db_session.flush()

    archived_doc = await RetentionPolicyService.soft_delete_health_document(
        session=db_session,
        document_id=doc.id,
        actor_id=coordinator.id,
        family_id=family.id,
        reason="Superseded by newer lab panel"
    )
    assert archived_doc.status == "archived"
    assert archived_doc.deleted_at is not None


@pytest.mark.asyncio
async def test_consent_history_immutably_preserved_on_revocation(db_session):
    """
    Verifies that revoking consent never deletes the record, keeping full audit and scope history.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_consent_ret",
        email="coord_consent_ret@kinguardian.com",
        display_name="Sarah Consent"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_consent_ret",
        email="parent_consent_ret@kinguardian.com",
        display_name="George Consent"
    )
    family = await family_svc.create_care_circle(coordinator.id, "Consent Retention Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-consent-ret-01",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    consent = await family_svc.set_consent(
        grantor_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_email=coordinator.email,
        scope={"clinical": True, "medications": True}
    )


    # Immutably revoke consent
    revoked = await RetentionPolicyService.revoke_consent_immutably(
        session=db_session,
        consent_id=consent.id,
        actor_id=parent.id,
        family_id=family.id,
        reason="Patient preference update"
    )

    assert revoked.status == "revoked"
    assert revoked.revoked_at is not None
    # Verify the record still exists in the database
    check_db = await db_session.get(Consent, consent.id)
    assert check_db is not None
    assert check_db.status == "revoked"
    assert check_db.scope == {"clinical": True, "medications": True}
