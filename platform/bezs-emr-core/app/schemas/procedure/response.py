from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRBundleEntry,
    FHIRCodeableConcept,
    FHIRReference,
)


# ── FHIR (camelCase) response schemas ─────────────────────────────────────────


class FHIRProcedurePerformer(BaseModel):
    function: Optional[FHIRCodeableConcept] = None
    actor: Optional[FHIRReference] = None
    onBehalfOf: Optional[FHIRReference] = None


class FHIRProcedureFocalDevice(BaseModel):
    action: Optional[FHIRCodeableConcept] = None
    manipulated: Optional[FHIRReference] = None


class FHIRProcedureSchema(BaseModel):
    resourceType: str = Field("Procedure", description="Always 'Procedure'.")
    id: str = Field(..., description="Public procedure_id as a string.")
    status: str
    statusReason: Optional[FHIRCodeableConcept] = None
    category: Optional[FHIRCodeableConcept] = None
    code: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    # performed[x]
    performedDateTime: Optional[str] = None
    performedPeriod: Optional[Dict[str, Any]] = None
    performedString: Optional[str] = None
    performedAge: Optional[Dict[str, Any]] = None
    performedRange: Optional[Dict[str, Any]] = None
    recorder: Optional[FHIRReference] = None
    asserter: Optional[FHIRReference] = None
    performer: Optional[List[FHIRProcedurePerformer]] = None
    location: Optional[FHIRReference] = None
    reasonCode: Optional[List[FHIRCodeableConcept]] = None
    reasonReference: Optional[List[FHIRReference]] = None
    bodySite: Optional[List[FHIRCodeableConcept]] = None
    outcome: Optional[FHIRCodeableConcept] = None
    report: Optional[List[FHIRReference]] = None
    complication: Optional[List[FHIRCodeableConcept]] = None
    complicationDetail: Optional[List[FHIRReference]] = None
    followUp: Optional[List[FHIRCodeableConcept]] = None
    note: Optional[List[Dict[str, Any]]] = None
    focalDevice: Optional[List[FHIRProcedureFocalDevice]] = None
    usedReference: Optional[List[FHIRReference]] = None
    usedCode: Optional[List[FHIRCodeableConcept]] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    basedOn: Optional[List[FHIRReference]] = None
    partOf: Optional[List[FHIRReference]] = None
    identifier: Optional[List[Dict[str, Any]]] = None


class FHIRProcedureBundleEntry(BaseModel):
    resource: FHIRProcedureSchema


class FHIRProcedureBundle(FHIRBundle):
    entry: Optional[List[FHIRProcedureBundleEntry]] = None


# ── Plain (snake_case) response schemas ───────────────────────────────────────


class PlainProcedureIdentifier(BaseModel):
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


class PlainProcedureBasedOn(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainProcedurePartOf(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainProcedurePerformer(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    function_system: Optional[str] = None
    function_code: Optional[str] = None
    function_display: Optional[str] = None
    function_text: Optional[str] = None
    actor_type: Optional[str] = None
    actor_id: Optional[int] = None
    actor_display: Optional[str] = None
    on_behalf_of_type: Optional[str] = None
    on_behalf_of_id: Optional[int] = None
    on_behalf_of_display: Optional[str] = None


class PlainProcedureReasonCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainProcedureReasonReference(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainProcedureBodySite(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainProcedureReport(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainProcedureComplication(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainProcedureComplicationDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainProcedureFollowUp(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainProcedureNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: Optional[str] = None
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainProcedureFocalDevice(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    action_system: Optional[str] = None
    action_code: Optional[str] = None
    action_display: Optional[str] = None
    action_text: Optional[str] = None
    manipulated_reference_type: Optional[str] = None
    manipulated_reference_id: Optional[int] = None
    manipulated_reference_display: Optional[str] = None


class PlainProcedureUsedReference(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainProcedureUsedCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainProcedureResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    status: Optional[str] = None
    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_type: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    performed_datetime: Optional[str] = None
    performed_period_start: Optional[str] = None
    performed_period_end: Optional[str] = None
    performed_string: Optional[str] = None
    performed_age_value: Optional[float] = None
    performed_age_unit: Optional[str] = None
    performed_age_system: Optional[str] = None
    performed_age_code: Optional[str] = None
    performed_range_low_value: Optional[float] = None
    performed_range_low_unit: Optional[str] = None
    performed_range_high_value: Optional[float] = None
    performed_range_high_unit: Optional[str] = None
    recorder_type: Optional[str] = None
    recorder_id: Optional[int] = None
    recorder_display: Optional[str] = None
    asserter_type: Optional[str] = None
    asserter_id: Optional[int] = None
    asserter_display: Optional[str] = None
    location_type: Optional[str] = None
    location_reference_id: Optional[int] = None
    location_display: Optional[str] = None
    outcome_system: Optional[str] = None
    outcome_code: Optional[str] = None
    outcome_display: Optional[str] = None
    outcome_text: Optional[str] = None
    instantiates_canonical: Optional[List[str]] = None
    instantiates_uri: Optional[List[str]] = None
    identifier: Optional[List[PlainProcedureIdentifier]] = None
    based_on: Optional[List[PlainProcedureBasedOn]] = None
    part_of: Optional[List[PlainProcedurePartOf]] = None
    performer: Optional[List[PlainProcedurePerformer]] = None
    reason_code: Optional[List[PlainProcedureReasonCode]] = None
    reason_reference: Optional[List[PlainProcedureReasonReference]] = None
    body_site: Optional[List[PlainProcedureBodySite]] = None
    report: Optional[List[PlainProcedureReport]] = None
    complication: Optional[List[PlainProcedureComplication]] = None
    complication_detail: Optional[List[PlainProcedureComplicationDetail]] = None
    follow_up: Optional[List[PlainProcedureFollowUp]] = None
    note: Optional[List[PlainProcedureNote]] = None
    focal_device: Optional[List[PlainProcedureFocalDevice]] = None
    used_reference: Optional[List[PlainProcedureUsedReference]] = None
    used_code: Optional[List[PlainProcedureUsedCode]] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedProcedureResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainProcedureResponse]
