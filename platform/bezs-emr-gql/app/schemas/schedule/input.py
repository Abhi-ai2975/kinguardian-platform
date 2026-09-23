"""
Input schemas for FHIR Schedule resource endpoints.

Three schemas cover the full API surface:
  - ScheduleCreateSchema:    validated body for POST /schedules
  - SchedulePatchSchema:     validated body for PATCH /schedules/{id}
  - ListSchedulesSchema:     validated query parameters for GET /schedules

A Schedule defines a container for time slots associated with one or more actors
(Practitioner, HealthcareService, Location, Device, Patient, etc.) during a
planning horizon. Slots reference back to a Schedule.

Design decisions:
  - user_id and org_id are Optional inputs supplied by the caller for tenant scoping,
    matching the fhir-server's own schema where they are Optional.
  - created_by / updated_by are NOT exposed — FhirClient injects them automatically.
  - actor is the central field — FHIR requires at least one actor (cardinality 1..*),
    but the fhir-server accepts it as Optional for flexibility; we follow suit.
  - Array sub-resources (identifier, service_category, service_type, specialty, actor)
    use nested Pydantic models with extra="forbid".
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Array sub-schemas ──────────────────────────────────────────────────────────


class ScheduleIdentifierInput(BaseModel):
    """
    A business identifier for a Schedule.
    Maps to FHIR R4 Identifier: https://hl7.org/fhir/R4/datatypes.html#Identifier
    """

    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = Field(
        default=None, description="Identifier use: usual | official | temp | secondary | old"
    )
    type_system: Optional[str] = Field(default=None, description="Coding system URI for the identifier type")
    type_code: Optional[str] = Field(default=None, description="Code from the identifier type system")
    type_display: Optional[str] = Field(default=None, description="Human-readable display for the identifier type")
    type_text: Optional[str] = Field(default=None, description="Plain-text description of the identifier type")
    system: Optional[str] = Field(default=None, description="URI defining the identifier namespace")
    value: str = Field(description="The identifier value within the system (required)")
    period_start: Optional[datetime] = Field(default=None, description="Start of the identifier validity period")
    period_end: Optional[datetime] = Field(default=None, description="End of the identifier validity period")
    assigner: Optional[str] = Field(default=None, description="Display name of the organisation that issued the identifier")


class ScheduleServiceCategoryInput(BaseModel):
    """
    Broad category of the service for which slots are being scheduled
    (e.g. 'General Practice', 'Physiotherapy').
    Maps to FHIR R4 CodeableConcept used in Schedule.serviceCategory.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the service category")
    coding_code: Optional[str] = Field(default=None, description="Service category code value")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the category")
    text: Optional[str] = Field(default=None, description="Plain-text description of the service category")


