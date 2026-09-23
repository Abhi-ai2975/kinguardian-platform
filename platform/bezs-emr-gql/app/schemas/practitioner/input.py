"""
Input schemas for the Practitioner resource endpoints.

Three schemas cover the write surfaces:
  - PractitionerCreateSchema  — POST /practitioners body
  - PractitionerPatchSchema   — PATCH /practitioners/{id} body
  - ListPractitionersSchema   — GET /practitioners query parameters

Design notes:
  - The fhir-server manages Practitioner child arrays (name, identifier, telecom,
    address, photo, qualification, communication) via separate sub-routes. The
    create schema here only accepts the top-level scalar fields — no child arrays.
  - user_id / org_id are Optional to match the fhir-server's PractitionerCreateSchema.
  - created_by / updated_by are NOT in any schema — FhirClient injects them from actor.sub.
  - gender uses AdministrativeGender so invalid values are caught at the API boundary.
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import (
    AddressType,
    AddressUse,
    AdministrativeGender,
    ContactPointSystem,
    ContactPointUse,
    HumanNameUse,
    IdentifierUse,
)


class PractitionerCreateSchema(BaseModel):
    """
    Input schema for creating a Practitioner resource (POST /practitioners).

    All fields are optional because the fhir-server allows creating a bare
    Practitioner record and adding child sub-resources (name, identifier, etc.)
    via separate sub-route calls.

    Tenant scoping (user_id, org_id) is Optional to match the fhir-server schema.
    created_by is NOT included — FhirClient injects it automatically from actor.sub.
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "active": True,
                "gender": "female",
                "birth_date": "1978-03-15",
            }
        },
    )

    # Tenant scoping — Optional to match the fhir-server schema
    user_id: Optional[str] = Field(default=None, description="User identifier for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Organisation identifier for tenant scoping")

    # Whether this practitioner record is currently in active use
    active: Optional[bool] = Field(default=True, description="Whether this practitioner record is active")

    # FHIR R4 administrative gender (not clinical sex or gender identity)
    gender: Optional[AdministrativeGender] = Field(
        default=None,
        description="Administrative gender: male | female | other | unknown",
    )

    # Date of birth — ISO 8601 date (not datetime)
    birth_date: Optional[date] = Field(default=None, description="Date of birth (ISO 8601 date, e.g. 1978-03-15)")

    # Deceased indicators — at most one should be populated (boolean XOR datetime)
    deceased_boolean: Optional[bool] = Field(
        default=None,
        description="True if the practitioner is deceased and the exact date/time is unknown",
    )
    deceased_datetime: Optional[datetime] = Field(
        default=None,
        description="Date/time of death — used when the exact datetime is known (ISO 8601)",
    )


class PractitionerPatchSchema(BaseModel):
    """
    Input schema for partially updating a Practitioner (PATCH /practitioners/{id}).

    All fields are optional — the service layer enforces that at least one is provided.
    Child arrays (name, identifier, telecom, address, photo, qualification, communication)
    are managed via separate sub-routes and cannot be patched here.
    updated_by is NOT included — FhirClient injects it automatically from actor.sub.
    """

    model_config = ConfigDict(extra="forbid")

    # Patchable scalar fields only
    active: Optional[bool] = Field(default=None, description="Update the active status")
    gender: Optional[AdministrativeGender] = Field(
        default=None,
        description="Update administrative gender: male | female | other | unknown",
    )
    birth_date: Optional[date] = Field(default=None, description="Update date of birth (ISO 8601 date)")
    deceased_boolean: Optional[bool] = Field(default=None, description="Update deceased boolean flag")
    deceased_datetime: Optional[datetime] = Field(default=None, description="Update date/time of death")


class ListPractitionersSchema(BaseModel):
    """
    Query parameters for listing Practitioners (GET /practitioners).

    Filters by name, active status, or tenant scoping. All filters optional.
    Name searches are delegated to the fhir-server which queries the practitioner_name
    child table.
    """

    # Name filters — searches across the practitioner_name child table (partial, case-insensitive)
    family_name: Optional[str] = Field(
        default=None,
        description="Filter by family (last) name — partial match, case-insensitive",
    )
    given_name: Optional[str] = Field(
        default=None,
        description="Filter by given (first) name — partial match, case-insensitive",
    )

    # Active status filter
    active: Optional[bool] = Field(default=None, description="Filter by active status")

    # Tenant scoping filters
    user_id: Optional[str] = Field(default=None, description="Filter by user_id for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Filter by org_id for tenant scoping")

    # Pagination
    limit: int = Field(default=20, ge=1, le=200, description="Maximum number of records to return per page")
    offset: int = Field(default=0, ge=0, description="Number of records to skip before returning results")


# ── Sub-resource: Names ───────────────────────────────────────────────────────


