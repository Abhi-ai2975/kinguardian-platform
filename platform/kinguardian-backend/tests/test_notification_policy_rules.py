import pytest
import uuid
from datetime import datetime, timedelta

from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.notifications.rules import (
    NotificationPolicyEngine,
    ParentCheckinSubmittedRule,
    MedicationMissedRule,
    GuardianMomentCreatedRule,
    AppointmentTomorrowRule
)
from app.domains.notifications.services import NotificationService


@pytest.mark.asyncio
async def test_notification_policy_rule_parent_checkin_submitted(db_session):
    """
    Rule 1: Parent check-in submitted → notify coordinator
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_rule1",
        email="coord_rule1@kinguardian.com",
        display_name="Maya Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_rule1",
        email="parent_rule1@kinguardian.com",
        display_name="George Senior",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coordinator.id, "George Care Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-rule1",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    notif_service = NotificationService(
        family_repo=family_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    # Process Domain Event: wellbeing_checkin_submitted
    dispatched = await notif_service.process_domain_event(
        event_type="wellbeing_checkin_submitted",
        family_id=family.id,
        subject_id=subject.id,
        payload={"feeling": "good", "notes": "Walked in the park this morning."}
    )

    assert len(dispatched) == 1
    notif = dispatched[0]
    assert notif.recipient_profile_id == coordinator.id
    assert notif.title == "Parent Check-in Received"
    assert "George Senior submitted a daily wellbeing check-in: Feeling good" in notif.body
    assert "Walked in the park" in notif.body


@pytest.mark.asyncio
async def test_notification_policy_rule_medication_missed(db_session):
    """
    Rule 2: Medication missed
    → notify parent first (dispatch_order=1)
    → notify coordinator according to policy (dispatch_order=2)
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_rule2",
        email="coord_rule2@kinguardian.com",
        display_name="Maya Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_rule2",
        email="parent_rule2@kinguardian.com",
        display_name="David Senior",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coordinator.id, "David Care Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-rule2",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    notif_service = NotificationService(
        family_repo=family_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    # Process Domain Event: medication_missed
    dispatched = await notif_service.process_domain_event(
        event_type="medication_missed",
        family_id=family.id,
        subject_id=subject.id,
        payload={"medication_name": "Metformin 500mg", "status": "missed"}
    )

    # 2 notifications dispatched: 1st parent, 2nd coordinator
    assert len(dispatched) == 2

    parent_notif = dispatched[0]
    assert parent_notif.recipient_profile_id == parent.id
    assert parent_notif.title == "Missed Medication Dose"
    assert "Metformin 500mg" in parent_notif.body

    coord_notif = dispatched[1]
    assert coord_notif.recipient_profile_id == coordinator.id
    assert coord_notif.title == "Medication Missed Alert"
    assert "David Senior missed their scheduled Metformin 500mg" in coord_notif.body


@pytest.mark.asyncio
async def test_notification_policy_rule_guardian_moment_created(db_session):
    """
    Rule 3: Guardian moment created → notify coordinator
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_rule3",
        email="coord_rule3@kinguardian.com",
        display_name="Dr. Sarah Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_rule3",
        email="parent_rule3@kinguardian.com",
        display_name="Eleanor Senior",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coordinator.id, "Eleanor Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-rule3",
        profile_id=parent.id,
        relationship_to_coordinator="mother"
    )

    notif_service = NotificationService(
        family_repo=family_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    # Process Domain Event: guardian_moment_created
    dispatched = await notif_service.process_domain_event(
        event_type="guardian_moment_created",
        family_id=family.id,
        subject_id=subject.id,
        payload={
            "insight_id": str(uuid.uuid4()),
            "title": "Consistent 14-Day Morning BP Normalization",
            "summary": "Eleanor's systolic BP has stabilized within 120-125 mmHg for 2 continuous weeks.",
            "severity": "normal"
        }
    )

    assert len(dispatched) == 1
    notif = dispatched[0]
    assert notif.recipient_profile_id == coordinator.id
    assert notif.title == "Guardian Moment: Consistent 14-Day Morning BP Normalization"
    assert "systolic BP has stabilized" in notif.body


@pytest.mark.asyncio
async def test_notification_policy_rule_appointment_tomorrow(db_session):
    """
    Rule 4: Appointment tomorrow
    → notify parent
    → notify assigned caregiver / coordinator
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_rule4",
        email="coord_rule4@kinguardian.com",
        display_name="Maya Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_rule4",
        email="parent_rule4@kinguardian.com",
        display_name="Robert Senior",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coordinator.id, "Robert Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-rule4",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    notif_service = NotificationService(
        family_repo=family_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    # Process Domain Event: appointment_reminder_tomorrow
    dispatched = await notif_service.process_domain_event(
        event_type="appointment_reminder_tomorrow",
        family_id=family.id,
        subject_id=subject.id,
        payload={
            "appointment_id": "appt-999",
            "appointment_time": "10:30 AM",
            "doctor_name": "Dr. Mehta (Cardiology)",
            "assigned_caregiver_profile_id": str(coordinator.id)
        }
    )

    assert len(dispatched) == 2

    parent_notif = dispatched[0]
    assert parent_notif.recipient_profile_id == parent.id
    assert parent_notif.title == "Appointment Reminder: Tomorrow"
    assert "Dr. Mehta (Cardiology)" in parent_notif.body

    caregiver_notif = dispatched[1]
    assert caregiver_notif.recipient_profile_id == coordinator.id
    assert caregiver_notif.title == "Upcoming Appointment Tomorrow"
    assert "Robert Senior has a scheduled doctor visit tomorrow" in caregiver_notif.body
