"""
Plain JSON response schemas for the Slot resource.

These models document the fhir-server's plain (non-FHIR) JSON output shape —
the response returned when the caller sends `Accept: application/json` (the default).

`extra="allow"` is set on every model so that new fields the fhir-server adds in
the future pass through to the caller without requiring a schema bump here.

For the FHIR R4 camelCase shape (used when the caller sends
`Accept: application/fhir+json`), see fhir_schemas.py.

Reference: https://hl7.org/fhir/R4/slot.html
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class PlainSlotIdentifier(BaseModel):
    """
    Plain JSON representation of a single slot identifier record.
    Mirrors the fhir-server's PlainSlotIdentifier — flat columns, no nested objects.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    assigner: Optional[str] = None


class PlainSlotServiceCategory(BaseModel):
    """
    Plain JSON representation of a service category entry for a Slot.
    Mirrors the fhir-server's PlainSlotServiceCategory (flat coding columns).
    """

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainSlotServiceType(BaseModel):
    """
    Plain JSON representation of a service type entry for a Slot.
    Mirrors the fhir-server's PlainSlotServiceType (flat coding columns).
    """

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainSlotSpecialty(BaseModel):
    """
    Plain JSON representation of a specialty entry for a Slot.
    Mirrors the fhir-server's PlainSlotSpecialty (flat coding columns).
    """

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class SlotResponse(BaseModel):
    """
    Full plain JSON response for a single Slot resource.

    Mirrors the fhir-server's PlainSlotResponse shape. Child arrays use typed
    sub-schemas so Swagger renders their fields correctly.

    `extra="allow"` ensures new fhir-server fields propagate to callers
    without requiring a middleware schema update.
    """

    model_config = ConfigDict(extra="allow")

    # Primary key
    id: int

    # Core slot fields
    status: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    overbooked: Optional[bool] = None
    comment: Optional[str] = None

    # Flattened schedule reference (fhir-server stores type + id + display separately)
    schedule_type: Optional[str] = None
    schedule_id: Optional[int] = None
    schedule_display: Optional[str] = None

    # Appointment type — stored as flat columns, not a nested CodeableConcept
    appointment_type_system: Optional[str] = None
    appointment_type_code: Optional[str] = None
    appointment_type_display: Optional[str] = None
    appointment_type_text: Optional[str] = None

    # Child arrays
    identifier: Optional[List[PlainSlotIdentifier]] = None
    service_category: Optional[List[PlainSlotServiceCategory]] = None
    service_type: Optional[List[PlainSlotServiceType]] = None
    specialty: Optional[List[PlainSlotSpecialty]] = None

    # Tenant scoping
    user_id: Optional[str] = None
    org_id: Optional[str] = None

    # Audit fields
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedSlotResponse(BaseModel):
    """
    Paginated list response for the GET /slots endpoint when the caller
    sends `Accept: application/json` (the default).

    The `total` field reflects the count across ALL pages, not just this page.
    """

    total: int
    limit: int
    offset: int
    data: List[SlotResponse]


class SlotGenerateResponse(BaseModel):
    """
    Response returned by POST /slots/generate after auto-generating Slots.

    Reports how many slots were created, their IDs, and any that failed
    (partial-failure model — successfully created slots are not rolled back
    if later ones in the batch fail).

    Fields:
      schedule_id:           The schedule the slots were generated for.
      generated_count:       Number of slots successfully created.
      slot_ids:              Ordered list of the new slot integer IDs.
      generation_start:      The requested window start (echoed back).
      generation_end:        The requested window end (echoed back).
      slot_duration_minutes: The duration used for each slot.
      failed_count:          Number of slot windows that could not be created.
      errors:                One error string per failure — "{start_iso}: {reason}".
    """

    schedule_id: int
    generated_count: int
    slot_ids: List[int]
    generation_start: datetime
    generation_end: datetime
    slot_duration_minutes: int
    failed_count: int = 0
    errors: List[str] = []
