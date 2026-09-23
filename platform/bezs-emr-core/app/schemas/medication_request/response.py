from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.common.fhir import FHIRBundle, FHIRBundleEntry, FHIRCodeableConcept, FHIRReference


class FHIRMedicationRequestSchema(BaseModel):
    model_config = ConfigDict(extra="allow")
    resourceType: str = "MedicationRequest"
    id: Optional[str] = None
    status: Optional[str] = None
    intent: Optional[str] = None
    priority: Optional[str] = None
    doNotPerform: Optional[bool] = None
    statusReason: Optional[FHIRCodeableConcept] = None
    medicationCodeableConcept: Optional[FHIRCodeableConcept] = None
    medicationReference: Optional[FHIRReference] = None
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    authoredOn: Optional[str] = None
    reportedBoolean: Optional[bool] = None
    reportedReference: Optional[FHIRReference] = None
    requester: Optional[FHIRReference] = None
    performer: Optional[FHIRReference] = None
    performerType: Optional[FHIRCodeableConcept] = None
    recorder: Optional[FHIRReference] = None
    groupIdentifier: Optional[Dict[str, Any]] = None
    courseOfTherapyType: Optional[FHIRCodeableConcept] = None
    priorPrescription: Optional[FHIRReference] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    dispenseRequest: Optional[Dict[str, Any]] = None
    substitution: Optional[Dict[str, Any]] = None
    identifier: Optional[List[Dict[str, Any]]] = None
    category: Optional[List[FHIRCodeableConcept]] = None
    supportingInformation: Optional[List[FHIRReference]] = None
    reasonCode: Optional[List[FHIRCodeableConcept]] = None
    reasonReference: Optional[List[FHIRReference]] = None
    basedOn: Optional[List[FHIRReference]] = None
    insurance: Optional[List[FHIRReference]] = None
    note: Optional[List[Dict[str, Any]]] = None
    dosageInstruction: Optional[List[Dict[str, Any]]] = None
    detectedIssue: Optional[List[FHIRReference]] = None
    eventHistory: Optional[List[FHIRReference]] = None


class FHIRMedicationRequestBundleEntry(FHIRBundleEntry):
    resource: Optional[FHIRMedicationRequestSchema] = None


class FHIRMedicationRequestBundle(FHIRBundle):
    entry: Optional[List[FHIRMedicationRequestBundleEntry]] = None


# ── Plain (snake_case) schemas ──────────────────────────────────────────────────


class PlainMedicationRequestIdentifier(BaseModel):
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


class PlainMedicationRequestCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainMedicationRequestSupportingInfo(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainMedicationRequestReasonCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainMedicationRequestReasonReference(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainMedicationRequestBasedOn(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainMedicationRequestInsurance(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainMedicationRequestNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: Optional[str] = None
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainMedicationRequestAdditionalInstruction(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainMedicationRequestDoseAndRate(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    dose_quantity_value: Optional[float] = None
    dose_quantity_unit: Optional[str] = None
    dose_quantity_system: Optional[str] = None
    dose_quantity_code: Optional[str] = None
    dose_range_low_value: Optional[float] = None
    dose_range_low_unit: Optional[str] = None
    dose_range_high_value: Optional[float] = None
    dose_range_high_unit: Optional[str] = None
    rate_ratio_numerator_value: Optional[float] = None
    rate_ratio_numerator_unit: Optional[str] = None
    rate_ratio_denominator_value: Optional[float] = None
    rate_ratio_denominator_unit: Optional[str] = None
    rate_range_low_value: Optional[float] = None
    rate_range_low_unit: Optional[str] = None
    rate_range_high_value: Optional[float] = None
    rate_range_high_unit: Optional[str] = None
    rate_quantity_value: Optional[float] = None
    rate_quantity_unit: Optional[str] = None
    rate_quantity_system: Optional[str] = None
    rate_quantity_code: Optional[str] = None


class PlainMedicationRequestDosageInstruction(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    text: Optional[str] = None
    patient_instruction: Optional[str] = None
    as_needed_boolean: Optional[bool] = None
    as_needed_system: Optional[str] = None
    as_needed_code: Optional[str] = None
    as_needed_display: Optional[str] = None
    as_needed_text: Optional[str] = None
    site_system: Optional[str] = None
    site_code: Optional[str] = None
    site_display: Optional[str] = None
    site_text: Optional[str] = None
    route_system: Optional[str] = None
    route_code: Optional[str] = None
    route_display: Optional[str] = None
    route_text: Optional[str] = None
    method_system: Optional[str] = None
    method_code: Optional[str] = None
    method_display: Optional[str] = None
    method_text: Optional[str] = None
    timing_code_system: Optional[str] = None
    timing_code_code: Optional[str] = None
    timing_code_display: Optional[str] = None
    timing_repeat_bounds_start: Optional[str] = None
    timing_repeat_bounds_end: Optional[str] = None
    timing_repeat_count: Optional[int] = None
    timing_repeat_count_max: Optional[int] = None
    timing_repeat_duration: Optional[float] = None
    timing_repeat_duration_max: Optional[float] = None
    timing_repeat_duration_unit: Optional[str] = None
    timing_repeat_frequency: Optional[int] = None
    timing_repeat_frequency_max: Optional[int] = None
    timing_repeat_period: Optional[float] = None
    timing_repeat_period_max: Optional[float] = None
    timing_repeat_period_unit: Optional[str] = None
    timing_repeat_day_of_week: Optional[str] = None
    timing_repeat_time_of_day: Optional[str] = None
    timing_repeat_when: Optional[str] = None
    timing_repeat_offset: Optional[int] = None
    max_dose_per_period_numerator_value: Optional[float] = None
    max_dose_per_period_numerator_unit: Optional[str] = None
    max_dose_per_period_denominator_value: Optional[float] = None
    max_dose_per_period_denominator_unit: Optional[str] = None
    max_dose_per_administration_value: Optional[float] = None
    max_dose_per_administration_unit: Optional[str] = None
    max_dose_per_lifetime_value: Optional[float] = None
    max_dose_per_lifetime_unit: Optional[str] = None
    additional_instruction: Optional[List[PlainMedicationRequestAdditionalInstruction]] = None
    dose_and_rate: Optional[List[PlainMedicationRequestDoseAndRate]] = None


class PlainMedicationRequestDetectedIssue(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainMedicationRequestEventHistory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainMedicationRequestResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None
    intent: Optional[str] = None
    priority: Optional[str] = None
    do_not_perform: Optional[bool] = None
    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None
    medication_code_system: Optional[str] = None
    medication_code_code: Optional[str] = None
    medication_code_display: Optional[str] = None
    medication_code_text: Optional[str] = None
    medication_reference_type: Optional[str] = None
    medication_reference_id: Optional[int] = None
    medication_reference_display: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    authored_on: Optional[str] = None
    reported_boolean: Optional[bool] = None
    reported_reference_type: Optional[str] = None
    reported_reference_id: Optional[int] = None
    reported_reference_display: Optional[str] = None
    requester_type: Optional[str] = None
    requester_id: Optional[int] = None
    requester_display: Optional[str] = None
    performer_type: Optional[str] = None
    performer_id: Optional[int] = None
    performer_display: Optional[str] = None
    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None
    recorder_type: Optional[str] = None
    recorder_id: Optional[int] = None
    recorder_display: Optional[str] = None
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
    course_of_therapy_type_system: Optional[str] = None
    course_of_therapy_type_code: Optional[str] = None
    course_of_therapy_type_display: Optional[str] = None
    course_of_therapy_type_text: Optional[str] = None
    prior_prescription_type: Optional[str] = None
    prior_prescription_id: Optional[int] = None
    prior_prescription_display: Optional[str] = None
    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    dispense_initial_fill_quantity_value: Optional[float] = None
    dispense_initial_fill_quantity_unit: Optional[str] = None
    dispense_initial_fill_quantity_system: Optional[str] = None
    dispense_initial_fill_quantity_code: Optional[str] = None
    dispense_initial_fill_duration_value: Optional[float] = None
    dispense_initial_fill_duration_unit: Optional[str] = None
    dispense_interval_value: Optional[float] = None
    dispense_interval_unit: Optional[str] = None
    dispense_validity_period_start: Optional[str] = None
    dispense_validity_period_end: Optional[str] = None
    dispense_number_of_repeats_allowed: Optional[int] = None
    dispense_quantity_value: Optional[float] = None
    dispense_quantity_unit: Optional[str] = None
    dispense_quantity_system: Optional[str] = None
    dispense_quantity_code: Optional[str] = None
    dispense_expected_supply_duration_value: Optional[float] = None
    dispense_expected_supply_duration_unit: Optional[str] = None
    dispense_performer_type: Optional[str] = None
    dispense_performer_id: Optional[int] = None
    dispense_performer_display: Optional[str] = None
    substitution_allowed_boolean: Optional[bool] = None
    substitution_allowed_system: Optional[str] = None
    substitution_allowed_code: Optional[str] = None
    substitution_allowed_display: Optional[str] = None
    substitution_allowed_text: Optional[str] = None
    substitution_reason_system: Optional[str] = None
    substitution_reason_code: Optional[str] = None
    substitution_reason_display: Optional[str] = None
    substitution_reason_text: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainMedicationRequestIdentifier]] = None
    category: Optional[List[PlainMedicationRequestCategory]] = None
    supporting_info: Optional[List[PlainMedicationRequestSupportingInfo]] = None
    reason_code: Optional[List[PlainMedicationRequestReasonCode]] = None
    reason_reference: Optional[List[PlainMedicationRequestReasonReference]] = None
    based_on: Optional[List[PlainMedicationRequestBasedOn]] = None
    insurance: Optional[List[PlainMedicationRequestInsurance]] = None
    note: Optional[List[PlainMedicationRequestNote]] = None
    dosage_instruction: Optional[List[PlainMedicationRequestDosageInstruction]] = None
    detected_issue: Optional[List[PlainMedicationRequestDetectedIssue]] = None
    event_history: Optional[List[PlainMedicationRequestEventHistory]] = None


class PaginatedMedicationRequestResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    total: int
    limit: int
    offset: int
    data: List[PlainMedicationRequestResponse]
