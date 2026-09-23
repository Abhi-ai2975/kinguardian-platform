"""
Response schemas for Condition resources.

Mirrors the fhir-server PlainCondition* shapes exactly.
`extra="allow"` on every schema ensures forward-compatibility.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ── Plain sub-resource response schemas ───────────────────────────────────────


class PlainConditionIdentifier(BaseModel):
    model_config = ConfigDict(extra="allow")
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


class PlainConditionCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainConditionBodySite(BaseModel):
    model_config = ConfigDict(extra="allow")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainConditionStageAssessment(BaseModel):
    """Assessment reference within a Condition stage."""

    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainConditionStage(BaseModel):
    """Clinical stage associated with the Condition."""

    model_config = ConfigDict(extra="allow")
    id: int
    summary_system: Optional[str] = None
    summary_code: Optional[str] = None
    summary_display: Optional[str] = None
    summary_text: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    assessment: Optional[List[PlainConditionStageAssessment]] = None


class PlainConditionEvidenceCode(BaseModel):
    """Coded evidence sub-item."""

    model_config = ConfigDict(extra="allow")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainConditionEvidenceDetail(BaseModel):
    """Reference evidence sub-item."""

    model_config = ConfigDict(extra="allow")
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainConditionEvidence(BaseModel):
    """Supporting evidence (coded or referenced) for the Condition."""

    model_config = ConfigDict(extra="allow")
    id: int
    code: Optional[List[PlainConditionEvidenceCode]] = None
    detail: Optional[List[PlainConditionEvidenceDetail]] = None


class PlainConditionNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


# ── Top-level response schemas ────────────────────────────────────────────────


class ConditionResponse(BaseModel):
    """
    Plain snake_case response for a single Condition.

    `extra="allow"` ensures forward-compatibility with fhir-server additions.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
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
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    onset_datetime: Optional[str] = None
    onset_age_value: Optional[float] = None
    onset_age_comparator: Optional[str] = None
    onset_age_unit: Optional[str] = None
    onset_age_system: Optional[str] = None
    onset_age_code: Optional[str] = None
    onset_period_start: Optional[str] = None
    onset_period_end: Optional[str] = None
    onset_range_low_value: Optional[float] = None
    onset_range_low_unit: Optional[str] = None
    onset_range_high_value: Optional[float] = None
    onset_range_high_unit: Optional[str] = None
    onset_string: Optional[str] = None
    abatement_datetime: Optional[str] = None
    abatement_age_value: Optional[float] = None
    abatement_age_comparator: Optional[str] = None
    abatement_age_unit: Optional[str] = None
    abatement_age_system: Optional[str] = None
    abatement_age_code: Optional[str] = None
    abatement_period_start: Optional[str] = None
    abatement_period_end: Optional[str] = None
    abatement_range_low_value: Optional[float] = None
    abatement_range_low_unit: Optional[str] = None
    abatement_range_high_value: Optional[float] = None
    abatement_range_high_unit: Optional[str] = None
    abatement_string: Optional[str] = None
    recorded_date: Optional[str] = None
    recorder_type: Optional[str] = None
    recorder_id: Optional[int] = None
    recorder_display: Optional[str] = None
    asserter_type: Optional[str] = None
    asserter_id: Optional[int] = None
    asserter_display: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainConditionIdentifier]] = None
    category: Optional[List[PlainConditionCategory]] = None
    body_site: Optional[List[PlainConditionBodySite]] = None
    stage: Optional[List[PlainConditionStage]] = None
    evidence: Optional[List[PlainConditionEvidence]] = None
    note: Optional[List[PlainConditionNote]] = None


class PaginatedConditionResponse(BaseModel):
    """Paginated list wrapper for Condition resources."""

    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    offset: int
    data: List[ConditionResponse]
