"""
Health Document Lifecycle State Machine:
Explicit transition logic:
created -> uploading -> processing -> ready -> reviewed -> archived
"""

from enum import Enum
from typing import Dict, Set
from app.core.state_machine import DomainStateMachine, InvalidStateTransitionError


class HealthDocumentState(str, Enum):
    CREATED = "created"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    REVIEWED = "reviewed"
    ARCHIVED = "archived"
    FAILED = "failed"


class HealthDocumentStateMachine(DomainStateMachine):
    workflow_name = "HealthDocument"

    transitions: Dict[str, Set[str]] = {
        HealthDocumentState.CREATED: {
            HealthDocumentState.UPLOADING,
            HealthDocumentState.FAILED
        },
        HealthDocumentState.UPLOADING: {
            HealthDocumentState.PROCESSING,
            HealthDocumentState.FAILED
        },
        HealthDocumentState.PROCESSING: {
            HealthDocumentState.READY,
            HealthDocumentState.FAILED
        },
        HealthDocumentState.READY: {
            HealthDocumentState.REVIEWED,
            HealthDocumentState.ARCHIVED
        },
        HealthDocumentState.REVIEWED: {
            HealthDocumentState.ARCHIVED
        },
        HealthDocumentState.ARCHIVED: set(),  # Terminal state
        HealthDocumentState.FAILED: {
            HealthDocumentState.CREATED,     # Retry from beginning
            HealthDocumentState.UPLOADING
        }
    }


def transition_document_state(current_state: str, target_state: str) -> str:
    return HealthDocumentStateMachine.validate_transition(current_state, target_state)