class PractitionerNameCreateSchema(BaseModel):
    """Input for adding a HumanName to a Practitioner. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[HumanNameUse] = Field(None, description="usual | official | temp | nickname | anonymous | old | maiden")
    text: Optional[str] = Field(None, description="Full name as a single string.")
    family: Optional[str] = Field(None, description="Family (last) name.")
    given: Optional[List[str]] = Field(None, description="Given (first/middle) names.")
    prefix: Optional[List[str]] = Field(None, description="Name prefixes (e.g. Dr., Mr.).")
    suffix: Optional[List[str]] = Field(None, description="Name suffixes (e.g. Jr., PhD).")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PractitionerNamePatchSchema(BaseModel):
    """Patchable fields for a Practitioner HumanName. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[HumanNameUse] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ── Sub-resource: Identifiers ─────────────────────────────────────────────────


class PractitionerIdentifierCreateSchema(BaseModel):
    """Input for adding an Identifier to a Practitioner. `value` is required."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[IdentifierUse] = Field(None, description="usual | official | temp | secondary | old")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = Field(None, description="URI of the identifier namespace.")
    value: str = Field(..., description="The identifier value within the namespace.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = Field(None, description="Display name of the organisation that issued the identifier.")


class PractitionerIdentifierPatchSchema(BaseModel):
    """Patchable fields for a Practitioner Identifier. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[IdentifierUse] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


# ── Sub-resource: Telecom ─────────────────────────────────────────────────────


class PractitionerTelecomCreateSchema(BaseModel):
    """Input for adding a ContactPoint to a Practitioner. `system` and `value` required."""

    model_config = ConfigDict(extra="forbid")

    system: ContactPointSystem = Field(..., description="phone | fax | email | pager | url | sms | other")
    value: str = Field(..., description="The actual contact value.")
    use: Optional[ContactPointUse] = Field(None, description="home | work | temp | old | mobile")
    rank: Optional[int] = Field(None, ge=1, description="Preferred order (1 = most preferred).")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PractitionerTelecomPatchSchema(BaseModel):
    """Patchable fields for a Practitioner ContactPoint. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    system: Optional[ContactPointSystem] = None
    value: Optional[str] = None
    use: Optional[ContactPointUse] = None
    rank: Optional[int] = Field(None, ge=1)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ── Sub-resource: Addresses ───────────────────────────────────────────────────


class PractitionerAddressCreateSchema(BaseModel):
    """Input for adding an Address to a Practitioner. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[AddressUse] = Field(None, description="home | work | temp | old | billing")
    type: Optional[AddressType] = Field(None, description="postal | physical | both")
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PractitionerAddressPatchSchema(BaseModel):
    """Patchable fields for a Practitioner Address. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[AddressUse] = None
    type: Optional[AddressType] = None
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ── Sub-resource: Photos ──────────────────────────────────────────────────────


class PractitionerPhotoCreateSchema(BaseModel):
    """Input for adding an Attachment (photo) to a Practitioner. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    content_type: Optional[str] = Field(None, description="MIME type (e.g. image/jpeg).")
    language: Optional[str] = Field(None, description="BCP-47 language code.")
    data: Optional[str] = Field(None, description="Base64-encoded photo data.")
    url: Optional[str] = Field(None, description="URL pointing to the photo.")
    size: Optional[int] = Field(None, description="Size in bytes.")
    hash: Optional[str] = Field(None, description="Base64-encoded SHA-1 hash.")
    title: Optional[str] = None
    creation: Optional[datetime] = None


