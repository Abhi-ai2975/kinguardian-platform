"""
Input schemas for DiagnosticReport resource endpoints.

Three schemas cover the write/query surfaces:
  - DiagnosticReportCreateSchema  — POST /diagnostic-reports body
  - DiagnosticReportPatchSchema   — PATCH /diagnostic-reports/{id} body (scalar fields only)
  - ListDiagnosticReportsSchema   — GET /diagnostic-reports query parameters

Design notes:
  - `status` is the only required field on DiagnosticReportCreateSchema (FHIR R4 1..1).
    All other fields are optional — the fhir-server accepts a minimal POST with just status.
  - `based_on` links this report to a ServiceRequest or CarePlan (the order that was fulfilled).
  - `presented_form` holds the actual document attachment(s) — each item carries a `url`
    pointing to the file in FilNest and a `content_type` (MIME type).
  - List filters match the fhir-server GET: status, patient_id, issued_from, issued_to,
    user_id, org_id, limit, offset.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Sub-resource input schemas ────────────────────────────────────────────────


class DiagnosticReportIdentifierInput(BaseModel):
    """Business identifier for the DiagnosticReport."""

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


class DiagnosticReportBasedOnInput(BaseModel):
    """Reference to the order (ServiceRequest, CarePlan) this report fulfils."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'ServiceRequest/80001' or 'CarePlan/10001'.",
    )
    reference_display: Optional[str] = None


class DiagnosticReportCategoryInput(BaseModel):
    """Classification of the type of diagnostic service (e.g. Hematology, Radiology)."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DiagnosticReportPerformerInput(BaseModel):
    """Practitioner or Organisation responsible for the diagnostic report."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Practitioner/30001' or 'Organization/190001'.",
    )
    reference_display: Optional[str] = None


class DiagnosticReportResultsInterpreterInput(BaseModel):
    """Practitioner or Organisation who interpreted the results."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Practitioner/30001' or 'Organization/190001'.",
    )
    reference_display: Optional[str] = None


class DiagnosticReportSpecimenInput(BaseModel):
    """Specimen used in the diagnostic investigation."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Reference to a Specimen e.g. 'Specimen/10001'.")
    reference_display: Optional[str] = None


class DiagnosticReportResultInput(BaseModel):
    """Reference to an Observation that is a result of this report."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Reference to an Observation e.g. 'Observation/160001'.")
    reference_display: Optional[str] = None


class DiagnosticReportImagingStudyInput(BaseModel):
    """Reference to an ImagingStudy associated with this report."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Reference to an ImagingStudy e.g. 'ImagingStudy/10001'.")
    reference_display: Optional[str] = None


class DiagnosticReportMediaInput(BaseModel):
    """Key images associated with this report."""

    model_config = ConfigDict(extra="forbid")

    comment: Optional[str] = None
    link_reference: str = Field(..., description="Reference to a Media resource e.g. 'Media/10001'.")
    link_reference_display: Optional[str] = None


class DiagnosticReportConclusionCodeInput(BaseModel):
    """Coded representation of the clinical conclusion."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DiagnosticReportPresentedFormInput(BaseModel):
    """
    Attached document (the actual report file).

    For patient uploads via FilNest, provide `url` (the FilNest file URL) and
    `content_type` (MIME type e.g. 'application/pdf'). `title` is optional but
    recommended for display purposes.
    """

    model_config = ConfigDict(extra="forbid")

    content_type: Optional[str] = Field(None, description="MIME type e.g. 'application/pdf'.")
    language: Optional[str] = Field(None, description="BCP-47 language code e.g. 'en'.")
    data: Optional[str] = Field(None, description="Base64-encoded content (use url instead where possible).")
    url: Optional[str] = Field(None, description="URL where the document is accessible e.g. FilNest URL.")
    size: Optional[int] = None
    hash: Optional[str] = Field(None, description="SHA-1 hash of the data (base64).")
    title: Optional[str] = None
    creation: Optional[datetime] = None


# ── Create / Patch / List ─────────────────────────────────────────────────────


class DiagnosticReportCreateSchema(BaseModel):
    """
    Full create body for a DiagnosticReport resource.

    `status` is required (FHIR R4 1..1). All other fields are optional.
    Use `based_on` to link to the ServiceRequest that triggered this report.
    Use `presented_form` to attach the result document (FilNest URL).
    """

    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # Required — FHIR R4 DiagnosticReport.status is 1..1
    status: str = Field(
        ...,
        description=(
            "registered | partial | preliminary | final | amended | "
            "corrected | appended | cancelled | entered-in-error | unknown"
        ),
    )

    # code (1..1 CodeableConcept — optional here for flexibility)
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

    # effective[x]
    effective_datetime: Optional[datetime] = None
    effective_period_start: Optional[datetime] = None
    effective_period_end: Optional[datetime] = None

    # issued
    issued: Optional[datetime] = None

    # conclusion
    conclusion: Optional[str] = None

    # child arrays
    identifier: Optional[List[DiagnosticReportIdentifierInput]] = None
    based_on: Optional[List[DiagnosticReportBasedOnInput]] = None
    category: Optional[List[DiagnosticReportCategoryInput]] = None
    performer: Optional[List[DiagnosticReportPerformerInput]] = None
    results_interpreter: Optional[List[DiagnosticReportResultsInterpreterInput]] = None
    specimen: Optional[List[DiagnosticReportSpecimenInput]] = None
    result: Optional[List[DiagnosticReportResultInput]] = None
    imaging_study: Optional[List[DiagnosticReportImagingStudyInput]] = None
    media: Optional[List[DiagnosticReportMediaInput]] = None
    conclusion_code: Optional[List[DiagnosticReportConclusionCodeInput]] = None
    presented_form: Optional[List[DiagnosticReportPresentedFormInput]] = None


class DiagnosticReportPatchSchema(BaseModel):
    """
    Partial update body for a DiagnosticReport.

    Only scalar fields are patchable. Child arrays (identifier, based_on, category,
    performer, results_interpreter, specimen, result, imaging_study, media,
    conclusion_code, presented_form) are immutable after creation on the fhir-server —
    delete and re-create the DiagnosticReport to change those.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    subject_display: Optional[str] = None
    encounter_display: Optional[str] = None
    effective_datetime: Optional[datetime] = None
    effective_period_start: Optional[datetime] = None
    effective_period_end: Optional[datetime] = None
    issued: Optional[datetime] = None
    conclusion: Optional[str] = None
    updated_by: Optional[str] = None


class ListDiagnosticReportsSchema(BaseModel):
    """
    Query parameters for GET /diagnostic-reports.

    Mirrors the fhir-server list endpoint: status, patient_id, issued_from,
    issued_to, user_id, org_id, limit, offset.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = Field(None, description="Filter by status e.g. 'final'.")
    patient_id: Optional[int] = Field(None, description="Filter by patient subject_id.")
    issued_from: Optional[datetime] = Field(None, description="Return reports issued on or after this datetime.")
    issued_to: Optional[datetime] = Field(None, description="Return reports issued on or before this datetime.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)
