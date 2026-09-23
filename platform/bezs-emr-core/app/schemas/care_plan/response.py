from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import FHIRBundle, FHIRCodeableConcept, FHIRReference


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRCarePlanNote(BaseModel):
    text: str
    time: Optional[str] = None
    authorString: Optional[str] = None
    authorReference: Optional[FHIRReference] = None


class FHIRCarePlanActivityDetail(BaseModel):
    kind: Optional[str] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    code: Optional[FHIRCodeableConcept] = None
    reasonCode: Optional[List[FHIRCodeableConcept]] = None
    reasonReference: Optional[List[FHIRReference]] = None
    goal: Optional[List[FHIRReference]] = None
    status: Optional[str] = None
    statusReason: Optional[FHIRCodeableConcept] = None
    doNotPerform: Optional[bool] = None
    scheduledTiming: Optional[Dict[str, Any]] = None
    scheduledPeriod: Optional[Dict[str, Any]] = None
    scheduledString: Optional[str] = None
    location: Optional[FHIRReference] = None
    performer: Optional[List[FHIRReference]] = None
    productCodeableConcept: Optional[FHIRCodeableConcept] = None
    productReference: Optional[FHIRReference] = None
    dailyAmount: Optional[Dict[str, Any]] = None
    quantity: Optional[Dict[str, Any]] = None
    description: Optional[str] = None


class FHIRCarePlanActivity(BaseModel):
    outcomeCodeableConcept: Optional[List[FHIRCodeableConcept]] = None
    outcomeReference: Optional[List[FHIRReference]] = None
    progress: Optional[List[FHIRCarePlanNote]] = None
    reference: Optional[FHIRReference] = None
    detail: Optional[FHIRCarePlanActivityDetail] = None


class FHIRCarePlanSchema(BaseModel):
    resourceType: str = Field("CarePlan", description="Always 'CarePlan'.")
    id: str
    identifier: Optional[List[Dict[str, Any]]] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    basedOn: Optional[List[FHIRReference]] = None
    replaces: Optional[List[FHIRReference]] = None
    partOf: Optional[List[FHIRReference]] = None
    status: str
    intent: str
    category: Optional[List[FHIRCodeableConcept]] = None
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    period: Optional[Dict[str, Any]] = None
    created: Optional[str] = None
    author: Optional[FHIRReference] = None
    contributor: Optional[List[FHIRReference]] = None
    careTeam: Optional[List[FHIRReference]] = None
    addresses: Optional[List[FHIRReference]] = None
    supportingInfo: Optional[List[FHIRReference]] = None
    goal: Optional[List[FHIRReference]] = None
    activity: Optional[List[FHIRCarePlanActivity]] = None
    note: Optional[List[FHIRCarePlanNote]] = None

    model_config = ConfigDict(populate_by_name=True)


class FHIRCarePlanBundleEntry(BaseModel):
    resource: FHIRCarePlanSchema


