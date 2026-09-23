"""
Plain JSON response schemas for FHIR HealthcareService resources.

These models document the shape of the fhir-server's plain JSON output — the format
returned when the client sends no Accept header or `Accept: application/json`.

The fhir-server returns rich typed sub-schemas for each array field (identifiers,
categories, types, etc.), each with their own `id` field (the database row ID of
the child record). These are modelled here as typed sub-schemas rather than
`List[Dict]` because the array structures are stable and well-documented, giving
Swagger UI better schema information.

extra="allow" on every model lets new fhir-server fields pass through to the client
without requiring a coordinated schema bump here.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


# ── Typed array sub-schemas (mirror fhir-server PlainHS* models) ──────────────


class PlainHSIdentifier(BaseModel):
    """A single business identifier row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
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


class PlainHSCategory(BaseModel):
    """A single service category row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSType(BaseModel):
    """A single service type row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSSpecialty(BaseModel):
    """A single clinical specialty row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSLocation(BaseModel):
    """A single location reference row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainHSTelecom(BaseModel):
    """A single telecom contact row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainHSCoverageArea(BaseModel):
    """A single coverage area reference row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainHSServiceProvisionCode(BaseModel):
    """A single service provision code row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSEligibility(BaseModel):
    """A single eligibility criteria row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    comment: Optional[str] = None


class PlainHSProgram(BaseModel):
    """A single health program row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSCharacteristic(BaseModel):
    """A single service characteristic row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSCommunication(BaseModel):
    """A single communication language row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSReferralMethod(BaseModel):
    """A single referral method row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSAvailableTime(BaseModel):
    """A single available time slot row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    days_of_week: Optional[List[str]] = None
    all_day: Optional[bool] = None
    available_start_time: Optional[str] = None
    available_end_time: Optional[str] = None


class PlainHSNotAvailable(BaseModel):
    """A single not-available period row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    description: Optional[str] = None
    during_start: Optional[str] = None
    during_end: Optional[str] = None


class PlainHSEndpoint(BaseModel):
    """A single technical endpoint reference row as returned by the fhir-server."""

    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


# ── Top-level response models ──────────────────────────────────────────────────


class HealthcareServiceResponse(BaseModel):
    """
    Full plain JSON response for a single HealthcareService resource.

    Mirrors PlainHealthcareServiceResponse from the fhir-server. extra="allow" lets
    new fhir-server fields pass through without requiring a schema bump here.
    """

    model_config = ConfigDict(extra="allow")

    # ── Core identity ──────────────────────────────────────────────────────────
    id: Optional[int] = None
    active: Optional[bool] = None
    name: Optional[str] = None
    comment: Optional[str] = None
    extra_details: Optional[str] = None
    appointment_required: Optional[bool] = None
    availability_exceptions: Optional[str] = None

    # ── Providing organisation (flattened reference) ───────────────────────────
    provided_by_type: Optional[str] = None
    provided_by_id: Optional[int] = None
    provided_by_display: Optional[str] = None

    # ── Photo (flattened FHIR Attachment) ─────────────────────────────────────
    photo_content_type: Optional[str] = None
    photo_language: Optional[str] = None
    photo_data: Optional[str] = None
    photo_url: Optional[str] = None
    photo_size: Optional[int] = None
    photo_hash: Optional[str] = None
    photo_title: Optional[str] = None
    photo_creation: Optional[str] = None

    # ── Array sub-resources ────────────────────────────────────────────────────
    identifier: Optional[List[PlainHSIdentifier]] = None
    category: Optional[List[PlainHSCategory]] = None
    type: Optional[List[PlainHSType]] = None
    specialty: Optional[List[PlainHSSpecialty]] = None
    location: Optional[List[PlainHSLocation]] = None
    telecom: Optional[List[PlainHSTelecom]] = None
    coverage_area: Optional[List[PlainHSCoverageArea]] = None
    service_provision_code: Optional[List[PlainHSServiceProvisionCode]] = None
    eligibility: Optional[List[PlainHSEligibility]] = None
    program: Optional[List[PlainHSProgram]] = None
    characteristic: Optional[List[PlainHSCharacteristic]] = None
    communication: Optional[List[PlainHSCommunication]] = None
    referral_method: Optional[List[PlainHSReferralMethod]] = None
    available_time: Optional[List[PlainHSAvailableTime]] = None
    not_available: Optional[List[PlainHSNotAvailable]] = None
    endpoint: Optional[List[PlainHSEndpoint]] = None

    # ── Tenant / audit fields ──────────────────────────────────────────────────
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedHealthcareServiceResponse(BaseModel):
    """
    Paginated plain JSON list response for GET /healthcare-services.

    Matches the fhir-server's standard pagination envelope:
      { total, limit, offset, data: [HealthcareServiceResponse, ...] }
    """

    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    offset: int
    data: List[HealthcareServiceResponse]
