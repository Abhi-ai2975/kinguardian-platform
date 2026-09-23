"""
Wearable + Care Coordination Domain Service.

Enables wearable-derived insights (Guardian Moments) to generate suggested care actions
and care tasks with strict human-in-the-loop AI safety governance.

Scenario:
Guardian moment:
  "Dad's activity has decreased."
Suggested:
  "Check in with Dad."
Coordinator Action:
  [Create care task] -> Creates: "Check in with Dad about activity. Assigned to Anjali."

AI SAFETY INVARIANT:
The AI must NOT silently create a human-facing task unless policy explicitly allows automatic creation.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid

from app.domains.wearables.domain.entities import WearableGuardianMoment


class CareTaskCreationMode(str, Enum):
    COORDINATOR_EXPLICIT = "coordinator_explicit"   # Default: Human coordinator explicitly chooses to create task
    POLICY_AUTOMATED = "policy_automated"           # Policy-authorized automatic task creation


@dataclass
class WearableCareActionPolicy:
    """
    Care coordination policy governing when and how wearable insights
    translate into actionable care tasks.
    """
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    family_id: uuid.UUID = field(default_factory=uuid.uuid4)
    allow_automatic_task_creation: bool = False     # Default: Strict human-in-the-loop
    require_coordinator_confirmation: bool = True
    default_assignee_role: str = "primary_coordinator"
    default_due_hours: int = 24


@dataclass
class WearableCareTaskSuggestion:
    """
    Suggested care action produced by wearable insight engine.
    Displayed to coordinator with a 1-tap 'Create care task' action.
    """
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    guardian_moment_id: uuid.UUID = field(default_factory=uuid.uuid4)
    subject_id: uuid.UUID = field(default_factory=uuid.uuid4)
    family_id: uuid.UUID = field(default_factory=uuid.uuid4)
    suggested_title: str = "Check in with Dad about activity"
    suggested_description: str = "Dad's activity has decreased below baseline."
    suggested_assignee_profile_id: uuid.UUID = field(default_factory=uuid.uuid4)
    suggested_assignee_name: str = "Anjali"
    category: str = "check_in"
    priority: str = "medium"
    source_metric: str = "steps"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "guardian_moment_id": str(self.guardian_moment_id),
            "subject_id": str(self.subject_id),
            "family_id": str(self.family_id),
            "suggested_title": self.suggested_title,
            "suggested_description": self.suggested_description,
            "suggested_assignee_name": self.suggested_assignee_name,
            "suggested_assignee_profile_id": str(self.suggested_assignee_profile_id),
            "category": self.category,
            "priority": self.priority,
            "source_metric": self.source_metric,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class CreatedCareTask:
    """Represents the created human-facing care task."""
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    family_id: uuid.UUID = field(default_factory=uuid.uuid4)
    subject_id: uuid.UUID = field(default_factory=uuid.uuid4)
    title: str = ""
    description: str = ""
    assigned_to_profile_id: uuid.UUID = field(default_factory=uuid.uuid4)
    assigned_to_name: str = ""
    status: str = "pending"
    creation_mode: CareTaskCreationMode = CareTaskCreationMode.COORDINATOR_EXPLICIT
    origin_guardian_moment_id: Optional[uuid.UUID] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class WearableCareCoordinatorService:
    """
    Coordinates wearable insight to care task workflows.
    Enforces AI safety invariants preventing silent task creation.
    """

    @classmethod
    def propose_care_action(
        cls,
        guardian_moment: WearableGuardianMoment,
        coordinator_profile_id: uuid.UUID,
        coordinator_name: str = "Anjali",
        subject_relationship_name: str = "Dad"
    ) -> WearableCareTaskSuggestion:
        """
        Generates a structured care task suggestion from a Guardian Moment.
        """
        title = f"Check in with {subject_relationship_name} about {guardian_moment.metric_name}."
        description = (
            f"Guardian moment: {guardian_moment.title}\n"
            f"Recent average: {guardian_moment.current_average_label} vs {guardian_moment.baseline_label}."
        )

        return WearableCareTaskSuggestion(
            guardian_moment_id=guardian_moment.id,
            subject_id=guardian_moment.subject_id,
            family_id=guardian_moment.family_id,
            suggested_title=title,
            suggested_description=description,
            suggested_assignee_profile_id=coordinator_profile_id,
            suggested_assignee_name=coordinator_name,
            source_metric=guardian_moment.metric_name
        )

    @classmethod
    def create_care_task(
        cls,
        suggestion: WearableCareTaskSuggestion,
        policy: WearableCareActionPolicy,
        confirmed_by_coordinator: bool = False
    ) -> CreatedCareTask:
        """
        Creates the care task if explicitly confirmed by coordinator or allowed by policy.
        STRICT AI SAFETY INVARIANT:
        The AI must NOT silently create a human-facing task unless policy allows automatic creation.
        """
        if not confirmed_by_coordinator and not policy.allow_automatic_task_creation:
            raise PermissionError(
                "AI Safety Invariant Violation: AI cannot silently create human-facing care tasks "
                "without explicit coordinator confirmation or an active automatic task creation policy."
            )

        mode = (
            CareTaskCreationMode.COORDINATOR_EXPLICIT
            if confirmed_by_coordinator
            else CareTaskCreationMode.POLICY_AUTOMATED
        )

        return CreatedCareTask(
            id=uuid.uuid4(),
            family_id=suggestion.family_id,
            subject_id=suggestion.subject_id,
            title=suggestion.suggested_title,
            description=suggestion.suggested_description,
            assigned_to_profile_id=suggestion.suggested_assignee_profile_id,
            assigned_to_name=suggestion.suggested_assignee_name,
            status="pending",
            creation_mode=mode,
            origin_guardian_moment_id=suggestion.guardian_moment_id
        )
