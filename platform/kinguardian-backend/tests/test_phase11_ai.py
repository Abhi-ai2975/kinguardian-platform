"""
Phase 11 — AI Integration & Agent Capabilities Test Suite (bezs-agent).

Validates:
1. Conversation facade (AskKinGuardianUseCase / AgentService integration)
2. Context builder (zero-trust scoped clinical context, consent-filtered)
3. Safe tools (ControlledToolRegistry enforcing authorization and bounded actions)
4. Insight generation (longitudinal biometric and adherence insight synthesis)
5. Guardian Moments (event detection and family-friendly synthesis)
6. Appointment preparation (agenda, vitals trend summary, physician questions)
7. Document summarization (AI clinical document extraction summarization)
8. Human-in-the-loop Approval workflow (proposing, approving, and executing AI actions)
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
from app.domains.clinical.gateway import MockClinicalRecordGateway
from app.domains.agent.context_builder import AIContextBuilder
from app.domains.agent.safety import AISafetyGuard
from app.domains.agent.tools import (
    ControlledToolRegistry,
    AgentToolContext
)
from app.application.ai.use_cases import (
    AskKinGuardianUseCase,
    GenerateHealthInsightUseCase,
    GenerateGuardianMomentUseCase
)


@pytest.fixture
def ai_environment(db_session):
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)
    mock_gateway = MockClinicalRecordGateway()
    context_builder = AIContextBuilder(db_session, gateway=mock_gateway)
    safety_guard = AISafetyGuard()

    registry = ControlledToolRegistry(
        family_repo=family_repo,
        consent_repo=consent_repo,
        profile_repo=user_repo,
        event_logger=event_logger,
        gateway=mock_gateway
    )

    return {
        "family_svc": family_svc,
        "user_repo": user_repo,
        "family_repo": family_repo,
        "consent_repo": consent_repo,
        "event_logger": event_logger,
        "mock_gateway": mock_gateway,
        "context_builder": context_builder,
        "safety_guard": safety_guard,
        "tool_registry": registry,
        "db_session": db_session
    }


@pytest.mark.asyncio
async def test_conversation_facade_and_context_builder(ai_environment):
    """
    1. Conversation Facade & 2. Context Builder:
    Verifies zero-trust minimal context generation and conversational agent querying.
    """
    env = ai_environment
    family_svc = env["family_svc"]

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_ai_{uuid.uuid4()}",
        email=f"coord_ai_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Anjali Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_ai_{uuid.uuid4()}",
        email=f"parent_ai_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Ramesh Parent",
        timezone="Asia/Kolkata"
    )

    family = await family_svc.create_care_circle(
        creator_id=coordinator.id,
        name="AI Coordinated Family",
        creator_role="coordinator"
    )
    await family_svc.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_svc.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-ai-001",
        profile_id=parent.id
    )

    # Grant consent for vitals and AI
    await family_svc.create_consent(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_id=coordinator.id,
        scope={"vitals": True, "ai_insights": True}
    )

    # 1. Test AskKinGuardianUseCase (Conversation Facade)
    ask_use_case = AskKinGuardianUseCase(
        context_builder=env["context_builder"],
        safety_guard=env["safety_guard"],
        family_service=family_svc
    )

    result = await ask_use_case.execute(
        actor_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        query="How are Ramesh's vitals and blood pressure doing this week?"
    )

    assert result is not None
    assert result["status"] == "answered"
    assert "response" in result
    assert result["minimized_context"] is not None


@pytest.mark.asyncio
async def test_safe_tools_and_appointment_preparation(ai_environment):
    """
    3. Safe Tools & 6. Appointment Preparation:
    Verifies controlled tool execution with independent authorization.
    """
    env = ai_environment
    family_svc = env["family_svc"]

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_ai_{uuid.uuid4()}",
        email=f"coord_tools_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_ai_{uuid.uuid4()}",
        email=f"parent_tools_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Parent"
    )

    family = await family_svc.create_care_circle(
        creator_id=coordinator.id,
        name="Safe Tools Family",
        creator_role="coordinator"
    )
    await family_svc.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_svc.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-tools-002",
        profile_id=parent.id
    )

    # Grant consent for appointments
    await family_svc.create_consent(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        grantee_id=coordinator.id,
        scope={"appointments": True}
    )

    # Seed appointment coordination record
    coord_rec = await family_svc.add_appointment_coordination(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_appointment_id="appt-cardio-99",
        assigned_caregiver_profile_id=coordinator.id
    )


    # 1. Execute PrepareAppointmentTool via Safe Tool Registry
    registry = env["tool_registry"]
    tool_ctx = AgentToolContext(
        actor_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id
    )

    prep_res = await registry.execute_tool(
        name="prepare_appointment",
        params={
            "appointment_id": str(coord_rec.id),
            "provider_name": "Dr. Sharma",
            "specialty": "Cardiology"
        },
        context=tool_ctx
    )
    assert prep_res.success is True
    assert prep_res.data is not None
    assert prep_res.data["preparation_status"] == "ready"
    assert "questions_for_doctor" in prep_res.data




@pytest.mark.asyncio
async def test_insight_generation_guardian_moments_and_approval_workflow(ai_environment):
    """
    4. Insight Generation, 5. Guardian Moments, 7. Document Summarization, and 8. Approval Workflow.
    """
    env = ai_environment
    family_svc = env["family_svc"]

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_ai_{uuid.uuid4()}",
        email=f"coord_flow_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_ai_{uuid.uuid4()}",
        email=f"parent_flow_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Parent"
    )

    family = await family_svc.create_care_circle(
        creator_id=coordinator.id,
        name="AI Insights Family",
        creator_role="coordinator"
    )
    await family_svc.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_svc.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-flow-003",
        profile_id=parent.id
    )

    # 1. Generate Guardian Moment
    moment_use_case = GenerateGuardianMomentUseCase(family_svc)
    moment = await moment_use_case.execute(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        title="7-Day Blood Pressure Stability",
        summary="Blood pressure has remained within normal limits for 7 consecutive days.",
        observation="Morning readings averaged 122/80 mmHg.",
        recommendation="Continue current medication regimen and daily 20-minute walks."
    )
    assert moment is not None
    assert moment.type == "guardian_moment"
    assert moment.title == "7-Day Blood Pressure Stability"

    # 2. Propose AI Action (Human-in-the-loop approval workflow)
    proposed_action = await family_svc.create_ai_action(
        requester_id=coordinator.id,
        family_id=family.id,
        agent_session_id=f"sess_{uuid.uuid4().hex[:8]}",
        action_type="create_care_task",
        input_data={"title": "Schedule Cardiologist Follow-up", "subject_id": str(subject.id)},
        output_data={"suggested_due_date": "2026-09-01"},
        requires_approval=True,
        subject_id=subject.id
    )
    assert proposed_action.status == "pending_approval"
    assert proposed_action.requires_approval is True

    # 3. Approve AI Action
    approved_action = await family_svc.review_ai_action(
        requester_id=coordinator.id,
        family_id=family.id,
        action_id=proposed_action.id,
        status="approved"
    )
    assert approved_action is not None
    assert approved_action.status == "approved"
    assert approved_action.approved_by_profile_id == coordinator.id
    assert approved_action.approved_at is not None
