"""
FHIR R4 schema models for PractitionerRole resources — used only for OpenAPI documentation.

These models are NOT used for runtime validation. The middleware returns a JSONResponse
constructed directly from the fhir-server's response. The models here serve only to
document the FHIR R4 shape in Swagger UI so consumers know what to expect when they
send `Accept: application/fhir+json`.

Naming follows FHIR R4 camelCase conventions (healthcareService, availabilityExceptions,
availableTime, etc.) because these models document the wire format.

Note: the availability grouping (FhirPRAvailability containing availableTime and
notAvailableTime arrays) is an R5-style extension used in this implementation.

Reference: https://hl7.org/fhir/R4/practitionerrole.html
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class FhirCoding(BaseModel):
    """A reference to a code defined by a terminology system (FHIR Coding datatype)."""

    system: Optional[str] = Field(default=None, description="The coding system URI")
    code: Optional[str] = Field(default=None, description="Symbol defined by the coding system")
    display: Optional[str] = Field(default=None, description="Representation defined by the system")


class FhirCodeableConcept(BaseModel):
    """A concept defined by a reference to a terminology or provided as text."""

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
    """A reference from one FHIR resource to another (FHIR Reference datatype)."""

    reference: Optional[str] = Field(
        default=None,
        description="Relative or absolute URL of the referenced resource",
    )
    display: Optional[str] = Field(default=None, description="Human-readable text for the reference")


class FhirPRContactName(BaseModel):
    """Name within a PractitionerRole contact entry."""

    use: Optional[str] = Field(default=None, description="usual | official | temp | nickname | anonymous | old | maiden")
    text: Optional[str] = Field(default=None, description="Full name as display string")
    family: Optional[str] = Field(default=None, description="Family name (surname)")
    given: Optional[List[str]] = Field(default=None, description="Given names (first/middle)")
    prefix: Optional[List[str]] = Field(default=None, description="Name prefixes (titles)")
    suffix: Optional[List[str]] = Field(default=None, description="Name suffixes")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when name was/is in use")


class FhirPRContactTelecom(BaseModel):
    """Telecom contact point within a PractitionerRole contact entry."""

    system: Optional[str] = Field(default=None, description="phone | fax | email | pager | url | sms | other")
    value: Optional[str] = Field(default=None, description="The actual contact point details")
    use: Optional[str] = Field(default=None, description="home | work | temp | old | mobile")
    rank: Optional[int] = Field(default=None, description="Preferred order (1 = highest)")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when contact was/is in use")


class FhirPRContact(BaseModel):
    """
    Contact for the PractitionerRole for a specific purpose (R5-style extension).
    Maps to PractitionerRole.contact backbone element.
    """

    purpose: Optional[FhirCodeableConcept] = Field(
        default=None,
        description="The type of contact (e.g. ADMIN, BILL, PATINF)",
    )
    name: Optional[List[FhirPRContactName]] = Field(
        default=None,
        description="Name(s) of the contact person",
    )
    telecom: Optional[List[FhirPRContactTelecom]] = Field(
        default=None,
        description="Contact details for this contact",
    )
    address: Optional[dict] = Field(
        default=None,
        description="Address for this contact (FHIR Address datatype)",
    )
    organization: Optional[FhirReference] = Field(
        default=None,
        description="Organisation associated with this contact",
    )
    period: Optional[FhirPeriod] = Field(
        default=None,
        description="Validity period for this contact",
    )


class FhirPRAvailableTime(BaseModel):
    """
    A time slot when the PractitionerRole is available.
    Maps to FHIR R4 PractitionerRole.availableTime backbone element.
    """

    daysOfWeek: Optional[List[str]] = Field(
        default=None,
        description="Days of week: mon | tue | wed | thu | fri | sat | sun",
    )
    allDay: Optional[bool] = Field(default=None, description="True if available all day")
    availableStartTime: Optional[str] = Field(default=None, description="Opening time (HH:mm:ss)")
    availableEndTime: Optional[str] = Field(default=None, description="Closing time (HH:mm:ss)")


class FhirPRNotAvailableTime(BaseModel):
    """
    A period when the PractitionerRole is not available.
    Maps to FHIR R4 PractitionerRole.notAvailableTime backbone element.
    """

    description: Optional[str] = Field(default=None, description="Reason for unavailability")
    during: Optional[FhirPeriod] = Field(default=None, description="Period during which unavailable")


class FhirPRAvailability(BaseModel):
    """
    Availability group — R5-style extension grouping availableTime and notAvailableTime.
    """

    availableTime: Optional[List[FhirPRAvailableTime]] = Field(
        default=None,
        description="Times when the practitioner is available",
    )
    notAvailableTime: Optional[List[FhirPRNotAvailableTime]] = Field(
        default=None,
        description="Times when the practitioner is not available",
    )


class FhirPractitionerRoleResponse(BaseModel):
    """
    FHIR R4 PractitionerRole resource — response shape when the client sends
    `Accept: application/fhir+json`.

    This model is used ONLY for OpenAPI documentation in Swagger UI.
    The middleware never validates runtime responses against it — the fhir-server
    constructs the actual FHIR resource and this middleware forwards it as-is.

    A PractitionerRole describes what services a Practitioner can provide at
    a given Organisation and Location.

    Reference: https://hl7.org/fhir/R4/practitionerrole.html
    """

    resourceType: str = Field(
        default="PractitionerRole",
        description="Always 'PractitionerRole' for this resource type",
    )
    id: Optional[str] = Field(
        default=None,
        description="Logical FHIR resource identifier (string form of practitioner_role_id)",
    )

    # Business identifiers for this role
    identifier: Optional[List[FhirIdentifier]] = Field(
        default=None,
        description="Business identifiers for this practitioner role",
    )

    # Whether this role is currently active
    active: Optional[bool] = Field(default=None, description="Whether this practitioner role record is active")

    # Validity period for this role
    period: Optional[FhirPeriod] = Field(
        default=None,
        description="The period during which the practitioner is authorised to perform this role",
    )

    # Links to the Practitioner and Organisation
    practitioner: Optional[FhirReference] = Field(
        default=None,
        description="Practitioner providing services in this role",
    )
    organization: Optional[FhirReference] = Field(
        default=None,
        description="Organisation where the practitioner performs this role",
    )

    # Role codes and specialties
    code: Optional[List[FhirCodeableConcept]] = Field(
        default=None,
        description="Roles which this practitioner is authorised to perform",
    )
    specialty: Optional[List[FhirCodeableConcept]] = Field(
        default=None,
        description="Specific specialties associated with this role",
    )

    # Locations and services
    location: Optional[List[FhirReference]] = Field(
        default=None,
        description="Location(s) where the practitioner provides this role",
    )
    healthcareService: Optional[List[FhirReference]] = Field(
        default=None,
        description="HealthcareService(s) that the practitioner provides in this role",
    )

    # Additional attributes
    characteristic: Optional[List[FhirCodeableConcept]] = Field(
        default=None,
        description="Collection of characteristics for this role",
    )
    communication: Optional[List[FhirCodeableConcept]] = Field(
        default=None,
        description="Languages the practitioner uses for patient communication in this role",
    )

    # Contact details for this specific role
    contact: Optional[List[FhirPRContact]] = Field(
        default=None,
        description="Contact details for this specific role",
    )

    # Availability schedule (R5-style grouping)
    availability: Optional[List[FhirPRAvailability]] = Field(
        default=None,
        description="Availability schedule — times when the practitioner is and is not available",
    )

    # Free-text description of availability exceptions
    availabilityExceptions: Optional[str] = Field(
        default=None,
        description="Description of availability exceptions (e.g. public holidays, annual leave)",
    )

    # Technical endpoints
    endpoint: Optional[List[FhirReference]] = Field(
        default=None,
        description="Technical endpoints providing electronic access for this role",
    )


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle — wraps one PractitionerRole resource."""

    # Typed to FhirPractitionerRoleResponse (NOT Any) so Swagger UI renders the full
    # PractitionerRole schema rather than a generic "string" placeholder.
    resource: FhirPractitionerRoleResponse = Field(
        description="The FHIR PractitionerRole resource contained in this entry"
    )


class FhirBundleResponse(BaseModel):
    """
    FHIR R4 Bundle searchset — returned for GET /practitioner-roles when the client
    sends `Accept: application/fhir+json`.

    Reference: https://hl7.org/fhir/R4/bundle.html
    """

    resourceType: str = Field(default="Bundle", description="Always 'Bundle' for collections")
    type: str = Field(default="searchset", description="Always 'searchset' for search results")
    total: int = Field(description="Total number of matching PractitionerRole resources across all pages")
    entry: Optional[List[FhirBundleEntry]] = Field(
        default=None,
        description="The PractitionerRole resources in this page of results",
    )
