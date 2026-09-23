from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRPeriod,
    FHIRReference,
)


# ── FHIR sub-types ─────────────────────────────────────────────────────────────


class FHIRAnnotation(BaseModel):
    authorString: Optional[str] = None
    authorReference: Optional[FHIRReference] = None
    time: Optional[str] = None
    text: str


class FHIRConditionStage(BaseModel):
    summary: Optional[FHIRCodeableConcept] = None
    assessment: Optional[List[FHIRReference]] = None
    type: Optional[FHIRCodeableConcept] = None


class FHIRConditionEvidence(BaseModel):
    code: Optional[List[FHIRCodeableConcept]] = None
    detail: Optional[List[FHIRReference]] = None


class FHIRConditionSchema(BaseModel):
    resourceType: str = Field("Condition", frozen=True)
    id: str
    identifier: Optional[List[FHIRIdentifier]] = None
    clinicalStatus: Optional[FHIRCodeableConcept] = None
    verificationStatus: Optional[FHIRCodeableConcept] = None
    category: Optional[List[FHIRCodeableConcept]] = None
    severity: Optional[FHIRCodeableConcept] = None
    code: Optional[FHIRCodeableConcept] = None
    bodySite: Optional[List[FHIRCodeableConcept]] = None
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    onsetDateTime: Optional[str] = None
    onsetAge: Optional[Dict[str, Any]] = None
    onsetPeriod: Optional[FHIRPeriod] = None
    onsetRange: Optional[Dict[str, Any]] = None
    onsetString: Optional[str] = None
    abatementDateTime: Optional[str] = None
    abatementAge: Optional[Dict[str, Any]] = None
    abatementPeriod: Optional[FHIRPeriod] = None
    abatementRange: Optional[Dict[str, Any]] = None
    abatementString: Optional[str] = None
    recordedDate: Optional[str] = None
    recorder: Optional[FHIRReference] = None
    asserter: Optional[FHIRReference] = None
    stage: Optional[List[FHIRConditionStage]] = None
    evidence: Optional[List[FHIRConditionEvidence]] = None
    note: Optional[List[FHIRAnnotation]] = None


class FHIRConditionBundleEntry(BaseModel):
    resource: FHIRConditionSchema


class FHIRConditionBundle(FHIRBundle):
    entry: Optional[List[FHIRConditionBundleEntry]] = None


# ── Plain sub-types ─────────────────────────────────────────────────────────────


class PlainConditionIdentifier(BaseModel):
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
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainConditionBodySite(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainConditionStageAssessment(BaseModel):
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainConditionStage(BaseModel):
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
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainConditionEvidenceDetail(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainConditionEvidence(BaseModel):
    id: int
    code: Optional[List[PlainConditionEvidenceCode]] = None
    detail: Optional[List[PlainConditionEvidenceDetail]] = None


class PlainConditionNote(BaseModel):
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainConditionResponse(BaseModel):
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
    total: int
    limit: int
    offset: int
    data: List[PlainConditionResponse]
