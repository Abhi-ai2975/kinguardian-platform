"""
Input schemas for FHIR Location resource endpoints.

Three schemas cover the full API surface:
  - LocationCreateSchema: validated body for POST /locations
  - LocationPatchSchema:  validated body for PATCH /locations/{id}
  - ListLocationsSchema:  validated query parameters for GET /locations

Design decisions:
  - user_id, org_id, created_by, updated_by are NOT exposed as input fields.
    user_id and org_id are injected by the service layer from the caller's JWT
    (actor.sub and actor.org_id). created_by / updated_by are injected by
    FhirClient from actor.sub. Exposing these fields would let callers forge
    audit identity, which is a security violation.
  - Sub-schemas for arrays (identifiers, types, telecoms, hours_of_operation,
    endpoints) are defined as nested Pydantic models using extra="forbid" to
    reject any fields not explicitly modelled.
  - All scalar fields mirror the fhir-server LocationCreateSchema field names
    exactly so the payload can be forwarded without re-mapping.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class LocationIdentifierInput(BaseModel):
    """
    A single business identifier for a Location (e.g. a hospital wing number).
    Maps to FHIR R4 Identifier: https://hl7.org/fhir/R4/datatypes.html#Identifier
    """

    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = Field(
        default=None, description="Identifier use: usual | official | temp | secondary | old"
    )
    type_system: Optional[str] = Field(
        default=None, description="Coding system URI for the identifier type"
    )
    type_code: Optional[str] = Field(
        default=None, description="Code from the identifier type coding system"
    )
    type_display: Optional[str] = Field(
        default=None, description="Human-readable display for the identifier type code"
    )
    type_text: Optional[str] = Field(
        default=None, description="Plain-text description of the identifier type"
    )
    system: Optional[str] = Field(
        default=None, description="URI that defines the namespace for the identifier value"
    )
    value: Optional[str] = Field(default=None, description="The identifier value within the system")
    period_start: Optional[datetime] = Field(
        default=None, description="Start of the validity period for this identifier"
    )
    period_end: Optional[datetime] = Field(
        default=None, description="End of the validity period for this identifier"
    )
    assigner: Optional[str] = Field(
        default=None, description="Display name of the organisation that issued the identifier"
    )


class LocationTypeInput(BaseModel):
    """
    A coded concept categorising the Location (e.g. ward, building, room).
    Maps to FHIR R4 CodeableConcept: https://hl7.org/fhir/R4/datatypes.html#CodeableConcept
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(
        default=None, description="Coding system URI (e.g. http://terminology.hl7.org/CodeSystem/v3-RoleCode)"
    )
    coding_code: Optional[str] = Field(default=None, description="Code value within the coding system")
    coding_display: Optional[str] = Field(
        default=None, description="Human-readable display text for the code"
    )
    text: Optional[str] = Field(
        default=None, description="Plain-text representation of the concept, independent of coding"
    )


class LocationTelecomInput(BaseModel):
    """
    A contact detail for the Location (phone, email, fax, etc.).
    Maps to FHIR R4 ContactPoint: https://hl7.org/fhir/R4/datatypes.html#ContactPoint
    """

    model_config = ConfigDict(extra="forbid")

    system: Optional[str] = Field(
        default=None,
        description="Contact system: phone | fax | email | pager | url | sms | other",
    )
    value: Optional[str] = Field(default=None, description="The contact value (phone number, email address, etc.)")
    use: Optional[str] = Field(
        default=None, description="Contact use: home | work | temp | old | mobile"
    )
    rank: Optional[int] = Field(
        default=None, description="Preferred order of use (lower = higher priority)"
    )
    period_start: Optional[datetime] = Field(
        default=None, description="Start of the validity period for this contact point"
    )
    period_end: Optional[datetime] = Field(
        default=None, description="End of the validity period for this contact point"
    )


class LocationHoursOfOperationInput(BaseModel):
    """
    Specifies the hours during which the Location is open.
    Maps to FHIR R4 Location.hoursOfOperation backbone element.
    """

    model_config = ConfigDict(extra="forbid")

    days_of_week: Optional[List[str]] = Field(
        default=None,
        description="Days the location is open: mon | tue | wed | thu | fri | sat | sun",
    )
    all_day: Optional[bool] = Field(
        default=None, description="True if the location is open all day on the listed days"
    )
    opening_time: Optional[str] = Field(
        default=None, description="Opening time in HH:mm:ss format (e.g. '08:00:00')"
    )
    closing_time: Optional[str] = Field(
        default=None, description="Closing time in HH:mm:ss format (e.g. '17:00:00')"
    )


