import pytest
import uuid
from datetime import datetime, timedelta
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
from app.domains.agent.safety import (
    ObservedFact,
    AIObservation,
    AIInterpretation,
    SuggestedAction,
    ClinicalDecision,
    StructuredAIOutput,
    AISafetyGuard,
    AISafetyViolationError,
    HIGH_RISK_ACTION_TYPES,
    LOW_RISK_ACTION_TYPES
)


def test_ai_output_five_tiers_differentiation():
    """
    Verifies that AI output cleanly encodes the 5 cognitive tiers separately:
    1. Observed Fact
    2. AI Observation
    3. AI Interpretation
    4. Suggested Action
    5. Clinical Decision
    """
    # 1. Observed Fact
    fact1 = ObservedFact(
        category="vital",
        statement="Blood Pressure recorded at 142/90 mmHg",
        source="FHIR Observation (LOINC 85354-9)",
        recorded_at=datetime.now()
    )
    fact2 = ObservedFact(
        category="medication_log",
        statement="Metformin 500mg morning dose taken at 08:30 AM",
        source="MedicationAdherenceEvent",
        recorded_at=datetime.now()
    )

    # 2. AI Observation
    obs = AIObservation(
        observation_text="Systolic blood pressure has remained above 140 mmHg for 3 consecutive days.",
        derived_from_fact_ids=[fact1.fact_id],
        confidence=0.98
    )

    # 3. AI Interpretation
    interp = AIInterpretation(
        interpretation_text="Persistent elevated morning BP may indicate hypertensive trend requiring clinical review.",
        clinical_rationale="Correlation observed between missed evening dose and morning spikes.",
        confidence=0.88
    )

    # 4. Suggested Action
    action = SuggestedAction(
        action_type="create_care_task",
        title="Schedule a cardiology consultation follow-up",
        description="Recommend physician check-in regarding 3-day BP trend.",
        risk_level="low",
        requires_approval=False
    )

    # 5. Clinical Decision (Mandates physician review)
    clin_dec = ClinicalDecision(
        decision_type="medication_change",
        recommendation="Consider titrating Amlodipine from 5mg to 10mg daily.",
        requires_provider_review=True
    )

    output = StructuredAIOutput(
        observed_facts=[fact1, fact2],
        ai_observations=[obs],
        ai_interpretations=[interp],
        suggested_actions=[action],
        clinical_decisions=[clin_dec],
        summary="Automated BP Trend Analysis"
    )

    # Verify separated encoding
    assert len(output.observed_facts) == 2
    assert output.observed_facts[0].category == "vital"
    assert len(output.ai_observations) == 1
    assert len(output.ai_interpretations) == 1
    assert "not a medical diagnosis" in output.ai_interpretations[0].clinical_disclaimer
    assert len(output.suggested_actions) == 1
    assert output.suggested_actions[0].risk_level == "low"
    assert len(output.clinical_decisions) == 1
    assert output.clinical_decisions[0].requires_provider_review is True

    # Verify Markdown formatting
    md = output.to_markdown()
    assert "## 1. Observed Facts" in md
    assert "## 2. AI Observations" in md
    assert "## 3. AI Interpretations" in md
    assert "## 4. Suggested Actions" in md
    assert "## 5. Clinical Decisions" in md


def test_ai_safety_guard_risk_evaluation_and_silent_execution_block():
    """
    Verifies that the AI Safety Guard blocks autonomous execution of high-risk actions:
    - change medication
    - alter diagnosis
    - cancel appointments
    - send medical info
    - make clinical decisions
    """
    for hr_action in HIGH_RISK_ACTION_TYPES:
        risk, req_approval = AISafetyGuard.evaluate_action_risk(hr_action, {})
        assert risk == "high"
        assert req_approval is True

        # Assert that direct autonomous execution raises AISafetyViolationError
        with pytest.raises(AISafetyViolationError):
            AISafetyGuard.assert_no_silent_execution(hr_action)

    for lr_action in LOW_RISK_ACTION_TYPES:
        risk, req_approval = AISafetyGuard.evaluate_action_risk(lr_action, {})
        assert risk == "low"
        assert req_approval is False
        # Should not raise
        AISafetyGuard.assert_no_silent_execution(lr_action)


@pytest.mark.asyncio
async def test_ai_human_in_the_loop_action_workflow(db_session):
    """
    Verifies the complete Human-in-the-Loop workflow via REST API:
    AI → Proposal (pending_approval)
            ↓
    Approval required (requires_approval=True)
            ↓
    Human confirms (POST /ai/actions/{id}/approve)
            ↓
    Action executes (status=executed)
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coord = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_hitl",
        email="coord_hitl@kinguardian.com",
        display_name="Dr. Sarah Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_hitl",
        email="parent_hitl@kinguardian.com",
        display_name="David Senior",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coord.id, "David Care Circle", "coordinator")
    await family_svc.add_member_to_circle(coord.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-hitl",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    app_profile = await db_session.get(AppProfile, coord.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. AI Proposes High-Risk Action: "change_medication"
            res_prop = await client.post(
                "/api/v1/ai/actions/propose",
                json={
                    "family_id": str(family.id),
                    "subject_id": str(subject.id),
                    "action_type": "change_medication",
                    "input": {
                        "medication_name": "Lisinopril",
                        "proposed_dosage": "20mg daily",
                        "reason": "Blood pressure optimization"
                    }
                }
            )
            assert res_prop.status_code == 201
            data_prop = res_prop.json()
            action_id = data_prop["id"]
            assert data_prop["action_type"] == "change_medication"
            assert data_prop["requires_approval"] is True
            assert data_prop["status"] == "pending_approval"

            # 2. Get AI Action Details
            res_get = await client.get(f"/api/v1/ai/actions/{action_id}")
            assert res_get.status_code == 200
            assert res_get.json()["status"] == "pending_approval"

            # 3. Human Confirms Proposal -> Executes
            res_appr = await client.post(f"/api/v1/ai/actions/{action_id}/approve")
            assert res_appr.status_code == 200
            data_appr = res_appr.json()
            assert data_appr["status"] == "executed"
            assert data_appr["approved_by_profile_id"] == str(coord.id)
            assert data_appr["approved_at"] is not None

            # 4. Propose another High-Risk Action: "cancel_appointment" and REJECT it
            res_prop2 = await client.post(
                "/api/v1/ai/actions/propose",
                json={
                    "family_id": str(family.id),
                    "subject_id": str(subject.id),
                    "action_type": "cancel_appointment",
                    "input": {"appointment_id": "appt-123"}
                }
            )
            assert res_prop2.status_code == 201
            action_id2 = res_prop2.json()["id"]

            # Human Rejects Proposal
            res_rej = await client.post(
                f"/api/v1/ai/actions/{action_id2}/reject",
                json={"reason": "Patient still needs to attend the appointment"}
            )
            assert res_rej.status_code == 200
            assert res_rej.json()["status"] == "rejected"
    finally:
        app.dependency_overrides.clear()
