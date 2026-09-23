from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRPeriod,
    FHIRReference,
)


# ── FHIR sub-schemas (R5 extensions — intentional per architecture) ────────────


class FHIRPRContactName(BaseModel):
    use: Optional[str] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period: Optional[FHIRPeriod] = None


class FHIRPRContactTelecom(BaseModel):
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period: Optional[FHIRPeriod] = None


class FHIRPRContact(BaseModel):
    purpose: Optional[FHIRCodeableConcept] = None
    name: Optional[List[FHIRPRContactName]] = None
    telecom: Optional[List[FHIRPRContactTelecom]] = None
    address: Optional[Dict[str, Any]] = None
    organization: Optional[FHIRReference] = None
    period: Optional[FHIRPeriod] = None


class FHIRPRAvailableTime(BaseModel):
    daysOfWeek: Optional[List[str]] = None
    allDay: Optional[bool] = None
    availableStartTime: Optional[str] = None
    availableEndTime: Optional[str] = None


class FHIRPRNotAvailableTime(BaseModel):
    description: Optional[str] = None
    during: Optional[FHIRPeriod] = None


class FHIRPRAvailability(BaseModel):
    availableTime: Optional[List[FHIRPRAvailableTime]] = None
    notAvailableTime: Optional[List[FHIRPRNotAvailableTime]] = None


# ── FHIR (camelCase) top-level schema ─────────────────────────────────────────


class FHIRPractitionerRoleSchema(BaseModel):
    resourceType: str = Field("PractitionerRole", description="Always 'PractitionerRole'.")
    id: str = Field(..., description="Public practitioner_role_id as a string.")
    identifier: Optional[List[FHIRIdentifier]] = None
    active: Optional[bool] = None
    period: Optional[FHIRPeriod] = None
    practitioner: Optional[FHIRReference] = None
    organization: Optional[FHIRReference] = None
    code: Optional[List[FHIRCodeableConcept]] = None
    specialty: Optional[List[FHIRCodeableConcept]] = None
    location: Optional[List[FHIRReference]] = None
    healthcareService: Optional[List[FHIRReference]] = None
    characteristic: Optional[List[FHIRCodeableConcept]] = None
    communication: Optional[List[FHIRCodeableConcept]] = None
    contact: Optional[List[FHIRPRContact]] = None
    availability: Optional[List[FHIRPRAvailability]] = None
    availabilityExceptions: Optional[str] = None
    endpoint: Optional[List[FHIRReference]] = None


class FHIRPractitionerRoleBundleEntry(BaseModel):
    resource: FHIRPractitionerRoleSchema


class FHIRPractitionerRoleBundle(FHIRBundle):
    entry: Optional[List[FHIRPractitionerRoleBundleEntry]] = None


# ── Plain (snake_case) sub-schemas ────────────────────────────────────────────


class PlainPRIdentifier(BaseModel):
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
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainPRSpecialty(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainPRLocation(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainPRHealthcareService(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainPRCharacteristic(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainPRCommunication(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainPRContactName(BaseModel):
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
    model_config = ConfigDict(extra="allow")
    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainPRContact(BaseModel):
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
    model_config = ConfigDict(extra="allow")
    id: int
    days_of_week: Optional[List[str]] = None
    all_day: Optional[bool] = None
    available_start_time: Optional[str] = None
    available_end_time: Optional[str] = None


class PlainPRNotAvailableTime(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    description: Optional[str] = None
    during_start: Optional[str] = None
    during_end: Optional[str] = None


class PlainPRAvailability(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    available_times: Optional[List[PlainPRAvailableTime]] = None
    not_available_times: Optional[List[PlainPRNotAvailableTime]] = None


class PlainPREndpoint(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainPractitionerRoleResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    active: Optional[bool] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    practitioner_ref_id: Optional[int] = None
    practitioner_display: Optional[str] = None
    organization_type: Optional[str] = None
    organization_id: Optional[int] = None
    organization_display: Optional[str] = None
    availability_exceptions: Optional[str] = None
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
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedPractitionerRoleResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainPractitionerRoleResponse]


# ── Booking directory schemas ──────────────────────────────────────────────────


class FHIRPractitionerBookingBundleEntry(BaseModel):
    resource: Dict[str, Any]


class FHIRPractitionerBookingBundle(FHIRBundle):
    entry: Optional[List[FHIRPractitionerBookingBundleEntry]] = None


class PlainPractitionerDetail(BaseModel):
    id: int
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    name: Optional[Dict[str, Any]] = None
    telecom: Optional[List[Dict[str, Any]]] = None
    languages: Optional[List[Dict[str, Any]]] = None
    qualifications: Optional[List[Dict[str, Any]]] = None
    photo_url: Optional[str] = None


class PlainBookingLocation(PlainPRLocation):
    model_config = ConfigDict(extra="allow")
    name: Optional[str] = None
    address_text: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    phone: Optional[str] = None


class PlainBookingHealthcareService(PlainPRHealthcareService):
    model_config = ConfigDict(extra="allow")
    name: Optional[str] = None
    comment: Optional[str] = None
    appointment_required: Optional[bool] = None
    category: Optional[str] = None
    availability_exceptions: Optional[str] = None


class PlainPractitionerBookingItem(PlainPractitionerRoleResponse):
    practitioner_detail: Optional[PlainPractitionerDetail] = None
    location: Optional[List[PlainBookingLocation]] = None
    healthcare_service: Optional[List[PlainBookingHealthcareService]] = None


class PaginatedPractitionerBookingResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainPractitionerBookingItem]
