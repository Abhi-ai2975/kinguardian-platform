"""
Plain JSON response schemas for the PractitionerRole resource.

These models document the fhir-server's plain (non-FHIR) JSON output shape.
`extra="allow"` on every model lets new fhir-server fields pass through without
requiring a schema bump here.

For the FHIR R4 camelCase shape (application/fhir+json), see fhir_schemas.py.

Booking-specific schemas (PlainPractitionerDetail, PractitionerBookingResponse,
PaginatedPractitionerBookingResponse) mirror the fhir-server's enriched response
for GET /practitioner-roles/booking — each item includes the linked Practitioner's
name, gender, photo, and qualifications alongside the role data.

Reference: https://hl7.org/fhir/R4/practitionerrole.html
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class PlainPRIdentifier(BaseModel):
    """Plain JSON representation of a PractitionerRole identifier record."""

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


class PlainPRCode(BaseModel):
    """Plain JSON representation of a role code (CodeableConcept) for a PractitionerRole."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainPRSpecialty(BaseModel):
    """Plain JSON representation of a specialty entry for a PractitionerRole."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainPRLocation(BaseModel):
    """Plain JSON representation of a location reference on a PractitionerRole."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainPRHealthcareService(BaseModel):
    """Plain JSON representation of a HealthcareService reference on a PractitionerRole."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainPRCharacteristic(BaseModel):
    """Plain JSON representation of a characteristic entry for a PractitionerRole."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainPRCommunication(BaseModel):
    """Plain JSON representation of a communication language entry for a PractitionerRole."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainPRContactName(BaseModel):
    """Name entry within a PractitionerRole contact record."""

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


class PlainPRContactTelecom(BaseModel):
    """Telecom entry within a PractitionerRole contact record."""

    model_config = ConfigDict(extra="allow")

    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainPRContact(BaseModel):
    """
    Plain JSON representation of a PractitionerRole contact entry.
    Contains flat address columns, purpose, organisation reference, and nested
    name/telecom child lists.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    purpose_system: Optional[str] = None
    purpose_code: Optional[str] = None
    purpose_display: Optional[str] = None
    purpose_text: Optional[str] = None
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
    organization_type: Optional[str] = None
    organization_id: Optional[int] = None
    organization_display: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    names: Optional[List[PlainPRContactName]] = None
    telecoms: Optional[List[PlainPRContactTelecom]] = None


class PlainPRAvailableTime(BaseModel):
    """Available time slot within a PractitionerRole availability group."""

    model_config = ConfigDict(extra="allow")

    id: int
    days_of_week: Optional[List[str]] = None
    all_day: Optional[bool] = None
    available_start_time: Optional[str] = None
    available_end_time: Optional[str] = None


class PlainPRNotAvailableTime(BaseModel):
    """Not-available period within a PractitionerRole availability group."""

    model_config = ConfigDict(extra="allow")

    id: int
    description: Optional[str] = None
    during_start: Optional[str] = None
    during_end: Optional[str] = None


