"""
Safe Development Seed Script for DrGodly / KinGuardian Platform.
Populates safe, non-real synthetic data for development, UI preview, and testing:
- Family: "Anjali's Family"
- Coordinator: Anjali — London (Europe/London)
- Parents: Ramesh — Chennai (Asia/Kolkata), Lakshmi — Chennai (Asia/Kolkata)
- Sibling: Rahul — Dubai (Asia/Dubai)
- Caregiver: Priya — Bengaluru (Asia/Kolkata)
- Relationships, permissions/consents, check-ins, tasks, medication adherence, appointments, insights, notifications.
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add backend root to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import db
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    FamilyRelationship,
    CareSubject,
    CareRelationship,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    MonitoringPreference,
    AIInsight,
    AIInsightSource,
    Notification,
    AppointmentCoordination,
    Consent
)
from app.domains.events.models import EventLog, OutboxEvent


# Deterministic Synthetic UUIDs for repeatable development testing
ANJALI_ID = uuid.UUID("a1111111-1111-4111-8111-111111111111")
RAMESH_ID = uuid.UUID("a2222222-2222-4222-8222-222222222222")
LAKSHMI_ID = uuid.UUID("a3333333-3333-4333-8333-333333333333")
RAHUL_ID = uuid.UUID("a4444444-4444-4444-8444-444444444444")
PRIYA_ID = uuid.UUID("a5555555-5555-4555-8555-555555555555")
FAMILY_ID = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
RAMESH_SUBJECT_ID = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
LAKSHMI_SUBJECT_ID = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccccc")



async def seed_development_data(session: AsyncSession) -> dict:
    existing_profile = await session.get(AppProfile, ANJALI_ID)
    if existing_profile:
        return {"status": "already_seeded"}

    utc_now = datetime.now(timezone.utc)

    # 1. Profiles
    anjali = AppProfile(
        id=ANJALI_ID,
        iam_subject_id="iam_anjali_london_001",
        display_name="Anjali",
        first_name="Anjali",
        last_name="Sharma",
        email="anjali.coordinator@example.com",
        city="London",
        country_code="GB",
        timezone="Europe/London",
        preferred_language="en",
        status="active"
    )

    ramesh = AppProfile(
        id=RAMESH_ID,
        iam_subject_id="iam_ramesh_chennai_002",
        display_name="Ramesh",
        first_name="Ramesh",
        last_name="Sharma",
        email="ramesh.parent@example.com",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata",
        preferred_language="ta",
        status="active"
    )

    lakshmi = AppProfile(
        id=LAKSHMI_ID,
        iam_subject_id="iam_lakshmi_chennai_003",
        display_name="Lakshmi",
        first_name="Lakshmi",
        last_name="Sharma",
        email="lakshmi.parent@example.com",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata",
        preferred_language="ta",
        status="active"
    )

    rahul = AppProfile(
        id=RAHUL_ID,
        iam_subject_id="iam_rahul_dubai_004",
        display_name="Rahul",
        first_name="Rahul",
        last_name="Sharma",
        email="rahul.sibling@example.com",
        city="Dubai",
        country_code="AE",
        timezone="Asia/Dubai",
        preferred_language="en",
        status="active"
    )

    priya = AppProfile(
        id=PRIYA_ID,
        iam_subject_id="iam_priya_bengaluru_005",
        display_name="Priya",
        first_name="Priya",
        last_name="Nair",
        email="priya.caregiver@example.com",
        city="Bengaluru",
        country_code="IN",
        timezone="Asia/Kolkata",
        preferred_language="kn",
        status="active"
    )

    session.add_all([anjali, ramesh, lakshmi, rahul, priya])

    # 2. Family Circle
    family = Family(
        id=FAMILY_ID,
        name="Anjali's Family",
        primary_coordinator_profile_id=ANJALI_ID
    )
    session.add(family)

    # 3. Family Memberships
    m_anjali = FamilyMembership(id=uuid.uuid4(), family_id=FAMILY_ID, profile_id=ANJALI_ID, membership_role="primary_coordinator", status="active")
    m_ramesh = FamilyMembership(id=uuid.uuid4(), family_id=FAMILY_ID, profile_id=RAMESH_ID, membership_role="elder_parent", status="active")
    m_lakshmi = FamilyMembership(id=uuid.uuid4(), family_id=FAMILY_ID, profile_id=LAKSHMI_ID, membership_role="elder_parent", status="active")
    m_rahul = FamilyMembership(id=uuid.uuid4(), family_id=FAMILY_ID, profile_id=RAHUL_ID, membership_role="secondary_coordinator", status="active")
    m_priya = FamilyMembership(id=uuid.uuid4(), family_id=FAMILY_ID, profile_id=PRIYA_ID, membership_role="family_viewer", status="active")

    session.add_all([m_anjali, m_ramesh, m_lakshmi, m_rahul, m_priya])

    # 4. Care Subjects
    sub_ramesh = CareSubject(
        id=RAMESH_SUBJECT_ID,
        family_id=FAMILY_ID,
        profile_id=RAMESH_ID,
        fhir_patient_id="synthetic-pat-ramesh-001",
        relationship_to_coordinator="father",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata",
        status="active"
    )

    sub_lakshmi = CareSubject(
        id=LAKSHMI_SUBJECT_ID,
        family_id=FAMILY_ID,
        profile_id=LAKSHMI_ID,
        fhir_patient_id="synthetic-pat-lakshmi-002",
        relationship_to_coordinator="mother",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata",
        status="active"
    )

    session.add_all([sub_ramesh, sub_lakshmi])

    # 5. Care Relationships
    cr1 = CareRelationship(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=RAMESH_SUBJECT_ID, profile_id=ANJALI_ID, relationship_type="primary_coordinator")
    cr2 = CareRelationship(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=RAMESH_SUBJECT_ID, profile_id=RAHUL_ID, relationship_type="secondary_coordinator")
    cr3 = CareRelationship(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=RAMESH_SUBJECT_ID, profile_id=PRIYA_ID, relationship_type="local_caregiver")
    cr4 = CareRelationship(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=LAKSHMI_SUBJECT_ID, profile_id=ANJALI_ID, relationship_type="primary_coordinator")
    cr5 = CareRelationship(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=LAKSHMI_SUBJECT_ID, profile_id=RAHUL_ID, relationship_type="secondary_coordinator")
    cr6 = CareRelationship(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=LAKSHMI_SUBJECT_ID, profile_id=PRIYA_ID, relationship_type="local_caregiver")


    session.add_all([cr1, cr2, cr3, cr4, cr5, cr6])

    # 6. Granular Consents & Permissions
    full_scope = {"vitals": True, "medications": True, "documents": True, "ai_insights": True, "appointments": True, "messaging": True}
    caregiver_scope = {"medications": True, "appointments": True, "messaging": True}

    c1 = Consent(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=RAMESH_SUBJECT_ID, grantor_profile_id=RAMESH_ID, grantee_profile_id=ANJALI_ID, consent_type="explicit", scope=full_scope, status="active", version=1)
    c2 = Consent(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=LAKSHMI_SUBJECT_ID, grantor_profile_id=LAKSHMI_ID, grantee_profile_id=ANJALI_ID, consent_type="explicit", scope=full_scope, status="active", version=1)
    c3 = Consent(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=RAMESH_SUBJECT_ID, grantor_profile_id=RAMESH_ID, grantee_profile_id=RAHUL_ID, consent_type="explicit", scope=full_scope, status="active", version=1)
    c4 = Consent(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=LAKSHMI_SUBJECT_ID, grantor_profile_id=LAKSHMI_ID, grantee_profile_id=RAHUL_ID, consent_type="explicit", scope=full_scope, status="active", version=1)
    c5 = Consent(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=RAMESH_SUBJECT_ID, grantor_profile_id=RAMESH_ID, grantee_profile_id=PRIYA_ID, consent_type="explicit", scope=caregiver_scope, status="active", version=1)
    c6 = Consent(id=uuid.uuid4(), family_id=FAMILY_ID, subject_id=LAKSHMI_SUBJECT_ID, grantor_profile_id=LAKSHMI_ID, grantee_profile_id=PRIYA_ID, consent_type="explicit", scope=caregiver_scope, status="active", version=1)

    session.add_all([c1, c2, c3, c4, c5, c6])

    # 7. Check-ins (Safe Synthetic Data)
    chk_ramesh = WellbeingCheckin(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        subject_id=RAMESH_SUBJECT_ID,
        submitted_by_profile_id=RAMESH_ID,
        feeling="good",
        notes="Morning walk completed at Semmozhi Poonga. Feeling energetic.",
        submitted_at=utc_now - timedelta(hours=2)
    )

    chk_lakshmi = WellbeingCheckin(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        subject_id=LAKSHMI_SUBJECT_ID,
        submitted_by_profile_id=LAKSHMI_ID,
        feeling="great",
        notes="Completed gentle yoga and morning meditation.",
        submitted_at=utc_now - timedelta(hours=3)
    )

    session.add_all([chk_ramesh, chk_lakshmi])

    # 8. Care Tasks
    task1 = CareTask(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        subject_id=RAMESH_SUBJECT_ID,
        created_by_profile_id=ANJALI_ID,
        assigned_to_profile_id=PRIYA_ID,
        title="Assist Ramesh with Weekly Medication Box Refill",
        description="Verify prescription count for the coming week.",
        category="medication",
        priority="high",
        status="pending",
        due_at=utc_now + timedelta(days=1)
    )

    task2 = CareTask(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        subject_id=LAKSHMI_SUBJECT_ID,
        created_by_profile_id=ANJALI_ID,
        assigned_to_profile_id=ANJALI_ID,
        title="Check in with Lakshmi on Evening Walk",
        description="Verify hydration and gentle evening walk routine.",
        category="check_in",
        priority="medium",
        status="completed",
        due_at=utc_now - timedelta(hours=12),
        completed_at=utc_now - timedelta(hours=10),
        completed_by_profile_id=ANJALI_ID
    )

    session.add_all([task1, task2])

    # 9. Medication Adherence Projections
    adh1 = MedicationAdherenceEvent(
        id=uuid.uuid4(),
        subject_id=RAMESH_SUBJECT_ID,
        fhir_medication_request_id="synthetic-med-req-001",
        scheduled_at=utc_now - timedelta(hours=4),
        confirmed_at=utc_now - timedelta(hours=4, minutes=-5),
        status="taken",
        confirmed_by_profile_id=RAMESH_ID,
        source="parent_app"
    )

    adh2 = MedicationAdherenceEvent(
        id=uuid.uuid4(),
        subject_id=LAKSHMI_SUBJECT_ID,
        fhir_medication_request_id="synthetic-med-req-002",
        scheduled_at=utc_now - timedelta(hours=4),
        confirmed_at=utc_now - timedelta(hours=4, minutes=-2),
        status="taken",
        confirmed_by_profile_id=LAKSHMI_ID,
        source="parent_app"
    )

    session.add_all([adh1, adh2])

    # 10. Appointments
    appt1 = AppointmentCoordination(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        subject_id=RAMESH_SUBJECT_ID,
        fhir_appointment_id="synthetic-appt-cardio-001",
        assigned_caregiver_profile_id=PRIYA_ID,
        preparation_status="ready",
        summary_status="pending",
        reminder_status="scheduled"
    )

    appt2 = AppointmentCoordination(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        subject_id=LAKSHMI_SUBJECT_ID,
        fhir_appointment_id="synthetic-appt-optom-002",
        assigned_caregiver_profile_id=PRIYA_ID,
        preparation_status="ready",
        summary_status="pending",
        reminder_status="scheduled"
    )

    session.add_all([appt1, appt2])

    # 11. AI Guardian Insights (Safe Baseline Observations)
    ins1 = AIInsight(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        subject_id=RAMESH_SUBJECT_ID,
        type="trend",
        severity="low",
        title="Consistent Morning Routine Observed",
        summary="Ramesh has maintained a regular morning check-in and activity cadence over the last 14 days.",
        observation="Morning activity window consistently falls between 06:30 and 08:00 IST.",
        recommendation="Continue current daily routine.",
        timeframe_start=utc_now - timedelta(days=14),
        timeframe_end=utc_now,
        confidence=0.94,
        status="active"
    )

    ins2 = AIInsight(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        subject_id=LAKSHMI_SUBJECT_ID,
        type="adherence",
        severity="low",
        title="100% On-Time Medication Confirmation",
        summary="Lakshmi confirmed all scheduled doses on time for 14 consecutive days.",
        observation="All 14 morning reminders confirmed within 15 minutes of prompt.",
        recommendation="Maintain adherence pace.",
        timeframe_start=utc_now - timedelta(days=14),
        timeframe_end=utc_now,
        confidence=0.98,
        status="active"
    )


    session.add_all([ins1, ins2])

    # 12. Notifications
    n1 = Notification(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        recipient_profile_id=ANJALI_ID,
        subject_id=RAMESH_SUBJECT_ID,
        type="medication_taken",
        title="Medication Confirmed",
        body="Ramesh confirmed his morning dose in Chennai.",
        priority="normal"
    )

    n2 = Notification(
        id=uuid.uuid4(),
        family_id=FAMILY_ID,
        recipient_profile_id=RAHUL_ID,
        subject_id=LAKSHMI_SUBJECT_ID,
        type="checkin_submitted",
        title="Parent Check-in Complete",
        body="Lakshmi submitted a positive wellbeing check-in.",
        priority="normal"
    )

    session.add_all([n1, n2])

    await session.commit()

    return {
        "family": "Anjali's Family",
        "coordinator": "Anjali (London)",
        "parents": ["Ramesh (Chennai)", "Lakshmi (Chennai)"],
        "sibling": "Rahul (Dubai)",
        "caregiver": "Priya (Bengaluru)",
        "care_subjects_count": 2,
        "care_relationships_count": 6,
        "consents_count": 6,
        "checkins_count": 2,
        "care_tasks_count": 2,
        "adherence_projections_count": 2,
        "appointments_count": 2,
        "insights_count": 2,
        "notifications_count": 2,
    }


async def main():
    async with db.session() as session:
        summary = await seed_development_data(session)
        print("Development Seed Complete:")
        for k, v in summary.items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    asyncio.run(main())
