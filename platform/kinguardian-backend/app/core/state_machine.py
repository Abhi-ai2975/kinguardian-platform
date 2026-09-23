"""
Domain State Machine Base:
Provides deterministic finite state machine transition validation and error handling across bounded domains.
"""

from typing import Dict, Set, Any, Optional, Generic, TypeVar
from fastapi import status
from app.core.errors import AppError, ErrorCode


class InvalidStateTransitionError(AppError):
    """
    Raised when an invalid state transition is attempted on a domain workflow entity.
    """
    def __init__(self, workflow: str, current_state: str, target_state: str, allowed_next_states: Set[str]):
        allowed_str = ", ".join(sorted([str(s.value if hasattr(s, 'value') else s) for s in allowed_next_states])) if allowed_next_states else "None (Terminal State)"
        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=f"Invalid state transition for {workflow}: cannot transition from '{current_state}' to '{target_state}'. Allowed next states: [{allowed_str}].",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={
                "workflow": workflow,
                "current_state": current_state.value if hasattr(current_state, "value") else current_state,
                "target_state": target_state.value if hasattr(target_state, "value") else target_state,
                "allowed_next_states": [s.value if hasattr(s, "value") else s for s in allowed_next_states]
            }
        )



T = TypeVar("T")


class DomainStateMachine(Generic[T]):
    """
    Generic Domain State Machine enforcing explicit state transitions.
    """
    workflow_name: str = "workflow"
    transitions: Dict[str, Set[str]] = {}

    @classmethod
    def can_transition(cls, current_state: str, target_state: str) -> bool:
        allowed = cls.transitions.get(current_state, set())
        return target_state in allowed

    @classmethod
    def validate_transition(cls, current_state: str, target_state: str) -> str:
        if current_state == target_state:
            return target_state

        allowed = cls.transitions.get(current_state, set())
        if target_state not in allowed:
            raise InvalidStateTransitionError(
                workflow=cls.workflow_name,
                current_state=current_state,
                target_state=target_state,
                allowed_next_states=allowed
            )
        return target_state
