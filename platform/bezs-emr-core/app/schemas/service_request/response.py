from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.common.fhir import FHIRBundle, FHIRBundleEntry, FHIRCodeableConcept, FHIRReference


class FHIRServiceRequestSchema(BaseModel):
    model_config = ConfigDict(extra="allow")
    resourceType: str = "ServiceRequest"
    id: Optional[str] = None
    status: Optional[str] = None
    intent: Optional[str] = None
    priority: Optional[str] = None
    doNotPerform: Optional[bool] = None
    code: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    occurrenceDateTime: Optional[str] = None
    occurrencePeriod: Optional[Dict[str, Any]] = None
    occurrenceTiming: Optional[Dict[str, Any]] = None
    asNeededBoolean: Optional[bool] = None
    asNeededCodeableConcept: Optional[FHIRCodeableConcept] = None
    authoredOn: Optional[str] = None
    requester: Optional[FHIRReference] = None
    performerType: Optional[FHIRCodeableConcept] = None
    quantityQuantity: Optional[Dict[str, Any]] = None
    quantityRatio: Optional[Dict[str, Any]] = None
    quantityRange: Optional[Dict[str, Any]] = None
    requisition: Optional[Dict[str, Any]] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    patientInstruction: Optional[str] = None
    identifier: Optional[List[Dict[str, Any]]] = None
    category: Optional[List[FHIRCodeableConcept]] = None
    orderDetail: Optional[List[FHIRCodeableConcept]] = None
    performer: Optional[List[FHIRReference]] = None
    locationCode: Optional[List[FHIRCodeableConcept]] = None
    locationReference: Optional[List[FHIRReference]] = None
    reasonCode: Optional[List[FHIRCodeableConcept]] = None
    reasonReference: Optional[List[FHIRReference]] = None
    insurance: Optional[List[FHIRReference]] = None
    supportingInfo: Optional[List[FHIRReference]] = None
    specimen: Optional[List[FHIRReference]] = None
    bodySite: Optional[List[FHIRCodeableConcept]] = None
    note: Optional[List[Dict[str, Any]]] = None
    relevantHistory: Optional[List[FHIRReference]] = None
    basedOn: Optional[List[FHIRReference]] = None
    replaces: Optional[List[FHIRReference]] = None


class FHIRServiceRequestBundleEntry(FHIRBundleEntry):
    resource: Optional[FHIRServiceRequestSchema] = None


class FHIRServiceRequestBundle(FHIRBundle):
    entry: Optional[List[FHIRServiceRequestBundleEntry]] = None


# ── Plain (snake_case) schemas ──────────────────────────────────────────────────


class PlainServiceRequestIdentifier(BaseModel):
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


class PlainServiceRequestCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestOrderDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestPerformer(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestLocationCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestLocationReference(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestReasonCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestReasonReference(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestInsurance(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestSupportingInfo(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestSpecimen(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestBodySite(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainServiceRequestRelevantHistory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestBasedOn(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestReplaces(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: str
    intent: str
    priority: Optional[str] = None
    do_not_perform: Optional[bool] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    occurrence_datetime: Optional[str] = None
    occurrence_period_start: Optional[str] = None
    occurrence_period_end: Optional[str] = None
    occurrence_timing_frequency: Optional[int] = None
    occurrence_timing_period: Optional[float] = None
    occurrence_timing_period_unit: Optional[str] = None
    occurrence_timing_bounds_start: Optional[str] = None
    occurrence_timing_bounds_end: Optional[str] = None
    as_needed_boolean: Optional[bool] = None
    as_needed_system: Optional[str] = None
    as_needed_code: Optional[str] = None
    as_needed_display: Optional[str] = None
    as_needed_text: Optional[str] = None
    authored_on: Optional[str] = None
    requester_type: Optional[str] = None
    requester_id: Optional[int] = None
    requester_display: Optional[str] = None
    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    quantity_ratio_numerator_value: Optional[float] = None
    quantity_ratio_numerator_unit: Optional[str] = None
    quantity_ratio_denominator_value: Optional[float] = None
    quantity_ratio_denominator_unit: Optional[str] = None
    quantity_range_low_value: Optional[float] = None
    quantity_range_low_unit: Optional[str] = None
    quantity_range_high_value: Optional[float] = None
    quantity_range_high_unit: Optional[str] = None
    requisition_use: Optional[str] = None
    requisition_type_system: Optional[str] = None
    requisition_type_code: Optional[str] = None
    requisition_type_display: Optional[str] = None
    requisition_type_text: Optional[str] = None
    requisition_system: Optional[str] = None
    requisition_value: Optional[str] = None
    requisition_period_start: Optional[str] = None
    requisition_period_end: Optional[str] = None
    requisition_assigner: Optional[str] = None
    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    patient_instruction: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainServiceRequestIdentifier]] = None
    category: Optional[List[PlainServiceRequestCategory]] = None
    order_detail: Optional[List[PlainServiceRequestOrderDetail]] = None
    performer: Optional[List[PlainServiceRequestPerformer]] = None
    location_code: Optional[List[PlainServiceRequestLocationCode]] = None
    location_reference: Optional[List[PlainServiceRequestLocationReference]] = None
    reason_code: Optional[List[PlainServiceRequestReasonCode]] = None
    reason_reference: Optional[List[PlainServiceRequestReasonReference]] = None
    insurance: Optional[List[PlainServiceRequestInsurance]] = None
    supporting_info: Optional[List[PlainServiceRequestSupportingInfo]] = None
    specimen: Optional[List[PlainServiceRequestSpecimen]] = None
    body_site: Optional[List[PlainServiceRequestBodySite]] = None
    note: Optional[List[PlainServiceRequestNote]] = None
    relevant_history: Optional[List[PlainServiceRequestRelevantHistory]] = None
    based_on: Optional[List[PlainServiceRequestBasedOn]] = None
    replaces: Optional[List[PlainServiceRequestReplaces]] = None


class PaginatedServiceRequestResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    total: int
    limit: int
    offset: int
    data: List[PlainServiceRequestResponse]
