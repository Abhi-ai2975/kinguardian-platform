"""
Wearable + Care Coordination Test Suite.

Verifies:
1. Wearable-derived insights (Guardian Moments) create actionable care task suggestions.
2. Example scenario:
   Guardian moment: "Dad's activity has decreased."
   Suggested: "Check in with Dad."
   Coordinator chooses [Create care task]:
     -> Creates care task: "Check in with Dad about steps. Assigned to Anjali."
3. AI Safety Invariant:
   The AI must NOT silently create a human-facing task unless policy allows automatic creation.
"""

import uuid
from datetime import datetime, timezone
import pytest

from app.domains.wearables.domain.entities import WearableGuardianMoment
from app.domains.wearables.domain.care_coordination import (
    CareTaskCreationMode,
    WearableCareActionPolicy,
    WearableCareTaskSuggestion,
    CreatedCareTask,
    WearableCareCoordinatorService
)


def test_wearable_guardian_moment_to_coordinator_care_task_flow():
    """
    Scenario directly from user request:
    1. Guardian moment: Dad's activity decreased below baseline.
    2. Proposes suggestion: "Check in with Dad about steps."
    3. Coordinator (Anjali) reviews and confirms [Create care task].
    4. Task is created and assigned to Anjali.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()
    anjali_profile_id = uuid.uuid4()

    # 1. Guardian Moment
    guardian_moment = WearableGuardianMoment(
        id=uuid.uuid4(),
        subject_id=subject_id,
        family_id=family_id,
        title="Dad's activity has decreased.",
        summary="Dad averaged 4,520 steps over the last 5 days compared to his 30-day baseline of 6,210 steps.",
        current_average=4520.0,
        current_average_label="4,520 steps/day",
        baseline_value=6210.0,
        baseline_label="30-day baseline: 6,210 steps/day",
        actions=["Check in with Dad", "Review trends", "Contact caregiver"],
        timeframe_days=5,
        metric_name="steps",
        severity="warning"
    )

    policy = WearableCareActionPolicy(
        family_id=family_id,
        allow_automatic_task_creation=False,  # Strict human in the loop
        require_coordinator_confirmation=True
    )

    # 2. AI Proposes Care Action
    suggestion = WearableCareCoordinatorService.propose_care_action(
        guardian_moment=guardian_moment,
        coordinator_profile_id=anjali_profile_id,
        coordinator_name="Anjali",
        subject_relationship_name="Dad"
    )

    assert "Check in with Dad about steps" in suggestion.suggested_title
    assert suggestion.suggested_assignee_name == "Anjali"
    assert suggestion.suggested_assignee_profile_id == anjali_profile_id

    # 3. Coordinator explicitly confirms: [Create care task]
    task = WearableCareCoordinatorService.create_care_task(
        suggestion=suggestion,
        policy=policy,
        confirmed_by_coordinator=True
    )

    assert task.title == "Check in with Dad about steps."
    assert task.assigned_to_name == "Anjali"
    assert task.assigned_to_profile_id == anjali_profile_id
    assert task.status == "pending"
    assert task.creation_mode == CareTaskCreationMode.COORDINATOR_EXPLICIT
    assert task.origin_guardian_moment_id == guardian_moment.id


def test_ai_safety_invariant_prohibits_silent_task_creation():
    """
    CRITICAL AI SAFETY INVARIANT:
    The AI must NOT silently create a human-facing task without explicit coordinator
    confirmation or an automated task creation policy.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()
    coordinator_id = uuid.uuid4()

    suggestion = WearableCareTaskSuggestion(
        id=uuid.uuid4(),
        guardian_moment_id=uuid.uuid4(),
        subject_id=subject_id,
        family_id=family_id,
        suggested_title="Check in with Dad about activity.",
        suggested_description="Activity decreased.",
        suggested_assignee_profile_id=coordinator_id,
        suggested_assignee_name="Anjali"
    )

    default_policy = WearableCareActionPolicy(
        family_id=family_id,
        allow_automatic_task_creation=False
    )

    # AI tries to create task without coordinator confirmation
    with pytest.raises(PermissionError) as exc_info:
        WearableCareCoordinatorService.create_care_task(
            suggestion=suggestion,
            policy=default_policy,
            confirmed_by_coordinator=False
        )

    assert "AI Safety Invariant Violation" in str(exc_info.value)
    assert "AI cannot silently create human-facing care tasks" in str(exc_info.value)


def test_policy_automated_task_creation_when_explicitly_configured():
    """
    When policy explicitly allows automatic creation, task creation succeeds in POLICY_AUTOMATED mode.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()
    coordinator_id = uuid.uuid4()

    suggestion = WearableCareTaskSuggestion(
        id=uuid.uuid4(),
        guardian_moment_id=uuid.uuid4(),
        subject_id=subject_id,
        family_id=family_id,
        suggested_title="Check in with Dad about heart rate.",
        suggested_description="Elevated RHR.",
        suggested_assignee_profile_id=coordinator_id,
        suggested_assignee_name="Anjali"
    )

    automated_policy = WearableCareActionPolicy(
        family_id=family_id,
        allow_automatic_task_creation=True
    )

    task = WearableCareCoordinatorService.create_care_task(
        suggestion=suggestion,
        policy=automated_policy,
        confirmed_by_coordinator=False
    )

    assert task.creation_mode == CareTaskCreationMode.POLICY_AUTOMATED
    assert task.assigned_to_name == "Anjali"
