from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRPeriod,
    FHIRReference,
)


# ── FHIR (camelCase) schema ────────────────────────────────────────────────────


class FHIRHSAvailableTime(BaseModel):
    daysOfWeek: Optional[List[str]] = None
    allDay: Optional[bool] = None
    availableStartTime: Optional[str] = None
    availableEndTime: Optional[str] = None


class FHIRHSNotAvailable(BaseModel):
    description: Optional[str] = None
    during: Optional[FHIRPeriod] = None


class FHIRHSEligibility(BaseModel):
    code: Optional[FHIRCodeableConcept] = None
    comment: Optional[str] = None


class FHIRHealthcareServiceSchema(BaseModel):
    resourceType: str = Field("HealthcareService", description="Always 'HealthcareService'.")
    id: str = Field(..., description="Public healthcare_service_id as a string.")
    identifier: Optional[List[FHIRIdentifier]] = None
    active: Optional[bool] = None
    providedBy: Optional[FHIRReference] = None
    category: Optional[List[FHIRCodeableConcept]] = None
    type: Optional[List[FHIRCodeableConcept]] = None
    specialty: Optional[List[FHIRCodeableConcept]] = None
    location: Optional[List[FHIRReference]] = None
    name: Optional[str] = None
    comment: Optional[str] = None
    extraDetails: Optional[str] = None
    photo: Optional[Dict[str, Any]] = None
    telecom: Optional[List[Dict[str, Any]]] = None
    coverageArea: Optional[List[FHIRReference]] = None
    serviceProvisionCode: Optional[List[FHIRCodeableConcept]] = None
    eligibility: Optional[List[FHIRHSEligibility]] = None
    program: Optional[List[FHIRCodeableConcept]] = None
    characteristic: Optional[List[FHIRCodeableConcept]] = None
    communication: Optional[List[FHIRCodeableConcept]] = None
    referralMethod: Optional[List[FHIRCodeableConcept]] = None
    appointmentRequired: Optional[bool] = None
    availableTime: Optional[List[FHIRHSAvailableTime]] = None
    notAvailable: Optional[List[FHIRHSNotAvailable]] = None
    availabilityExceptions: Optional[str] = None
    endpoint: Optional[List[FHIRReference]] = None


class FHIRHealthcareServiceBundleEntry(BaseModel):
    resource: FHIRHealthcareServiceSchema


class FHIRHealthcareServiceBundle(FHIRBundle):
    entry: Optional[List[FHIRHealthcareServiceBundleEntry]] = None


# ── Plain (snake_case) sub-schemas ────────────────────────────────────────────


class PlainHSIdentifier(BaseModel):
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


class PlainHSCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSSpecialty(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSLocation(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainHSTelecom(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainHSCoverageArea(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainHSServiceProvisionCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSEligibility(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    comment: Optional[str] = None


class PlainHSProgram(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSCharacteristic(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSCommunication(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSReferralMethod(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainHSAvailableTime(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    days_of_week: Optional[List[str]] = None
    all_day: Optional[bool] = None
    available_start_time: Optional[str] = None
    available_end_time: Optional[str] = None


class PlainHSNotAvailable(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    description: Optional[str] = None
    during_start: Optional[str] = None
    during_end: Optional[str] = None


class PlainHSEndpoint(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainHealthcareServiceResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    active: Optional[bool] = None
    provided_by_type: Optional[str] = None
    provided_by_id: Optional[int] = None
    provided_by_display: Optional[str] = None
    name: Optional[str] = None
    comment: Optional[str] = None
    extra_details: Optional[str] = None
    photo_content_type: Optional[str] = None
    photo_language: Optional[str] = None
    photo_data: Optional[str] = None
    photo_url: Optional[str] = None
    photo_size: Optional[int] = None
    photo_hash: Optional[str] = None
    photo_title: Optional[str] = None
    photo_creation: Optional[str] = None
    appointment_required: Optional[bool] = None
    availability_exceptions: Optional[str] = None
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
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedHealthcareServiceResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainHealthcareServiceResponse]
