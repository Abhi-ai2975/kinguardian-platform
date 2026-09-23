"""
AI Action State Machine:
Explicit transition logic:
requested -> awaiting_approval -> approved -> executing -> completed
"""

from enum import Enum
from typing import Dict, Set
from app.core.state_machine import DomainStateMachine, InvalidStateTransitionError


class AIActionState(str, Enum):
    REQUESTED = "requested"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    REJECTED = "rejected"
    FAILED = "failed"


class AIActionStateMachine(DomainStateMachine):
    workflow_name = "AIAction"

    transitions: Dict[str, Set[str]] = {
        AIActionState.REQUESTED: {
            AIActionState.AWAITING_APPROVAL,
            AIActionState.REJECTED
        },
        AIActionState.AWAITING_APPROVAL: {
            AIActionState.APPROVED,
            AIActionState.REJECTED
        },
        AIActionState.APPROVED: {
            AIActionState.EXECUTING,
            AIActionState.FAILED
        },
        AIActionState.EXECUTING: {
            AIActionState.COMPLETED,
            AIActionState.FAILED
        },
        AIActionState.COMPLETED: set(),  # Terminal state
        AIActionState.REJECTED: set(),   # Terminal state
        AIActionState.FAILED: {
            AIActionState.REQUESTED,     # Retry
            AIActionState.APPROVED
        }
    }


def transition_ai_action_state(current_state: str, target_state: str) -> str:
    return AIActionStateMachine.validate_transition(current_state, target_state)
