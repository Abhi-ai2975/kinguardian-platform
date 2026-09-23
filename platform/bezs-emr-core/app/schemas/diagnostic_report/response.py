from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.common.fhir import FHIRBundle, FHIRBundleEntry, FHIRCodeableConcept, FHIRReference


class FHIRDiagnosticReportSchema(BaseModel):
    model_config = ConfigDict(extra="allow")
    resourceType: str = "DiagnosticReport"
    id: Optional[str] = None
    status: Optional[str] = None
    code: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    effectiveDateTime: Optional[str] = None
    effectivePeriod: Optional[Dict[str, Any]] = None
    issued: Optional[str] = None
    conclusion: Optional[str] = None
    identifier: Optional[List[Dict[str, Any]]] = None
    basedOn: Optional[List[FHIRReference]] = None
    category: Optional[List[FHIRCodeableConcept]] = None
    performer: Optional[List[FHIRReference]] = None
    resultsInterpreter: Optional[List[FHIRReference]] = None
    specimen: Optional[List[FHIRReference]] = None
    result: Optional[List[FHIRReference]] = None
    imagingStudy: Optional[List[FHIRReference]] = None
    media: Optional[List[Dict[str, Any]]] = None
    conclusionCode: Optional[List[FHIRCodeableConcept]] = None
    presentedForm: Optional[List[Dict[str, Any]]] = None


class FHIRDiagnosticReportBundleEntry(FHIRBundleEntry):
    resource: Optional[FHIRDiagnosticReportSchema] = None


class FHIRDiagnosticReportBundle(FHIRBundle):
    entry: Optional[List[FHIRDiagnosticReportBundleEntry]] = None


# ── Plain (snake_case) schemas ──────────────────────────────────────────────────


class PlainDiagnosticReportIdentifier(BaseModel):
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


class PlainDiagnosticReportBasedOn(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDiagnosticReportCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainDiagnosticReportPerformer(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDiagnosticReportResultsInterpreter(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDiagnosticReportSpecimen(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDiagnosticReportResult(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDiagnosticReportImagingStudy(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDiagnosticReportMedia(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    comment: Optional[str] = None
    link_reference_type: Optional[str] = None
    link_reference_id: Optional[int] = None
    link_reference_display: Optional[str] = None


class PlainDiagnosticReportConclusionCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainDiagnosticReportPresentedForm(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class PlainDiagnosticReportResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: str
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    effective_datetime: Optional[str] = None
    effective_period_start: Optional[str] = None
    effective_period_end: Optional[str] = None
    issued: Optional[str] = None
    conclusion: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainDiagnosticReportIdentifier]] = None
    based_on: Optional[List[PlainDiagnosticReportBasedOn]] = None
    category: Optional[List[PlainDiagnosticReportCategory]] = None
    performer: Optional[List[PlainDiagnosticReportPerformer]] = None
    results_interpreter: Optional[List[PlainDiagnosticReportResultsInterpreter]] = None
    specimen: Optional[List[PlainDiagnosticReportSpecimen]] = None
    result: Optional[List[PlainDiagnosticReportResult]] = None
    imaging_study: Optional[List[PlainDiagnosticReportImagingStudy]] = None
    media: Optional[List[PlainDiagnosticReportMedia]] = None
    conclusion_code: Optional[List[PlainDiagnosticReportConclusionCode]] = None
    presented_form: Optional[List[PlainDiagnosticReportPresentedForm]] = None


class PaginatedDiagnosticReportResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    total: int
    limit: int
    offset: int
    data: List[PlainDiagnosticReportResponse]
