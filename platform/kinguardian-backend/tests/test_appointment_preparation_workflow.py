"""
Appointment Preparation Workflow Test Suite:
Verifies the end-to-end pipeline:
Appointment selected
        ↓
Authorization check
        ↓
Collect recent context
        ↓
AI preparation job
        ↓
Draft summary (Never automatically shared)
        ↓
Human review (Mandatory before sharing)
        ↓
Share (Only upon explicit user action)
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.state_machine import InvalidStateTransitionError
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.exceptions import FamilyAccessError
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domain.appointment.state_machine import AppointmentPreparationState
from app.application.appointments.workflow import AppointmentPreparationWorkflow
from app.application.appointments.use_cases import (
    InitiateAppointmentPreparationUseCase,
    GenerateAppointmentDraftUseCase,
    ReviewAppointmentDraftUseCase,
    ShareAppointmentSummaryUseCase
)


@pytest.mark.asyncio
async def test_appointment_preparation_workflow_complete_pipeline(db_session: AsyncSession):
    """
    Verifies full appointment preparation workflow from selection to explicit user sharing.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    workflow = AppointmentPreparationWorkflow(family_service)
    initiate_uc = InitiateAppointmentPreparationUseCase(workflow)
    generate_uc = GenerateAppointmentDraftUseCase(workflow)
    review_uc = ReviewAppointmentDraftUseCase(workflow)
    share_uc = ShareAppointmentSummaryUseCase(workflow)

    now = datetime.now(timezone.utc)

    # 1. Setup Family, Subject, and Profiles
    coord = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_appt_01",
        email="coord.appt@kinguardian.com",
        display_name="Ananya",
        timezone="America/New_York"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_appt_01",
        email="parent.appt@kinguardian.com",
        display_name="Rajesh",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=coord.id,
        name="Rajesh Family Circle",
        creator_role="coordinator"
    )
    await family_service.add_member_to_circle(
        requester_id=coord.id,
        care_circle_id=family.id,
        target_email="parent.appt@kinguardian.com",
        role="parent"
    )
    subject = await family_service.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-appt-99",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # Seed recent adherence and checkin data
    await family_service.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="med-metformin-500",
        scheduled_at=now - timedelta(days=1),
        status="taken"
    )
    await family_service.submit_subject_checkin(
        requester_id=parent.id,
        subject_id=subject.id,
        feeling="okay",
        notes="Slight dizziness in the morning after walking."
    )

    # ==========================================
    # Step 1 & 2: Appointment Selected & Authorization Check
    # ==========================================
    fhir_appt_id = "appt-cardiology-2026-08"

    # Stranger attempt must fail authorization
    stranger = await family_service.get_or_create_profile(
        iam_subject_id="iam_stranger_appt_99",
        email="stranger.appt@kinguardian.com",
        display_name="Intruder"
    )
    with pytest.raises(FamilyAccessError):
        await initiate_uc.execute(
            requester_id=stranger.id,
            family_id=family.id,
            subject_id=subject.id,
            fhir_appointment_id=fhir_appt_id
        )

    # Legitimate coordinator initiates selection
    draft = await initiate_uc.execute(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_appointment_id=fhir_appt_id
    )
    assert draft.state == AppointmentPreparationState.SELECTED
    assert draft.is_shared is False

    # ==========================================
    # Step 3, 4 & 5: Collect Context & AI Preparation Job -> Draft Summary
    # ==========================================
    draft = await generate_uc.execute(
        requester_id=coord.id,
        coordination_id=draft.coordination_id,
        custom_focus_areas=["Morning dizziness symptom", "Kidney function panel"]
    )
    assert draft.state == AppointmentPreparationState.DRAFT_READY
    assert len(draft.questions_for_doctor) >= 4
    assert any("Morning dizziness" in q for q in draft.questions_for_doctor)
    assert draft.vitals_summary is not None
    assert draft.adherence_summary["total_events"] >= 1

    # Invariant: AI-generated summary is NOT shared automatically!
    assert draft.is_shared is False
    assert draft.share_recipients == []
    assert draft.reviewed_by_profile_id is None

    # ==========================================
    # Guard Check: Attempting to share without human review MUST fail
    # ==========================================
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        await share_uc.execute(
            requester_id=coord.id,
            coordination_id=draft.coordination_id,
            recipients=["dr.patel@cardiology.com"]
        )
    assert "Invalid state transition for AppointmentPreparation" in str(exc_info.value)
    assert draft.is_shared is False

    # ==========================================
    # Step 6: Human Review & Approval
    # ==========================================
    refined_questions = [
        "Is the morning dizziness related to the recent Metformin or BP dosage?",
        "Should we schedule an updated echocardiogram?",
        "Can we safely continue current exercise routines?"
    ]
    custom_notes = "Reviewed by Ananya (Daughter / Coordinator). Added notes on morning dizziness."

    reviewed_draft = await review_uc.execute(
        reviewer_id=coord.id,
        coordination_id=draft.coordination_id,
        approved_questions=refined_questions,
        custom_notes=custom_notes
    )
    assert reviewed_draft.state == AppointmentPreparationState.REVIEWED
    assert reviewed_draft.reviewed_by_profile_id == coord.id
    assert reviewed_draft.reviewed_at is not None
    assert reviewed_draft.questions_for_doctor == refined_questions
    assert reviewed_draft.notes == custom_notes
    assert reviewed_draft.is_shared is False  # Still not shared until explicit user share action

    # ==========================================
    # Step 7: Explicit User Sharing Action
    # ==========================================
    recipients = ["dr.patel@cardiology.com", "caregiver.nurse@kinguardian.com"]
    shared_draft = await share_uc.execute(
        requester_id=coord.id,
        coordination_id=draft.coordination_id,
        recipients=recipients
    )
    assert shared_draft.state == AppointmentPreparationState.SHARED
    assert shared_draft.is_shared is True
    assert shared_draft.shared_at is not None
    assert shared_draft.share_recipients == recipients
