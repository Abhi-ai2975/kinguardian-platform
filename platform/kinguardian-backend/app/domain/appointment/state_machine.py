"""
Appointment Preparation State Machine:
Explicit transition logic:
selected -> context_collected -> generating_draft -> draft_ready -> reviewed -> shared
"""

from enum import Enum
from typing import Dict, Set
from app.core.state_machine import DomainStateMachine, InvalidStateTransitionError


class AppointmentPreparationState(str, Enum):
    SELECTED = "selected"
    CONTEXT_COLLECTED = "context_collected"
    GENERATING_DRAFT = "generating_draft"
    DRAFT_READY = "draft_ready"
    REVIEWED = "reviewed"
    SHARED = "shared"
    CANCELLED = "cancelled"


class AppointmentPreparationStateMachine(DomainStateMachine):
    workflow_name = "AppointmentPreparation"

    transitions: Dict[str, Set[str]] = {
        AppointmentPreparationState.SELECTED: {
            AppointmentPreparationState.CONTEXT_COLLECTED,
            AppointmentPreparationState.CANCELLED
        },
        AppointmentPreparationState.CONTEXT_COLLECTED: {
            AppointmentPreparationState.GENERATING_DRAFT,
            AppointmentPreparationState.CANCELLED
        },
        AppointmentPreparationState.GENERATING_DRAFT: {
            AppointmentPreparationState.DRAFT_READY,
            AppointmentPreparationState.CONTEXT_COLLECTED,  # Retry
            AppointmentPreparationState.CANCELLED
        },
        AppointmentPreparationState.DRAFT_READY: {
            AppointmentPreparationState.REVIEWED,
            AppointmentPreparationState.GENERATING_DRAFT,  # Re-generate
            AppointmentPreparationState.CANCELLED
            # NOTE: Cannot transition directly to SHARED without human REVIEWED state!
        },
        AppointmentPreparationState.REVIEWED: {
            AppointmentPreparationState.SHARED,
            AppointmentPreparationState.DRAFT_READY,      # Re-edit
            AppointmentPreparationState.CANCELLED
        },
        AppointmentPreparationState.SHARED: set(),        # Terminal state
        AppointmentPreparationState.CANCELLED: {
            AppointmentPreparationState.SELECTED          # Restart
        }
    }


def transition_appointment_prep_state(current_state: str, target_state: str) -> str:
    return AppointmentPreparationStateMachine.validate_transition(current_state, target_state)
