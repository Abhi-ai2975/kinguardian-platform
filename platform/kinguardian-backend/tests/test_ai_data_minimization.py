"""
AI Data Minimization Test Suite:
Verifies that the AI Context Engine retrieves ONLY the minimum clinical context
necessary to answer a specific user query.

Example Invariant:
User asks: "Did Dad take his evening medication?"
System MUST NOT send:
- full lab history
- all conditions / vitals
- all documents / family messages
System MUST send ONLY:
- medication and adherence context needed to answer.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.agent.context_builder import AIContextBuilder, infer_dimensions_from_query
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService


def test_infer_dimensions_from_user_query():
    """
    Tests query intent analysis and minimal dimension selection.
    """
    # 1. Evening medication inquiry
    med_dims = infer_dimensions_from_query("Did Dad take his evening medication?")
    assert "medications" in med_dims
    assert "adherence" in med_dims
    assert "labs" not in med_dims
    assert "recent_observations" not in med_dims
    assert "documents" not in med_dims
    assert "care_tasks" not in med_dims

    # 2. Vitals inquiry
    vitals_dims = infer_dimensions_from_query("What was Dad's blood pressure reading yesterday?")
    assert "recent_observations" in vitals_dims
    assert "medications" not in vitals_dims
    assert "labs" not in vitals_dims
    assert "appointments" not in vitals_dims

    # 3. Appointment inquiry
    appt_dims = infer_dimensions_from_query("When is Dad's next doctor appointment at the cardiology clinic?")
    assert "appointments" in appt_dims
    assert "medications" not in appt_dims
    assert "labs" not in appt_dims
    assert "recent_observations" not in appt_dims

    # 4. Lab results inquiry
    lab_dims = infer_dimensions_from_query("Can you show me the latest HbA1c blood test result?")
    assert "labs" in lab_dims
    assert "documents" in lab_dims
    assert "recent_observations" not in lab_dims
    assert "appointments" not in lab_dims


@pytest.mark.asyncio
async def test_ai_context_builder_query_data_minimization(db_session: AsyncSession):
    """
    End-to-end test verifying that when a user asks:
    'Did Dad take his evening medication?'
    Only medication/adherence context is assembled into the prompt context,
    and lab history, vitals, care tasks, and documents are suppressed.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    now = datetime.now(timezone.utc)

    # 1. Create Profiles & Care Circle
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_min_01",
        email="anjali.min@kinguardian.com",
        display_name="Anjali",
        timezone="Europe/London"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_min_01",
        email="ramesh.min@kinguardian.com",
        display_name="Ramesh",
        timezone="Asia/Kolkata"
    )

    family = await family_svc.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="synth-pat-min-101",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 2. Grant Broad Consent to Coordinator across all dimensions
    await family_svc.create_consent(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_id=coordinator.id,
        scope={
            "medications": True,
            "adherence": True,
            "vitals": True,
            "labs": True,
            "appointments": True,
            "documents": True,
            "care_tasks": True,
            "check_ins": True,
            "insights": True
        }
    )

    # 3. Seed data across ALL clinical dimensions
    # 3.1 Medication adherence
    await family_svc.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="med-metformin-500",
        scheduled_at=now,
        status="taken",
        source="parent"
    )


    # 2.2 Care task
    await family_svc.add_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coordinator.id,
        title="Schedule annual dental cleaning",
        description="Routine annual checkup",
        category="appointment",
        priority="medium",
        due_at=now + timedelta(days=5)
    )


    # 2.3 Check-in
    await family_svc.submit_subject_checkin(
        requester_id=parent.id,
        subject_id=subject.id,
        feeling="good",
        notes="Morning walk completed."
    )

    # 3. Build Minimized Context for query: "Did Dad take his evening medication?"
    builder = AIContextBuilder(db_session)
    scoped_payload = await builder.build_scoped_context(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_ids=[subject.id],
        user_query="Did Dad take his evening medication?"
    )

    assert len(scoped_payload.subjects) == 1
    subj_ctx = scoped_payload.subjects[0]

    # Invariant: Medication and adherence MUST be present
    assert "medications" in subj_ctx.authorized_dimensions
    assert "adherence" in subj_ctx.authorized_dimensions
    assert subj_ctx.adherence is not None
    assert subj_ctx.adherence["taken_count"] >= 1

    # Invariant: Labs, vitals, documents, care tasks, and check-ins MUST NOT be retrieved
    assert "labs" not in subj_ctx.authorized_dimensions
    assert subj_ctx.labs is None
    assert "recent_observations" not in subj_ctx.authorized_dimensions
    assert subj_ctx.recent_observations is None
    assert "documents" not in subj_ctx.authorized_dimensions
    assert subj_ctx.documents is None
    assert "care_tasks" not in subj_ctx.authorized_dimensions
    assert subj_ctx.care_tasks is None
    assert "check_ins" not in subj_ctx.authorized_dimensions
    assert subj_ctx.check_ins is None

    # Invariant: Formatted prompt string contains ONLY medication sections and NO lab/vitals sections
    prompt_str = scoped_payload.to_prompt_context()
    assert "Adherence Metrics" in prompt_str
    assert "Diagnostic Lab Results" not in prompt_str
    assert "Recent Vital Signs" not in prompt_str
    assert "Care Tasks" not in prompt_str
    assert "Wellbeing Check-ins" not in prompt_str
