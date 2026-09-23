"""
FHIR R4 schema models for Location resources — used only for OpenAPI documentation.

These models are NOT used for runtime validation. The middleware returns a JSONResponse
constructed directly from the fhir-server's response. The models here serve only to
document the FHIR R4 shape in Swagger UI so consumers know what to expect when they
send `Accept: application/fhir+json`.

Reference: https://hl7.org/fhir/R4/location.html

Naming follows FHIR R4 camelCase conventions (resourceType, hoursOfOperation, etc.)
because these models document the wire format, not the database schema.
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
    """
    A business identifier for a resource (FHIR Identifier datatype).
    Reference: https://hl7.org/fhir/R4/datatypes.html#Identifier
    """

    use: Optional[str] = Field(
        default=None, description="usual | official | temp | secondary | old"
    )
    type: Optional[FhirCodeableConcept] = Field(
        default=None, description="Description of identifier type"
    )
    system: Optional[str] = Field(default=None, description="The namespace for the identifier value")
    value: Optional[str] = Field(default=None, description="The value that is unique")
    period: Optional[FhirPeriod] = Field(default=None, description="Time period when identifier was/is valid")
    assigner: Optional[str] = Field(
        default=None, description="Organisation that issued the identifier (display only)"
    )


class FhirContactPoint(BaseModel):
    """
    Details for all kinds of technology-mediated contact points (FHIR ContactPoint datatype).
    Reference: https://hl7.org/fhir/R4/datatypes.html#ContactPoint
    """

    system: Optional[str] = Field(
        default=None, description="phone | fax | email | pager | url | sms | other"
    )
    value: Optional[str] = Field(default=None, description="The actual contact point details")
    use: Optional[str] = Field(
        default=None, description="home | work | temp | old | mobile"
    )
    rank: Optional[int] = Field(
        default=None, description="Specify preferred order of use (1 = highest)"
    )
    period: Optional[FhirPeriod] = Field(
        default=None, description="Time period when the contact point was/is in use"
    )


class FhirAddress(BaseModel):
    """
    An address expressed using postal conventions (FHIR Address datatype).
    Reference: https://hl7.org/fhir/R4/datatypes.html#Address
    """

    use: Optional[str] = Field(default=None, description="home | work | temp | old | billing")
    type: Optional[str] = Field(default=None, description="postal | physical | both")
    text: Optional[str] = Field(default=None, description="Text representation of the address")
    line: Optional[List[str]] = Field(default=None, description="Street name, number, direction, etc.")
    city: Optional[str] = Field(default=None, description="Name of city, town, village, etc.")
    district: Optional[str] = Field(default=None, description="District name (county, etc.)")
    state: Optional[str] = Field(default=None, description="Sub-unit of country (state, province)")
    postalCode: Optional[str] = Field(default=None, description="Postal code for area")
    country: Optional[str] = Field(default=None, description="Country (ISO 3166 code preferred)")
    period: Optional[FhirPeriod] = Field(
        default=None, description="Time period when the address was/is in use"
    )


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


class FhirPosition(BaseModel):
    """
    The absolute geographic position of the Location (FHIR Location.position backbone element).
    Uses WGS84 datum (same as KML).
    """

    longitude: float = Field(description="Longitude in WGS84 decimal degrees")
    latitude: float = Field(description="Latitude in WGS84 decimal degrees")
    altitude: Optional[float] = Field(default=None, description="Altitude in WGS84 decimal meters")


class FhirHoursOfOperation(BaseModel):
    """
    The days and times a Location is available (FHIR Location.hoursOfOperation backbone element).
    """

    daysOfWeek: Optional[List[str]] = Field(
        default=None, description="Days of the week: mon | tue | wed | thu | fri | sat | sun"
    )
    allDay: Optional[bool] = Field(
        default=None, description="The location is open all day on the listed days"
    )
    openingTime: Optional[str] = Field(
        default=None, description="Time that the location opens (HH:mm:ss)"
    )
    closingTime: Optional[str] = Field(
        default=None, description="Time that the location closes (HH:mm:ss)"
    )


class FhirLocationResponse(BaseModel):
    """
    FHIR R4 Location resource — response shape when the client sends
    `Accept: application/fhir+json`.

    This model is used ONLY for OpenAPI documentation in Swagger UI.
    The middleware never validates runtime responses against it — the fhir-server
    constructs the actual FHIR resource and this middleware forwards it as-is.

    Reference: https://hl7.org/fhir/R4/location.html
    """

    resourceType: str = Field(default="Location", description="Always 'Location' for this resource type")
    id: Optional[str] = Field(default=None, description="Logical FHIR resource identifier")

    # Business identifiers (e.g. facility code, wing number)
    identifier: Optional[List[FhirIdentifier]] = Field(
        default=None, description="Business identifiers for this location"
    )

    # Status of the location (whether it can be used)
    status: Optional[str] = Field(
        default=None, description="active | suspended | inactive"
    )
    # Operational status (e.g. for beds: occupied, available, contaminated)
    operationalStatus: Optional[FhirCoding] = Field(
        default=None, description="Operational status of the location (bed management)"
    )

    name: Optional[str] = Field(default=None, description="Name of the location as used by humans")
    alias: Optional[List[str]] = Field(
        default=None, description="Alternate names that this location is known as"
    )
    description: Optional[str] = Field(
        default=None, description="Additional details about the location beyond name"
    )

    # instance = a specific, physical location; kind = a type of location
    mode: Optional[str] = Field(
        default=None, description="instance | kind"
    )

    # Functional type of the location (ward, room, building, etc.)
    type: Optional[List[FhirCodeableConcept]] = Field(
        default=None, description="Type of function performed at the location"
    )

    telecom: Optional[List[FhirContactPoint]] = Field(
        default=None, description="Contact details of the location"
    )
    address: Optional[FhirAddress] = Field(
        default=None, description="Physical location address"
    )

    # Physical type describes the container/form of the location (building, wing, room, etc.)
    physicalType: Optional[FhirCodeableConcept] = Field(
        default=None, description="Physical form of the location (building, wing, room, etc.)"
    )

    # WGS84 geographic coordinates
    position: Optional[FhirPosition] = Field(
        default=None, description="The absolute geographic location"
    )

    managingOrganization: Optional[FhirReference] = Field(
        default=None, description="Organisation responsible for provisioning and upkeep"
    )
    partOf: Optional[FhirReference] = Field(
        default=None, description="Another Location this is physically part of (hierarchical)"
    )

    hoursOfOperation: Optional[List[FhirHoursOfOperation]] = Field(
        default=None, description="What days/times this location is usually open"
    )
    availabilityExceptions: Optional[str] = Field(
        default=None, description="Description of availability exceptions (e.g. bank holidays)"
    )

    # Technical endpoints providing access to services at this location
    endpoint: Optional[List[FhirReference]] = Field(
        default=None, description="Technical endpoints providing access to services at this location"
    )


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle — wraps one Location resource."""

    resource: FhirLocationResponse = Field(description="The FHIR Location resource contained in this entry")


class FhirBundleResponse(BaseModel):
    """
    FHIR R4 Bundle searchset — returned for GET /locations when the client sends
    `Accept: application/fhir+json`.

    The fhir-server wraps paginated results in this Bundle format. This model
    exists only for OpenAPI documentation.

    Reference: https://hl7.org/fhir/R4/bundle.html
    """

    resourceType: str = Field(default="Bundle", description="Always 'Bundle' for collections")
    type: str = Field(default="searchset", description="Always 'searchset' for search results")
    total: int = Field(description="Total number of matching resources (across all pages)")
    entry: Optional[List[FhirBundleEntry]] = Field(
        default=None, description="The Location resources in this page of results"
    )
