"""
Explicit Application Use Cases Test Suite:
Tests all domain use cases with transactional databases and repositories:
- CreateFamilyUseCase
- AddFamilyMemberUseCase
- CreateCareRelationshipUseCase
- GrantConsentUseCase
- RevokeConsentUseCase
- GetCoordinatorHomeUseCase
- GetParentHomeUseCase
- GetParentHealthSummaryUseCase
- SubmitParentCheckInUseCase
- ConfirmMedicationUseCase
- SendMedicationReminderUseCase
- CreateCareTaskUseCase
- AssignCareTaskUseCase
- CompleteCareTaskUseCase
- GetUpcomingAppointmentsUseCase
- PrepareAppointmentUseCase
- UploadHealthDocumentUseCase
- ProcessHealthDocumentUseCase
- ReviewDocumentExtractionUseCase
- AskKinGuardianUseCase
- GenerateHealthInsightUseCase
- GenerateGuardianMomentUseCase
- CreateFamilyMessageUseCase
- SendNotificationUseCase
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.family.application.services import FamilyService
from app.domains.family.application.home_read_service import FamilyHomeReadService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.agent.context_builder import AIContextBuilder
from app.domains.agent.safety import AISafetyGuard
from app.application.use_cases import (
    CreateFamilyUseCase,
    AddFamilyMemberUseCase,
    CreateCareRelationshipUseCase,
    GrantConsentUseCase,
    RevokeConsentUseCase,
    GetCoordinatorHomeUseCase,
    GetParentHomeUseCase,
    GetParentHealthSummaryUseCase,
    SubmitParentCheckInUseCase,
    ConfirmMedicationUseCase,
    SendMedicationReminderUseCase,
    CreateCareTaskUseCase,
    AssignCareTaskUseCase,
    CompleteCareTaskUseCase,
    GetUpcomingAppointmentsUseCase,
    PrepareAppointmentUseCase,
    UploadHealthDocumentUseCase,
    ProcessHealthDocumentUseCase,
    ReviewDocumentExtractionUseCase,
    AskKinGuardianUseCase,
    GenerateHealthInsightUseCase,
    GenerateGuardianMomentUseCase,
    CreateFamilyMessageUseCase,
    SendNotificationUseCase
)


@pytest.mark.asyncio
async def test_all_explicit_use_cases_lifecycle(db_session: AsyncSession):
    """
    Tests complete use case execution lifecycle across all domains.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)
    home_read_service = FamilyHomeReadService(session=db_session)
    context_builder = AIContextBuilder(session=db_session)
    safety_guard = AISafetyGuard()


    now = datetime.now(timezone.utc)

    # 1. Setup Profiles
    coord_profile = await family_service.get_or_create_profile(
        iam_subject_id="iam_coord_uc_01",
        email="coord.uc@kinguardian.com",
        display_name="Meera",
        timezone="Europe/London"
    )
    parent_profile = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_uc_01",
        email="parent.uc@kinguardian.com",
        display_name="Deepak",
        timezone="Asia/Kolkata"
    )

    # 2. Family & Relationship Use Cases
    create_family_uc = CreateFamilyUseCase(family_service)
    family = await create_family_uc.execute(
        coordinator_profile_id=coord_profile.id,
        name="Deepak Care Circle"
    )
    assert family.name == "Deepak Care Circle"

    add_member_uc = AddFamilyMemberUseCase(family_service)
    member = await add_member_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        email="parent.uc@kinguardian.com",
        role="parent"
    )
    assert member.membership_role == "parent"

    subject = await family_service.add_care_subject(
        requester_id=coord_profile.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-uc-100",
        profile_id=parent_profile.id,
        relationship_to_coordinator="father"
    )

    create_rel_uc = CreateCareRelationshipUseCase(family_service)
    rel = await create_rel_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        from_profile_id=coord_profile.id,
        to_profile_id=parent_profile.id,
        relationship_type="daughter"
    )
    assert rel.relationship_type == "daughter"

    # 3. Consent Use Cases
    grant_consent_uc = GrantConsentUseCase(family_service)
    consent = await grant_consent_uc.execute(
        requester_id=parent_profile.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_id=coord_profile.id,
        scope={"vitals": True, "medications": True, "health_summary": True}
    )
    assert consent.status == "active"

    revoke_consent_uc = RevokeConsentUseCase(family_service)
    revoked = await revoke_consent_uc.execute(
        requester_id=parent_profile.id,
        family_id=family.id,
        consent_id=consent.id
    )
    assert revoked.status == "revoked"

    # Re-grant for subsequent use cases
    await grant_consent_uc.execute(
        requester_id=parent_profile.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_id=coord_profile.id,
        scope={"vitals": True, "medications": True, "health_summary": True}
    )

    # 4. Checkin & Health Summary Use Cases
    submit_checkin_uc = SubmitParentCheckInUseCase(family_service)
    checkin = await submit_checkin_uc.execute(
        requester_id=parent_profile.id,
        subject_id=subject.id,
        feeling="good",
        notes="Walked 2km in the morning."
    )
    assert checkin.feeling == "good"

    get_health_summary_uc = GetParentHealthSummaryUseCase(family_service)
    summary = await get_health_summary_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        subject_id=subject.id
    )
    assert summary["subject_id"] == str(subject.id)

    # 5. Medication Use Cases
    confirm_med_uc = ConfirmMedicationUseCase(family_service)
    adherence = await confirm_med_uc.execute(
        requester_id=parent_profile.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="med-amlodipine-5mg",
        scheduled_at=now
    )
    assert adherence.status == "taken"

    reminder_uc = SendMedicationReminderUseCase(family_service)
    reminder = await reminder_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        recipient_profile_id=parent_profile.id,
        subject_id=subject.id,
        medication_name="Amlodipine 5mg",
        scheduled_time_str="8:00 AM"
    )
    assert reminder.type == "medication_reminder"

    # 6. Care Task Use Cases
    create_task_uc = CreateCareTaskUseCase(family_service)
    task = await create_task_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=None,
        title="Check BP",
        priority="high",
        due_at=now + timedelta(days=1)
    )
    assert task.title == "Check BP"

    assign_task_uc = AssignCareTaskUseCase(family_service)
    assigned = await assign_task_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        task_id=task.id,
        assigned_to_profile_id=coord_profile.id
    )
    assert assigned.assigned_to_profile_id == coord_profile.id

    complete_task_uc = CompleteCareTaskUseCase(family_service)
    completed = await complete_task_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        task_id=task.id
    )
    assert completed.status == "completed"

    # 7. Appointments Use Cases
    prep_appt_uc = PrepareAppointmentUseCase(family_service)
    appt = await prep_appt_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_appointment_id="appt-cardio-55",
        notes="Review blood pressure readings"
    )
    assert appt.fhir_appointment_id == "appt-cardio-55"

    get_appts_uc = GetUpcomingAppointmentsUseCase(family_service)
    appts = await get_appts_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        subject_id=subject.id
    )
    assert len(appts) >= 1

    # 8. Documents Use Cases
    upload_doc_uc = UploadHealthDocumentUseCase(family_service)
    doc_file_id = uuid.uuid4()
    doc = await upload_doc_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        subject_id=subject.id,
        filenest_file_id=doc_file_id,
        document_type="lab_report",
        title="Lipid Panel 2026",
        mime_type="application/pdf"
    )
    assert doc.document_type == "lab_report"


    process_doc_uc = ProcessHealthDocumentUseCase(family_service)
    extraction = await process_doc_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        document_id=doc.id,
        extracted_text="Cholesterol: 180 mg/dL, HDL: 50 mg/dL",
        structured_data={"cholesterol": 180, "hdl": 50}
    )
    assert extraction.raw_output is not None

    review_doc_uc = ReviewDocumentExtractionUseCase(family_service)
    reviewed = await review_doc_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        extraction_id=extraction.id,
        approved=True
    )
    assert reviewed.review_status == "approved"


    # 9. AI & Guardian Moment Use Cases
    ask_kinguardian_uc = AskKinGuardianUseCase(context_builder, safety_guard, family_service)
    ai_resp = await ask_kinguardian_uc.execute(
        actor_id=coord_profile.id,
        family_id=family.id,
        query="Did Dad take his medication?",
        subject_id=subject.id
    )
    assert ai_resp["status"] == "answered"

    gen_insight_uc = GenerateHealthInsightUseCase(family_service)
    insights = await gen_insight_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        subject_id=subject.id
    )
    assert insights.type == "vital_trends"


    gen_moment_uc = GenerateGuardianMomentUseCase(family_service)
    moment = await gen_moment_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        subject_id=subject.id,
        title="Morning Vitals Steady",
        summary="Blood pressure is within target range.",
        observation="Consistent morning readings.",
        recommendation="Maintain current dosage."
    )
    assert moment.type == "guardian_moment"

    # 10. Communication & Notifications Use Cases
    # Conversation setup
    conv = await family_service.create_family_conversation(
        requester_id=coord_profile.id,
        family_id=family.id,
        subject_id=subject.id
    )



    create_msg_uc = CreateFamilyMessageUseCase(family_service)
    msg = await create_msg_uc.execute(
        sender_id=coord_profile.id,
        family_id=family.id,
        conversation_id=conv.id,
        content="Good morning, checking in on Dad's schedule."
    )
    assert msg.body == "Good morning, checking in on Dad's schedule."


    send_notif_uc = SendNotificationUseCase(family_service)
    notif = await send_notif_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id,
        recipient_profile_id=parent_profile.id,
        type="general_update",
        title="Family Update",
        body="Dr. Sharma confirmed tomorrow's visit.",
        priority="normal"
    )
    assert notif.title == "Family Update"

    # 11. Home Screen Use Cases
    get_coord_home_uc = GetCoordinatorHomeUseCase(home_read_service)
    coord_home = await get_coord_home_uc.execute(
        requester_id=coord_profile.id,
        family_id=family.id
    )
    assert coord_home.family["name"] == "Deepak Care Circle"
    assert len(coord_home.recent_checkins) >= 1

    get_parent_home_uc = GetParentHomeUseCase(home_read_service)
    parent_home = await get_parent_home_uc.execute(
        requester_id=parent_profile.id,
        family_id=family.id
    )
    assert parent_home.family["name"] == "Deepak Care Circle"
