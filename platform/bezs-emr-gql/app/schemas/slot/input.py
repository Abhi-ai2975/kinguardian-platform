"""
Input schemas for the Slot resource endpoints.

Three schemas cover the three write surfaces:
  - SlotCreateSchema   — POST /slots body
  - SlotPatchSchema    — PATCH /slots/{id} body (all optional, at least one required)
  - ListSlotsSchema    — GET /slots query parameters

Design notes:
  - user_id / org_id are Optional here because the fhir-server's SlotCreateSchema
    also declares them Optional (matching the fhir-server schema exactly avoids
    silent failures at the fhir-server boundary).
  - created_by / updated_by are NOT in any of these schemas — FhirClient injects
    them automatically from actor.sub on POST / PATCH.
  - schedule and status are required at creation; arrays and appointment_type_*
    flat fields are optional throughout.
  - Arrays (identifier, service_category, service_type, specialty) and the schedule
    reference are not patchable — the PATCH schema deliberately omits them. To change
    those, delete and re-create the Slot.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SlotIdentifierInput(BaseModel):
    """
    A business identifier for the Slot (e.g. a booking reference number).
    Maps to the FHIR Identifier datatype stored in the slot_identifier child table.
    """

    model_config = ConfigDict(extra="forbid")

    # FHIR Identifier.use — usual | official | temp | secondary | old
    use: Optional[str] = Field(default=None, description="usual | official | temp | secondary | old")

    # Type sub-fields — flatten the CodeableConcept.coding[0] + text into flat columns
    type_system: Optional[str] = Field(default=None, description="Coding system URI for the identifier type")
    type_code: Optional[str] = Field(default=None, description="Code for the identifier type")
    type_display: Optional[str] = Field(default=None, description="Display text for the identifier type")
    type_text: Optional[str] = Field(default=None, description="Plain-text description of the identifier type")

    # The actual identifier namespace + value
    system: Optional[str] = Field(default=None, description="Namespace URI for this identifier value")
    value: str = Field(..., description="The identifier value — required, must be unique within system")

    # Optional validity period
    period_start: Optional[datetime] = Field(default=None, description="Start of the period this identifier is valid")
    period_end: Optional[datetime] = Field(default=None, description="End of the period this identifier is valid")

    assigner: Optional[str] = Field(default=None, description="Organisation that issued the identifier (display text)")


class SlotServiceCategoryInput(BaseModel):
    """
    Broad category of service covered by this Slot (e.g. General Practice, Physiotherapy).
    Maps to the FHIR CodeableConcept stored in the slot_service_category child table.
    """

    model_config = ConfigDict(extra="ignore")

    # First coding entry — the fhir-server expects exactly one Coding per category
    coding_system: Optional[str] = Field(default=None, description="Coding system URI (e.g. http://example.org/service-category)")
    coding_code: Optional[str] = Field(default=None, description="Code value (e.g. '17')")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the code")
    text: Optional[str] = Field(default=None, description="Plain-text representation of the service category")


class SlotServiceTypeInput(BaseModel):
    """
    Specific type of service that may be delivered during this Slot (e.g. Immunization).
    Maps to the FHIR CodeableConcept stored in the slot_service_type child table.
    """

    model_config = ConfigDict(extra="ignore")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the service type")
    coding_code: Optional[str] = Field(default=None, description="Code value for the service type")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the service type")
    text: Optional[str] = Field(default=None, description="Plain-text representation of the service type")


class SlotSpecialtyInput(BaseModel):
    """
    Clinical specialty required to deliver the service in this Slot (e.g. Cardiology).
    Maps to the FHIR CodeableConcept stored in the slot_specialty child table.
    """

    model_config = ConfigDict(extra="ignore")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the specialty (e.g. http://snomed.info/sct)")
    coding_code: Optional[str] = Field(default=None, description="SNOMED CT or other code for the specialty")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the specialty")
    text: Optional[str] = Field(default=None, description="Plain-text description of the specialty")


class SlotCreateSchema(BaseModel):
    """
    Input schema for creating a Slot resource (POST /slots).

    Required fields:
      - schedule: FHIR reference string, e.g. 'Schedule/200001'
      - status:   busy | free | busy-unavailable | busy-tentative | entered-in-error

    Tenant scoping (user_id, org_id) is Optional to match the fhir-server schema.
    created_by is NOT included — FhirClient injects it automatically from actor.sub.
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "schedule": "Schedule/200001",
                "status": "free",
                "start": "2024-06-01T09:00:00Z",
                "end": "2024-06-01T09:30:00Z",
                "overbooked": False,
                "comment": "Morning slot — first appointment of the day",
                "appointment_type_system": "http://terminology.hl7.org/CodeSystem/v2-0276",
                "appointment_type_code": "ROUTINE",
                "appointment_type_display": "Routine appointment",
                "service_category": [
                    {
                        "coding_system": "http://example.org/service-category",
                        "coding_code": "17",
                        "coding_display": "General Practice",
                    }
                ],
                "service_type": [{"coding_code": "57", "coding_display": "Immunization"}],
                "specialty": [
                    {
                        "coding_system": "http://snomed.info/sct",
                        "coding_code": "394814009",
                        "coding_display": "General practice",
                    }
                ],
                "identifier": [],
            }
        },
    )

    # Tenant scoping — Optional to match fhir-server's SlotCreateSchema.
    # The caller may supply these or rely on the fhir-server's defaults.
    user_id: Optional[str] = Field(default=None, description="User identifier for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Organisation identifier for tenant scoping")

    # The Schedule this slot belongs to — required, FHIR reference format e.g. "Schedule/200001"
    schedule: str = Field(
        ...,
        description="Reference to the Schedule this slot belongs to, e.g. 'Schedule/200001'",
    )
    schedule_display: Optional[str] = Field(
        default=None,
        description="Human-readable display text for the schedule reference",
    )

    # Slot status — required; free = bookable, busy = taken, etc.
    status: str = Field(
        ...,
        description="Slot status: busy | free | busy-unavailable | busy-tentative | entered-in-error",
    )

    # The bookable time window
    start: Optional[datetime] = Field(default=None, description="ISO 8601 datetime when the slot begins")
    end: Optional[datetime] = Field(default=None, description="ISO 8601 datetime when the slot concludes")

    overbooked: Optional[bool] = Field(
        default=None,
        description="True if the slot has been marked as overbooked beyond its normal capacity",
    )
    comment: Optional[str] = Field(
        default=None,
        description="Free-text comment about the slot (shown to consumers seeking appointments)",
    )

    # Appointment type — flat CodeableConcept fields (not a nested object)
    appointment_type_system: Optional[str] = Field(
        default=None,
        description="Coding system URI for the appointment type (e.g. http://terminology.hl7.org/CodeSystem/v2-0276)",
    )
    appointment_type_code: Optional[str] = Field(
        default=None,
        description="Appointment type code (e.g. ROUTINE, WALKIN, CHECKUP, FOLLOWUP, EMERGENCY)",
    )
    appointment_type_display: Optional[str] = Field(
        default=None,
        description="Human-readable display for the appointment type code",
    )
    appointment_type_text: Optional[str] = Field(
        default=None,
        description="Free-text description of the appointment type when no code applies",
    )

    # Child arrays — all optional at creation
    identifier: Optional[List[SlotIdentifierInput]] = Field(
        default=None,
        description="Business identifiers for this slot (e.g. booking reference numbers)",
    )
    service_category: Optional[List[SlotServiceCategoryInput]] = Field(
        default=None,
        description="Broad categories of service covered by this slot",
    )
    service_type: Optional[List[SlotServiceTypeInput]] = Field(
        default=None,
        description="Specific types of service that may be delivered during this slot",
    )
    specialty: Optional[List[SlotSpecialtyInput]] = Field(
        default=None,
        description="Clinical specialties required to deliver the service in this slot",
    )


