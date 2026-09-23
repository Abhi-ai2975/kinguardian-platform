"""
FHIR R4 schema models for Practitioner resources — used only for OpenAPI documentation.

These models are NOT used for runtime validation. The middleware returns a JSONResponse
constructed directly from the fhir-server's response. The models here serve only to
document the FHIR R4 shape in Swagger UI so consumers know what to expect when they
send `Accept: application/fhir+json`.

Naming follows FHIR R4 camelCase conventions (birthDate, deceasedBoolean,
appointmentRequired, etc.) because these models document the wire format.

Reference: https://hl7.org/fhir/R4/practitioner.html
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


class FhirContactPoint(BaseModel):
    """Details for technology-mediated contact points (FHIR ContactPoint datatype)."""

    system: Optional[str] = Field(default=None, description="phone | fax | email | pager | url | sms | other")
    value: Optional[str] = Field(default=None, description="The actual contact point details")
    use: Optional[str] = Field(default=None, description="home | work | temp | old | mobile")
    rank: Optional[int] = Field(default=None, description="Specify preferred order (1 = highest)")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when contact was/is in use")


class FhirHumanName(BaseModel):
    """A human's name with parts and usage (FHIR HumanName datatype)."""

    use: Optional[str] = Field(
        default=None,
        description="usual | official | temp | nickname | anonymous | old | maiden",
    )
    text: Optional[str] = Field(default=None, description="Text representation of the full name")
    family: Optional[str] = Field(default=None, description="Family name (surname)")
    given: Optional[List[str]] = Field(default=None, description="Given names (including middle names)")
    prefix: Optional[List[str]] = Field(default=None, description="Parts that come before the name (titles)")
    suffix: Optional[List[str]] = Field(default=None, description="Parts that come after the name (qualifications)")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when name was/is in use")


class FhirAddress(BaseModel):
    """An address expressed using postal conventions (FHIR Address datatype)."""

    use: Optional[str] = Field(default=None, description="home | work | temp | old | billing")
    type: Optional[str] = Field(default=None, description="postal | physical | both")
    text: Optional[str] = Field(default=None, description="Text representation of the address")
    line: Optional[List[str]] = Field(default=None, description="Street name, number, direction, etc.")
    city: Optional[str] = Field(default=None, description="Name of city, town, village, etc.")
    district: Optional[str] = Field(default=None, description="District name (county, etc.)")
    state: Optional[str] = Field(default=None, description="Sub-unit of country (state, province)")
    postalCode: Optional[str] = Field(default=None, description="Postal code for area")
    country: Optional[str] = Field(default=None, description="Country (ISO 3166 code preferred)")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when address was/is in use")


class FhirAttachment(BaseModel):
    """For referring to data content defined in other formats (FHIR Attachment datatype)."""

    contentType: Optional[str] = Field(default=None, description="MIME type of the content (e.g. image/png)")
    language: Optional[str] = Field(default=None, description="BCP-47 language of the content")
    data: Optional[str] = Field(default=None, description="Base64-encoded data")
    url: Optional[str] = Field(default=None, description="URI where the data can be found")
    size: Optional[int] = Field(default=None, description="Number of bytes of content")
    hash: Optional[str] = Field(default=None, description="Base64-encoded SHA-1 hash of the data")
    title: Optional[str] = Field(default=None, description="Label to display in place of the data")
    creation: Optional[str] = Field(default=None, description="Date attachment was first created (ISO 8601)")


class FhirReference(BaseModel):
    """A reference from one FHIR resource to another (FHIR Reference datatype)."""

    reference: Optional[str] = Field(
        default=None,
        description="Relative or absolute URL of the referenced resource (e.g. 'Organization/100')",
    )
    display: Optional[str] = Field(default=None, description="Human-readable text for the reference")


class FhirQualification(BaseModel):
    """
    Practitioner qualification — certifications, licenses, or training completed.
    Maps to FHIR R4 Practitioner.qualification backbone element.
    """

    identifier: Optional[List[FhirIdentifier]] = Field(
        default=None,
        description="Identifiers for this qualification (e.g. license number)",
    )
    code: Optional[FhirCodeableConcept] = Field(
        default=None,
        description="Coded qualification type (e.g. MD, RN, PharmD)",
    )
    status: Optional[FhirCodeableConcept] = Field(
        default=None,
        description="Status of the qualification (e.g. active, inactive, pending)",
    )
    period: Optional[FhirPeriod] = Field(
        default=None,
        description="Period during which the qualification is valid",
    )
    issuer: Optional[FhirReference] = Field(
        default=None,
        description="Organisation that issued the qualification (e.g. 'Organization/100')",
    )


