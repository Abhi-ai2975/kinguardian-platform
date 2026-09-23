from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCoding,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRReference,
    FHIRPeriod,
)


# ── Local R5 types ─────────────────────────────────────────────────────────────


class FHIRCodeableReference(BaseModel):
    """R5 CodeableReference — concept (CodeableConcept) + reference (Reference)."""
    concept: Optional[FHIRCodeableConcept] = None
    reference: Optional[FHIRReference] = None


# ── FHIR R5 sub-schemas ────────────────────────────────────────────────────────


class FHIREncounterStatusHistory(BaseModel):
    status: str
    period: Optional[FHIRPeriod] = None


class FHIREncounterClassHistory(BaseModel):
    """classHistory — R4 backward-compat element; removed in R5."""
    class_: Optional[FHIRCoding] = Field(None, alias="class")
    period: Optional[FHIRPeriod] = None

    model_config = {"populate_by_name": True}


class FHIREncounterBusinessStatus(BaseModel):
    code: Optional[FHIRCodeableConcept] = None
    type: Optional[FHIRCoding] = None
    effectiveDate: Optional[str] = None


class FHIREncounterParticipant(BaseModel):
    type: Optional[List[FHIRCodeableConcept]] = None
    period: Optional[FHIRPeriod] = None
    actor: Optional[FHIRReference] = None


class FHIREncounterReasonValue(BaseModel):
    concept: Optional[FHIRCodeableConcept] = None
    reference: Optional[FHIRReference] = None


class FHIREncounterReason(BaseModel):
    """reason[] BackboneElement — R5 consolidates reasonCode + reasonReference."""
    use: Optional[List[FHIRCodeableConcept]] = None
    value: Optional[List[FHIREncounterReasonValue]] = None


class FHIREncounterDiagnosisCondition(BaseModel):
    concept: Optional[FHIRCodeableConcept] = None
    reference: Optional[FHIRReference] = None


class FHIREncounterDiagnosis(BaseModel):
    condition: Optional[List[FHIREncounterDiagnosisCondition]] = None
    use: Optional[List[FHIRCodeableConcept]] = None


class FHIREncounterAdmission(BaseModel):
    """admission — R5 renamed from hospitalization."""
    preAdmissionIdentifier: Optional[FHIRIdentifier] = None
    origin: Optional[FHIRReference] = None
    admitSource: Optional[FHIRCodeableConcept] = None
    reAdmission: Optional[FHIRCodeableConcept] = None
    destination: Optional[FHIRReference] = None
    dischargeDisposition: Optional[FHIRCodeableConcept] = None


class FHIREncounterVirtualService(BaseModel):
    channelType: Optional[FHIRCoding] = None
    addressUrl: Optional[str] = None
    additionalInfo: Optional[List[str]] = None
    maxParticipants: Optional[int] = None
    sessionKey: Optional[str] = None


class FHIREncounterLocation(BaseModel):
    location: Optional[FHIRReference] = None
    status: Optional[str] = None
    form: Optional[FHIRCodeableConcept] = None
    period: Optional[FHIRPeriod] = None


class FHIREncounterSchema(BaseModel):
    model_config = {"populate_by_name": True}

    resourceType: str = Field("Encounter", description="Always 'Encounter'.")
    id: str = Field(..., description="Public encounter_id as a string.")
    identifier: Optional[List[FHIRIdentifier]] = None
    status: str = Field(..., description="R5 status value.")
    statusHistory: Optional[List[FHIREncounterStatusHistory]] = None
    class_: Optional[List[FHIRCodeableConcept]] = Field(None, alias="class", description="class[] 0..* CodeableConcept — R5 changed from 0..1 Coding.")
    classHistory: Optional[List[FHIREncounterClassHistory]] = None
    businessStatus: Optional[List[FHIREncounterBusinessStatus]] = None
    type: Optional[List[FHIRCodeableConcept]] = None
    serviceType: Optional[List[FHIRCodeableReference]] = None
    priority: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    subjectStatus: Optional[FHIRCodeableConcept] = None
    episodeOfCare: Optional[List[FHIRReference]] = None
    basedOn: Optional[List[FHIRReference]] = None
    careTeam: Optional[List[FHIRReference]] = None
    participant: Optional[List[FHIREncounterParticipant]] = None
    appointment: Optional[List[FHIRReference]] = None
    virtualService: Optional[List[FHIREncounterVirtualService]] = None
    actualPeriod: Optional[FHIRPeriod] = None
    plannedStartDate: Optional[str] = None
    plannedEndDate: Optional[str] = None
    length: Optional[Any] = Field(None, description="Duration — value, comparator, unit, system, code.")
    reason: Optional[List[FHIREncounterReason]] = None
    diagnosis: Optional[List[FHIREncounterDiagnosis]] = None
    account: Optional[List[FHIRReference]] = None
    admission: Optional[FHIREncounterAdmission] = None
    dietPreference: Optional[List[FHIRCodeableConcept]] = None
    specialArrangement: Optional[List[FHIRCodeableConcept]] = None
    specialCourtesy: Optional[List[FHIRCodeableConcept]] = None
    location: Optional[List[FHIREncounterLocation]] = None
    serviceProvider: Optional[FHIRReference] = None
    partOf: Optional[FHIRReference] = None


class FHIREncounterBundleEntry(BaseModel):
    resource: FHIREncounterSchema


class FHIREncounterBundle(FHIRBundle):
    entry: Optional[List[FHIREncounterBundleEntry]] = None


