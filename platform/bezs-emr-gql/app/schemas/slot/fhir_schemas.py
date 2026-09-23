"""
FHIR R4 schema models for Slot resources — used only for OpenAPI documentation.

These models are NOT used for runtime validation. The middleware returns a JSONResponse
constructed directly from the fhir-server's response. The models here serve only to
document the FHIR R4 shape in Swagger UI so consumers know what to expect when they
send `Accept: application/fhir+json`.

Naming follows FHIR R4 camelCase conventions (serviceCategory, serviceType,
appointmentType, etc.) because these models document the wire format.

Reference: https://hl7.org/fhir/R4/slot.html
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class FhirCoding(BaseModel):
    """A reference to a code defined by a terminology system (FHIR Coding datatype)."""

    system: Optional[str] = Field(default=None, description="The coding system URI")
    code: Optional[str] = Field(default=None, description="Symbol defined by the coding system")
    display: Optional[str] = Field(default=None, description="Representation defined by the system")


class FhirCodeableConcept(BaseModel):
    """
    A concept that may be defined by a formal reference to a terminology or ontology
    (FHIR CodeableConcept datatype).
    """

    coding: Optional[List[FhirCoding]] = Field(default=None, description="Code defined by a terminology system")
    text: Optional[str] = Field(default=None, description="Plain text representation of the concept")


class FhirPeriod(BaseModel):
    """A time period defined by a start and end datetime (FHIR Period datatype)."""

    start: Optional[str] = Field(default=None, description="Start of the period (ISO 8601 datetime)")
    end: Optional[str] = Field(default=None, description="End of the period (ISO 8601 datetime)")


class FhirIdentifier(BaseModel):
    """A business identifier for a resource (FHIR Identifier datatype)."""

    use: Optional[str] = Field(default=None, description="usual | official | temp | secondary | old")
    type: Optional[FhirCodeableConcept] = Field(default=None, description="Description of identifier type")
    system: Optional[str] = Field(default=None, description="The namespace for the identifier value")
    value: Optional[str] = Field(default=None, description="The value that is unique within the system")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when identifier was/is valid")
    assigner: Optional[str] = Field(default=None, description="Organisation that issued the identifier")


class FhirReference(BaseModel):
    """
    A reference from one FHIR resource to another (FHIR Reference datatype).
    Reference: https://hl7.org/fhir/R4/references.html
    """

    reference: Optional[str] = Field(
        default=None,
        description="Relative or absolute URL of the referenced resource (e.g. 'Schedule/200001')",
    )
    display: Optional[str] = Field(
        default=None,
        description="Human-readable text alternative to the reference",
    )


class FhirSlotResponse(BaseModel):
    """
    FHIR R4 Slot resource — response shape when the client sends
    `Accept: application/fhir+json`.

    This model is used ONLY for OpenAPI documentation in Swagger UI.
    The middleware never validates runtime responses against it — the fhir-server
    constructs the actual FHIR resource and this middleware forwards it as-is.

    A Slot is a bookable time window on a Schedule. Multiple Slots may exist on
    a Schedule, and an Appointment is created by booking one (or more) Slots.

    Reference: https://hl7.org/fhir/R4/slot.html
    """

    resourceType: str = Field(default="Slot", description="Always 'Slot' for this resource type")
    id: Optional[str] = Field(default=None, description="Logical FHIR resource identifier (string form of slot_id)")

    # Business identifiers for the slot (e.g. booking reference numbers)
    identifier: Optional[List[FhirIdentifier]] = Field(
        default=None,
        description="External identifiers for this slot",
    )

    # Broad category of service covered by this slot (e.g. General Practice, Physiotherapy)
    serviceCategory: Optional[List[FhirCodeableConcept]] = Field(
        default=None,
        description="High-level category of service covered by the slot",
    )

    # Specific type of service (e.g. Immunization, Consultation)
    serviceType: Optional[List[FhirCodeableConcept]] = Field(
        default=None,
        description="Specific type of service that may be delivered during this slot",
    )

    # Clinical specialty required (e.g. General Practice, Cardiology)
    specialty: Optional[List[FhirCodeableConcept]] = Field(
        default=None,
        description="Clinical specialty required to deliver the service in this slot",
    )

    # Type of appointment that can be booked in this slot
    # (e.g. ROUTINE, WALKIN, CHECKUP, FOLLOWUP, EMERGENCY from v2-0276)
    appointmentType: Optional[FhirCodeableConcept] = Field(
        default=None,
        description="The style of appointment or patient that may be booked in this slot",
    )

    # Reference to the parent Schedule — required in FHIR R4 (1..1 cardinality)
    schedule: Optional[FhirReference] = Field(
        default=None,
        description="The Schedule resource that this slot defines an interval of (e.g. 'Schedule/200001')",
    )

    # Slot availability status — required in FHIR R4
    status: Optional[str] = Field(
        default=None,
        description="busy | free | busy-unavailable | busy-tentative | entered-in-error",
    )

    # The bookable time window
    start: Optional[str] = Field(default=None, description="Date/Time the slot begins (ISO 8601)")
    end: Optional[str] = Field(default=None, description="Date/Time the slot concludes (ISO 8601)")

    overbooked: Optional[bool] = Field(
        default=None,
        description="True if the slot has been overbooked — appointment booking should not be done",
    )

    comment: Optional[str] = Field(
        default=None,
        description="Comments on the slot to describe any extended information. Shown to consumers.",
    )


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle — wraps one Slot resource."""

    # Typed to FhirSlotResponse (NOT Any) so Swagger UI renders the full
    # Slot schema inside the Bundle entry instead of a generic "string" placeholder.
    resource: FhirSlotResponse = Field(description="The FHIR Slot resource contained in this entry")


class FhirBundleResponse(BaseModel):
    """
    FHIR R4 Bundle searchset — returned for GET /slots when the client sends
    `Accept: application/fhir+json`.

    Reference: https://hl7.org/fhir/R4/bundle.html
    """

    resourceType: str = Field(default="Bundle", description="Always 'Bundle' for collections")
    type: str = Field(default="searchset", description="Always 'searchset' for search results")
    total: int = Field(description="Total number of matching Slot resources across all pages")
    entry: Optional[List[FhirBundleEntry]] = Field(
        default=None,
        description="The Slot resources in this page of results",
    )
