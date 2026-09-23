"""
Pydantic models representing the FHIR R4 Organization resource shape.

These models exist ONLY for OpenAPI documentation purposes — they tell Swagger UI
what the response looks like when the client sends `Accept: application/fhir+json`.
They are never used for runtime validation because route handlers return JSONResponse
directly (which bypasses Pydantic response_model validation by design).

The FHIR R4 Organization resource spec:
  https://hl7.org/fhir/R4/organization.html

Structure mirrors what the FHIR Server's content negotiation layer produces when it
receives `Accept: application/fhir+json`. All field names follow FHIR R4 camelCase
conventions (e.g. `postalCode`, `partOf`) rather than the plain JSON snake_case shape.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class FhirCoding(BaseModel):
    """
    FHIR Coding — a reference to a code defined by a terminology system.
    Used inside CodeableConcept to provide a system-code-display triple.
    """

    system: Optional[str] = Field(default=None, description="URI of the code system (e.g. http://terminology.hl7.org/CodeSystem/organization-type)")
    code: Optional[str] = Field(default=None, description="Symbol in the code system (e.g. 'prov')")
    display: Optional[str] = Field(default=None, description="Human-readable representation of the code")


class FhirCodeableConcept(BaseModel):
    """
    FHIR CodeableConcept — a concept that may be defined by a formal reference to a terminology
    or ontology, or may be provided by text.
    """

    coding: Optional[List[FhirCoding]] = Field(default=None, description="Code defined by a terminology system")
    text: Optional[str] = Field(default=None, description="Plain text representation of the concept")


class FhirPeriod(BaseModel):
    """FHIR Period — a time period defined by a start and end datetime."""

    start: Optional[str] = Field(default=None, description="ISO-8601 start of the period")
    end: Optional[str] = Field(default=None, description="ISO-8601 end of the period (inclusive)")


class FhirIdentifier(BaseModel):
    """
    FHIR Identifier — a numeric or alphanumeric string that is associated with a
    single object or entity within a given system (e.g. NPI, tax ID, MRN).
    """

    use: Optional[str] = Field(default=None, description="usual | official | temp | secondary | old")
    type: Optional[FhirCodeableConcept] = Field(default=None, description="Description of identifier")
    system: Optional[str] = Field(default=None, description="URI namespace of the identifier value")
    value: Optional[str] = Field(default=None, description="The value that is unique within the system")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when identifier is/was valid")
    assigner: Optional[dict] = Field(default=None, description="Organisation that issued the identifier")


class FhirContactPoint(BaseModel):
    """FHIR ContactPoint — details for all kinds of technology-mediated contact points."""

    system: Optional[str] = Field(default=None, description="phone | fax | email | pager | url | sms | other")
    value: Optional[str] = Field(default=None, description="The actual contact point details")
    use: Optional[str] = Field(default=None, description="home | work | temp | old | mobile")
    rank: Optional[int] = Field(default=None, description="Preferred order — lower number = higher preference")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when contact point was/is in use")


class FhirAddress(BaseModel):
    """FHIR Address — an address expressed using postal conventions."""

    use: Optional[str] = Field(default=None, description="home | work | temp | old | billing")
    type: Optional[str] = Field(default=None, description="postal | physical | both")
    text: Optional[str] = Field(default=None, description="Text representation of the address")
    line: Optional[List[str]] = Field(default=None, description="Street name, number, direction, PO Box")
    city: Optional[str] = Field(default=None, description="Name of city, town, suburb, village")
    district: Optional[str] = Field(default=None, description="District name (county, parish, etc.)")
    state: Optional[str] = Field(default=None, description="Sub-unit of country (abbreviation)")
    postalCode: Optional[str] = Field(default=None, description="Postal code for area")
    country: Optional[str] = Field(default=None, description="Country (ISO 3166 code preferred)")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when address was/is in use")


class FhirHumanName(BaseModel):
    """FHIR HumanName — a human's name with the ability to identify parts and usage."""

    use: Optional[str] = Field(default=None, description="usual | official | temp | nickname | anonymous | old | maiden")
    text: Optional[str] = Field(default=None, description="Text representation of the full name")
    family: Optional[str] = Field(default=None, description="Family name (surname)")
    given: Optional[List[str]] = Field(default=None, description="Given names (including middle names)")
    prefix: Optional[List[str]] = Field(default=None, description="Parts that come before the name (titles)")
    suffix: Optional[List[str]] = Field(default=None, description="Parts that come after the name (qualifications)")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when name was/is in use")


