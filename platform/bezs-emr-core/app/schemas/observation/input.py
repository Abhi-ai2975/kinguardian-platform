from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Shared value[x] mixin fields (reused by Observation and Component) ─────────

class _ValueXFields(BaseModel):
    """value[x] fields shared by both ObservationCreateSchema and ObservationComponentInput."""
    # Quantity
    value_quantity_value: Optional[float] = None
    value_quantity_comparator: Optional[str] = Field(None, description="<|<=|>=|>")
    value_quantity_unit: Optional[str] = None
    value_quantity_system: Optional[str] = None
    value_quantity_code: Optional[str] = None
    # CodeableConcept
    value_codeable_concept_system: Optional[str] = None
    value_codeable_concept_code: Optional[str] = None
    value_codeable_concept_display: Optional[str] = None
    value_codeable_concept_text: Optional[str] = None
    # Primitives
    value_string: Optional[str] = None
    value_boolean: Optional[bool] = None
    value_integer: Optional[int] = None
    value_time: Optional[str] = Field(None, description="HH:mm:ss")
    value_date_time: Optional[datetime] = None
    # Period
    value_period_start: Optional[datetime] = None
    value_period_end: Optional[datetime] = None
    # Range
    value_range_low_value: Optional[float] = None
    value_range_low_unit: Optional[str] = None
    value_range_low_system: Optional[str] = None
    value_range_low_code: Optional[str] = None
    value_range_high_value: Optional[float] = None
    value_range_high_unit: Optional[str] = None
    value_range_high_system: Optional[str] = None
    value_range_high_code: Optional[str] = None
    # Ratio
    value_ratio_numerator_value: Optional[float] = None
    value_ratio_numerator_comparator: Optional[str] = None
    value_ratio_numerator_unit: Optional[str] = None
    value_ratio_numerator_system: Optional[str] = None
    value_ratio_numerator_code: Optional[str] = None
    value_ratio_denominator_value: Optional[float] = None
    value_ratio_denominator_comparator: Optional[str] = None
    value_ratio_denominator_unit: Optional[str] = None
    value_ratio_denominator_system: Optional[str] = None
    value_ratio_denominator_code: Optional[str] = None
    # SampledData
    value_sampled_data_origin_value: Optional[float] = None
    value_sampled_data_origin_unit: Optional[str] = None
    value_sampled_data_origin_system: Optional[str] = None
    value_sampled_data_origin_code: Optional[str] = None
    value_sampled_data_period: Optional[float] = None
    value_sampled_data_factor: Optional[float] = None
    value_sampled_data_lower_limit: Optional[float] = None
    value_sampled_data_upper_limit: Optional[float] = None
    value_sampled_data_dimensions: Optional[int] = None
    value_sampled_data_data: Optional[str] = None


# ── Sub-input schemas ───────────────────────────────────────────────────────────


class ObservationIdentifierInput(BaseModel):
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


class ObservationBasedOnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="Reference to CarePlan|DeviceRequest|ImmunizationRecommendation|MedicationRequest|NutritionOrder|ServiceRequest.",
    )
    reference_display: Optional[str] = None


class ObservationPartOfInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="Reference to MedicationAdministration|MedicationDispense|MedicationStatement|Procedure|Immunization|ImagingStudy.",
    )
    reference_display: Optional[str] = None


class ObservationCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ObservationFocusInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Open FHIR reference e.g. 'Condition/120001'.")
    reference_display: Optional[str] = None


class ObservationPerformerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="Reference to Practitioner|PractitionerRole|Organization|CareTeam|Patient|RelatedPerson.",
    )
    reference_display: Optional[str] = None


class ObservationInterpretationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ObservationNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(
        None, description="Open reference e.g. 'Practitioner/30001'."
    )


class ObservationAppliesToInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ObservationReferenceRangeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    low_value: Optional[float] = None
    low_unit: Optional[str] = None
    low_system: Optional[str] = None
    low_code: Optional[str] = None
    high_value: Optional[float] = None
    high_unit: Optional[str] = None
    high_system: Optional[str] = None
    high_code: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    age_low_value: Optional[float] = None
    age_low_unit: Optional[str] = None
    age_low_system: Optional[str] = None
    age_low_code: Optional[str] = None
    age_high_value: Optional[float] = None
    age_high_unit: Optional[str] = None
    age_high_system: Optional[str] = None
    age_high_code: Optional[str] = None
    text: Optional[str] = None
    applies_to: Optional[List[ObservationAppliesToInput]] = None


class ObservationHasMemberInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ..., description="Reference to Observation|QuestionnaireResponse|MolecularSequence."
    )
    reference_display: Optional[str] = None


class ObservationDerivedFromInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="Reference to DocumentReference|ImagingStudy|Media|QuestionnaireResponse|Observation|MolecularSequence.",
    )
    reference_display: Optional[str] = None


class ObservationComponentInput(_ValueXFields):
    model_config = ConfigDict(extra="forbid")
    # code (1..1)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    # dataAbsentReason
    data_absent_reason_system: Optional[str] = None
    data_absent_reason_code: Optional[str] = None
    data_absent_reason_display: Optional[str] = None
    data_absent_reason_text: Optional[str] = None
    interpretation: Optional[List[ObservationInterpretationInput]] = None
    reference_range: Optional[List[ObservationReferenceRangeInput]] = None


# ── Create / Patch ──────────────────────────────────────────────────────────────


class ObservationCreateSchema(_ValueXFields):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "status": "final",
                "code_system": "http://loinc.org",
                "code_code": "8867-4",
                "code_display": "Heart rate",
                "subject": "Patient/10001",
                "encounter_id": 20001,
                "effective_date_time": "2026-05-17T09:00:00Z",
                "value_quantity_value": 72,
                "value_quantity_unit": "beats/minute",
                "value_quantity_system": "http://unitsofmeasure.org",
                "value_quantity_code": "/min",
                "category": [
                    {
                        "coding_system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "coding_code": "vital-signs",
                        "coding_display": "Vital Signs",
                    }
                ],
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # Required
    status: str = Field(
        ...,
        description="registered|preliminary|final|amended|corrected|cancelled|entered-in-error|unknown",
    )

    # code (1..1)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    # subject
    subject: Optional[str] = Field(None, description="Reference e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    # encounter
    encounter_id: Optional[int] = Field(None, description="Public encounter_id.")
    encounter_display: Optional[str] = None

    # effective[x]
    effective_date_time: Optional[datetime] = None
    effective_period_start: Optional[datetime] = None
    effective_period_end: Optional[datetime] = None
    effective_instant: Optional[datetime] = None
    # Timing variant
    effective_timing_event: Optional[str] = Field(None, description="Comma-separated ISO datetimes.")
    effective_timing_code_system: Optional[str] = None
    effective_timing_code_code: Optional[str] = None
    effective_timing_code_display: Optional[str] = None
    effective_timing_code_text: Optional[str] = None
    effective_timing_repeat_bounds_duration_value: Optional[float] = None
    effective_timing_repeat_bounds_duration_comparator: Optional[str] = None
    effective_timing_repeat_bounds_duration_unit: Optional[str] = None
    effective_timing_repeat_bounds_duration_system: Optional[str] = None
    effective_timing_repeat_bounds_duration_code: Optional[str] = None
    effective_timing_repeat_bounds_range_low_value: Optional[float] = None
    effective_timing_repeat_bounds_range_low_unit: Optional[str] = None
    effective_timing_repeat_bounds_range_low_system: Optional[str] = None
    effective_timing_repeat_bounds_range_low_code: Optional[str] = None
    effective_timing_repeat_bounds_range_high_value: Optional[float] = None
    effective_timing_repeat_bounds_range_high_unit: Optional[str] = None
    effective_timing_repeat_bounds_range_high_system: Optional[str] = None
    effective_timing_repeat_bounds_range_high_code: Optional[str] = None
    effective_timing_repeat_bounds_period_start: Optional[datetime] = None
    effective_timing_repeat_bounds_period_end: Optional[datetime] = None
    effective_timing_repeat_count: Optional[int] = None
    effective_timing_repeat_count_max: Optional[int] = None
    effective_timing_repeat_duration: Optional[float] = None
    effective_timing_repeat_duration_max: Optional[float] = None
    effective_timing_repeat_duration_unit: Optional[str] = None
    effective_timing_repeat_frequency: Optional[int] = None
    effective_timing_repeat_frequency_max: Optional[int] = None
    effective_timing_repeat_period: Optional[float] = None
    effective_timing_repeat_period_max: Optional[float] = None
    effective_timing_repeat_period_unit: Optional[str] = None
    effective_timing_repeat_day_of_week: Optional[str] = Field(None, description="Comma-separated e.g. 'mon,wed,fri'.")
    effective_timing_repeat_time_of_day: Optional[str] = Field(None, description="Comma-separated HH:MM.")
    effective_timing_repeat_when: Optional[str] = Field(None, description="Comma-separated event codes.")
    effective_timing_repeat_offset: Optional[int] = None

    issued: Optional[datetime] = None

    # dataAbsentReason
    data_absent_reason_system: Optional[str] = None
    data_absent_reason_code: Optional[str] = None
    data_absent_reason_display: Optional[str] = None
    data_absent_reason_text: Optional[str] = None

    # bodySite
    body_site_system: Optional[str] = None
    body_site_code: Optional[str] = None
    body_site_display: Optional[str] = None
    body_site_text: Optional[str] = None

    # method
    method_system: Optional[str] = None
    method_code: Optional[str] = None
    method_display: Optional[str] = None
    method_text: Optional[str] = None

    # specimen (0..1)
    specimen: Optional[str] = Field(None, description="Reference to Specimen e.g. 'Specimen/10001'.")
    specimen_display: Optional[str] = None

    # device (0..1)
    device: Optional[str] = Field(None, description="Reference to Device|DeviceMetric e.g. 'Device/10001'.")
    device_display: Optional[str] = None

    # child arrays
    identifier: Optional[List[ObservationIdentifierInput]] = None
    based_on: Optional[List[ObservationBasedOnInput]] = None
    part_of: Optional[List[ObservationPartOfInput]] = None
    category: Optional[List[ObservationCategoryInput]] = None
    focus: Optional[List[ObservationFocusInput]] = None
    performer: Optional[List[ObservationPerformerInput]] = None
    interpretation: Optional[List[ObservationInterpretationInput]] = None
    note: Optional[List[ObservationNoteInput]] = None
    reference_range: Optional[List[ObservationReferenceRangeInput]] = None
    has_member: Optional[List[ObservationHasMemberInput]] = None
    derived_from: Optional[List[ObservationDerivedFromInput]] = None
    component: Optional[List[ObservationComponentInput]] = None


class ObservationPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    subject_display: Optional[str] = None
    encounter_display: Optional[str] = None
    effective_date_time: Optional[datetime] = None
    effective_period_start: Optional[datetime] = None
    effective_period_end: Optional[datetime] = None
    effective_instant: Optional[datetime] = None
    issued: Optional[datetime] = None
    value_quantity_value: Optional[float] = None
    value_quantity_comparator: Optional[str] = None
    value_quantity_unit: Optional[str] = None
    value_quantity_system: Optional[str] = None
    value_quantity_code: Optional[str] = None
    value_codeable_concept_system: Optional[str] = None
    value_codeable_concept_code: Optional[str] = None
    value_codeable_concept_display: Optional[str] = None
    value_codeable_concept_text: Optional[str] = None
    value_string: Optional[str] = None
    value_boolean: Optional[bool] = None
    value_integer: Optional[int] = None
    value_time: Optional[str] = None
    value_date_time: Optional[datetime] = None
    value_period_start: Optional[datetime] = None
    value_period_end: Optional[datetime] = None
    data_absent_reason_system: Optional[str] = None
    data_absent_reason_code: Optional[str] = None
    data_absent_reason_display: Optional[str] = None
    data_absent_reason_text: Optional[str] = None
    body_site_system: Optional[str] = None
    body_site_code: Optional[str] = None
    body_site_display: Optional[str] = None
    body_site_text: Optional[str] = None
    method_system: Optional[str] = None
    method_code: Optional[str] = None
    method_display: Optional[str] = None
    method_text: Optional[str] = None
    specimen_display: Optional[str] = None
    device_display: Optional[str] = None
    updated_by: Optional[str] = None
