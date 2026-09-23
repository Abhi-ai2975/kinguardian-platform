from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ConditionIdentifierInput(BaseModel):
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


class ConditionCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ConditionBodySiteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ConditionStageAssessmentInput(BaseModel):
    """stage[].assessment[] — Reference(ClinicalImpression|DiagnosticReport|Observation)."""
    model_config = ConfigDict(extra="forbid")
    reference: Optional[str] = Field(
        None,
        description="FHIR reference e.g. 'DiagnosticReport/110001' or 'Observation/160001'.",
    )
    reference_display: Optional[str] = None


class ConditionStageInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary_system: Optional[str] = None
    summary_code: Optional[str] = None
    summary_display: Optional[str] = None
    summary_text: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    assessment: Optional[List[ConditionStageAssessmentInput]] = None


class ConditionEvidenceCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ConditionEvidenceDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="Any FHIR resource reference e.g. 'Observation/160001'.",
    )
    reference_display: Optional[str] = None


class ConditionEvidenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: Optional[List[ConditionEvidenceCodeInput]] = None
    detail: Optional[List[ConditionEvidenceDetailInput]] = None


class ConditionNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(..., description="Annotation text (markdown).")
    time: Optional[datetime] = None
    author_string: Optional[str] = Field(None, description="Author as plain text name.")
    author_reference: Optional[str] = Field(
        None,
        description="Author as FHIR reference e.g. 'Practitioner/30001'.",
    )
    author_reference_display: Optional[str] = None


# ── Create / Patch ─────────────────────────────────────────────────────────────


class ConditionCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "clinical_status_code": "active",
                "clinical_status_system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                "clinical_status_display": "Active",
                "verification_status_code": "confirmed",
                "verification_status_system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                "verification_status_display": "Confirmed",
                "code_system": "http://snomed.info/sct",
                "code_code": "44054006",
                "code_display": "Diabetes mellitus type 2",
                "subject": "Patient/10001",
                "subject_display": "John Doe",
                "encounter_id": 20001,
                "recorded_date": "2026-05-17T10:00:00Z",
                "category": [
                    {
                        "coding_system": "http://terminology.hl7.org/CodeSystem/condition-category",
                        "coding_code": "problem-list-item",
                        "coding_display": "Problem List Item",
                    }
                ],
                "note": [{"text": "Patient reports onset 3 years ago."}],
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # clinicalStatus (0..1 CodeableConcept)
    clinical_status_system: Optional[str] = None
    clinical_status_code: Optional[str] = None
    clinical_status_display: Optional[str] = None
    clinical_status_text: Optional[str] = None

    # verificationStatus (0..1 CodeableConcept)
    verification_status_system: Optional[str] = None
    verification_status_code: Optional[str] = None
    verification_status_display: Optional[str] = None
    verification_status_text: Optional[str] = None

    # severity (0..1 CodeableConcept)
    severity_system: Optional[str] = None
    severity_code: Optional[str] = None
    severity_display: Optional[str] = None
    severity_text: Optional[str] = None

    # code (0..1 CodeableConcept)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    # subject (0..1 Reference(Patient|Group))
    subject: Optional[str] = Field(None, description="FHIR reference e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    # encounter (0..1 Reference(Encounter))
    encounter_id: Optional[int] = Field(None, description="Public encounter_id.")
    encounter_display: Optional[str] = None

    # onset[x]
    onset_datetime: Optional[datetime] = None
    onset_age_value: Optional[float] = None
    onset_age_comparator: Optional[str] = Field(None, description="< | <= | >= | >")
    onset_age_unit: Optional[str] = None
    onset_age_system: Optional[str] = None
    onset_age_code: Optional[str] = None
    onset_period_start: Optional[datetime] = None
    onset_period_end: Optional[datetime] = None
    onset_range_low_value: Optional[float] = None
    onset_range_low_unit: Optional[str] = None
    onset_range_high_value: Optional[float] = None
    onset_range_high_unit: Optional[str] = None
    onset_string: Optional[str] = None

    # abatement[x]
    abatement_datetime: Optional[datetime] = None
    abatement_age_value: Optional[float] = None
    abatement_age_comparator: Optional[str] = Field(None, description="< | <= | >= | >")
    abatement_age_unit: Optional[str] = None
    abatement_age_system: Optional[str] = None
    abatement_age_code: Optional[str] = None
    abatement_period_start: Optional[datetime] = None
    abatement_period_end: Optional[datetime] = None
    abatement_range_low_value: Optional[float] = None
    abatement_range_low_unit: Optional[str] = None
    abatement_range_high_value: Optional[float] = None
    abatement_range_high_unit: Optional[str] = None
    abatement_string: Optional[str] = None

    # recordedDate (0..1)
    recorded_date: Optional[datetime] = None

    # recorder (0..1 Reference)
    recorder: Optional[str] = Field(
        None,
        description="FHIR reference e.g. 'Practitioner/30001'.",
    )
    recorder_display: Optional[str] = None

    # asserter (0..1 Reference)
    asserter: Optional[str] = Field(
        None,
        description="FHIR reference e.g. 'Practitioner/30001'.",
    )
    asserter_display: Optional[str] = None

    # child arrays
    identifier: Optional[List[ConditionIdentifierInput]] = None
    category: Optional[List[ConditionCategoryInput]] = None
    body_site: Optional[List[ConditionBodySiteInput]] = None
    stage: Optional[List[ConditionStageInput]] = None
    evidence: Optional[List[ConditionEvidenceInput]] = None
    note: Optional[List[ConditionNoteInput]] = None


class ConditionPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    clinical_status_system: Optional[str] = None
    clinical_status_code: Optional[str] = None
    clinical_status_display: Optional[str] = None
    clinical_status_text: Optional[str] = None

    verification_status_system: Optional[str] = None
    verification_status_code: Optional[str] = None
    verification_status_display: Optional[str] = None
    verification_status_text: Optional[str] = None

    severity_system: Optional[str] = None
    severity_code: Optional[str] = None
    severity_display: Optional[str] = None
    severity_text: Optional[str] = None

    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    recorded_date: Optional[datetime] = None
    encounter_display: Optional[str] = None

    onset_datetime: Optional[datetime] = None
    onset_age_value: Optional[float] = None
    onset_age_comparator: Optional[str] = None
    onset_age_unit: Optional[str] = None
    onset_age_system: Optional[str] = None
    onset_age_code: Optional[str] = None
    onset_period_start: Optional[datetime] = None
    onset_period_end: Optional[datetime] = None
    onset_range_low_value: Optional[float] = None
    onset_range_low_unit: Optional[str] = None
    onset_range_high_value: Optional[float] = None
    onset_range_high_unit: Optional[str] = None
    onset_string: Optional[str] = None

    abatement_datetime: Optional[datetime] = None
    abatement_age_value: Optional[float] = None
    abatement_age_comparator: Optional[str] = None
    abatement_age_unit: Optional[str] = None
    abatement_age_system: Optional[str] = None
    abatement_age_code: Optional[str] = None
    abatement_period_start: Optional[datetime] = None
    abatement_period_end: Optional[datetime] = None
    abatement_range_low_value: Optional[float] = None
    abatement_range_low_unit: Optional[str] = None
    abatement_range_high_value: Optional[float] = None
    abatement_range_high_unit: Optional[str] = None
    abatement_string: Optional[str] = None
    updated_by: Optional[str] = None
