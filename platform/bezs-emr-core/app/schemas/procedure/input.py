from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Reference sub-inputs ──────────────────────────────────────────────────────


class ProcedureIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: str = Field(..., description="Identifier value.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class ProcedureBasedOnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference e.g. 'CarePlan/1' or 'ServiceRequest/80001'.")
    reference_display: Optional[str] = None


class ProcedurePartOfInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference e.g. 'Procedure/100001' or 'Observation/160001'.")
    reference_display: Optional[str] = None


class ProcedurePerformerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    function_system: Optional[str] = None
    function_code: Optional[str] = None
    function_display: Optional[str] = None
    function_text: Optional[str] = None
    actor: str = Field(..., description="FHIR reference e.g. 'Practitioner/30001'.")
    actor_display: Optional[str] = None
    on_behalf_of: Optional[str] = Field(None, description="FHIR reference e.g. 'Organization/190001'.")
    on_behalf_of_display: Optional[str] = None


class ProcedureReasonCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ProcedureReasonReferenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference e.g. 'Condition/120001'.")
    reference_display: Optional[str] = None


class ProcedureBodySiteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ProcedureReportInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference e.g. 'DiagnosticReport/110001'.")
    reference_display: Optional[str] = None


class ProcedureComplicationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ProcedureComplicationDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference e.g. 'Condition/120001'.")
    reference_display: Optional[str] = None


class ProcedureFollowUpInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ProcedureNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(..., description="Annotation text (markdown).")
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(
        None,
        description="FHIR reference for author e.g. 'Practitioner/30001'. Mutually exclusive with author_string.",
    )
    author_reference_display: Optional[str] = None


class ProcedureFocalDeviceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action_system: Optional[str] = None
    action_code: Optional[str] = None
    action_display: Optional[str] = None
    action_text: Optional[str] = None
    manipulated_reference: str = Field(..., description="FHIR reference e.g. 'Device/1'.")
    manipulated_reference_display: Optional[str] = None


class ProcedureUsedReferenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference e.g. 'Device/1' or 'Medication/1'.")
    reference_display: Optional[str] = None


class ProcedureUsedCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ── Create / Patch schemas ─────────────────────────────────────────────────────


class ProcedureCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")
    created_by: Optional[str] = None

    # Required
    status: str = Field(..., description="preparation|in-progress|not-done|on-hold|stopped|completed|entered-in-error|unknown")

    # statusReason (0..1 CodeableConcept)
    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None

    # category (0..1 CodeableConcept)
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None

    # code (0..1 CodeableConcept)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    # subject (1..1 Reference)
    subject: Optional[str] = Field(None, description="FHIR reference e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    # encounter (0..1)
    encounter_id: Optional[int] = Field(None, description="Public encounter_id of the linked Encounter.")
    encounter_display: Optional[str] = None

    # performed[x]
    performed_datetime: Optional[datetime] = None
    performed_period_start: Optional[datetime] = None
    performed_period_end: Optional[datetime] = None
    performed_string: Optional[str] = None
    performed_age_value: Optional[float] = None
    performed_age_unit: Optional[str] = None
    performed_age_system: Optional[str] = None
    performed_age_code: Optional[str] = None
    performed_range_low_value: Optional[float] = None
    performed_range_low_unit: Optional[str] = None
    performed_range_high_value: Optional[float] = None
    performed_range_high_unit: Optional[str] = None

    # recorder (0..1 Reference)
    recorder: Optional[str] = Field(None, description="FHIR reference e.g. 'Practitioner/30001'.")
    recorder_display: Optional[str] = None

    # asserter (0..1 Reference)
    asserter: Optional[str] = Field(None, description="FHIR reference e.g. 'Practitioner/30001'.")
    asserter_display: Optional[str] = None

    # location (0..1 Reference)
    location: Optional[str] = Field(None, description="FHIR reference e.g. 'Location/1'.")
    location_display: Optional[str] = None

    # outcome (0..1 CodeableConcept)
    outcome_system: Optional[str] = None
    outcome_code: Optional[str] = None
    outcome_display: Optional[str] = None
    outcome_text: Optional[str] = None

    # instantiates (0..*)
    instantiates_canonical: Optional[List[str]] = Field(None, description="Canonical URIs of FHIR protocols instantiated.")
    instantiates_uri: Optional[List[str]] = Field(None, description="External URI protocols instantiated.")

    # child arrays
    identifier: Optional[List[ProcedureIdentifierInput]] = None
    based_on: Optional[List[ProcedureBasedOnInput]] = None
    part_of: Optional[List[ProcedurePartOfInput]] = None
    performer: Optional[List[ProcedurePerformerInput]] = None
    reason_code: Optional[List[ProcedureReasonCodeInput]] = None
    reason_reference: Optional[List[ProcedureReasonReferenceInput]] = None
    body_site: Optional[List[ProcedureBodySiteInput]] = None
    report: Optional[List[ProcedureReportInput]] = None
    complication: Optional[List[ProcedureComplicationInput]] = None
    complication_detail: Optional[List[ProcedureComplicationDetailInput]] = None
    follow_up: Optional[List[ProcedureFollowUpInput]] = None
    note: Optional[List[ProcedureNoteInput]] = None
    focal_device: Optional[List[ProcedureFocalDeviceInput]] = None
    used_reference: Optional[List[ProcedureUsedReferenceInput]] = None
    used_code: Optional[List[ProcedureUsedCodeInput]] = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "status": "completed",
                "code_system": "http://snomed.info/sct",
                "code_code": "80146002",
                "code_display": "Appendectomy",
                "subject": "Patient/10001",
                "performed_datetime": "2024-03-15T10:30:00Z",
                "encounter_id": 20001,
                "performer": [
                    {
                        "actor": "Practitioner/30001",
                        "actor_display": "Dr. Smith",
                        "function_code": "01.000",
                        "function_system": "http://snomed.info/sct",
                    }
                ],
                "note": [{"text": "Procedure completed without complications."}],
            }
        },
    )


class ProcedurePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

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
    subject_display: Optional[str] = None
    encounter_display: Optional[str] = None
    performed_datetime: Optional[datetime] = None
    performed_period_start: Optional[datetime] = None
    performed_period_end: Optional[datetime] = None
    performed_string: Optional[str] = None
    performed_age_value: Optional[float] = None
    performed_age_unit: Optional[str] = None
    performed_age_system: Optional[str] = None
    performed_age_code: Optional[str] = None
    performed_range_low_value: Optional[float] = None
    performed_range_low_unit: Optional[str] = None
    performed_range_high_value: Optional[float] = None
    performed_range_high_unit: Optional[str] = None
    recorder_display: Optional[str] = None
    asserter_display: Optional[str] = None
    location_display: Optional[str] = None
    outcome_system: Optional[str] = None
    outcome_code: Optional[str] = None
    outcome_display: Optional[str] = None
    outcome_text: Optional[str] = None
    instantiates_canonical: Optional[List[str]] = None
    instantiates_uri: Optional[List[str]] = None
    updated_by: Optional[str] = None
