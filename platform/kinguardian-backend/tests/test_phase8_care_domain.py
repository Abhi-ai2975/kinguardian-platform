"""
Phase 8 — Care Domain Comprehensive Test Suite.

Validates:
1. Care tasks creation (category, priority, due date)
2. Task assignments (assigning tasks to specific family members/caregivers)
3. Task lifecycle (pending -> in_progress -> completed with completion metadata)
4. Caregiver workflows (listing and executing assigned care duties)
5. Medication adherence tracking (confirming doses taken/missed with dual timestamps)
6. Parent wellbeing check-ins (recording feeling, severity, notes, voice file linkages)
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta

from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService


@pytest.fixture
def family_service(db_session):
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(db_session),
        circle_repo=SQLAlchemyFamilyRepository(db_session),
        consent_repo=SQLAlchemyConsentRepository(db_session),
        event_logger=EventService(db_session)
    )


@pytest.mark.asyncio
async def test_care_task_creation_assignment_and_lifecycle(family_service, db_session):
    """
    1. Care Tasks, 2. Assignments, and 3. Task Lifecycle:
    Verifies creating tasks, assigning them to caregivers, updating status, and completing tasks.
    """
    coordinator = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"coord_care_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Anjali Coordinator"
    )
    caregiver = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"caregiver_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Priya Nurse"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"parent_care_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Ramesh Parent"
    )

    family = await family_service.create_care_circle(
        creator_id=coordinator.id,
        name="Care Operations Family",
        creator_role="coordinator"
    )
    await family_service.circle_repo.add_member(family.id, caregiver.id, "caregiver")
    await family_service.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_service.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-care-001",
        profile_id=parent.id
    )

    # 1. Create Care Task
    due_date = datetime.now(timezone.utc) + timedelta(days=1)
    task = await family_service.add_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coordinator.id,
        title="Check morning blood glucose and BP vitals",
        description="Verify fasting blood glucose before breakfast and record systolic/diastolic BP",
        category="medication",
        priority="high",
        due_at=due_date
    )
    assert task is not None
    assert task.status == "pending"
    assert task.title == "Check morning blood glucose and BP vitals"
    assert task.priority == "high"

    # 2. Re-assign task to Caregiver
    assigned_task = await family_service.assign_care_task(
        requester_id=coordinator.id,
        task_id=task.id,
        assigned_to_profile_id=caregiver.id
    )
    assert assigned_task.assigned_to_profile_id == caregiver.id

    # 3. Update status to in_progress
    in_progress_task = await family_service.update_care_task_by_id(
        requester_id=caregiver.id,
        task_id=task.id,
        status="in_progress"
    )
    assert in_progress_task.status == "in_progress"

    # 4. Complete Care Task
    completed_task = await family_service.complete_care_task(
        requester_id=caregiver.id,
        family_id=family.id,
        task_id=task.id
    )
    assert completed_task.status == "completed"
    assert completed_task.completed_by_profile_id == caregiver.id
    assert completed_task.completed_at is not None

    # Verify task events logged
    events = await family_service.event_logger.get_circle_events(family.id)
    event_types = [e.event_type for e in events]
    assert "care_task_created" in event_types
    assert "care_task_assigned" in event_types
    assert "care_task_completed" in event_types


@pytest.mark.asyncio
async def test_caregiver_workflow_and_medication_adherence(family_service, db_session):
    """
    4. Caregiver Workflows & 5. Medication Adherence:
    Verifies recording medication adherence confirmations (taken/skipped) linked to FHIR prescription.
    """
    coordinator = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"coord_adh_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    caregiver = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"nurse_adh_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Nurse Priya"
    )
    parent = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"parent_adh_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Parent"
    )

    family = await family_service.create_care_circle(
        creator_id=coordinator.id,
        name="Adherence Tracking Family",
        creator_role="coordinator"
    )
    await family_service.circle_repo.add_member(family.id, caregiver.id, "caregiver")
    await family_service.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_service.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-adh-002",
        profile_id=parent.id
    )

    # 1. Caregiver confirms morning medication dose was taken
    now = datetime.now(timezone.utc)
    adherence_taken = await family_service.record_adherence_event(
        requester_id=caregiver.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="med-req-metformin-500",
        scheduled_at=now,
        status="taken",
        source="caregiver"
    )
    assert adherence_taken is not None
    assert adherence_taken.status == "taken"
    assert adherence_taken.confirmed_by_profile_id == caregiver.id
    assert adherence_taken.confirmed_at is not None

    # 2. Confirm evening dose skipped/missed
    adherence_skipped = await family_service.record_adherence_event(
        requester_id=caregiver.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="med-req-atorvastatin-20",
        scheduled_at=now + timedelta(hours=8),
        status="skipped",
        source="caregiver"
    )
    assert adherence_skipped.status == "skipped"

    # List adherence records
    history = await family_service.list_adherence_events(
        requester_id=caregiver.id,
        family_id=family.id,
        subject_id=subject.id
    )
    assert len(history) == 2


@pytest.mark.asyncio
async def test_parent_wellbeing_checkins(family_service, db_session):
    """
    6. Parent Wellbeing Check-ins:
    Verifies submitting daily wellbeing check-ins, tracking feeling and severity notes.
    """
    parent = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"parent_chk_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Ramesh Parent",
        timezone="Asia/Kolkata"
    )
    coordinator = await family_service.get_or_create_profile(
        iam_subject_id=f"iam_{uuid.uuid4()}",
        email=f"coord_chk_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    family = await family_service.create_care_circle(
        creator_id=coordinator.id,
        name="Checkin Family",
        creator_role="coordinator"
    )
    await family_service.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_service.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-chk-003",
        profile_id=parent.id
    )

    # Parent submits daily check-in
    checkin = await family_service.submit_subject_checkin(
        requester_id=parent.id,
        subject_id=subject.id,
        feeling="good",
        notes="Walked 2 kilometers in the garden. Feeling refreshed and active today.",
        severity="low"
    )
    assert checkin is not None
    assert checkin.feeling == "good"
    assert checkin.severity == "low"
    assert checkin.submitted_by_profile_id == parent.id

    # Retrieve checkin history
    checkins = await family_service.list_subject_checkins(
        requester_id=parent.id,
        subject_id=subject.id
    )
    assert len(checkins) == 1
    assert checkins[0].feeling == "good"
