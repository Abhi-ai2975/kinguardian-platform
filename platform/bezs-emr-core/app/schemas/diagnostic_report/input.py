from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DiagnosticReportIdentifierInput(BaseModel):
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
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'ServiceRequest/80001' or 'CarePlan/10001'.",
    )
    reference_display: Optional[str] = None


class DiagnosticReportCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DiagnosticReportPerformerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Practitioner/30001' or 'Organization/190001'.",
    )
    reference_display: Optional[str] = None


class DiagnosticReportResultsInterpreterInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Practitioner/30001' or 'Organization/190001'.",
    )
    reference_display: Optional[str] = None


class DiagnosticReportSpecimenInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to a Specimen e.g. 'Specimen/10001'.")
    reference_display: Optional[str] = None


class DiagnosticReportResultInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to an Observation e.g. 'Observation/160001'.")
    reference_display: Optional[str] = None


class DiagnosticReportImagingStudyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to an ImagingStudy e.g. 'ImagingStudy/10001'.")
    reference_display: Optional[str] = None


class DiagnosticReportMediaInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    comment: Optional[str] = None
    link_reference: str = Field(..., description="Reference to a Media resource e.g. 'Media/10001'.")
    link_reference_display: Optional[str] = None


class DiagnosticReportConclusionCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DiagnosticReportPresentedFormInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_type: Optional[str] = Field(None, description="MIME type e.g. 'application/pdf'.")
    language: Optional[str] = Field(None, description="BCP-47 language code e.g. 'en'.")
    data: Optional[str] = Field(None, description="Base64-encoded content.")
    url: Optional[str] = Field(None, description="URL where content is accessible.")
    size: Optional[int] = None
    hash: Optional[str] = Field(None, description="SHA-1 hash of the data (base64).")
    title: Optional[str] = None
    creation: Optional[datetime] = None


# ── Create / Patch ──────────────────────────────────────────────────────────────


class DiagnosticReportCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "status": "final",
                "code_system": "http://loinc.org",
                "code_code": "58410-2",
                "code_display": "CBC panel - Blood by Automated count",
                "subject": "Patient/10001",
                "encounter_id": 20001,
                "effective_datetime": "2026-05-17T08:00:00Z",
                "issued": "2026-05-17T10:30:00Z",
                "category": [
                    {
                        "coding_system": "http://terminology.hl7.org/CodeSystem/v2-0074",
                        "coding_code": "HM",
                        "coding_display": "Hematology",
                    }
                ],
                "conclusion": "All values within normal range.",
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # Required
    status: str = Field(
        ...,
        description="registered|partial|preliminary|final|amended|corrected|appended|cancelled|entered-in-error|unknown",
    )

    # code (1..1 CodeableConcept)
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
