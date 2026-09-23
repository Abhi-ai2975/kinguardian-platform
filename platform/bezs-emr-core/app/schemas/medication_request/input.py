from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class MedicationRequestIdentifierInput(BaseModel):
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


class MedicationRequestCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class MedicationRequestSupportingInfoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Open FHIR reference e.g. 'AllergyIntolerance/10001'.")
    reference_display: Optional[str] = None


class MedicationRequestReasonCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class MedicationRequestReasonReferenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to Condition or Observation e.g. 'Condition/120001'.")
    reference_display: Optional[str] = None


class MedicationRequestBasedOnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="Reference to CarePlan|MedicationRequest|ServiceRequest|ImmunizationRecommendation.",
    )
    reference_display: Optional[str] = None


class MedicationRequestInsuranceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to Coverage or ClaimResponse e.g. 'Coverage/10001'.")
    reference_display: Optional[str] = None


class MedicationRequestNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(
        None,
        description="Reference to Practitioner|Patient|RelatedPerson|Organization e.g. 'Practitioner/30001'.",
    )


class MedicationRequestAdditionalInstructionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class MedicationRequestDoseAndRateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    # dose[x]
    dose_quantity_value: Optional[float] = None
    dose_quantity_unit: Optional[str] = None
    dose_quantity_system: Optional[str] = None
    dose_quantity_code: Optional[str] = None
    dose_range_low_value: Optional[float] = None
    dose_range_low_unit: Optional[str] = None
    dose_range_high_value: Optional[float] = None
    dose_range_high_unit: Optional[str] = None
    # rate[x]
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


class MedicationRequestDosageInstructionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: Optional[int] = None
    text: Optional[str] = None
    patient_instruction: Optional[str] = None
    # asNeeded[x]
    as_needed_boolean: Optional[bool] = None
    as_needed_system: Optional[str] = None
    as_needed_code: Optional[str] = None
    as_needed_display: Optional[str] = None
    as_needed_text: Optional[str] = None
    # site
    site_system: Optional[str] = None
    site_code: Optional[str] = None
    site_display: Optional[str] = None
    site_text: Optional[str] = None
    # route
    route_system: Optional[str] = None
    route_code: Optional[str] = None
    route_display: Optional[str] = None
    route_text: Optional[str] = None
    # method
    method_system: Optional[str] = None
    method_code: Optional[str] = None
    method_display: Optional[str] = None
    method_text: Optional[str] = None
    # timing.code
    timing_code_system: Optional[str] = None
    timing_code_code: Optional[str] = None
    timing_code_display: Optional[str] = None
    # timing.repeat
    timing_repeat_bounds_start: Optional[datetime] = None
    timing_repeat_bounds_end: Optional[datetime] = None
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
    timing_repeat_day_of_week: Optional[str] = Field(None, description="Comma-separated e.g. 'mon,wed,fri'.")
    timing_repeat_time_of_day: Optional[str] = Field(None, description="Comma-separated HH:MM e.g. '08:00,20:00'.")
    timing_repeat_when: Optional[str] = Field(None, description="Comma-separated event codes e.g. 'MORN,EVE'.")
    timing_repeat_offset: Optional[int] = None
    # maxDose
    max_dose_per_period_numerator_value: Optional[float] = None
    max_dose_per_period_numerator_unit: Optional[str] = None
    max_dose_per_period_denominator_value: Optional[float] = None
    max_dose_per_period_denominator_unit: Optional[str] = None
    max_dose_per_administration_value: Optional[float] = None
    max_dose_per_administration_unit: Optional[str] = None
    max_dose_per_lifetime_value: Optional[float] = None
    max_dose_per_lifetime_unit: Optional[str] = None
    # nested
    additional_instruction: Optional[List[MedicationRequestAdditionalInstructionInput]] = None
    dose_and_rate: Optional[List[MedicationRequestDoseAndRateInput]] = None


class MedicationRequestDetectedIssueInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to DetectedIssue e.g. 'DetectedIssue/10001'.")
    reference_display: Optional[str] = None


class MedicationRequestEventHistoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to Provenance e.g. 'Provenance/10001'.")
    reference_display: Optional[str] = None


# ── Create / Patch ──────────────────────────────────────────────────────────────


class MedicationRequestCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "status": "active",
                "intent": "order",
                "medication_code_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "medication_code_code": "1049502",
                "medication_code_display": "12 HR Oxycodone Hydrochloride 10 MG Extended Release Oral Tablet",
                "subject": "Patient/10001",
                "encounter_id": 20001,
                "authored_on": "2026-05-17T09:00:00Z",
                "dosage_instruction": [
                    {
                        "sequence": 1,
                        "text": "Take one tablet by mouth every 12 hours.",
                        "timing_code_code": "BID",
                        "route_code": "26643006",
                        "route_display": "Oral route",
                    }
                ],
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # Required
    status: str = Field(..., description="active|on-hold|cancelled|completed|entered-in-error|stopped|draft|unknown")
    intent: str = Field(..., description="proposal|plan|order|original-order|reflex-order|filler-order|instance-order|option")

    # statusReason
    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None

    priority: Optional[str] = Field(None, description="routine|urgent|asap|stat")
    do_not_perform: Optional[bool] = None

    # medication[x]
    medication_code_system: Optional[str] = None
    medication_code_code: Optional[str] = None
    medication_code_display: Optional[str] = None
    medication_code_text: Optional[str] = None
    medication_reference: Optional[str] = Field(None, description="Reference to Medication e.g. 'Medication/10001'.")
    medication_reference_display: Optional[str] = None

    # subject
    subject: Optional[str] = Field(None, description="Reference e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    # encounter
    encounter_id: Optional[int] = Field(None, description="Public encounter_id.")
    encounter_display: Optional[str] = None

    authored_on: Optional[datetime] = None

    # reported[x]
    reported_boolean: Optional[bool] = None
    reported_reference: Optional[str] = Field(
        None,
        description="Reference to Patient|Practitioner|PractitionerRole|RelatedPerson|Organization.",
    )
    reported_reference_display: Optional[str] = None

    # requester
    requester: Optional[str] = Field(
        None,
        description="Reference to Practitioner|PractitionerRole|Organization|Patient|RelatedPerson|Device.",
    )
    requester_display: Optional[str] = None

    # performer (0..1)
    performer: Optional[str] = Field(
        None,
        description="Reference to Practitioner|PractitionerRole|Organization|Patient|Device|RelatedPerson|CareTeam.",
    )
    performer_display: Optional[str] = None

    # performerType (CodeableConcept)
    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None

    # recorder
    recorder: Optional[str] = Field(None, description="Reference to Practitioner or PractitionerRole.")
    recorder_display: Optional[str] = None

    # groupIdentifier
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

    # courseOfTherapyType
    course_of_therapy_type_system: Optional[str] = None
    course_of_therapy_type_code: Optional[str] = None
    course_of_therapy_type_display: Optional[str] = None
    course_of_therapy_type_text: Optional[str] = None

    # priorPrescription
    prior_prescription: Optional[str] = Field(None, description="Reference to MedicationRequest e.g. 'MedicationRequest/90001'.")
    prior_prescription_display: Optional[str] = None

    instantiates_canonical: Optional[str] = Field(None, description="Comma-separated canonical URIs.")
    instantiates_uri: Optional[str] = Field(None, description="Comma-separated URIs.")

    # dispenseRequest (flattened)
    dispense_initial_fill_quantity_value: Optional[float] = None
    dispense_initial_fill_quantity_unit: Optional[str] = None
    dispense_initial_fill_quantity_system: Optional[str] = None
    dispense_initial_fill_quantity_code: Optional[str] = None
    dispense_initial_fill_duration_value: Optional[float] = None
    dispense_initial_fill_duration_unit: Optional[str] = None
    dispense_interval_value: Optional[float] = None
    dispense_interval_unit: Optional[str] = None
    dispense_validity_period_start: Optional[datetime] = None
    dispense_validity_period_end: Optional[datetime] = None
    dispense_number_of_repeats_allowed: Optional[int] = None
    dispense_quantity_value: Optional[float] = None
    dispense_quantity_unit: Optional[str] = None
    dispense_quantity_system: Optional[str] = None
    dispense_quantity_code: Optional[str] = None
    dispense_expected_supply_duration_value: Optional[float] = None
    dispense_expected_supply_duration_unit: Optional[str] = None
    dispense_performer: Optional[str] = Field(None, description="Reference to Organization e.g. 'Organization/190001'.")
    dispense_performer_display: Optional[str] = None

    # substitution (flattened)
    substitution_allowed_boolean: Optional[bool] = None
    substitution_allowed_system: Optional[str] = None
    substitution_allowed_code: Optional[str] = None
    substitution_allowed_display: Optional[str] = None
    substitution_allowed_text: Optional[str] = None
    substitution_reason_system: Optional[str] = None
    substitution_reason_code: Optional[str] = None
    substitution_reason_display: Optional[str] = None
    substitution_reason_text: Optional[str] = None

    # child arrays
    identifier: Optional[List[MedicationRequestIdentifierInput]] = None
    category: Optional[List[MedicationRequestCategoryInput]] = None
    supporting_info: Optional[List[MedicationRequestSupportingInfoInput]] = None
    reason_code: Optional[List[MedicationRequestReasonCodeInput]] = None
    reason_reference: Optional[List[MedicationRequestReasonReferenceInput]] = None
    based_on: Optional[List[MedicationRequestBasedOnInput]] = None
    insurance: Optional[List[MedicationRequestInsuranceInput]] = None
    note: Optional[List[MedicationRequestNoteInput]] = None
    dosage_instruction: Optional[List[MedicationRequestDosageInstructionInput]] = None
    detected_issue: Optional[List[MedicationRequestDetectedIssueInput]] = None
    event_history: Optional[List[MedicationRequestEventHistoryInput]] = None


class MedicationRequestPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

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

    subject_display: Optional[str] = None
    encounter_display: Optional[str] = None
    authored_on: Optional[datetime] = None

    reported_boolean: Optional[bool] = None
    reported_reference_display: Optional[str] = None

    requester_display: Optional[str] = None
    performer_display: Optional[str] = None
    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None
    recorder_display: Optional[str] = None

    course_of_therapy_type_system: Optional[str] = None
    course_of_therapy_type_code: Optional[str] = None
    course_of_therapy_type_display: Optional[str] = None
    course_of_therapy_type_text: Optional[str] = None

    dispense_number_of_repeats_allowed: Optional[int] = None
    dispense_validity_period_start: Optional[datetime] = None
    dispense_validity_period_end: Optional[datetime] = None
    dispense_quantity_value: Optional[float] = None
    dispense_quantity_unit: Optional[str] = None

    substitution_allowed_boolean: Optional[bool] = None
    substitution_reason_system: Optional[str] = None
    substitution_reason_code: Optional[str] = None
    substitution_reason_display: Optional[str] = None
    substitution_reason_text: Optional[str] = None

    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    updated_by: Optional[str] = None