class PlainPRAvailability(BaseModel):
    """
    Plain JSON representation of a PractitionerRole availability group.
    Groups available times and not-available times into one record.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    available_times: Optional[List[PlainPRAvailableTime]] = None
    not_available_times: Optional[List[PlainPRNotAvailableTime]] = None


class PlainPREndpoint(BaseModel):
    """Plain JSON representation of an endpoint reference on a PractitionerRole."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PractitionerRoleResponse(BaseModel):
    """
    Full plain JSON response for a single PractitionerRole resource.

    Mirrors the fhir-server's PlainPractitionerRoleResponse. All child arrays
    use typed sub-schemas so Swagger renders their fields correctly.

    `extra="allow"` ensures new fhir-server fields propagate to callers
    without requiring a middleware schema update.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    active: Optional[bool] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None

    # Practitioner reference (split into type + id + display by fhir-server)
    practitioner_ref_id: Optional[int] = None
    practitioner_display: Optional[str] = None

    # Organisation reference
    organization_type: Optional[str] = None
    organization_id: Optional[int] = None
    organization_display: Optional[str] = None

    availability_exceptions: Optional[str] = None

    # Child arrays
    identifier: Optional[List[PlainPRIdentifier]] = None
    code: Optional[List[PlainPRCode]] = None
    specialty: Optional[List[PlainPRSpecialty]] = None
    location: Optional[List[PlainPRLocation]] = None
    healthcare_service: Optional[List[PlainPRHealthcareService]] = None
    characteristic: Optional[List[PlainPRCharacteristic]] = None
    communication: Optional[List[PlainPRCommunication]] = None
    contact: Optional[List[PlainPRContact]] = None
    availability: Optional[List[PlainPRAvailability]] = None
    endpoint: Optional[List[PlainPREndpoint]] = None

    # Tenant scoping
    user_id: Optional[str] = None
    org_id: Optional[str] = None

    # Audit fields
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedPractitionerRoleResponse(BaseModel):
    """
    Paginated list response for the GET /practitioner-roles endpoint (application/json).

    `total` reflects the count across ALL pages, not just this page.
    """

    total: int
    limit: int
    offset: int
    data: List[PractitionerRoleResponse]


# ── Booking-enriched response schemas ─────────────────────────────────────────
# Used by GET /practitioner-roles/booking — each item extends the standard role
# response with a `practitioner_detail` block containing the linked Practitioner's
# name, gender, photo, and qualifications. This matches the fhir-server's
# PaginatedPractitionerBookingResponse shape exactly.


class PlainPractitionerQualification(BaseModel):
    """A single qualification entry for a Practitioner in the booking response."""

    model_config = ConfigDict(extra="allow")

    code: Optional[str] = None
    display: Optional[str] = None
    text: Optional[str] = None


class PlainPractitionerName(BaseModel):
    """Structured name for a Practitioner in the booking response."""

    model_config = ConfigDict(extra="allow")

    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None


class PlainPractitionerDetail(BaseModel):
    """
    Enriched Practitioner data embedded in each booking response item.

    The fhir-server joins the linked Practitioner record onto the PractitionerRole
    so the booking UI does not need a second request to show the practitioner's name,
    contact details, languages, and qualifications.
    """

    model_config = ConfigDict(extra="allow")

    id: Optional[int] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    name: Optional[PlainPractitionerName] = None
    # Each entry: {system, value, use, rank}
    telecom: Optional[List[dict]] = None
    # Each entry: {code, display, preferred}
    languages: Optional[List[dict]] = None
    qualifications: Optional[List[PlainPractitionerQualification]] = None
    photo_url: Optional[str] = None


class PlainBookingLocation(PlainPRLocation):
    """
    Location reference enriched with Location model data for booking UIs.

    Extends the bare reference (id, reference_type, reference_id, reference_display)
    with address and phone fields fetched from the Location resource by the fhir-server.
    """

    model_config = ConfigDict(extra="allow")

    name: Optional[str] = None
    address_text: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    phone: Optional[str] = None


class PlainBookingHealthcareService(PlainPRHealthcareService):
    """
    HealthcareService reference enriched with HealthcareService model data for booking UIs.

    Extends the bare reference with descriptive fields fetched from the
    HealthcareService resource by the fhir-server.
    """

    model_config = ConfigDict(extra="allow")

    name: Optional[str] = None
    comment: Optional[str] = None
    appointment_required: Optional[bool] = None
    category: Optional[str] = None
    availability_exceptions: Optional[str] = None


class PractitionerBookingResponse(PractitionerRoleResponse):
    """
    PractitionerRole enriched with the linked Practitioner's details and resolved
    Location / HealthcareService data.

    Extends PractitionerRoleResponse with:
      - practitioner_detail: name, gender, birth_date, telecom, languages, qualifications, photo
      - location: enriched with address and phone from the Location resource
      - healthcare_service: enriched with name, category, and availability from HealthcareService
    """

    practitioner_detail: Optional[PlainPractitionerDetail] = None
    # Override parent's bare-reference lists with enriched variants
    location: Optional[List[PlainBookingLocation]] = None
    healthcare_service: Optional[List[PlainBookingHealthcareService]] = None


class PaginatedPractitionerBookingResponse(BaseModel):
    """
    Paginated list response for GET /practitioner-roles/booking (application/json).

    `total` reflects the count across ALL pages, not just this page.
    Each item in `data` is an enriched PractitionerRole with `practitioner_detail`.
    """

    total: int
    limit: int
    offset: int
    data: List[PractitionerBookingResponse]