class FhirCommunication(BaseModel):
    """
    Language the practitioner can use in patient communication.
    Maps to FHIR R4 Practitioner.communication backbone element.
    """

    language: Optional[FhirCodeableConcept] = Field(
        default=None,
        description="Language as a CodeableConcept (BCP-47 language code, e.g. en-US)",
    )
    preferred: Optional[bool] = Field(
        default=None,
        description="True if this is the practitioner's preferred communication language",
    )


class FhirPractitionerResponse(BaseModel):
    """
    FHIR R4 Practitioner resource — response shape when the client sends
    `Accept: application/fhir+json`.

    This model is used ONLY for OpenAPI documentation in Swagger UI.
    The middleware never validates runtime responses against it — the fhir-server
    constructs the actual FHIR resource and this middleware forwards it as-is.

    Reference: https://hl7.org/fhir/R4/practitioner.html
    """

    resourceType: str = Field(
        default="Practitioner",
        description="Always 'Practitioner' for this resource type",
    )
    id: Optional[str] = Field(
        default=None,
        description="Logical FHIR resource identifier (string form of practitioner_id)",
    )

    # Whether this practitioner record is currently in active use
    active: Optional[bool] = Field(
        default=None,
        description="Whether this practitioner's record is in active use",
    )

    # FHIR R4 administrative gender
    gender: Optional[str] = Field(
        default=None,
        description="Administrative gender: male | female | other | unknown",
    )

    # Date of birth in ISO 8601 date format
    birthDate: Optional[str] = Field(default=None, description="The date of birth for the practitioner (ISO 8601)")

    # Deceased — either a boolean flag or an exact datetime, not both
    deceasedBoolean: Optional[bool] = Field(
        default=None,
        description="Indicates if the practitioner is deceased (when exact datetime is unknown)",
    )
    deceasedDateTime: Optional[str] = Field(
        default=None,
        description="Date/time of death (ISO 8601) — used when the exact datetime is known",
    )

    # Business identifiers (NPI, license number, DEA number, etc.)
    identifier: Optional[List[FhirIdentifier]] = Field(
        default=None,
        description="An identifier that applies to this practitioner in this role",
    )

    # Names — a practitioner may have multiple names (official, nickname, etc.)
    name: Optional[List[FhirHumanName]] = Field(
        default=None,
        description="The name(s) associated with the practitioner",
    )

    # Contact details applying to all roles (role-specific telecom goes on PractitionerRole)
    telecom: Optional[List[FhirContactPoint]] = Field(
        default=None,
        description="A contact detail for the practitioner (applying to all roles)",
    )

    # Address — physical address(es)
    address: Optional[List[FhirAddress]] = Field(
        default=None,
        description="Address(es) of the practitioner that are not role specific",
    )

    # Photos of the practitioner (typically a headshot)
    photo: Optional[List[FhirAttachment]] = Field(
        default=None,
        description="Image(s) of the practitioner",
    )

    # Credentials — certifications, training, licenses
    qualification: Optional[List[FhirQualification]] = Field(
        default=None,
        description="Qualifications — certifications, licenses, or training of the practitioner",
    )

    # Languages used in patient communication
    communication: Optional[List[FhirCommunication]] = Field(
        default=None,
        description="A language the practitioner can use in patient communication",
    )


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle — wraps one Practitioner resource."""

    # Typed to FhirPractitionerResponse (NOT Any) so Swagger UI renders the full
    # Practitioner schema rather than a generic "string" placeholder.
    resource: FhirPractitionerResponse = Field(
        description="The FHIR Practitioner resource contained in this entry"
    )


class FhirBundleResponse(BaseModel):
    """
    FHIR R4 Bundle searchset — returned for GET /practitioners when the client
    sends `Accept: application/fhir+json`.

    Reference: https://hl7.org/fhir/R4/bundle.html
    """

    resourceType: str = Field(default="Bundle", description="Always 'Bundle' for collections")
    type: str = Field(default="searchset", description="Always 'searchset' for search results")
    total: int = Field(description="Total number of matching Practitioner resources across all pages")
    entry: Optional[List[FhirBundleEntry]] = Field(
        default=None,
        description="The Practitioner resources in this page of results",
    )
