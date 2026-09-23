"""
Pydantic response models for FHIR Organisation resources.

These models describe the shape of data returned by the FHIR Server and re-serialised
by this middleware layer to API consumers. They mirror the flat, relational structure
that the FHIR Server uses internally (flattened FHIR R4 Organisation resource) rather
than the deeply-nested FHIR JSON wire format.

`extra="allow"` is set on all models so that new fields added to the FHIR Server
response are passed through transparently without requiring a schema update here first.
This makes forward-compatibility the default at the cost of schema strictness —
acceptable because this service trusts the FHIR Server as an internal component.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ── Sub-resource response schemas (mirror FHIR server plain responses) ────────


class OrgIdentifierResponse(BaseModel):
    """
    Response model for a single FHIR Identifier attached to an Organisation.

    Maps to the flattened `identifier` table row in the FHIR Server. The `type_*`
    fields represent the CodeableConcept that classifies the identifier system
    (e.g. NPI, tax ID), and `period_*` fields represent the validity window.
    `extra="allow"` forwards any additional FHIR Server fields without requiring a schema bump.
    """

    model_config = ConfigDict(extra="allow")

    id: int                          # FHIR Server primary key for this identifier row
    use: Optional[str] = None        # IdentifierUse code (usual, official, temp, etc.)
    type_system: Optional[str] = None    # Coding.system for the identifier type CodeableConcept
    type_code: Optional[str] = None      # Coding.code for the identifier type
    type_display: Optional[str] = None   # Coding.display for the identifier type
    type_text: Optional[str] = None      # CodeableConcept.text (human-readable type label)
    system: Optional[str] = None     # URI namespace of the identifier value (e.g. http://hl7.org/fhir/sid/us-npi)
    value: Optional[str] = None      # The actual identifier string (e.g. NPI number)
    period_start: Optional[str] = None   # ISO-8601 date when this identifier became valid
    period_end: Optional[str] = None     # ISO-8601 date when this identifier expires
    assigner: Optional[str] = None   # Display name of the organisation that issued the identifier


class OrgTypeResponse(BaseModel):
    """
    Response model for a FHIR Organisation type coding.

    Represents one entry in the Organisation.type array — a CodeableConcept that
    categorises the organisation (e.g. prov = Healthcare Provider, dept = Hospital Department).
    See https://hl7.org/fhir/R4/valueset-organization-type.html for standard codes.
    """

    model_config = ConfigDict(extra="allow")

    id: int                              # FHIR Server primary key for this type row
    coding_system: Optional[str] = None     # URI of the coding system (e.g. http://terminology.hl7.org/CodeSystem/organization-type)
    coding_code: Optional[str] = None       # Code value (e.g. "prov", "dept", "ins")
    coding_display: Optional[str] = None    # Human-readable label for the code
    text: Optional[str] = None          # Free-text description of the type


class OrgAliasResponse(BaseModel):
    """
    Response model for an Organisation alias (alternative name).

    Maps to the FHIR Organisation.alias array — a list of alternate names the
    organisation is or was known by. Useful for search and display in clinical UIs.
    """

    model_config = ConfigDict(extra="allow")

    id: int                      # FHIR Server primary key for this alias row
    value: Optional[str] = None  # The alias string (e.g. "Acme Health System")


class OrgTelecomResponse(BaseModel):
    """
    Response model for an Organisation contact point (telecom).

    Maps to the FHIR Organisation.telecom array. Each entry represents one contact
    channel (phone, email, fax, etc.) with optional validity period and usage context.
    """

    model_config = ConfigDict(extra="allow")

    id: int                              # FHIR Server primary key for this telecom row
    system: Optional[str] = None         # ContactPointSystem code (phone, email, fax, etc.)
    value: Optional[str] = None          # The contact value (phone number, email address, etc.)
    use: Optional[str] = None            # ContactPointUse code (home, work, mobile, etc.)
    rank: Optional[int] = None           # Preference rank — lower number = higher preference
    period_start: Optional[str] = None   # ISO-8601 date when this contact became valid
    period_end: Optional[str] = None     # ISO-8601 date when this contact expires


class OrgAddressResponse(BaseModel):
    """
    Response model for an Organisation address.

    Maps to the FHIR Organisation.address array. Supports both structured
    (city/state/postal_code/country) and unstructured (text) address representations.
    """

    model_config = ConfigDict(extra="allow")

    id: int                              # FHIR Server primary key for this address row
    use: Optional[str] = None            # AddressUse code (home, work, billing, etc.)
    type: Optional[str] = None           # AddressType code (postal, physical, both)
    text: Optional[str] = None           # Full unstructured address as a single string
    line: Optional[List[str]] = None     # Street lines (e.g. ["123 Main St", "Suite 400"])
    city: Optional[str] = None
    district: Optional[str] = None      # County or district within a state/province
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None       # ISO 3166 country code (e.g. "US", "IN")
    period_start: Optional[str] = None  # ISO-8601 date when this address became valid
    period_end: Optional[str] = None    # ISO-8601 date when this address expires


class OrgContactTelecomResponse(BaseModel):
    """
    Response model for a telecom entry nested inside an OrgContactResponse.

    Identical structure to OrgTelecomResponse but scoped to an Organisation contact
    person rather than the organisation itself. Separated to allow independent
    evolution if FHIR Server adds contact-telecom-specific fields in the future.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class OrgContactResponse(BaseModel):
    """
    Response model for an Organisation contact person.

    Maps to the FHIR Organisation.contact array. Each entry represents a person who
    can be contacted about the organisation in a specific capacity (admin, billing,
    clinical, etc.). Includes flattened HumanName, Address, and nested telecoms for
    that contact person.
    """

    model_config = ConfigDict(extra="allow")

    id: int                                      # FHIR Server primary key for this contact row
    # Purpose of this contact: which department/function this person handles.
    purpose_system: Optional[str] = None         # Coding.system for the contact purpose
    purpose_code: Optional[str] = None           # Coding.code (e.g. ADMIN, BILL, PATINF)
    purpose_display: Optional[str] = None
    purpose_text: Optional[str] = None
    # Flattened HumanName for the contact person.
    name_use: Optional[str] = None               # HumanNameUse code
    name_text: Optional[str] = None              # Full name as a single string
    name_family: Optional[str] = None            # Surname / family name
    name_given: Optional[List[str]] = None       # Given names (first, middle, etc.)
    name_prefix: Optional[List[str]] = None      # Titles (Dr., Prof., etc.)
    name_suffix: Optional[List[str]] = None      # Qualifications (MD, PhD, etc.)
    name_period_start: Optional[str] = None
    name_period_end: Optional[str] = None
    # Flattened Address for the contact person (may differ from the org's address).
    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_line: Optional[List[str]] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    address_period_start: Optional[str] = None
    address_period_end: Optional[str] = None
    # Nested telecom list for this contact person specifically.
    telecoms: Optional[List[OrgContactTelecomResponse]] = None


