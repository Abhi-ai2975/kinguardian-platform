"""
Response schemas for Observation resources.

Mirrors the fhir-server PlainObservation* shapes exactly.
`extra="allow"` on every schema ensures forward-compatibility.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ── Plain sub-resource response schemas ───────────────────────────────────────


class PlainObservationIdentifier(BaseModel):
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


class PlainObservationBasedOn(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainObservationPartOf(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainObservationCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainObservationFocus(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainObservationPerformer(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainObservationInterpretation(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainObservationNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: Optional[str] = None
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainObservationAppliesTo(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainObservationReferenceRange(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
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
    applies_to: Optional[List[PlainObservationAppliesTo]] = None


class PlainObservationHasMember(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainObservationDerivedFrom(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainObservationComponentInterpretation(BaseModel):
    """Interpretation within a component sub-observation."""

    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainObservationComponentReferenceRangeAppliesTo(BaseModel):
    """Population appliesTo within a component referenceRange."""

    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainObservationComponentReferenceRange(BaseModel):
    """Reference range within a component sub-observation."""

    model_config = ConfigDict(extra="allow")
    id: int
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
    applies_to: Optional[List[PlainObservationComponentReferenceRangeAppliesTo]] = None


class PlainObservationComponent(BaseModel):
    """Component sub-result within a panel / multi-component observation."""

    model_config = ConfigDict(extra="allow")
    id: int
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
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
    value_date_time: Optional[str] = None
    value_period_start: Optional[str] = None
    value_period_end: Optional[str] = None
    value_range_low_value: Optional[float] = None
    value_range_low_unit: Optional[str] = None
    value_range_low_system: Optional[str] = None
    value_range_low_code: Optional[str] = None
    value_range_high_value: Optional[float] = None
    value_range_high_unit: Optional[str] = None
    value_range_high_system: Optional[str] = None
    value_range_high_code: Optional[str] = None
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
    data_absent_reason_system: Optional[str] = None
    data_absent_reason_code: Optional[str] = None
    data_absent_reason_display: Optional[str] = None
    data_absent_reason_text: Optional[str] = None
    interpretation: Optional[List[PlainObservationComponentInterpretation]] = None
    reference_range: Optional[List[PlainObservationComponentReferenceRange]] = None


# ── Top-level response schemas ────────────────────────────────────────────────


class ObservationResponse(BaseModel):
    """
    Plain snake_case response for a single Observation.

    `extra="allow"` ensures forward-compatibility with fhir-server additions.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    effective_date_time: Optional[str] = None
    effective_period_start: Optional[str] = None
    effective_period_end: Optional[str] = None
    effective_instant: Optional[str] = None
    effective_timing_event: Optional[str] = None
    effective_timing_code_system: Optional[str] = None
    effective_timing_code_code: Optional[str] = None
    effective_timing_code_display: Optional[str] = None
    effective_timing_code_text: Optional[str] = None
    issued: Optional[str] = None
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
    value_date_time: Optional[str] = None
    value_period_start: Optional[str] = None
    value_period_end: Optional[str] = None
    value_range_low_value: Optional[float] = None
    value_range_low_unit: Optional[str] = None
    value_range_low_system: Optional[str] = None
    value_range_low_code: Optional[str] = None
    value_range_high_value: Optional[float] = None
    value_range_high_unit: Optional[str] = None
    value_range_high_system: Optional[str] = None
    value_range_high_code: Optional[str] = None
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
    specimen_type: Optional[str] = None
    specimen_id: Optional[int] = None
    specimen_display: Optional[str] = None
    device_type: Optional[str] = None
    device_id: Optional[int] = None
    device_display: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainObservationIdentifier]] = None
    based_on: Optional[List[PlainObservationBasedOn]] = None
    part_of: Optional[List[PlainObservationPartOf]] = None
    category: Optional[List[PlainObservationCategory]] = None
    focus: Optional[List[PlainObservationFocus]] = None
    performer: Optional[List[PlainObservationPerformer]] = None
    interpretation: Optional[List[PlainObservationInterpretation]] = None
    note: Optional[List[PlainObservationNote]] = None
    reference_range: Optional[List[PlainObservationReferenceRange]] = None
    has_member: Optional[List[PlainObservationHasMember]] = None
    derived_from: Optional[List[PlainObservationDerivedFrom]] = None
    component: Optional[List[PlainObservationComponent]] = None


class PaginatedObservationResponse(BaseModel):
    """Paginated list wrapper for Observation resources."""

    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    offset: int
    data: List[ObservationResponse]