# ── Plain (snake_case) sub-schemas ────────────────────────────────────────────


class PlainEncounterIdentifier(BaseModel):
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


class PlainEncounterStatusHistory(BaseModel):
    status: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainEncounterClassHistory(BaseModel):
    class_system: Optional[str] = None
    class_version: Optional[str] = None
    class_code: Optional[str] = None
    class_display: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainEncounterClass(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterBusinessStatus(BaseModel):
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    effective_date: Optional[str] = None


class PlainEncounterServiceType(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterType(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterEpisodeOfCare(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterBasedOn(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterCareTeam(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterParticipantType(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterParticipant(BaseModel):
    type: Optional[List[PlainEncounterParticipantType]] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainEncounterAppointmentRef(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterVirtualService(BaseModel):
    channel_type_system: Optional[str] = None
    channel_type_code: Optional[str] = None
    channel_type_display: Optional[str] = None
    address_url: Optional[str] = None
    additional_info: Optional[str] = None
    max_participants: Optional[int] = None
    session_key: Optional[str] = None


class PlainEncounterReasonUse(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterReasonValue(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterReason(BaseModel):
    use: Optional[List[PlainEncounterReasonUse]] = None
    value: Optional[List[PlainEncounterReasonValue]] = None


class PlainEncounterDiagnosisCondition(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterDiagnosisUse(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterDiagnosis(BaseModel):
    condition: Optional[List[PlainEncounterDiagnosisCondition]] = None
    use: Optional[List[PlainEncounterDiagnosisUse]] = None


class PlainEncounterAccount(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterAdmission(BaseModel):
    pre_admission_identifier_system: Optional[str] = None
    pre_admission_identifier_value: Optional[str] = None
    origin_type: Optional[str] = None
    origin_id: Optional[int] = None
    origin_display: Optional[str] = None
    admit_source_system: Optional[str] = None
    admit_source_code: Optional[str] = None
    admit_source_display: Optional[str] = None
    admit_source_text: Optional[str] = None
    re_admission_system: Optional[str] = None
    re_admission_code: Optional[str] = None
    re_admission_display: Optional[str] = None
    re_admission_text: Optional[str] = None
    destination_type: Optional[str] = None
    destination_id: Optional[int] = None
    destination_display: Optional[str] = None
    discharge_disposition_system: Optional[str] = None
    discharge_disposition_code: Optional[str] = None
    discharge_disposition_display: Optional[str] = None
    discharge_disposition_text: Optional[str] = None


class PlainEncounterLocation(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None
    status: Optional[str] = None
    form_system: Optional[str] = None
    form_code: Optional[str] = None
    form_display: Optional[str] = None
    form_text: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainEncounterLength(BaseModel):
    value: Optional[float] = None
    comparator: Optional[str] = None
    unit: Optional[str] = None
    system: Optional[str] = None
    code: Optional[str] = None


class PlainEncounterCodeableConcept(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ── Full plain Encounter response ─────────────────────────────────────────────


class PlainEncounterResponse(BaseModel):
    id: int = Field(..., description="Public encounter_id.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    subject_status_system: Optional[str] = None
    subject_status_code: Optional[str] = None
    subject_status_display: Optional[str] = None
    subject_status_text: Optional[str] = None
    actual_period_start: Optional[str] = None
    actual_period_end: Optional[str] = None
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
    length: Optional[PlainEncounterLength] = None
    service_provider_type: Optional[str] = None
    service_provider_id: Optional[int] = None
    service_provider_display: Optional[str] = None
    part_of_id: Optional[int] = None
    # Admission (flat on model)
    admission: Optional[PlainEncounterAdmission] = None
    # Arrays
    identifier: Optional[List[PlainEncounterIdentifier]] = None
    status_history: Optional[List[PlainEncounterStatusHistory]] = None
    class_history: Optional[List[PlainEncounterClassHistory]] = None
    class_: Optional[List[PlainEncounterClass]] = Field(None, alias="class")
    business_status: Optional[List[PlainEncounterBusinessStatus]] = None
    service_type: Optional[List[PlainEncounterServiceType]] = None
    type: Optional[List[PlainEncounterType]] = None
    episode_of_care: Optional[List[PlainEncounterEpisodeOfCare]] = None
    based_on: Optional[List[PlainEncounterBasedOn]] = None
    care_team: Optional[List[PlainEncounterCareTeam]] = None
    participant: Optional[List[PlainEncounterParticipant]] = None
    appointment: Optional[List[PlainEncounterAppointmentRef]] = None
    virtual_service: Optional[List[PlainEncounterVirtualService]] = None
    reason: Optional[List[PlainEncounterReason]] = None
    diagnosis: Optional[List[PlainEncounterDiagnosis]] = None
    account: Optional[List[PlainEncounterAccount]] = None
    diet_preference: Optional[List[PlainEncounterCodeableConcept]] = None
    special_arrangement: Optional[List[PlainEncounterCodeableConcept]] = None
    special_courtesy: Optional[List[PlainEncounterCodeableConcept]] = None
    location: Optional[List[PlainEncounterLocation]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = {"populate_by_name": True}


# ── Paginated response ────────────────────────────────────────────────────────


class PaginatedEncounterResponse(BaseModel):
    total: int = Field(..., description="Total number of matching encounters.")
    limit: int = Field(..., description="Page size requested.")
    offset: int = Field(..., description="Number of records skipped.")
    data: List[PlainEncounterResponse] = Field(..., description="Array of plain-JSON Encounter objects.")