class PractitionerPhotoPatchSchema(BaseModel):
    """Patchable fields for a Practitioner photo Attachment. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[datetime] = None


# ── Sub-resource: Qualifications ──────────────────────────────────────────────


class QualificationIdentifierInput(BaseModel):
    """
    An identifier attached to a qualification record.

    Qualifications may have their own identifiers (e.g. a medical license number
    is an identifier on the qualification, not the practitioner itself).
    """

    model_config = ConfigDict(extra="forbid")

    use: Optional[IdentifierUse] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: str = Field(..., description="The identifier value.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class PractitionerQualificationCreateSchema(BaseModel):
    """
    Input for adding a qualification (certification, license, training) to a Practitioner.

    `issuer` must be a FHIR reference string e.g. 'Organization/190001'.
    `identifier` is an optional list of identifiers on the qualification itself
    (e.g. license number issued by the certifying body).
    """

    model_config = ConfigDict(extra="forbid")

    identifier: Optional[List[QualificationIdentifierInput]] = Field(
        None, description="Identifiers for this qualification (e.g. license number)."
    )
    # code CodeableConcept — what qualification is this?
    code_system: Optional[str] = Field(None, description="Coding system URI for the qualification code.")
    code_code: Optional[str] = Field(None, description="Qualification code.")
    code_display: Optional[str] = Field(None, description="Human-readable label for the qualification.")
    code_text: Optional[str] = Field(None, description="Plain-text description of the qualification.")
    # status CodeableConcept — current status of the qualification
    status_system: Optional[str] = None
    status_code: Optional[str] = None
    status_display: Optional[str] = None
    status_text: Optional[str] = None
    # validity period
    period_start: Optional[datetime] = Field(None, description="Date qualification was issued / became valid.")
    period_end: Optional[datetime] = Field(None, description="Date qualification expires.")
    # issuer — the organisation that issued this qualification
    issuer: Optional[str] = Field(None, description="FHIR reference to the issuing organisation e.g. 'Organization/190001'.")
    issuer_display: Optional[str] = Field(None, description="Display name of the issuing organisation.")


class PractitionerQualificationPatchSchema(BaseModel):
    """
    Patchable fields for a Practitioner qualification. All fields optional.

    When `identifier` is provided it replaces all existing qualification identifiers
    entirely — this is a full replacement of the nested array, not a merge.
    """

    model_config = ConfigDict(extra="forbid")

    identifier: Optional[List[QualificationIdentifierInput]] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    status_system: Optional[str] = None
    status_code: Optional[str] = None
    status_display: Optional[str] = None
    status_text: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    issuer: Optional[str] = None
    issuer_display: Optional[str] = None


# ── Sub-resource: Communications ──────────────────────────────────────────────


class PractitionerCommunicationCreateSchema(BaseModel):
    """Input for adding a language/communication preference to a Practitioner. `language_code` required."""

    model_config = ConfigDict(extra="forbid")

    language_system: Optional[str] = Field(None, description="Coding system URI (e.g. urn:ietf:bcp:47).")
    language_code: str = Field(..., description="ISO 639-1 language code (e.g. en, fr, de).")
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = Field(None, description="True if this is the practitioner's preferred language.")


class PractitionerCommunicationPatchSchema(BaseModel):
    """Patchable fields for a Practitioner communication entry. All fields optional."""

    model_config = ConfigDict(extra="forbid")

    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = None


# ── Full atomic patch ─────────────────────────────────────────────────────────


class PractitionerFullPatchSchema(PractitionerPatchSchema):
    """
    Input schema for PATCH /practitioners/{id}/full.

    Extends PractitionerPatchSchema with all seven sub-resource arrays.
    The semantics differ from the regular sub-resource routes:

      - null / omitted → leave that sub-resource completely untouched.
      - []             → delete ALL records of that sub-resource type.
      - [{...}, ...]   → replace ALL records with the provided items
                         (full replacement, not a merge).

    This allows a single call to update scalar fields AND/OR rewrite any
    combination of sub-resources atomically on the fhir-server.

    At least one field or array must be provided (enforced in the service layer).
    updated_by is NOT included — FhirClient injects it from actor.sub automatically.
    """

    model_config = ConfigDict(extra="forbid")

    # Sub-resource arrays — None means "leave alone"; [] means "delete all".
    names: Optional[List[PractitionerNameCreateSchema]] = None
    identifiers: Optional[List[PractitionerIdentifierCreateSchema]] = None
    telecom: Optional[List[PractitionerTelecomCreateSchema]] = None
    addresses: Optional[List[PractitionerAddressCreateSchema]] = None
    photos: Optional[List[PractitionerPhotoCreateSchema]] = None
    qualifications: Optional[List[PractitionerQualificationCreateSchema]] = None
    communications: Optional[List[PractitionerCommunicationCreateSchema]] = None


# ── Full atomic create ────────────────────────────────────────────────────────


class PractitionerFullCreateSchema(PractitionerCreateSchema):
    """
    Input schema for creating a Practitioner and any combination of sub-resources
    atomically in a single request.

    Extends PractitionerCreateSchema with 7 optional sub-resource arrays. Each array
    is forwarded to the fhir-server's POST /practitioners/full endpoint, which wraps
    all inserts in one DB transaction — if any sub-resource insert fails, the entire
    request rolls back and no records are created.

    All arrays are optional; omit any to skip those sub-resources.
    Practitioner has no contacts, general_practitioners, or links — only the 7
    arrays below are supported (matching the FHIR R4 Practitioner resource model).
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "active": True,
                "gender": "female",
                "birth_date": "1978-03-15",
                "names": [{"use": "official", "family": "Smith", "given": ["Jane"]}],
                "identifiers": [{"value": "1234567890", "system": "http://hl7.org/fhir/sid/us-npi"}],
                "telecom": [{"system": "email", "value": "jane.smith@hospital.org", "use": "work"}],
                "qualifications": [{"code_code": "MD", "code_display": "Doctor of Medicine"}],
                "communications": [{"language_code": "en", "preferred": True}],
            }
        },
    )

    # Sub-resource arrays — all optional; any combination may be provided.
    names: Optional[List[PractitionerNameCreateSchema]] = None
    identifiers: Optional[List[PractitionerIdentifierCreateSchema]] = None
    telecom: Optional[List[PractitionerTelecomCreateSchema]] = None
    addresses: Optional[List[PractitionerAddressCreateSchema]] = None
    photos: Optional[List[PractitionerPhotoCreateSchema]] = None
    qualifications: Optional[List[PractitionerQualificationCreateSchema]] = None
    communications: Optional[List[PractitionerCommunicationCreateSchema]] = None
