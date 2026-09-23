"""
Input schemas for Observation resource endpoints.

Three schemas cover the write/query surfaces:
  - ObservationCreateSchema  — POST /observations body
  - ObservationPatchSchema   — PATCH /observations/{id} body (scalar fields only)
  - ListObservationsSchema   — GET /observations query parameters

Design notes:
  - `_ValueXFields` is a shared mixin for the many value[x] variants (Quantity,
    CodeableConcept, String, Boolean, Integer, Time, DateTime, Period, Range,
    Ratio, SampledData). Both the main create schema and ObservationComponentInput
    inherit from it — mirrors the fhir-server pattern.
  - `status` is the only required field (FHIR R4 1..1 on Observation.status).
  - List filters: status, patient_id, encounter_id, effective_from, effective_to,
    user_id, org_id, limit, offset (matching the fhir-server /observations GET).
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Shared value[x] mixin ────────────────────────────────────────────────────


class _ValueXFields(BaseModel):
    """
    Reusable mixin for value[x] polymorphic fields.

    Shared by ObservationCreateSchema and ObservationComponentInput so both
    surfaces accept the same set of value variants without duplication.
    """

    value_quantity_value: Optional[float] = None
    value_quantity_comparator: Optional[str] = Field(None, description="<|<=|>=|>")
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
    value_time: Optional[str] = Field(None, description="HH:mm:ss")
    value_date_time: Optional[datetime] = None
    value_period_start: Optional[datetime] = None
    value_period_end: Optional[datetime] = None
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


# ── Sub-resource input schemas ────────────────────────────────────────────────


class ObservationIdentifierInput(BaseModel):
    """Business identifier for the Observation."""

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
    """Reference to orders this observation fulfils."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="Reference to CarePlan|DeviceRequest|ImmunizationRecommendation|MedicationRequest|NutritionOrder|ServiceRequest.",
    )
    reference_display: Optional[str] = None


class ObservationPartOfInput(BaseModel):
    """Reference to the event this observation is part of."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="Reference to MedicationAdministration|MedicationDispense|MedicationStatement|Procedure|Immunization|ImagingStudy.",
    )
    reference_display: Optional[str] = None


class ObservationCategoryInput(BaseModel):
    """Classification of the observation (e.g. vital-signs, laboratory)."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ObservationFocusInput(BaseModel):
    """Reference to the actual focus when different from the subject."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Open FHIR reference e.g. 'Condition/120001'.")
    reference_display: Optional[str] = None


class ObservationPerformerInput(BaseModel):
    """Reference to who performed the observation."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="Reference to Practitioner|PractitionerRole|Organization|CareTeam|Patient|RelatedPerson.",
    )
    reference_display: Optional[str] = None


class ObservationInterpretationInput(BaseModel):
    """Coded interpretation of the observation result (H/L/N/A etc.)."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ObservationNoteInput(BaseModel):
    """Annotation note attached to the observation."""

    model_config = ConfigDict(extra="forbid")

    text: str
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(
        None, description="Open reference e.g. 'Practitioner/30001'."
    )


class ObservationAppliesToInput(BaseModel):
    """Population group that a reference range applies to."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ObservationReferenceRangeInput(BaseModel):
    """Expected value range for the observation result."""

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
    """Reference to a related observation that belongs to a group."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ..., description="Reference to Observation|QuestionnaireResponse|MolecularSequence."
    )
    reference_display: Optional[str] = None


class ObservationDerivedFromInput(BaseModel):
    """Reference to a resource from which the observation is derived."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="Reference to DocumentReference|ImagingStudy|Media|QuestionnaireResponse|Observation|MolecularSequence.",
    )
    reference_display: Optional[str] = None


class ObservationComponentInput(_ValueXFields):
    """
    Component result within a panel / multi-component observation.

    Inherits all value[x] fields from _ValueXFields plus a code and optional
    dataAbsentReason, interpretation, and referenceRange.
    """

    model_config = ConfigDict(extra="forbid")

    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    data_absent_reason_system: Optional[str] = None
    data_absent_reason_code: Optional[str] = None
    data_absent_reason_display: Optional[str] = None
    data_absent_reason_text: Optional[str] = None
    interpretation: Optional[List[ObservationInterpretationInput]] = None
    reference_range: Optional[List[ObservationReferenceRangeInput]] = None


# ── Create / Patch / List ─────────────────────────────────────────────────────


class ObservationCreateSchema(_ValueXFields):
    """
    Full create body for an Observation resource.

    Inherits all value[x] fields from _ValueXFields. `status` is required.
    Supplies subject via open FHIR reference string and optionally links to an
    Encounter via `encounter_id`.
    """

    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    status: str = Field(
        ...,
        description="registered|preliminary|final|amended|corrected|cancelled|entered-in-error|unknown",
    )

    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    subject: Optional[str] = Field(None, description="Reference e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    encounter_id: Optional[int] = Field(None, description="Public encounter_id.")
    encounter_display: Optional[str] = None

    # effective[x]
    effective_date_time: Optional[datetime] = None
    effective_period_start: Optional[datetime] = None
    effective_period_end: Optional[datetime] = None
    effective_instant: Optional[datetime] = None
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

    specimen: Optional[str] = Field(None, description="Reference to Specimen e.g. 'Specimen/10001'.")
    specimen_display: Optional[str] = None

    device: Optional[str] = Field(None, description="Reference to Device|DeviceMetric e.g. 'Device/10001'.")
    device_display: Optional[str] = None

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
    """
    Partial update body for an Observation.

    Only scalar fields are patchable. Child arrays are immutable after creation.
    """

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


class ListObservationsSchema(BaseModel):
    """
    Query parameters for GET /observations.

    Mirrors the fhir-server list endpoint: status, patient_id, encounter_id,
    effective_from, effective_to, user_id, org_id, limit, offset.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = Field(None, description="Filter by status e.g. 'final'.")
    patient_id: Optional[int] = Field(None, description="Filter by patient subject_id.")
    encounter_id: Optional[int] = Field(None, description="Filter by public encounter_id.")
    effective_from: Optional[datetime] = Field(None, description="Filter by effectiveDateTime >= this value.")
    effective_to: Optional[datetime] = Field(None, description="Filter by effectiveDateTime <= this value.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)
