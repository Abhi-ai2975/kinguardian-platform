from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DeviceRequestIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class DeviceRequestBasedOnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Any FHIR resource reference e.g. 'CarePlan/10001'.")
    reference_display: Optional[str] = None


class DeviceRequestPriorRequestInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Any FHIR resource reference e.g. 'DeviceRequest/130001'.")
    reference_display: Optional[str] = None


class DeviceRequestParameterInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # code (CodeableConcept)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    # value[x] — send exactly one
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


class DeviceRequestReasonCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DeviceRequestReasonReferenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Condition/120001' or 'Observation/160001'.",
    )
    reference_display: Optional[str] = None


class DeviceRequestInsuranceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Coverage/10001' or 'ClaimResponse/180001'.",
    )
    reference_display: Optional[str] = None


class DeviceRequestSupportingInfoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Any FHIR resource reference e.g. 'Observation/160001'.")
    reference_display: Optional[str] = None


class DeviceRequestNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(..., description="Annotation text (markdown).")
    time: Optional[datetime] = None
    author_string: Optional[str] = Field(None, description="Author as plain text name.")
    author_reference: Optional[str] = Field(
        None,
        description="Author as FHIR reference e.g. 'Practitioner/30001'.",
    )
    author_reference_display: Optional[str] = None


class DeviceRequestRelevantHistoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to a Provenance record e.g. 'Provenance/10001'.")
    reference_display: Optional[str] = None


# ── Create / Patch ──────────────────────────────────────────────────────────────


class DeviceRequestCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "intent": "order",
                "status": "active",
                "priority": "routine",
                "code_reference": "Device/10001",
                "subject": "Patient/10001",
                "encounter_id": 20001,
                "authored_on": "2026-05-17T10:00:00Z",
                "requester": "Practitioner/30001",
                "note": [{"text": "Please expedite this request."}],
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # Required
    intent: str = Field(..., description="proposal|plan|directive|order|original-order|reflex-order|filler-order|instance-order|option")

    # Classification
    status: Optional[str] = Field(None, description="draft|active|on-hold|revoked|completed|entered-in-error|unknown")
    priority: Optional[str] = Field(None, description="routine|urgent|asap|stat")

    # code[x] — exactly one of code_reference or code_concept_* expected
    code_reference: Optional[str] = Field(None, description="FHIR reference to Device e.g. 'Device/10001'.")
    code_reference_display: Optional[str] = None
    code_concept_system: Optional[str] = None
    code_concept_code: Optional[str] = None
    code_concept_display: Optional[str] = None
    code_concept_text: Optional[str] = None

    # subject
    subject: Optional[str] = Field(None, description="FHIR reference e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    # encounter
    encounter_id: Optional[int] = Field(None, description="Public encounter_id.")
    encounter_display: Optional[str] = None

    # occurrence[x]
    occurrence_datetime: Optional[datetime] = None
    occurrence_period_start: Optional[datetime] = None
    occurrence_period_end: Optional[datetime] = None
    occurrence_timing_code_system: Optional[str] = None
    occurrence_timing_code_code: Optional[str] = None
    occurrence_timing_code_display: Optional[str] = None
    occurrence_timing_bounds_start: Optional[datetime] = None
    occurrence_timing_bounds_end: Optional[datetime] = None
    occurrence_timing_count: Optional[int] = None
    occurrence_timing_count_max: Optional[int] = None
    occurrence_timing_duration: Optional[float] = None
    occurrence_timing_duration_max: Optional[float] = None
    occurrence_timing_duration_unit: Optional[str] = Field(None, description="s|min|h|d|wk|mo|a")
    occurrence_timing_frequency: Optional[int] = None
    occurrence_timing_frequency_max: Optional[int] = None
    occurrence_timing_period: Optional[float] = None
    occurrence_timing_period_max: Optional[float] = None
    occurrence_timing_period_unit: Optional[str] = Field(None, description="s|min|h|d|wk|mo|a")
    occurrence_timing_day_of_week: Optional[str] = Field(None, description="Comma-separated: mon|tue|wed|thu|fri|sat|sun")
    occurrence_timing_time_of_day: Optional[str] = Field(None, description="Comma-separated HH:MM times.")
    occurrence_timing_when: Optional[str] = Field(None, description="Comma-separated EventTiming codes.")
    occurrence_timing_offset: Optional[int] = None

    # authored / requester / performer
    authored_on: Optional[datetime] = None
    requester: Optional[str] = Field(None, description="FHIR reference e.g. 'Practitioner/30001'.")
    requester_display: Optional[str] = None

    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None

    performer_reference: Optional[str] = Field(None, description="FHIR reference e.g. 'Practitioner/30001'.")
    performer_reference_display: Optional[str] = None

    # groupIdentifier (full Identifier datatype)
    group_identifier_use: Optional[str] = None
    group_identifier_type_system: Optional[str] = None
    group_identifier_type_code: Optional[str] = None
    group_identifier_type_display: Optional[str] = None
    group_identifier_type_text: Optional[str] = None
    group_identifier_system: Optional[str] = None
    group_identifier_value: Optional[str] = None
    group_identifier_period_start: Optional[datetime] = None
    group_identifier_period_end: Optional[datetime] = None
    group_identifier_assigner: Optional[str] = None

    # instantiates
    instantiates_canonical: Optional[str] = Field(None, description="Comma-separated canonical URIs.")
    instantiates_uri: Optional[str] = Field(None, description="Comma-separated URIs.")

    # child arrays
    identifier: Optional[List[DeviceRequestIdentifierInput]] = None
    based_on: Optional[List[DeviceRequestBasedOnInput]] = None
    prior_request: Optional[List[DeviceRequestPriorRequestInput]] = None
    parameter: Optional[List[DeviceRequestParameterInput]] = None
    reason_code: Optional[List[DeviceRequestReasonCodeInput]] = None
    reason_reference: Optional[List[DeviceRequestReasonReferenceInput]] = None
    insurance: Optional[List[DeviceRequestInsuranceInput]] = None
    supporting_info: Optional[List[DeviceRequestSupportingInfoInput]] = None
    note: Optional[List[DeviceRequestNoteInput]] = None
    relevant_history: Optional[List[DeviceRequestRelevantHistoryInput]] = None


class DeviceRequestPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    intent: Optional[str] = None
    priority: Optional[str] = None

    code_reference_display: Optional[str] = None
    code_concept_system: Optional[str] = None
    code_concept_code: Optional[str] = None
    code_concept_display: Optional[str] = None
    code_concept_text: Optional[str] = None

    subject_display: Optional[str] = None
    encounter_display: Optional[str] = None

    occurrence_datetime: Optional[datetime] = None
    occurrence_period_start: Optional[datetime] = None
    occurrence_period_end: Optional[datetime] = None
    occurrence_timing_code_system: Optional[str] = None
    occurrence_timing_code_code: Optional[str] = None
    occurrence_timing_code_display: Optional[str] = None
    occurrence_timing_bounds_start: Optional[datetime] = None
    occurrence_timing_bounds_end: Optional[datetime] = None
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

    authored_on: Optional[datetime] = None
    requester_display: Optional[str] = None

    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None
    performer_reference_display: Optional[str] = None

    group_identifier_use: Optional[str] = None
    group_identifier_type_system: Optional[str] = None
    group_identifier_type_code: Optional[str] = None
    group_identifier_type_display: Optional[str] = None
    group_identifier_type_text: Optional[str] = None
    group_identifier_system: Optional[str] = None
    group_identifier_value: Optional[str] = None
    group_identifier_period_start: Optional[datetime] = None
    group_identifier_period_end: Optional[datetime] = None
    group_identifier_assigner: Optional[str] = None

    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    updated_by: Optional[str] = None
