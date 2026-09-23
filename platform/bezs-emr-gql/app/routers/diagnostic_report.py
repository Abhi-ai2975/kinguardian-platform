"""
FastAPI router for DiagnosticReport resources.

Endpoints:
  POST   /diagnostic-reports/        — create with all child arrays in the body
  GET    /diagnostic-reports/{id}    — fetch a single DiagnosticReport by integer ID
  GET    /diagnostic-reports/        — paginated list with optional filters
  PATCH  /diagnostic-reports/{id}    — partial update (scalar fields only)
  DELETE /diagnostic-reports/{id}    — permanent delete (cascades to all child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("diagnostic_report", <action>) pair.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.diagnostic_report import get_diagnostic_report_service
from app.schemas.diagnostic_report.fhir_schemas import FhirBundleResponse, FhirDiagnosticReportResponse
from app.schemas.diagnostic_report.input import (
    DiagnosticReportCreateSchema,
    DiagnosticReportPatchSchema,
    ListDiagnosticReportsSchema,
)
from app.schemas.diagnostic_report.response import DiagnosticReportResponse, PaginatedDiagnosticReportResponse
from app.services.diagnostic_report_service import DiagnosticReportService

# All diagnostic report routes are prefixed with /diagnostic-reports; tagged for Swagger grouping.
router = APIRouter(prefix="/diagnostic-reports", tags=["DiagnosticReports"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "DiagnosticReport not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────

_SINGLE_201 = {
    201: {
        "description": "DiagnosticReport created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(DiagnosticReportResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirDiagnosticReportResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "DiagnosticReport retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(DiagnosticReportResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirDiagnosticReportResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of DiagnosticReport resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedDiagnosticReportResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /diagnostic-reports/ ────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_diagnostic_report",
    summary="Create a DiagnosticReport",
    description=(
        "Creates a new DiagnosticReport — the findings and interpretation of a diagnostic test "
        "performed on a patient. "
        "Use `based_on` to link to the ServiceRequest that ordered the test. "
        "Use `presented_form` to attach the result document (FilNest URL, MIME type, title). "
        "All child arrays (identifier, based_on, category, performer, results_interpreter, "
        "specimen, result, imaging_study, media, conclusion_code, presented_form) are submitted "
        "in the single request body — no separate sub-resource routes exist. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("diagnostic_report", "create"))],
)
async def create_diagnostic_report(
    dto: DiagnosticReportCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("diagnostic_report", "create")),
    service: DiagnosticReportService = Depends(get_diagnostic_report_service),
) -> JSONResponse:
    """Create a new DiagnosticReport resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /diagnostic-reports/{resource_id} ────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_diagnostic_report",
    summary="Get a DiagnosticReport by ID",
    description=(
        "Fetch a single DiagnosticReport by its integer ID. "
        "The response includes all child arrays (based_on, category, performer, "
        "results_interpreter, specimen, result, imaging_study, media, conclusion_code, "
        "presented_form). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("diagnostic_report", "read"))],
)
async def get_diagnostic_report(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("diagnostic_report", "read")),
    service: DiagnosticReportService = Depends(get_diagnostic_report_service),
) -> JSONResponse:
    """Fetch a single DiagnosticReport resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /diagnostic-reports/ ─────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_diagnostic_reports",
    summary="List DiagnosticReports",
    description=(
        "Returns a paginated list of DiagnosticReport resources. "
        "Filter by `status`, `patient_id`, `issued_from`, `issued_to`, `user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("diagnostic_report", "read"))],
)
async def list_diagnostic_reports(
    request: Request,
    filters: ListDiagnosticReportsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("diagnostic_report", "read")),
    service: DiagnosticReportService = Depends(get_diagnostic_report_service),
) -> JSONResponse:
    """Return a paginated list of DiagnosticReports, optionally filtered."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /diagnostic-reports/{resource_id} ──────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_diagnostic_report",
    summary="Partially update a DiagnosticReport",
    description=(
        "Update specific scalar fields on a DiagnosticReport. At least one field must be provided. "
        "Patchable fields: `status`, `code_*`, `subject_display`, `encounter_display`, "
        "`effective_datetime`, `effective_period_start`, `effective_period_end`, `issued`, `conclusion`. "
        "Child arrays (identifier, based_on, category, performer, results_interpreter, specimen, "
        "result, imaging_study, media, conclusion_code, presented_form) are immutable after creation "
        "— delete and re-create the DiagnosticReport to change those. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("diagnostic_report", "update"))],
)
async def update_diagnostic_report(
    resource_id: int,
    dto: DiagnosticReportPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("diagnostic_report", "update")),
    service: DiagnosticReportService = Depends(get_diagnostic_report_service),
) -> JSONResponse:
    """Partially update a DiagnosticReport resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /diagnostic-reports/{resource_id} ─────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_diagnostic_report",
    summary="Delete a DiagnosticReport",
    description=(
        "Permanently deletes the DiagnosticReport and all its child records "
        "(identifier, based_on, category, performer, results_interpreter, specimen, result, "
        "imaging_study, media, conclusion_code, presented_form). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("diagnostic_report", "delete"))],
)
async def delete_diagnostic_report(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("diagnostic_report", "delete")),
    service: DiagnosticReportService = Depends(get_diagnostic_report_service),
) -> None:
    """Permanently delete a DiagnosticReport and cascade to all child records."""
    await service.delete(resource_id, actor)
