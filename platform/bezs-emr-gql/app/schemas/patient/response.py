"""
Plain JSON response models for the Patient resource and all its sub-resources.

These models mirror the fhir-server's plain (snake_case) output format.
All models use extra="allow" so that new fields added to the fhir-server
response pass through to the API consumer without requiring a schema bump here.

Sub-resource list responses use the shape {data: [...], total: N} rather than
the paginated envelope {total, limit, offset, data} — sub-resource lists
return all items for the patient without pagination.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


# ── Sub-resource response models ──────────────────────────────────────────────


class PatientNameResponse(BaseModel):
    """Plain response for a single Patient HumanName sub-resource."""

    model_config = ConfigDict(extra="allow")

    id: int
    use: Optional[str] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PatientIdentifierResponse(BaseModel):
    """Plain response for a single Patient Identifier sub-resource."""

    model_config = ConfigDict(extra="allow")

    id: int
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


class PatientTelecomResponse(BaseModel):
    """Plain response for a single Patient ContactPoint (telecom) sub-resource."""

    model_config = ConfigDict(extra="allow")

    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PatientAddressResponse(BaseModel):
    """Plain response for a single Patient Address sub-resource."""

    model_config = ConfigDict(extra="allow")

    id: int
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


class PatientPhotoResponse(BaseModel):
    """Plain response for a single Patient Attachment (photo) sub-resource."""

    model_config = ConfigDict(extra="allow")

    id: int
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class PatientContactTelecomResponse(BaseModel):
    """Plain response for a single telecom entry within a Patient contact."""

    model_config = ConfigDict(extra="allow")

    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PatientContactRelationshipResponse(BaseModel):
    """Plain response for a single relationship CodeableConcept within a Patient contact."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PatientContactResponse(BaseModel):
    """
    Plain response for a single Patient contact (BackboneElement).

    Includes nested relationship and telecom arrays because a contact can have
    multiple relationships and multiple contact points.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    relationship: Optional[List[PatientContactRelationshipResponse]] = None
    name_use: Optional[str] = None
    name_text: Optional[str] = None
    name_family: Optional[str] = None
    name_given: Optional[List[str]] = None
    name_prefix: Optional[List[str]] = None
    name_suffix: Optional[List[str]] = None
    telecom: Optional[List[PatientContactTelecomResponse]] = None
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
    gender: Optional[str] = None
    organization_type: Optional[str] = None
    organization_id: Optional[int] = None
    organization_display: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PatientCommunicationResponse(BaseModel):
    """Plain response for a single Patient communication language entry."""

    model_config = ConfigDict(extra="allow")

    id: int
    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = None


class PatientGeneralPractitionerResponse(BaseModel):
    """Plain response for a single Patient generalPractitioner reference."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PatientLinkResponse(BaseModel):
    """Plain response for a single Patient link to another Patient or RelatedPerson."""

    model_config = ConfigDict(extra="allow")

    id: int
    other_type: Optional[str] = None
    other_id: Optional[int] = None
    other_display: Optional[str] = None
    type: Optional[str] = None


# ── Sub-resource list response wrappers ───────────────────────────────────────
# Each wraps {data: [...], total: N} — all items returned, no pagination.


class PatientNameListResponse(BaseModel):
    """List response for Patient names sub-resource."""

    total: int
    data: List[PatientNameResponse]


class PatientIdentifierListResponse(BaseModel):
    """List response for Patient identifiers sub-resource."""

    total: int
    data: List[PatientIdentifierResponse]


class PatientTelecomListResponse(BaseModel):
    """List response for Patient telecom sub-resource."""

    total: int
    data: List[PatientTelecomResponse]


class PatientAddressListResponse(BaseModel):
    """List response for Patient addresses sub-resource."""

    total: int
    data: List[PatientAddressResponse]


class PatientPhotoListResponse(BaseModel):
    """List response for Patient photos sub-resource."""

    total: int
    data: List[PatientPhotoResponse]


class PatientContactListResponse(BaseModel):
    """List response for Patient contacts sub-resource."""

    total: int
    data: List[PatientContactResponse]


class PatientCommunicationListResponse(BaseModel):
    """List response for Patient communications sub-resource."""

    total: int
    data: List[PatientCommunicationResponse]


class PatientGeneralPractitionerListResponse(BaseModel):
    """List response for Patient general practitioners sub-resource."""

    total: int
    data: List[PatientGeneralPractitionerResponse]


class PatientLinkListResponse(BaseModel):
    """List response for Patient links sub-resource."""

    total: int
    data: List[PatientLinkResponse]


# ── Top-level Patient response ────────────────────────────────────────────────


class PatientResponse(BaseModel):
    """
    Full plain JSON response for a single Patient resource.

    Includes all scalar fields and all nine nested sub-resource arrays.
    The id field reflects the public patient_id (not the internal DB pk).
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
    marital_status_system: Optional[str] = None
    marital_status_code: Optional[str] = None
    marital_status_display: Optional[str] = None
    marital_status_text: Optional[str] = None
    multiple_birth_boolean: Optional[bool] = None
    multiple_birth_integer: Optional[int] = None
    managing_organization_type: Optional[str] = None
    managing_organization_id: Optional[int] = None
    managing_organization_display: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    # Nested sub-resource arrays — populated by the fhir-server on every GET.
    name: Optional[List[PatientNameResponse]] = None
    identifier: Optional[List[PatientIdentifierResponse]] = None
    telecom: Optional[List[PatientTelecomResponse]] = None
    address: Optional[List[PatientAddressResponse]] = None
    photo: Optional[List[PatientPhotoResponse]] = None
    contact: Optional[List[PatientContactResponse]] = None
    communication: Optional[List[PatientCommunicationResponse]] = None
    general_practitioner: Optional[List[PatientGeneralPractitionerResponse]] = None
    link: Optional[List[PatientLinkResponse]] = None


class PaginatedPatientResponse(BaseModel):
    """Paginated list response for the GET /patients endpoint."""

    total: int
    limit: int
    offset: int
    data: List[PatientResponse]