class LocationEndpointInput(BaseModel):
    """
    A reference to a technical endpoint providing access to services operated at this Location.
    Maps to FHIR R4 Reference pointing to an Endpoint resource.
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        description="Relative FHIR Endpoint reference (e.g. 'Endpoint/1')"
    )
    reference_display: Optional[str] = Field(
        default=None, description="Human-readable display text for the Endpoint reference"
    )


class LocationCreateSchema(BaseModel):
    """
    Validated body for POST /locations.

    Fields are a subset of the fhir-server LocationCreateSchema:
      - user_id, org_id, created_by are excluded — the service injects them from the JWT.
      - All scalar and array fields mirror the fhir-server field names exactly to
        avoid a translation layer when forwarding to the fhir-server.

    extra="forbid" rejects unknown fields at the API boundary so clients cannot
    accidentally or intentionally inject fields meant for internal use.
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "status": "active",
                    "name": "Main Building",
                    "description": "Primary hospital building",
                    "mode": "instance",
                    "address_line": ["123 Main St", "Suite 100"],
                    "address_city": "Springfield",
                    "address_state": "IL",
                    "address_postal_code": "62701",
                    "address_country": "US",
                    "physical_type_system": "http://terminology.hl7.org/CodeSystem/location-physical-type",
                    "physical_type_code": "bu",
                    "physical_type_display": "Building",
                    "managing_organization": "Organization/190001",
                    "managing_organization_display": "General Hospital",
                    "position_longitude": -89.6501481,
                    "position_latitude": 39.7817213,
                    "hours_of_operation": [
                        {
                            "days_of_week": ["mon", "tue", "wed", "thu", "fri"],
                            "all_day": False,
                            "opening_time": "08:00:00",
                            "closing_time": "17:00:00",
                        }
                    ],
                }
            ]
        },
    )

    # ── Tenant scoping ─────────────────────────────────────────────────────────
    # Required by the fhir-server for multi-tenant data isolation.
    # The caller supplies these explicitly; the middleware does not infer them from
    # the JWT. Only created_by / updated_by are injected from the JWT (by FhirClient).
    user_id: str = Field(description="User identifier for tenant scoping")
    org_id: str = Field(description="Organisation identifier for tenant scoping")

    # ── Status and operational details ─────────────────────────────────────────
    status: Optional[str] = Field(
        default=None, description="Location status: active | suspended | inactive"
    )
    operational_status_system: Optional[str] = Field(
        default=None, description="Coding system URI for the operational status code"
    )
    operational_status_code: Optional[str] = Field(
        default=None, description="Operational status code (e.g. 'O' for occupied, 'V' for vacant)"
    )
    operational_status_display: Optional[str] = Field(
        default=None, description="Human-readable display for the operational status code"
    )

    # ── Identification ─────────────────────────────────────────────────────────
    name: Optional[str] = Field(default=None, description="Human-readable name of the Location")
    description: Optional[str] = Field(
        default=None, description="Additional details about the Location beyond name"
    )
    mode: Optional[str] = Field(
        default=None, description="Location mode: instance (physical) | kind (type/category)"
    )

    # ── Array sub-resources ────────────────────────────────────────────────────
    identifiers: Optional[List[LocationIdentifierInput]] = Field(
        default=None, description="Business identifiers assigned to this Location"
    )
    aliases: Optional[List[str]] = Field(
        default=None, description="Alternate names the Location is or was known by"
    )
    types: Optional[List[LocationTypeInput]] = Field(
        default=None,
        description="Coded concepts indicating the type or function of this Location",
    )
    telecoms: Optional[List[LocationTelecomInput]] = Field(
        default=None, description="Contact details for this Location"
    )

    # ── Address ────────────────────────────────────────────────────────────────
    address_use: Optional[str] = Field(
        default=None, description="Address use: home | work | temp | old | billing"
    )
    address_type: Optional[str] = Field(
        default=None, description="Address type: postal | physical | both"
    )
    address_text: Optional[str] = Field(
        default=None, description="Full text representation of the address"
    )
    address_line: Optional[List[str]] = Field(
        default=None, description="Street address lines (e.g. ['123 Main St', 'Suite 100'])"
    )
    address_city: Optional[str] = Field(default=None, description="City or town")
    address_district: Optional[str] = Field(default=None, description="District or county")
    address_state: Optional[str] = Field(default=None, description="State or province")
    address_postal_code: Optional[str] = Field(default=None, description="Postal or ZIP code")
    address_country: Optional[str] = Field(default=None, description="Country (ISO 3166 code)")
    address_period_start: Optional[datetime] = Field(
        default=None, description="Start of the validity period for this address"
    )
    address_period_end: Optional[datetime] = Field(
        default=None, description="End of the validity period for this address"
    )

    # ── Physical type ──────────────────────────────────────────────────────────
    physical_type_system: Optional[str] = Field(
        default=None,
        description="Coding system URI for physical type (typically http://terminology.hl7.org/CodeSystem/location-physical-type)",
    )
    physical_type_code: Optional[str] = Field(
        default=None,
        description="Physical type code: bu=Building, wi=Wing, wa=Ward, ro=Room, bd=Bed, etc.",
    )
    physical_type_display: Optional[str] = Field(
        default=None, description="Human-readable display for the physical type code"
    )
    physical_type_text: Optional[str] = Field(
        default=None, description="Plain-text description of the physical type"
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    managing_organization: Optional[str] = Field(
        default=None,
        description="Reference to the managing Organisation (e.g. 'Organization/190001')",
    )
    managing_organization_display: Optional[str] = Field(
        default=None, description="Display name of the managing Organisation"
    )
    part_of: Optional[str] = Field(
        default=None,
        description="Reference to the parent Location (e.g. 'Location/230001'). Used for hierarchical locations.",
    )
    part_of_display: Optional[str] = Field(
        default=None, description="Display name of the parent Location"
    )

    # ── Availability ───────────────────────────────────────────────────────────
    availability_exceptions: Optional[str] = Field(
        default=None,
        description="Description of any exceptions to normal opening hours (e.g. public holidays)",
    )
    hours_of_operation: Optional[List[LocationHoursOfOperationInput]] = Field(
        default=None, description="Normal operating hours for this Location"
    )

    # ── Geographic position ────────────────────────────────────────────────────
    position_longitude: Optional[Decimal] = Field(
        default=None, description="WGS84 longitude in decimal degrees"
    )
    position_latitude: Optional[Decimal] = Field(
        default=None, description="WGS84 latitude in decimal degrees"
    )
    position_altitude: Optional[Decimal] = Field(
        default=None, description="WGS84 altitude in decimal meters (optional)"
    )

    # ── Endpoints ──────────────────────────────────────────────────────────────
    endpoints: Optional[List[LocationEndpointInput]] = Field(
        default=None,
        description="Technical endpoints providing access to services at this Location",
    )


class LocationPatchSchema(BaseModel):
    """
    Validated body for PATCH /locations/{id}.

    All fields are optional — at least one must be provided (enforced in
    LocationService.update() to prevent no-op patches). Array sub-resources
    (identifiers, types, telecoms, hours_of_operation, endpoints) are not
    patchable — delete and re-create the Location to correct those.

    updated_by is not exposed — FhirClient injects it from actor.sub automatically.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = Field(default=None, description="active | suspended | inactive")
    operational_status_system: Optional[str] = None
    operational_status_code: Optional[str] = None
    operational_status_display: Optional[str] = None

    name: Optional[str] = Field(default=None, description="Updated human-readable name")
    description: Optional[str] = Field(default=None, description="Updated description")
    mode: Optional[str] = Field(default=None, description="instance | kind")

    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_line: Optional[List[str]] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    address_period_start: Optional[datetime] = None
    address_period_end: Optional[datetime] = None

    physical_type_system: Optional[str] = None
    physical_type_code: Optional[str] = None
    physical_type_display: Optional[str] = None
    physical_type_text: Optional[str] = None

    managing_organization: Optional[str] = None
    managing_organization_display: Optional[str] = None
    part_of: Optional[str] = None
    part_of_display: Optional[str] = None

    availability_exceptions: Optional[str] = None

    position_longitude: Optional[Decimal] = None
    position_latitude: Optional[Decimal] = None
    position_altitude: Optional[Decimal] = None


class ListLocationsSchema(BaseModel):
    """
    Validated query parameters for GET /locations.

    All filters are optional. Unset filters (None) are stripped by LocationClient.list()
    before the query string is built, so they are not sent to the fhir-server.
    """

    model_config = ConfigDict(extra="forbid")

    # org_id scopes results to a single tenant organisation — mirrors the fhir-server
    # list_locations router which accepts org_id as a query param.
    org_id: Optional[str] = Field(
        default=None, description="Filter by organisation ID (tenant scoping)."
    )
    status: Optional[str] = Field(
        default=None, description="Filter by status: active | suspended | inactive"
    )
    limit: int = Field(default=20, ge=1, le=200, description="Maximum number of records to return")
    offset: int = Field(default=0, ge=0, description="Number of records to skip for pagination")