class FHIRCarePlanBundle(FHIRBundle):
    entry: Optional[List[FHIRCarePlanBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainCarePlanIdentifier(BaseModel):
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


class PlainCarePlanRef(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainCarePlanCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainCarePlanNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainCarePlanActivityOutcomeCC(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainCarePlanActivityOutcomeRef(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainCarePlanActivityProgress(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainCarePlanActivityDetailReasonCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainCarePlanActivityDetailReasonRef(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainCarePlanActivityDetailGoal(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainCarePlanActivityDetailPerformer(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainCarePlanActivity(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None
    detail_kind: Optional[str] = None
    detail_instantiates_canonical: Optional[str] = None
    detail_instantiates_uri: Optional[str] = None
    detail_code_system: Optional[str] = None
    detail_code_code: Optional[str] = None
    detail_code_display: Optional[str] = None
    detail_code_text: Optional[str] = None
    detail_status: Optional[str] = None
    detail_status_reason_system: Optional[str] = None
    detail_status_reason_code: Optional[str] = None
    detail_status_reason_display: Optional[str] = None
    detail_status_reason_text: Optional[str] = None
    detail_do_not_perform: Optional[bool] = None
    detail_scheduled_timing_event: Optional[str] = None
    detail_scheduled_timing_code_system: Optional[str] = None
    detail_scheduled_timing_code_code: Optional[str] = None
    detail_scheduled_timing_code_display: Optional[str] = None
    detail_scheduled_timing_code_text: Optional[str] = None
    detail_scheduled_timing_repeat_count: Optional[int] = None
    detail_scheduled_timing_repeat_count_max: Optional[int] = None
    detail_scheduled_timing_repeat_duration: Optional[float] = None
    detail_scheduled_timing_repeat_duration_max: Optional[float] = None
    detail_scheduled_timing_repeat_duration_unit: Optional[str] = None
    detail_scheduled_timing_repeat_frequency: Optional[int] = None
    detail_scheduled_timing_repeat_frequency_max: Optional[int] = None
    detail_scheduled_timing_repeat_period: Optional[float] = None
    detail_scheduled_timing_repeat_period_max: Optional[float] = None
    detail_scheduled_timing_repeat_period_unit: Optional[str] = None
    detail_scheduled_timing_repeat_day_of_week: Optional[str] = None
    detail_scheduled_timing_repeat_time_of_day: Optional[str] = None
    detail_scheduled_timing_repeat_when: Optional[str] = None
    detail_scheduled_timing_repeat_offset: Optional[int] = None
    detail_scheduled_timing_repeat_bounds_start: Optional[str] = None
    detail_scheduled_timing_repeat_bounds_end: Optional[str] = None
    detail_scheduled_period_start: Optional[str] = None
    detail_scheduled_period_end: Optional[str] = None
    detail_scheduled_string: Optional[str] = None
    detail_location_type: Optional[str] = None
    detail_location_id: Optional[int] = None
    detail_location_display: Optional[str] = None
    detail_product_codeable_concept_system: Optional[str] = None
    detail_product_codeable_concept_code: Optional[str] = None
    detail_product_codeable_concept_display: Optional[str] = None
    detail_product_codeable_concept_text: Optional[str] = None
    detail_product_reference_type: Optional[str] = None
    detail_product_reference_id: Optional[int] = None
    detail_product_reference_display: Optional[str] = None
    detail_daily_amount_value: Optional[float] = None
    detail_daily_amount_unit: Optional[str] = None
    detail_daily_amount_system: Optional[str] = None
    detail_daily_amount_code: Optional[str] = None
    detail_quantity_value: Optional[float] = None
    detail_quantity_unit: Optional[str] = None
    detail_quantity_system: Optional[str] = None
    detail_quantity_code: Optional[str] = None
    detail_description: Optional[str] = None
    outcome_codeable_concepts: Optional[List[PlainCarePlanActivityOutcomeCC]] = None
    outcome_references: Optional[List[PlainCarePlanActivityOutcomeRef]] = None
    progress: Optional[List[PlainCarePlanActivityProgress]] = None
    detail_reason_codes: Optional[List[PlainCarePlanActivityDetailReasonCode]] = None
    detail_reason_references: Optional[List[PlainCarePlanActivityDetailReasonRef]] = None
    detail_goals: Optional[List[PlainCarePlanActivityDetailGoal]] = None
    detail_performers: Optional[List[PlainCarePlanActivityDetailPerformer]] = None


class PlainCarePlanResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    status: Optional[str] = None
    intent: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_type: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    created: Optional[str] = None
    author_type: Optional[str] = None
    author_id: Optional[int] = None
    author_display: Optional[str] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifiers: Optional[List[PlainCarePlanIdentifier]] = None
    based_on: Optional[List[PlainCarePlanRef]] = None
    replaces: Optional[List[PlainCarePlanRef]] = None
    part_of: Optional[List[PlainCarePlanRef]] = None
    categories: Optional[List[PlainCarePlanCategory]] = None
    contributors: Optional[List[PlainCarePlanRef]] = None
    care_teams: Optional[List[PlainCarePlanRef]] = None
    addresses: Optional[List[PlainCarePlanRef]] = None
    supporting_info: Optional[List[PlainCarePlanRef]] = None
    goals: Optional[List[PlainCarePlanRef]] = None
    activities: Optional[List[PlainCarePlanActivity]] = None
    notes: Optional[List[PlainCarePlanNote]] = None


class PaginatedCarePlanResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainCarePlanResponse]