class OrgEndpointResponse(BaseModel):
    """
    Response model for a FHIR Endpoint reference attached to an Organisation.

    Maps to the FHIR Organisation.endpoint array — references to technical endpoints
    (e.g. SMART on FHIR, Direct Messaging) associated with this organisation.
    Stored as a reference triple (type, id, display) rather than an embedded resource.
    """

    model_config = ConfigDict(extra="allow")

    id: int                                  # FHIR Server primary key for this endpoint row
    reference_type: Optional[str] = None     # Resource type of the endpoint (always "Endpoint")
    reference_id: Optional[int] = None       # FHIR Server ID of the referenced Endpoint resource
    reference_display: Optional[str] = None  # Human-readable name of the endpoint


# ── Top-level response ─────────────────────────────────────────────────────────


class OrgResponse(BaseModel):
    """
    Full response model for a single FHIR Organisation resource.

    Combines the top-level Organisation scalar fields with nested arrays for all
    sub-resources (identifiers, types, aliases, telecoms, addresses, contacts, endpoints).
    The `partof_*` fields represent a reference to a parent Organisation (FHIR partOf).
    Audit fields (user_id, org_id, created_by, etc.) are set by the FHIR Server.
    `extra="allow"` lets new FHIR Server fields pass through without schema changes.
    """

    model_config = ConfigDict(extra="allow")

    id: int                                          # FHIR Server primary key
    active: Optional[bool] = None                    # Whether the organisation is currently active
    name: Optional[str] = None                       # Primary display name
    # partOf reference fields — the parent organisation in a hierarchy (e.g. hospital system → hospital → department)
    partof_type: Optional[str] = None                # Resource type of the parent (always "Organization")
    partof_id: Optional[int] = None                  # FHIR Server ID of the parent Organisation
    partof_display: Optional[str] = None             # Display name of the parent Organisation
    # Sub-resource arrays
    identifier: Optional[List[OrgIdentifierResponse]] = None
    type: Optional[List[OrgTypeResponse]] = None
    alias: Optional[List[OrgAliasResponse]] = None
    telecom: Optional[List[OrgTelecomResponse]] = None
    address: Optional[List[OrgAddressResponse]] = None
    contact: Optional[List[OrgContactResponse]] = None
    endpoint: Optional[List[OrgEndpointResponse]] = None
    # Actor and audit fields injected by the FHIR Server on write operations.
    user_id: Optional[str] = None       # JWT sub of the user who owns this resource
    org_id: Optional[str] = None        # Tenant org_id scoping this resource
    created_at: Optional[str] = None    # ISO-8601 creation timestamp
    updated_at: Optional[str] = None    # ISO-8601 last-update timestamp
    created_by: Optional[str] = None    # JWT sub of the user who created this record
    updated_by: Optional[str] = None    # JWT sub of the user who last updated this record


class PaginatedOrgResponse(BaseModel):
    """
    Paginated list response for Organisation collection endpoints.

    Wraps a list of OrgResponse objects with pagination metadata so API consumers
    can implement cursor-based or offset-based paging without additional requests.
    `total` represents the full count before pagination is applied so clients can
    calculate the number of pages / detect when they have fetched all records.
    """

    total: int               # Total number of matching organisations (before limit/offset)
    limit: int               # Number of records requested per page
    offset: int              # Number of records skipped (zero-indexed)
    data: List[OrgResponse]  # The current page of Organisation records