class SlotGenerateSchema(BaseModel):
    """
    Input schema for auto-generating Slot resources (POST /slots/generate).

    The service fetches the target Schedule, validates the generation window
    against its planningHorizon, then creates one Slot per
    `slot_duration_minutes` interval between `generation_start` and
    `generation_end`. All generated slots are set to status=free.

    service_category, service_type, and specialty are optional overrides.
    When omitted they are auto-inherited in this priority order:
      1. Fields already stored on the Schedule resource.
      2. specialty[] on the PractitionerRole actor (if one is listed on the Schedule).
    The caller may always supply explicit values to override the auto-resolved ones.

    appointment_type_* is intentionally optional — the FHIR pattern is to set
    appointmentType on the Appointment at booking time, not on the Slot at
    generation time. It can still be pre-set here if all slots in a batch share
    the same appointment type (e.g. a dedicated ROUTINE session).
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "schedule_id": 200001,
                "generation_start": "2025-08-01T09:00:00",
                "generation_end": "2025-08-01T13:00:00",
                "slot_duration_minutes": 30,
                "overbooked": False,
                "comment": "Morning session — Cardiology OPD",
            }
        },
    )

    # Tenant scoping
    user_id: Optional[str] = Field(default=None, description="User ID for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Organisation ID for tenant scoping")

    # Target schedule — REQUIRED
    schedule_id: int = Field(
        ...,
        description="Integer ID of the Schedule to generate slots for",
    )

    # Generation window — REQUIRED; both must fall within the Schedule's planningHorizon
    generation_start: datetime = Field(
        ...,
        description="Start of the generation window (inclusive). Must be within the Schedule's planningHorizon.",
    )
    generation_end: datetime = Field(
        ...,
        description="End of the generation window (exclusive). Must be within the Schedule's planningHorizon.",
    )

    # Slot duration — REQUIRED
    slot_duration_minutes: int = Field(
        ...,
        ge=1,
        le=1440,
        description="Duration of each generated slot in minutes (1–1440). Must divide evenly into the window.",
    )

    # Appointment type — OPTIONAL; can be set at booking time instead
    appointment_type_system: Optional[str] = Field(
        default=None,
        description="Coding system URI for the appointment type (e.g. http://terminology.hl7.org/CodeSystem/v2-0276)",
    )
    appointment_type_code: Optional[str] = Field(
        default=None,
        description="Appointment type code (e.g. ROUTINE, WALKIN, FOLLOWUP, EMERGENCY). Can be set at booking time.",
    )
    appointment_type_display: Optional[str] = Field(
        default=None,
        description="Human-readable display for the appointment type code",
    )
    appointment_type_text: Optional[str] = Field(
        default=None,
        description="Free-text appointment type description when no code applies",
    )

    # Override arrays — if omitted, auto-inherited from Schedule / PractitionerRole actor
    service_category: Optional[List[SlotServiceCategoryInput]] = Field(
        default=None,
        description=(
            "Broad service category for every generated slot. "
            "Auto-inherited from the Schedule's service_category if omitted."
        ),
    )
    service_type: Optional[List[SlotServiceTypeInput]] = Field(
        default=None,
        description=(
            "Specific service type for every generated slot. "
            "Auto-inherited from the Schedule's service_type if omitted."
        ),
    )
    specialty: Optional[List[SlotSpecialtyInput]] = Field(
        default=None,
        description=(
            "Clinical specialty for every generated slot. "
            "Auto-inherited from the Schedule's specialty, then from the PractitionerRole "
            "actor's specialty[], if omitted."
        ),
    )

    # Slot flags
    overbooked: bool = Field(
        default=False,
        description="Mark every generated slot as overbooked. Default: False.",
    )
    comment: Optional[str] = Field(
        default=None,
        description="Free-text comment stamped on every generated slot",
    )

    @model_validator(mode="after")
    def validate_window(self) -> "SlotGenerateSchema":
        """Ensure the generation window is valid before hitting the fhir-server."""
        if self.generation_end <= self.generation_start:
            raise ValueError("generation_end must be after generation_start")
        return self


class SlotPatchSchema(BaseModel):
    """
    Input schema for partially updating a Slot (PATCH /slots/{id}).

    All fields are optional — the service layer enforces that at least one is provided.
    Arrays (identifier, serviceCategory, serviceType, specialty) and the schedule
    reference are intentionally excluded — they cannot be changed via PATCH.
    updated_by is NOT included — FhirClient injects it automatically from actor.sub.
    """

    model_config = ConfigDict(extra="forbid")

    # Patchable scalar fields only — no arrays, no schedule reference
    status: Optional[str] = Field(
        default=None,
        description="New slot status: busy | free | busy-unavailable | busy-tentative | entered-in-error",
    )
    start: Optional[datetime] = Field(default=None, description="New start datetime for the slot")
    end: Optional[datetime] = Field(default=None, description="New end datetime for the slot")
    overbooked: Optional[bool] = Field(default=None, description="Update the overbooked flag")
    comment: Optional[str] = Field(default=None, description="Update the free-text comment")

    # Appointment type flat fields — patchable individually
    appointment_type_system: Optional[str] = Field(default=None, description="New appointment type coding system URI")
    appointment_type_code: Optional[str] = Field(default=None, description="New appointment type code")
    appointment_type_display: Optional[str] = Field(default=None, description="New appointment type display text")
    appointment_type_text: Optional[str] = Field(default=None, description="New appointment type free text")


class ListSlotsSchema(BaseModel):
    """
    Query parameters for listing Slots (GET /slots).

    Supports filtering by status, schedule, practitioner role, and tenant scoping.
    All filters are optional — omitting them returns all slots the caller can see.
    """

    # Slot status filter — maps to the fhir-server's `status` query param
    status: Optional[str] = Field(
        default=None,
        description="Filter by slot status (busy | free | busy-unavailable | busy-tentative | entered-in-error)",
        alias=None,
    )

    # Schedule filter — returns only slots attached to this schedule
    schedule_id: Optional[int] = Field(
        default=None,
        description="Filter by the integer schedule_id to return only slots for a specific Schedule",
    )

    # Practitioner role filter — returns slots on schedules belonging to this practitioner role
    practitioner_role_id: Optional[int] = Field(
        default=None,
        description="Filter by practitioner_role_id — returns slots on that practitioner's schedules",
    )

    # Date range filters — all accept ISO datetime strings or YYYY-MM-DD date strings
    # date narrows to a single day; start_from/start_to define an inclusive range
    date: Optional[str] = Field(
        default=None,
        description="Exact start date filter (YYYY-MM-DD) — returns all slots whose start falls on this date",
    )
    start_from: Optional[str] = Field(
        default=None,
        description="Return slots with start >= this value (ISO datetime or YYYY-MM-DD)",
    )
    start_to: Optional[str] = Field(
        default=None,
        description="Return slots with start <= this value (ISO datetime or YYYY-MM-DD)",
    )

    # Tenant scoping — optional, narrows results to a specific user/org
    user_id: Optional[str] = Field(default=None, description="Filter by user_id for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Filter by org_id for tenant scoping")

    # Pagination
    limit: int = Field(default=20, ge=1, le=200, description="Maximum number of records to return per page")
    offset: int = Field(default=0, ge=0, description="Number of records to skip before returning results")
