"""
Input schemas for Condition resource endpoints.

Three schemas cover the write/query surfaces:
  - ConditionCreateSchema  — POST /conditions body
  - ConditionPatchSchema   — PATCH /conditions/{id} body (scalar fields only)
  - ListConditionsSchema   — GET /conditions query parameters

Design notes:
  - No fields are required on ConditionCreateSchema (all FHIR R4 elements are 0..1
    or 0..*). The fhir-server accepts an empty POST; callers should provide at
    minimum a subject and code.
  - stage[].assessment and evidence[].detail are nested arrays handled via sub-schemas.
  - List filters: clinical_status, patient_id, encounter_id, recorded_from,
    recorded_to, user_id, org_id, limit, offset (matching the fhir-server GET).
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Sub-resource input schemas ────────────────────────────────────────────────


class ConditionIdentifierInput(BaseModel):
    """Business identifier for the Condition."""

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
    """Classification category for the Condition."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ConditionBodySiteInput(BaseModel):
    """Anatomic body site for the Condition."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ConditionStageAssessmentInput(BaseModel):
    """Assessment reference within a stage — ClinicalImpression, DiagnosticReport, or Observation."""

    model_config = ConfigDict(extra="forbid")

    reference: Optional[str] = Field(
        None,
        description="FHIR reference e.g. 'DiagnosticReport/110001' or 'Observation/160001'.",
    )
    reference_display: Optional[str] = None


class ConditionStageInput(BaseModel):
    """Clinical stage or grade associated with the Condition."""

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
    """Coded evidence supporting the Condition."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ConditionEvidenceDetailInput(BaseModel):
    """Reference to a resource providing evidence for the Condition."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="Any FHIR resource reference e.g. 'Observation/160001'.",
    )
    reference_display: Optional[str] = None


class ConditionEvidenceInput(BaseModel):
    """Supporting evidence (coded or referenced) for the Condition."""

    model_config = ConfigDict(extra="forbid")

    code: Optional[List[ConditionEvidenceCodeInput]] = None
    detail: Optional[List[ConditionEvidenceDetailInput]] = None


class ConditionNoteInput(BaseModel):
    """Annotation note attached to the Condition."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(..., description="Annotation text (markdown).")
    time: Optional[datetime] = None
    author_string: Optional[str] = Field(None, description="Author as plain text name.")
    author_reference: Optional[str] = Field(
        None,
        description="Author as FHIR reference e.g. 'Practitioner/30001'.",
    )
    author_reference_display: Optional[str] = None


# ── Create / Patch / List ─────────────────────────────────────────────────────


class ConditionCreateSchema(BaseModel):
    """
    Full create body for a Condition resource.

    All fields are optional — minimum viable payload includes `subject` and
    `code_code`. Provide `encounter_id` to link to an existing Encounter.
    """

    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # clinicalStatus
    clinical_status_system: Optional[str] = None
    clinical_status_code: Optional[str] = None
    clinical_status_display: Optional[str] = None
    clinical_status_text: Optional[str] = None

    # verificationStatus
    verification_status_system: Optional[str] = None
    verification_status_code: Optional[str] = None
    verification_status_display: Optional[str] = None
    verification_status_text: Optional[str] = None

    # severity
    severity_system: Optional[str] = None
    severity_code: Optional[str] = None
    severity_display: Optional[str] = None
    severity_text: Optional[str] = None

    # code
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    # subject
    subject: Optional[str] = Field(None, description="FHIR reference e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    # encounter
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

    recorded_date: Optional[datetime] = None

    recorder: Optional[str] = Field(
        None,
        description="FHIR reference e.g. 'Practitioner/30001'.",
    )
    recorder_display: Optional[str] = None

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
    """
    Partial update body for a Condition.

    Only scalar fields are patchable. Child arrays (identifier, category,
    body_site, stage, evidence, note) are immutable after creation.
    """

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


class ListConditionsSchema(BaseModel):
    """
    Query parameters for GET /conditions.

    Mirrors the fhir-server list endpoint: clinical_status, patient_id,
    encounter_id, recorded_from, recorded_to, user_id, org_id, limit, offset.
    """

    model_config = ConfigDict(extra="forbid")

    clinical_status: Optional[str] = Field(None, description="Filter by clinicalStatus code e.g. 'active'.")
    patient_id: Optional[int] = Field(None, description="Filter by patient subject_id.")
    encounter_id: Optional[int] = Field(None, description="Filter by public encounter_id.")
    recorded_from: Optional[datetime] = Field(None, description="Return conditions recorded on or after this datetime.")
    recorded_to: Optional[datetime] = Field(None, description="Return conditions recorded on or before this datetime.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)
