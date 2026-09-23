from .fhir import (
    fhir_slot_identifier,
    fhir_slot_service_category,
    fhir_slot_service_type,
    fhir_slot_specialty,
    to_fhir_slot,
)
from .plain import (
    plain_slot_identifier,
    plain_slot_service_category,
    plain_slot_service_type,
    plain_slot_specialty,
    to_plain_slot,
)

__all__ = [
    "fhir_slot_identifier",
    "fhir_slot_service_category",
    "fhir_slot_service_type",
    "fhir_slot_specialty",
    "to_fhir_slot",
    "plain_slot_identifier",
    "plain_slot_service_category",
    "plain_slot_service_type",
    "plain_slot_specialty",
    "to_plain_slot",
]
