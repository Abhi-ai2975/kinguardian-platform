"""
Response schemas for DiagnosticReport resources.

`extra="allow"` on every schema ensures forward-compatibility with fhir-server additions.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


# ── Plain sub-resource response schemas ───────────────────────────────────────


class PlainDiagnosticReportBasedOn(BaseModel):
    """Reference to the order this report fulfils."""

    model_config = ConfigDict(extra="allow")

    id: Optional[int] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDiagnosticReportPresentedForm(BaseModel):
    """Attached document (the actual report file)."""

    model_config = ConfigDict(extra="allow")

    id: Optional[int] = None
    content_type: Optional[str] = None
    language: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


# ── Top-level response schemas ────────────────────────────────────────────────


class DiagnosticReportResponse(BaseModel):
    """
    Plain snake_case response for a single DiagnosticReport.

    `extra="allow"` ensures forward-compatibility with fhir-server additions.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None
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
    based_on: Optional[List[PlainDiagnosticReportBasedOn]] = None
    presented_form: Optional[List[PlainDiagnosticReportPresentedForm]] = None
    category: Optional[List[Dict[str, Any]]] = None
    performer: Optional[List[Dict[str, Any]]] = None
    results_interpreter: Optional[List[Dict[str, Any]]] = None
    specimen: Optional[List[Dict[str, Any]]] = None
    result: Optional[List[Dict[str, Any]]] = None
    imaging_study: Optional[List[Dict[str, Any]]] = None
    media: Optional[List[Dict[str, Any]]] = None
    conclusion_code: Optional[List[Dict[str, Any]]] = None
    identifier: Optional[List[Dict[str, Any]]] = None


class PaginatedDiagnosticReportResponse(BaseModel):
    """Paginated list wrapper for DiagnosticReport resources."""

    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    offset: int
    data: List[DiagnosticReportResponse]