class FhirOrgContact(BaseModel):
    """
    FHIR Organization.contact — contact for the organisation for a certain purpose.
    Represents a person who acts as a point of contact for specific functions.
    """

    purpose: Optional[FhirCodeableConcept] = Field(default=None, description="The type of contact (ADMIN, BILL, HR, PATINF, PRESS)")
    name: Optional[FhirHumanName] = Field(default=None, description="A name associated with the contact")
    telecom: Optional[List[FhirContactPoint]] = Field(default=None, description="Contact details for the person")
    address: Optional[FhirAddress] = Field(default=None, description="Visiting or postal address for the contact")


class FhirReference(BaseModel):
    """
    FHIR Reference — a reference from one resource to another.
    Stored as a relative URL string (e.g. 'Organization/42') plus an optional display label.
    """

    reference: Optional[str] = Field(default=None, description="Relative URL reference (e.g. 'Endpoint/1')")
    display: Optional[str] = Field(default=None, description="Human-readable text for the reference")


class FhirOrgResponse(BaseModel):
    """
    FHIR R4 Organization resource — the response shape when the client sends
    `Accept: application/fhir+json`.

    All fields follow FHIR R4 camelCase naming. Fields that were not populated
    on the resource are omitted from the response (not returned as null).

    Reference: https://hl7.org/fhir/R4/organization.html
    """

    resourceType: str = Field(default="Organization", description="Always 'Organization' — identifies the FHIR resource type")
    id: str = Field(description="Logical FHIR resource ID (string representation of the DB primary key)")
    active: Optional[bool] = Field(default=None, description="Whether the organisation's record is still in active use")
    name: Optional[str] = Field(default=None, description="Name used for the organisation")
    identifier: Optional[List[FhirIdentifier]] = Field(default=None, description="Identifies this organisation across multiple systems")
    type: Optional[List[FhirCodeableConcept]] = Field(default=None, description="Kind(s) of organisation (prov, dept, team, govt, ins, etc.)")
    alias: Optional[List[str]] = Field(default=None, description="A list of alternate names the organisation is known as")
    telecom: Optional[List[FhirContactPoint]] = Field(default=None, description="A contact detail for the organisation")
    address: Optional[List[FhirAddress]] = Field(default=None, description="An address for the organisation")
    partOf: Optional[FhirReference] = Field(default=None, description="The organisation of which this organisation forms a part")
    contact: Optional[List[FhirOrgContact]] = Field(default=None, description="Contact for the organisation for a certain purpose")
    endpoint: Optional[List[FhirReference]] = Field(default=None, description="Technical endpoints providing access to services operated for the organisation")


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle — wraps one Organization resource."""

    resource: FhirOrgResponse = Field(description="The FHIR Organization resource contained in this entry")


class FhirBundleResponse(BaseModel):
    """
    FHIR R4 Bundle of type 'searchset' — the paginated list response shape when
    the client sends `Accept: application/fhir+json` to a collection endpoint.

    Reference: https://hl7.org/fhir/R4/bundle.html
    """

    resourceType: str = Field(default="Bundle", description="Always 'Bundle'")
    type: str = Field(default="searchset", description="Always 'searchset' for search/list results")
    total: int = Field(description="Total number of matching resources (before pagination)")
    entry: Optional[List[FhirBundleEntry]] = Field(default=None, description="Results — each entry wraps one Organization resource")
