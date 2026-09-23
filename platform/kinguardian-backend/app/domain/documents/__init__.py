"""
Domain Documents Layer:
Entities, Value Objects, Repositories, and State Machine for Health Documents & Prescriptions.
"""

from app.domains.family.domain.entities import HealthDocumentEntity, DocumentExtractionEntity
from app.domain.documents.state_machine import (
    HealthDocumentState,
    HealthDocumentStateMachine,
    transition_document_state
)

__all__ = [
    "HealthDocumentEntity",
    "DocumentExtractionEntity",
    "HealthDocumentState",
    "HealthDocumentStateMachine",
    "transition_document_state"
]
