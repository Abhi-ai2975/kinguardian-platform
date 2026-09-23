"""
Public API for the Slot schemas package.

Consumers should import from here rather than from the individual sub-modules
so that internal reorganisation does not break call sites.
"""

from app.schemas.slot.fhir_schemas import FhirBundleResponse, FhirSlotResponse
from app.schemas.slot.input import ListSlotsSchema, SlotCreateSchema, SlotPatchSchema
from app.schemas.slot.response import PaginatedSlotResponse, SlotResponse

__all__ = [
    # Input schemas — used for request body validation
    "SlotCreateSchema",
    "SlotPatchSchema",
    "ListSlotsSchema",
    # Plain JSON response schemas — used for Swagger documentation (application/json)
    "SlotResponse",
    "PaginatedSlotResponse",
    # FHIR R4 response schemas — used for Swagger documentation (application/fhir+json)
    "FhirSlotResponse",
    "FhirBundleResponse",
]
