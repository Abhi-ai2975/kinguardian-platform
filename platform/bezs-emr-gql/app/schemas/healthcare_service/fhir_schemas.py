"""
FHIR R4 schema models for HealthcareService resources — used only for OpenAPI documentation.

These models are NOT used for runtime validation. The middleware returns a JSONResponse
constructed directly from the fhir-server's response. The models here serve only to
document the FHIR R4 shape in Swagger UI so consumers know what to expect when they
send `Accept: application/fhir+json`.

Reference: https://hl7.org/fhir/R4/healthcareservice.html

Naming follows FHIR R4 camelCase conventions (providedBy, availableTime,
appointmentRequired, etc.) because these models document the wire format.
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


class FhirReference(BaseModel):
    """
    A reference from one resource to another (FHIR Reference datatype).
    Reference: https://hl7.org/fhir/R4/references.html
    """

    reference: Optional[str] = Field(
        default=None, description="Relative or absolute URL of the referenced resource"
    )
    display: Optional[str] = Field(
        default=None, description="Human-readable text alternative to the reference"
    )


class FhirContactPoint(BaseModel):
    """
    Details for all kinds of technology-mediated contact points (FHIR ContactPoint datatype).
    """

    system: Optional[str] = Field(
        default=None, description="phone | fax | email | pager | url | sms | other"
    )
    value: Optional[str] = Field(default=None, description="The actual contact point details")
    use: Optional[str] = Field(default=None, description="home | work | temp | old | mobile")
    rank: Optional[int] = Field(default=None, description="Specify preferred order of use (1 = highest)")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when the contact was/is in use")


class FhirIdentifier(BaseModel):
    """A business identifier for a resource (FHIR Identifier datatype)."""

    use: Optional[str] = Field(default=None, description="usual | official | temp | secondary | old")
    type: Optional[FhirCodeableConcept] = Field(default=None, description="Description of identifier type")
    system: Optional[str] = Field(default=None, description="The namespace for the identifier value")
    value: Optional[str] = Field(default=None, description="The value that is unique")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when identifier was valid")
    assigner: Optional[str] = Field(default=None, description="Organisation that issued the identifier")


class FhirAttachment(BaseModel):
    """
    For referring to data content defined in other formats (FHIR Attachment datatype).
    Used here for HealthcareService.photo.
    """

    contentType: Optional[str] = Field(default=None, description="MIME type of the content")
    language: Optional[str] = Field(default=None, description="BCP-47 language of the content")
    data: Optional[str] = Field(default=None, description="Base64-encoded data")
    url: Optional[str] = Field(default=None, description="URI where the data can be found")
    size: Optional[int] = Field(default=None, description="Number of bytes of content")
    hash: Optional[str] = Field(default=None, description="Base64-encoded SHA-1 hash of the data")
    title: Optional[str] = Field(default=None, description="Label to display in place of the data")
    creation: Optional[str] = Field(default=None, description="Date attachment was first created")


class FhirHSAvailableTime(BaseModel):
    """
    A time slot when the HealthcareService is available.
    Maps to FHIR R4 HealthcareService.availableTime backbone element.
    """

    daysOfWeek: Optional[List[str]] = Field(
        default=None, description="Days of the week: mon | tue | wed | thu | fri | sat | sun"
    )
    allDay: Optional[bool] = Field(default=None, description="Service is available all day")
    availableStartTime: Optional[str] = Field(default=None, description="Opening time (HH:mm:ss)")
    availableEndTime: Optional[str] = Field(default=None, description="Closing time (HH:mm:ss)")


class FhirHSNotAvailable(BaseModel):
    """
    A period during which the HealthcareService is not available.
    Maps to FHIR R4 HealthcareService.notAvailable backbone element.
    """

    description: Optional[str] = Field(default=None, description="Reason why the service is unavailable")
    during: Optional[FhirPeriod] = Field(default=None, description="The period during which the service is unavailable")


class FhirHSEligibility(BaseModel):
    """
    Eligibility requirements for the HealthcareService.
    Maps to FHIR R4 HealthcareService.eligibility backbone element.
    """

    code: Optional[FhirCodeableConcept] = Field(default=None, description="Coded value for eligibility")
    comment: Optional[str] = Field(default=None, description="Describes the eligibility conditions in detail")


class FhirHealthcareServiceResponse(BaseModel):
    """
    FHIR R4 HealthcareService resource — response shape when the client sends
    `Accept: application/fhir+json`.

    This model is used ONLY for OpenAPI documentation in Swagger UI.
    The middleware never validates runtime responses against it — the fhir-server
    constructs the actual FHIR resource and this middleware forwards it as-is.

    Reference: https://hl7.org/fhir/R4/healthcareservice.html
    """

    resourceType: str = Field(
        default="HealthcareService", description="Always 'HealthcareService' for this resource type"
    )
    id: Optional[str] = Field(default=None, description="Logical FHIR resource identifier")

    # Business identifiers for the service
    identifier: Optional[List[FhirIdentifier]] = Field(
        default=None, description="External identifiers for this service"
    )

    # Whether the service is currently active
    active: Optional[bool] = Field(default=None, description="Whether this service is currently active")

    # The organisation that provides the service
    providedBy: Optional[FhirReference] = Field(
        default=None, description="Organisation that provides this service"
    )

    # Broad category grouping(s) for the service
    category: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Broad category of service (e.g. General Practice, Dental)"
    )

    # Specific type(s) of service delivered
    type: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Type of service that may be delivered or performed"
    )

    # Clinical specialties associated with the service
    specialty: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Specialties handled by the service"
    )

    # Locations where the service is provided
    location: Optional[List[FhirReference]] = Field(
        default=None, description="Location(s) where the service may be provided"
    )

    name: Optional[str] = Field(default=None, description="Description of service as presented to a consumer")
    comment: Optional[str] = Field(
        default=None,
        description="Additional description of the service and/or specific requirements for delivering it",
    )
    extraDetails: Optional[str] = Field(
        default=None, description="Extra details about the service not captured elsewhere"
    )

    # Representative photo
    photo: Optional[FhirAttachment] = Field(
        default=None, description="Facilitates quick identification of the service"
    )

    # Contact details
    telecom: Optional[List[FhirContactPoint]] = Field(
        default=None, description="Contacts related to the healthcare service"
    )

    # Coverage area
    coverageArea: Optional[List[FhirReference]] = Field(
        default=None, description="Location(s) service is intended for/available to"
    )

    # Service provision conditions (cost, eligibility)
    serviceProvisionCode: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Conditions under which service is available/offered"
    )

    # Eligibility requirements
    eligibility: Optional[List[FhirHSEligibility]] = Field(
        default=None, description="Specific eligibility requirements for using the service"
    )

    # Health programs
    program: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Programs that this service is applicable to"
    )

    # Service characteristics (accessibility, language support, etc.)
    characteristic: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Collection of characteristics (attributes)"
    )

    # Communication languages
    communication: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="The language that this service is offered in"
    )

    # Referral methods accepted
    referralMethod: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Ways that the service accepts referrals"
    )

    appointmentRequired: Optional[bool] = Field(
        default=None, description="If an appointment is required for access to this service"
    )

    # Availability schedule
    availableTime: Optional[List[FhirHSAvailableTime]] = Field(
        default=None, description="Times the service is available"
    )
    notAvailable: Optional[List[FhirHSNotAvailable]] = Field(
        default=None, description="Not available during this time due to provided reason"
    )
    availabilityExceptions: Optional[str] = Field(
        default=None,
        description="Description of availability exceptions (e.g. public holidays)",
    )

    # Technical endpoints for electronic access
    endpoint: Optional[List[FhirReference]] = Field(
        default=None, description="Technical endpoints providing access to electronic services"
    )


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle — wraps one HealthcareService resource."""

    resource: FhirHealthcareServiceResponse = Field(description="The FHIR HealthcareService resource contained in this entry")


class FhirBundleResponse(BaseModel):
    """
    FHIR R4 Bundle searchset — returned for GET /healthcare-services when the client
    sends `Accept: application/fhir+json`.

    Reference: https://hl7.org/fhir/R4/bundle.html
    """

    resourceType: str = Field(default="Bundle", description="Always 'Bundle' for collections")
    type: str = Field(default="searchset", description="Always 'searchset' for search results")
    total: int = Field(description="Total number of matching resources (across all pages)")
    entry: Optional[List[FhirBundleEntry]] = Field(
        default=None, description="The HealthcareService resources in this page of results"
    )
