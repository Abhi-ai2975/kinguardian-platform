"""
Medication Domain Module:
Bounded domain for Medication Adherence Tracking, Confirmation Events, and Adherence Projections.
"""

from app.domains.family.infrastructure.models import MedicationAdherenceEvent
from app.domains.family.domain.entities import MedicationAdherenceEventEntity
from app.domains.family.schemas import (
    AdherenceEventCreate,
    AdherenceEventResponse
)

MedicationAdherenceCreate = AdherenceEventCreate
MedicationAdherenceResponse = AdherenceEventResponse

__all__ = [
    "MedicationAdherenceEvent",
    "MedicationAdherenceEventEntity",
    "AdherenceEventCreate",
    "AdherenceEventResponse",
    "MedicationAdherenceCreate",
    "MedicationAdherenceResponse"
]
