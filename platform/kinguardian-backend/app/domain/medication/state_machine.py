"""
Medication Adherence State Machine:
Explicit transition logic:
scheduled -> due -> taken | missed
"""

from enum import Enum
from typing import Dict, Set
from app.core.state_machine import DomainStateMachine, InvalidStateTransitionError


class MedicationAdherenceState(str, Enum):
    SCHEDULED = "scheduled"
    DUE = "due"
    TAKEN = "taken"
    MISSED = "missed"


class MedicationAdherenceStateMachine(DomainStateMachine):
    workflow_name = "MedicationAdherence"

    transitions: Dict[str, Set[str]] = {
        MedicationAdherenceState.SCHEDULED: {
            MedicationAdherenceState.DUE,
            MedicationAdherenceState.TAKEN,
            MedicationAdherenceState.MISSED
        },
        MedicationAdherenceState.DUE: {
            MedicationAdherenceState.TAKEN,
            MedicationAdherenceState.MISSED
        },
        MedicationAdherenceState.MISSED: {
            MedicationAdherenceState.TAKEN  # Late intake allowed
        },
        MedicationAdherenceState.TAKEN: set()  # Terminal state
    }


def transition_medication_state(current_state: str, target_state: str) -> str:
    return MedicationAdherenceStateMachine.validate_transition(current_state, target_state)
