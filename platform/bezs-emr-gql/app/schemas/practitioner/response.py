"""
Plain JSON response schemas for the Practitioner resource.

These models document the fhir-server's plain (non-FHIR) JSON output shape —
what the caller receives when `Accept: application/json` (the default).

`extra="allow"` is set on every model so new fhir-server fields pass through
without requiring a schema bump here.

For the FHIR R4 camelCase shape (when `Accept: application/fhir+json`),
see fhir_schemas.py.

Reference: https://hl7.org/fhir/R4/practitioner.html
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class PlainPractitionerName(BaseModel):
    """Plain JSON representation of a single practitioner name record."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    use: Optional[str] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainPractitionerIdentifier(BaseModel):
    """Plain JSON representation of a practitioner identifier (NPI, license, DEA, etc.)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    assigner: Optional[str] = None


class PlainPractitionerTelecom(BaseModel):
    """Plain JSON representation of a practitioner contact point."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainPractitionerAddress(BaseModel):
    """Plain JSON representation of a practitioner address."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    use: Optional[str] = None
    type: Optional[str] = None
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainPractitionerPhoto(BaseModel):
    """Plain JSON representation of a practitioner photo (FHIR Attachment)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class PlainQualificationIdentifier(BaseModel):
    """Plain JSON representation of an identifier on a qualification record."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    assigner: Optional[str] = None


class PlainQualification(BaseModel):
    """
    Plain JSON representation of a practitioner qualification record.
    Captures certifications, training, and licenses with validity periods.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    identifier: Optional[List[PlainQualificationIdentifier]] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    status_system: Optional[str] = None
    status_code: Optional[str] = None
    status_display: Optional[str] = None
    status_text: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    issuer_type: Optional[str] = None
    issuer_id: Optional[int] = None
    issuer_display: Optional[str] = None


class PlainPractitionerCommunication(BaseModel):
    """Plain JSON representation of a practitioner communication language record."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = None


class PractitionerResponse(BaseModel):
    """
    Full plain JSON response for a single Practitioner resource.

    Mirrors the fhir-server's PlainPractitionerResponse. Child arrays use typed
    sub-schemas so Swagger renders their fields correctly.

    `extra="allow"` ensures new fhir-server fields propagate to callers
    without requiring a middleware schema update.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    active: Optional[bool] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    deceased_boolean: Optional[bool] = None
    deceased_datetime: Optional[str] = None

    # Child arrays — populated on read; empty on bare creation
    name: Optional[List[PlainPractitionerName]] = None
    identifier: Optional[List[PlainPractitionerIdentifier]] = None
    telecom: Optional[List[PlainPractitionerTelecom]] = None
    address: Optional[List[PlainPractitionerAddress]] = None
    photo: Optional[List[PlainPractitionerPhoto]] = None
    qualification: Optional[List[PlainQualification]] = None
    communication: Optional[List[PlainPractitionerCommunication]] = None

    # Audit fields
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedPractitionerResponse(BaseModel):
    """
    Paginated list response for the GET /practitioners endpoint (application/json).

    `total` reflects the count across ALL pages, not just this page.
    """

    total: int
    limit: int
    offset: int
    data: List[PractitionerResponse]


# ── Sub-resource list response wrappers ───────────────────────────────────────
# Each sub-resource list endpoint returns {data: [...], total: N} — NOT the full
# paginated envelope (no limit/offset) because sub-resource collections are small
# and returned in full.


class PractitionerNameListResponse(BaseModel):
    """Response shape for GET /practitioners/{id}/names."""

    data: List[PlainPractitionerName]
    total: int


class PractitionerIdentifierListResponse(BaseModel):
    """Response shape for GET /practitioners/{id}/identifiers."""

    data: List[PlainPractitionerIdentifier]
    total: int


class PractitionerTelecomListResponse(BaseModel):
    """Response shape for GET /practitioners/{id}/telecom."""

    data: List[PlainPractitionerTelecom]
    total: int


class PractitionerAddressListResponse(BaseModel):
    """Response shape for GET /practitioners/{id}/addresses."""

    data: List[PlainPractitionerAddress]
    total: int


class PractitionerPhotoListResponse(BaseModel):
    """Response shape for GET /practitioners/{id}/photos."""

    data: List[PlainPractitionerPhoto]
    total: int


class PractitionerQualificationListResponse(BaseModel):
    """Response shape for GET /practitioners/{id}/qualifications."""

    data: List[PlainQualification]
    total: int


class PractitionerCommunicationListResponse(BaseModel):
    """Response shape for GET /practitioners/{id}/communications."""

    data: List[PlainPractitionerCommunication]
    total: int
