"""
FHIR R4 schema models for Schedule resources — used only for OpenAPI documentation.

These models are NOT used for runtime validation. The middleware returns a JSONResponse
constructed directly from the fhir-server's response. The models here serve only to
document the FHIR R4 shape in Swagger UI so consumers know what to expect when they
send `Accept: application/fhir+json`.

Reference: https://hl7.org/fhir/R4/schedule.html

Naming follows FHIR R4 camelCase conventions (serviceCategory, serviceType,
planningHorizon, etc.) because these models document the wire format.
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
        default=None, description="Relative or absolute URL of the referenced resource (e.g. 'Practitioner/30001')"
    )
    display: Optional[str] = Field(
        default=None, description="Human-readable text alternative to the reference"
    )


class FhirScheduleResponse(BaseModel):
    """
    FHIR R4 Schedule resource — response shape when the client sends
    `Accept: application/fhir+json`.

    This model is used ONLY for OpenAPI documentation in Swagger UI.
    The middleware never validates runtime responses against it — the fhir-server
    constructs the actual FHIR resource and this middleware forwards it as-is.

    Reference: https://hl7.org/fhir/R4/schedule.html
    """

    resourceType: str = Field(default="Schedule", description="Always 'Schedule' for this resource type")
    id: Optional[str] = Field(default=None, description="Logical FHIR resource identifier")

    # Business identifiers for the Schedule
    identifier: Optional[List[FhirIdentifier]] = Field(
        default=None, description="External identifiers for this Schedule"
    )

    # Whether this Schedule is currently active
    active: Optional[bool] = Field(
        default=None, description="Whether the schedule is still being used"
    )

    # Broad category of service (e.g. General Practice, Physiotherapy)
    serviceCategory: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="High-level category of the service covered by the schedule"
    )

    # Specific type of service (e.g. Immunization, Consultation)
    serviceType: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Specific service within the broader category"
    )

    # Clinical specialty (e.g. General Practice, Cardiology)
    specialty: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Type of specialist that would be required to perform the service"
    )

    # The actors this Schedule provides availability for.
    # FHIR R4 cardinality is 1..* — at least one actor is required.
    # Allowed types: Patient, Practitioner, PractitionerRole, RelatedPerson,
    #                Device, HealthcareService, Location.
    actor: Optional[List[FhirReference]] = Field(
        default=None,
        description=(
            "The resource(s) this schedule provides availability information for. "
            "Allowed types: Patient, Practitioner, PractitionerRole, RelatedPerson, "
            "Device, HealthcareService, Location."
        ),
    )

    # The period of time for which slots can/should be provided
    planningHorizon: Optional[FhirPeriod] = Field(
        default=None,
        description="The period of time that the slots that are attached to this schedule cover",
    )

    comment: Optional[str] = Field(
        default=None,
        description="Comments on the availability of slots. Shown to consumers seeking appointments.",
    )


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle — wraps one Schedule resource."""

    resource: FhirScheduleResponse = Field(description="The FHIR Schedule resource contained in this entry")


class FhirBundleResponse(BaseModel):
    """
    FHIR R4 Bundle searchset — returned for GET /schedules when the client sends
    `Accept: application/fhir+json`.

    Reference: https://hl7.org/fhir/R4/bundle.html
    """

    resourceType: str = Field(default="Bundle", description="Always 'Bundle' for collections")
    type: str = Field(default="searchset", description="Always 'searchset' for search results")
    total: int = Field(description="Total number of matching Schedule resources across all pages")
    entry: Optional[List[FhirBundleEntry]] = Field(
        default=None, description="The Schedule resources in this page of results"
    )
