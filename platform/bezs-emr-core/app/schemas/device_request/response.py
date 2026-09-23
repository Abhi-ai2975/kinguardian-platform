from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.common.fhir import FHIRBundle, FHIRBundleEntry, FHIRCodeableConcept, FHIRReference


class FHIRDeviceRequestSchema(BaseModel):
    model_config = ConfigDict(extra="allow")
    resourceType: str = "DeviceRequest"
    id: Optional[str] = None
    status: Optional[str] = None
    intent: Optional[str] = None
    priority: Optional[str] = None
    codeReference: Optional[FHIRReference] = None
    codeCodeableConcept: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    occurrenceDateTime: Optional[str] = None
    occurrencePeriod: Optional[Dict[str, Any]] = None
    occurrenceTiming: Optional[Dict[str, Any]] = None
    authoredOn: Optional[str] = None
    requester: Optional[FHIRReference] = None
    performerType: Optional[FHIRCodeableConcept] = None
    performer: Optional[FHIRReference] = None
    groupIdentifier: Optional[Dict[str, Any]] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    identifier: Optional[List[Dict[str, Any]]] = None
    basedOn: Optional[List[FHIRReference]] = None
    priorRequest: Optional[List[FHIRReference]] = None
    parameter: Optional[List[Dict[str, Any]]] = None
    reasonCode: Optional[List[FHIRCodeableConcept]] = None
    reasonReference: Optional[List[FHIRReference]] = None
    insurance: Optional[List[FHIRReference]] = None
    supportingInfo: Optional[List[FHIRReference]] = None
    note: Optional[List[Dict[str, Any]]] = None
    relevantHistory: Optional[List[FHIRReference]] = None


class FHIRDeviceRequestBundleEntry(FHIRBundleEntry):
    resource: Optional[FHIRDeviceRequestSchema] = None


class FHIRDeviceRequestBundle(FHIRBundle):
    entry: Optional[List[FHIRDeviceRequestBundleEntry]] = None


# ── Plain (snake_case) schemas ──────────────────────────────────────────────────


class PlainDeviceRequestIdentifier(BaseModel):
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


class PlainDeviceRequestBasedOn(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDeviceRequestPriorRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDeviceRequestParameter(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    value_concept_system: Optional[str] = None
    value_concept_code: Optional[str] = None
    value_concept_display: Optional[str] = None
    value_concept_text: Optional[str] = None
    value_quantity_value: Optional[float] = None
    value_quantity_unit: Optional[str] = None
    value_quantity_system: Optional[str] = None
    value_quantity_code: Optional[str] = None
    value_range_low_value: Optional[float] = None
    value_range_low_unit: Optional[str] = None
    value_range_high_value: Optional[float] = None
    value_range_high_unit: Optional[str] = None
    value_boolean: Optional[bool] = None


class PlainDeviceRequestReasonCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainDeviceRequestReasonReference(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDeviceRequestInsurance(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDeviceRequestSupportingInfo(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDeviceRequestNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainDeviceRequestRelevantHistory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDeviceRequestResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None
    intent: str
    priority: Optional[str] = None
    code_reference_type: Optional[str] = None
    code_reference_id: Optional[int] = None
    code_reference_display: Optional[str] = None
    code_concept_system: Optional[str] = None
    code_concept_code: Optional[str] = None
    code_concept_display: Optional[str] = None
    code_concept_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    occurrence_datetime: Optional[str] = None
    occurrence_period_start: Optional[str] = None
    occurrence_period_end: Optional[str] = None
    occurrence_timing_code_system: Optional[str] = None
    occurrence_timing_code_code: Optional[str] = None
    occurrence_timing_code_display: Optional[str] = None
    occurrence_timing_bounds_start: Optional[str] = None
    occurrence_timing_bounds_end: Optional[str] = None
    occurrence_timing_count: Optional[int] = None
    occurrence_timing_count_max: Optional[int] = None
    occurrence_timing_duration: Optional[float] = None
    occurrence_timing_duration_max: Optional[float] = None
    occurrence_timing_duration_unit: Optional[str] = None
    occurrence_timing_frequency: Optional[int] = None
    occurrence_timing_frequency_max: Optional[int] = None
    occurrence_timing_period: Optional[float] = None
    occurrence_timing_period_max: Optional[float] = None
    occurrence_timing_period_unit: Optional[str] = None
    occurrence_timing_day_of_week: Optional[str] = None
    occurrence_timing_time_of_day: Optional[str] = None
    occurrence_timing_when: Optional[str] = None
    occurrence_timing_offset: Optional[int] = None
    authored_on: Optional[str] = None
    requester_type: Optional[str] = None
    requester_id: Optional[int] = None
    requester_display: Optional[str] = None
    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None
    performer_reference_type: Optional[str] = None
    performer_reference_id: Optional[int] = None
    performer_reference_display: Optional[str] = None
    group_identifier_use: Optional[str] = None
    group_identifier_type_system: Optional[str] = None
    group_identifier_type_code: Optional[str] = None
    group_identifier_type_display: Optional[str] = None
    group_identifier_type_text: Optional[str] = None
    group_identifier_system: Optional[str] = None
    group_identifier_value: Optional[str] = None
    group_identifier_period_start: Optional[str] = None
    group_identifier_period_end: Optional[str] = None
    group_identifier_assigner: Optional[str] = None
    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainDeviceRequestIdentifier]] = None
    based_on: Optional[List[PlainDeviceRequestBasedOn]] = None
    prior_request: Optional[List[PlainDeviceRequestPriorRequest]] = None
    parameter: Optional[List[PlainDeviceRequestParameter]] = None
    reason_code: Optional[List[PlainDeviceRequestReasonCode]] = None
    reason_reference: Optional[List[PlainDeviceRequestReasonReference]] = None
    insurance: Optional[List[PlainDeviceRequestInsurance]] = None
    supporting_info: Optional[List[PlainDeviceRequestSupportingInfo]] = None
    note: Optional[List[PlainDeviceRequestNote]] = None
    relevant_history: Optional[List[PlainDeviceRequestRelevantHistory]] = None


class PaginatedDeviceRequestResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    total: int
    limit: int
    offset: int
    data: List[PlainDeviceRequestResponse]
