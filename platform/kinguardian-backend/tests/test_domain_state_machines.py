"""
Domain State Machines Test Suite:
Verifies strict finite state machine transition logic and rejection of invalid state transitions:
1. Medication Adherence: scheduled -> due -> taken | missed
2. Document Lifecycle: created -> uploading -> processing -> ready -> reviewed -> archived
3. Care Task: pending -> assigned -> in_progress -> completed
4. AI Action: requested -> awaiting_approval -> approved -> executing -> completed
"""

import pytest
from app.core.state_machine import InvalidStateTransitionError
from app.domain.medication.state_machine import (
    MedicationAdherenceState,
    MedicationAdherenceStateMachine,
    transition_medication_state
)
from app.domain.documents.state_machine import (
    HealthDocumentState,
    HealthDocumentStateMachine,
    transition_document_state
)
from app.domain.care.state_machine import (
    CareTaskState,
    CareTaskStateMachine,
    transition_care_task_state
)
from app.domain.ai.state_machine import (
    AIActionState,
    AIActionStateMachine,
    transition_ai_action_state
)


# ==========================================
# 1. Medication Adherence State Machine Tests
# ==========================================

def test_medication_adherence_valid_lifecycle():
    """scheduled -> due -> taken"""
    state = MedicationAdherenceState.SCHEDULED
    state = transition_medication_state(state, MedicationAdherenceState.DUE)
    assert state == MedicationAdherenceState.DUE

    state = transition_medication_state(state, MedicationAdherenceState.TAKEN)
    assert state == MedicationAdherenceState.TAKEN


def test_medication_adherence_missed_then_late_taken():
    """scheduled -> due -> missed -> taken"""
    state = MedicationAdherenceState.SCHEDULED
    state = transition_medication_state(state, MedicationAdherenceState.DUE)
    state = transition_medication_state(state, MedicationAdherenceState.MISSED)
    assert state == MedicationAdherenceState.MISSED

    # Late confirmation
    state = transition_medication_state(state, MedicationAdherenceState.TAKEN)
    assert state == MedicationAdherenceState.TAKEN


def test_medication_adherence_invalid_transitions():
    """Rejects illegal transitions from terminal or non-adjacent states."""
    # Cannot go from taken back to scheduled or due
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        transition_medication_state(MedicationAdherenceState.TAKEN, MedicationAdherenceState.SCHEDULED)
    assert "Invalid state transition for MedicationAdherence" in str(exc_info.value)
    assert exc_info.value.details["current_state"] == "taken"
    assert exc_info.value.details["target_state"] == "scheduled"

    with pytest.raises(InvalidStateTransitionError):
        transition_medication_state(MedicationAdherenceState.TAKEN, MedicationAdherenceState.DUE)


# ==========================================
# 2. Document Lifecycle State Machine Tests
# ==========================================

def test_document_lifecycle_valid_progression():
    """created -> uploading -> processing -> ready -> reviewed -> archived"""
    state = HealthDocumentState.CREATED
    state = transition_document_state(state, HealthDocumentState.UPLOADING)
    assert state == HealthDocumentState.UPLOADING

    state = transition_document_state(state, HealthDocumentState.PROCESSING)
    assert state == HealthDocumentState.PROCESSING

    state = transition_document_state(state, HealthDocumentState.READY)
    assert state == HealthDocumentState.READY

    state = transition_document_state(state, HealthDocumentState.REVIEWED)
    assert state == HealthDocumentState.REVIEWED

    state = transition_document_state(state, HealthDocumentState.ARCHIVED)
    assert state == HealthDocumentState.ARCHIVED


def test_document_lifecycle_invalid_transitions():
    """Rejects skips and illegal transitions."""
    # Cannot jump from created straight to ready or reviewed
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        transition_document_state(HealthDocumentState.CREATED, HealthDocumentState.READY)
    assert "Invalid state transition for HealthDocument" in str(exc_info.value)

    # Cannot transition from archived back to created
    with pytest.raises(InvalidStateTransitionError):
        transition_document_state(HealthDocumentState.ARCHIVED, HealthDocumentState.CREATED)

    # Cannot transition from processing back to uploading
    with pytest.raises(InvalidStateTransitionError):
        transition_document_state(HealthDocumentState.PROCESSING, HealthDocumentState.UPLOADING)


# ==========================================
# 3. Care Task State Machine Tests
# ==========================================

def test_care_task_valid_progression():
    """pending -> assigned -> in_progress -> completed"""
    state = CareTaskState.PENDING
    state = transition_care_task_state(state, CareTaskState.ASSIGNED)
    assert state == CareTaskState.ASSIGNED

    state = transition_care_task_state(state, CareTaskState.IN_PROGRESS)
    assert state == CareTaskState.IN_PROGRESS

    state = transition_care_task_state(state, CareTaskState.COMPLETED)
    assert state == CareTaskState.COMPLETED


def test_care_task_invalid_transitions():
    """Rejects illegal transitions from completed terminal state."""
    # Completed cannot go back to pending or in_progress
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        transition_care_task_state(CareTaskState.COMPLETED, CareTaskState.PENDING)
    assert "Invalid state transition for CareTask" in str(exc_info.value)

    with pytest.raises(InvalidStateTransitionError):
        transition_care_task_state(CareTaskState.COMPLETED, CareTaskState.IN_PROGRESS)


# ==========================================
# 4. AI Action State Machine Tests
# ==========================================

def test_ai_action_valid_progression():
    """requested -> awaiting_approval -> approved -> executing -> completed"""
    state = AIActionState.REQUESTED
    state = transition_ai_action_state(state, AIActionState.AWAITING_APPROVAL)
    assert state == AIActionState.AWAITING_APPROVAL

    state = transition_ai_action_state(state, AIActionState.APPROVED)
    assert state == AIActionState.APPROVED

    state = transition_ai_action_state(state, AIActionState.EXECUTING)
    assert state == AIActionState.EXECUTING

    state = transition_ai_action_state(state, AIActionState.COMPLETED)
    assert state == AIActionState.COMPLETED


def test_ai_action_rejection_flow():
    """requested -> awaiting_approval -> rejected"""
    state = AIActionState.REQUESTED
    state = transition_ai_action_state(state, AIActionState.AWAITING_APPROVAL)
    state = transition_ai_action_state(state, AIActionState.REJECTED)
    assert state == AIActionState.REJECTED

    # Rejected is terminal
    with pytest.raises(InvalidStateTransitionError):
        transition_ai_action_state(state, AIActionState.APPROVED)


def test_ai_action_invalid_skips():
    """Rejects unauthorized autonomous jump directly to completed or executing without approval."""
    # Cannot jump from requested straight to completed
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        transition_ai_action_state(AIActionState.REQUESTED, AIActionState.COMPLETED)
    assert "Invalid state transition for AIAction" in str(exc_info.value)

    # Cannot jump from awaiting_approval straight to executing without approval
    with pytest.raises(InvalidStateTransitionError):
        transition_ai_action_state(AIActionState.AWAITING_APPROVAL, AIActionState.EXECUTING)