class ScheduleServiceTypeInput(BaseModel):
    """
    Specific type of service for which slots are being scheduled (e.g. 'Immunization').
    Maps to FHIR R4 CodeableConcept used in Schedule.serviceType.
    Reference: https://hl7.org/fhir/R4/valueset-service-type.html
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the service type")
    coding_code: Optional[str] = Field(default=None, description="Service type code value")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the service type")
    text: Optional[str] = Field(default=None, description="Plain-text description of the service type")


class ScheduleSpecialtyInput(BaseModel):
    """
    Clinical specialty for the Schedule (e.g. 'General Practice', 'Cardiology').
    Maps to FHIR R4 CodeableConcept used in Schedule.specialty.
    Reference: https://hl7.org/fhir/R4/valueset-c80-practice-codes.html
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI (e.g. http://snomed.info/sct)")
    coding_code: Optional[str] = Field(default=None, description="Specialty SNOMED CT concept code")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the specialty")
    text: Optional[str] = Field(default=None, description="Plain-text description of the specialty")


class ScheduleActorInput(BaseModel):
    """
    A resource that this Schedule provides availability for.

    FHIR R4 allows the following actor types:
      Patient, Practitioner, PractitionerRole, RelatedPerson,
      Device, HealthcareService, Location.

    Maps to a FHIR R4 Reference in Schedule.actor (cardinality 1..*).
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        description=(
            "FHIR relative reference identifying the actor, e.g. 'Practitioner/30001'. "
            "Allowed types: Patient, Practitioner, PractitionerRole, RelatedPerson, "
            "Device, HealthcareService, Location."
        )
    )
    reference_display: Optional[str] = Field(
        default=None, description="Human-readable display name for the actor"
    )


# ── Top-level schemas ──────────────────────────────────────────────────────────


class ScheduleCreateSchema(BaseModel):
    """
    Validated body for POST /schedules.

    user_id and org_id are Optional inputs supplied by the caller for tenant scoping.
    created_by is excluded — FhirClient.post() injects it from actor.sub automatically.

    extra="forbid" rejects unknown fields at the API boundary.
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "active": True,
                "comment": "Schedule for Dr. Smith — Mon/Wed/Fri mornings",
                "planning_horizon_start": "2024-01-01T08:00:00Z",
                "planning_horizon_end": "2024-12-31T12:00:00Z",
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
                "actor": [{"reference": "Practitioner/30001", "reference_display": "Dr. Smith"}],
            }
        },
    )

    # ── Tenant scoping ─────────────────────────────────────────────────────────
    # Optional — supplied by the caller in the request body when multi-tenant
    # isolation is required. The fhir-server treats these as Optional.
    # created_by is NOT included — FhirClient injects it from actor.sub.
    user_id: Optional[str] = Field(default=None, description="User identifier for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Organisation identifier for tenant scoping")

    # ── Core scalar fields ─────────────────────────────────────────────────────
    active: Optional[bool] = Field(
        default=None, description="Whether this Schedule is currently active and accepting new appointments"
    )
    comment: Optional[str] = Field(
        default=None, description="Comments on the availability of slots. Displayed to consumers."
    )

    # ── Planning horizon ───────────────────────────────────────────────────────
    # Defines the period of time for which slots should be generated.
    # Slots outside this range should not be created.
    planning_horizon_start: Optional[datetime] = Field(
        default=None, description="Start of the period for which slots should be provided (ISO 8601)"
    )
    planning_horizon_end: Optional[datetime] = Field(
        default=None, description="End of the period for which slots should be provided (ISO 8601)"
    )

    # ── Array sub-resources ────────────────────────────────────────────────────
    identifier: Optional[List[ScheduleIdentifierInput]] = Field(
        default=None, description="External business identifiers for this Schedule"
    )
    service_category: Optional[List[ScheduleServiceCategoryInput]] = Field(
        default=None, description="Broad category of service being scheduled"
    )
    service_type: Optional[List[ScheduleServiceTypeInput]] = Field(
        default=None, description="Specific service type being scheduled"
    )
    specialty: Optional[List[ScheduleSpecialtyInput]] = Field(
        default=None, description="Clinical specialty(s) of the Schedule"
    )
    # actor is the central relationship — who or what this schedule is for.
    # FHIR R4 requires at least one actor (1..*); fhir-server accepts it as Optional.
    actor: Optional[List[ScheduleActorInput]] = Field(
        default=None,
        description=(
            "The resource(s) this Schedule provides availability for. "
            "At least one actor is expected per FHIR R4 (Practitioner, HealthcareService, Location, etc.)."
        ),
    )


class SchedulePatchSchema(BaseModel):
    """
    Validated body for PATCH /schedules/{id}.

    Only scalar fields are patchable. Array sub-resources (identifier,
    service_category, service_type, specialty, actor) are not patchable —
    delete and re-create the Schedule to correct those.

    All fields are optional — at least one must be provided (enforced by the
    service layer). updated_by is not exposed — FhirClient.patch() injects it.
    """

    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = Field(default=None, description="Whether this Schedule is active")
    comment: Optional[str] = Field(default=None, description="Updated comments on slot availability")
    planning_horizon_start: Optional[datetime] = Field(
        default=None, description="Updated start of the planning horizon"
    )
    planning_horizon_end: Optional[datetime] = Field(
        default=None, description="Updated end of the planning horizon"
    )


class ListSchedulesSchema(BaseModel):
    """
    Validated query parameters for GET /schedules.

    All filters are optional. Unset filters (None) are stripped by
    ScheduleClient.list() before the query string is built.
    """

    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = Field(default=None, description="Filter by active status")
    limit: int = Field(default=20, ge=1, le=200, description="Maximum number of records to return")
    offset: int = Field(default=0, ge=0, description="Number of records to skip for pagination")
