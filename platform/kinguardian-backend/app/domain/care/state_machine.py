"""
Care Task State Machine:
Explicit transition logic:
pending -> assigned -> in_progress -> completed
"""

from enum import Enum
from typing import Dict, Set
from app.core.state_machine import DomainStateMachine, InvalidStateTransitionError


class CareTaskState(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CareTaskStateMachine(DomainStateMachine):
    workflow_name = "CareTask"

    transitions: Dict[str, Set[str]] = {
        CareTaskState.PENDING: {
            CareTaskState.ASSIGNED,
            CareTaskState.IN_PROGRESS,
            CareTaskState.COMPLETED,
            CareTaskState.CANCELLED
        },
        CareTaskState.ASSIGNED: {
            CareTaskState.IN_PROGRESS,
            CareTaskState.COMPLETED,
            CareTaskState.PENDING,  # Unassigned
            CareTaskState.CANCELLED
        },
        CareTaskState.IN_PROGRESS: {
            CareTaskState.COMPLETED,
            CareTaskState.ASSIGNED,
            CareTaskState.CANCELLED
        },
        CareTaskState.COMPLETED: set(),  # Terminal state
        CareTaskState.CANCELLED: {
            CareTaskState.PENDING        # Reopened
        }
    }


def transition_care_task_state(current_state: str, target_state: str) -> str:
    return CareTaskStateMachine.validate_transition(current_state, target_state)
