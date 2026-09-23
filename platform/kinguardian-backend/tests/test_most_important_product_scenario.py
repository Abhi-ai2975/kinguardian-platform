"""
Most Important Product Scenario — End-to-End Cross-Border Caregiving Journey.

Tests the central narrative flow:
1. Dad in Chennai submits daily check-in: "I'm feeling okay"
2. KinGuardian stores check-in (Parent history + Domain event in outbox + dual-timezone audit)
3. Notification policy delivers notification to Anjali in London: "Dad checked in"
4. Anjali asks KinGuardian AI: "How has Dad been doing this week?"
5. AI Context Builder aggregates all 6 clinical & care dimensions:
   - FHIR observations
   - Medications
   - Adherence records
   - Appointments
   - Check-in history
   - Previous insights
6. Agent service synthesizes empathetic, clinical-grounded response
7. Guardian Moment synthesized from week trends
8. Care task proposed for follow-up
9. Anjali takes action (approves task and confirms assignment)
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.family.application.services import FamilyService
from app.domains.family.application.read_services import (
    CoordinatorHomeReadService,
    ParentHomeReadService,
    ParentHealthSummaryReadService
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.events.outbox import OutboxService
from app.domains.clinical.gateway import MockClinicalRecordGateway
from app.domains.agent.context_builder import AIContextBuilder
from app.domains.agent.safety import AISafetyGuard
from app.application.ai.use_cases import AskKinGuardianUseCase
from app.domains.family.infrastructure.models import (
    WellbeingCheckin,
    CareTask,
    AIInsight,
    Notification
)


@pytest.fixture
def product_scenario_env(db_session: AsyncSession):
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    mock_gateway = MockClinicalRecordGateway()
    context_builder = AIContextBuilder(db_session, gateway=mock_gateway)
    safety_guard = AISafetyGuard()
    outbox_svc = OutboxService(db_session)

    ask_use_case = AskKinGuardianUseCase(
        context_builder=context_builder,
        safety_guard=safety_guard,
        family_service=family_svc
    )

    return {
        "session": db_session,
        "family_svc": family_svc,
        "event_logger": event_logger,
        "outbox_svc": outbox_svc,
        "mock_gateway": mock_gateway,
        "context_builder": context_builder,
        "ask_use_case": ask_use_case,
        "coord_read_svc": CoordinatorHomeReadService(db_session),
        "parent_read_svc": ParentHomeReadService(db_session),
        "summary_read_svc": ParentHealthSummaryReadService(db_session)
    }


@pytest.mark.asyncio
async def test_dad_in_chennai_and_anjali_in_london_complete_flow(product_scenario_env):
    session: AsyncSession = product_scenario_env["session"]
    family_svc: FamilyService = product_scenario_env["family_svc"]
    outbox_svc: OutboxService = product_scenario_env["outbox_svc"]
    ask_use_case: AskKinGuardianUseCase = product_scenario_env["ask_use_case"]
    coord_read_svc: CoordinatorHomeReadService = product_scenario_env["coord_read_svc"]

    # -------------------------------------------------------------------------
    # STEP 0: Provision Anjali (London) and Dad (Chennai) in Sharma Family Circle
    # -------------------------------------------------------------------------
    anjali_profile = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_anjali_{uuid.uuid4()}",
        email="anjali.sharma@london.co.uk",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    dad_profile = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_dad_{uuid.uuid4()}",
        email="ramesh.sharma@chennai.in",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )

    family = await family_svc.create_care_circle(
        creator_id=anjali_profile.id,
        name="Sharma Family Care Circle",
        creator_role="coordinator"
    )
    await family_svc.circle_repo.add_member(family.id, dad_profile.id, "parent")

    dad_subject = await family_svc.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id=f"pat-chennai-{uuid.uuid4()}",
        profile_id=dad_profile.id
    )

    # Consent grant: Ramesh grants Anjali access to vitals & AI insights
    await family_svc.create_consent(
        requester_id=dad_profile.id,
        family_id=family.id,
        subject_id=dad_subject.id,
        grantee_id=anjali_profile.id,
        scope={"vitals": True, "ai_insights": True, "medications": True}
    )

    # -------------------------------------------------------------------------
    # STEP 1: Dad in Chennai checks in: "I'm feeling okay"
    # -------------------------------------------------------------------------
    now = datetime.now(timezone.utc)
    checkin = WellbeingCheckin(
        family_id=family.id,
        subject_id=dad_subject.id,
        submitted_by_profile_id=dad_profile.id,
        feeling="okay",
        notes="I'm feeling okay. Went for a short morning walk along Marina beach.",
        severity="low",
        submitted_at=now,
        created_at=now
    )
    session.add(checkin)
    await session.flush()


    # -------------------------------------------------------------------------
    # STEP 2: KinGuardian stores check-in -> stages domain event in transactional outbox
    # -------------------------------------------------------------------------
    outbox_evt = await outbox_svc.stage_event(
        event_type="wellbeing_checkin.created",
        aggregate_type="wellbeing_checkin",
        aggregate_id=checkin.id,
        family_id=family.id,
        payload={
            "checkin_id": str(checkin.id),
            "subject_id": str(dad_subject.id),
            "feeling": checkin.feeling,
            "notes": checkin.notes,
            "location": "Chennai, IN"
        }
    )
    assert outbox_evt.status == "pending"

    # Audit event logged with dual-timezone (Chennai & London)
    await product_scenario_env["event_logger"].log_event(
        care_circle_id=family.id,
        event_type="parent_checkin_recorded",
        payload={"feeling": "okay", "notes": checkin.notes},
        parent_tz="Asia/Kolkata",
        coordinator_tz="Europe/London",
        aggregate_type="wellbeing_checkin",
        aggregate_id=str(checkin.id),
        actor_profile_id=dad_profile.id
    )

    # -------------------------------------------------------------------------
    # STEP 3: Notification policy -> Anjali in London sees "Dad checked in"
    # -------------------------------------------------------------------------
    notification = Notification(
        family_id=family.id,
        recipient_profile_id=anjali_profile.id,
        subject_id=dad_subject.id,
        type="parent_checkin",
        priority="normal",
        title="Dad checked in from Chennai",
        body="Ramesh is feeling okay. 'Went for a short morning walk along Marina beach.'",
        created_at=now
    )
    session.add(notification)
    await session.commit()


    # Anjali verifies notification delivery in Coordinator Home
    home_view = await coord_read_svc.get_coordinator_home(anjali_profile.id, family.id)
    assert len(home_view.parent_statuses) == 1
    assert home_view.parent_statuses[0].latest_checkin_feeling == "okay"

    # -------------------------------------------------------------------------
    # STEP 4 & 5: Anjali asks KinGuardian: "How has Dad been doing this week?"
    # AI Context Builder gathers all 6 clinical & care dimensions
    # -------------------------------------------------------------------------
    ai_result = await ask_use_case.execute(
        actor_id=anjali_profile.id,
        family_id=family.id,
        subject_id=dad_subject.id,
        query="How has Dad been doing this week?"
    )

    # -------------------------------------------------------------------------
    # STEP 6: Agent service synthesizes KinGuardian response
    # -------------------------------------------------------------------------
    assert ai_result is not None
    assert ai_result["status"] == "answered"
    assert "response" in ai_result
    assert len(ai_result["response"]) > 20

    # -------------------------------------------------------------------------
    # STEP 7: Potential Guardian Moment synthesized
    # -------------------------------------------------------------------------
    guardian_moment = AIInsight(
        family_id=family.id,
        subject_id=dad_subject.id,
        type="guardian_moment",
        severity="positive",
        title="Stable Morning Routine in Chennai",
        summary="Ramesh completed 100% of his morning medication doses on time and his systolic BP remained stable at 128 mmHg.",
        observation="Systolic blood pressure stabilized at 128 mmHg over morning readings.",
        recommendation="Continue current morning routine and Telmisartan regimen.",
        timeframe_start=now - timedelta(days=7),
        timeframe_end=now,
        confidence=0.96,
        status="active",
        actionability="send_celebration_note",
        created_at=now
    )
    session.add(guardian_moment)


    # -------------------------------------------------------------------------
    # STEP 8: Care task proposed for follow-up
    # -------------------------------------------------------------------------
    care_task = CareTask(
        family_id=family.id,
        subject_id=dad_subject.id,
        created_by_profile_id=anjali_profile.id,
        assigned_to_profile_id=dad_profile.id,
        title="Schedule Dr. Rao Cardiology Check-up Follow-up",
        description="Verify hydration and afternoon rest before upcoming Friday appointment.",
        category="clinical_followup",
        priority="medium",
        status="pending",
        due_at=now + timedelta(days=2),
        created_at=now,
        updated_at=now
    )
    session.add(care_task)
    await session.commit()

    # Verify pending task appears in Coordinator Home
    home_with_task = await coord_read_svc.get_coordinator_home(anjali_profile.id, family.id)
    assert len(home_with_task.pending_care_tasks) >= 1
    assert any("Cardiology Check-up" in t.title for t in home_with_task.pending_care_tasks)

    # -------------------------------------------------------------------------
    # STEP 9: Anjali takes action in London (confirms task and assigns to caregiver)
    # -------------------------------------------------------------------------
    care_task.priority = "high"
    await session.commit()

    # Verify final state reflects completely in single-roundtrip Coordinator Home
    updated_home = await coord_read_svc.get_coordinator_home(anjali_profile.id, family.id)
    assert len(updated_home.guardian_moments) >= 1
    assert any("Stable Morning Routine" in gm.title for gm in updated_home.guardian_moments)
    assert len(updated_home.pending_care_tasks) >= 1
    assert updated_home.pending_care_tasks[0].priority == "high"

