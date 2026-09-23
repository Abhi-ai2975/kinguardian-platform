from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.diagnostic_report_deps import resolve_diagnostic_report
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.diagnostic_report import get_diagnostic_report_service
from app.models.diagnostic_report.diagnostic_report import DiagnosticReportModel
from app.schemas.diagnostic_report import DiagnosticReportCreateSchema, DiagnosticReportPatchSchema
from app.schemas.diagnostic_report.response import (
    FHIRDiagnosticReportSchema,
    FHIRDiagnosticReportBundle,
    PaginatedDiagnosticReportResponse,
    PlainDiagnosticReportResponse,
)
from app.services.diagnostic_report_service import DiagnosticReportService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "DiagnosticReport not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainDiagnosticReportResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRDiagnosticReportSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of diagnostic reports",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedDiagnosticReportResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRDiagnosticReportBundle.model_json_schema())},
        },
    }
}


# ── Create DiagnosticReport ────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_diagnostic_report",
    summary="Create a new DiagnosticReport resource",
    description=(
        "Records the findings and interpretation of diagnostic tests performed on patients. "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id` (public encounter_id). "
        "The caller's `sub` and `activeOrganizationId` JWT claims are automatically bound. "
        + _CONTENT_NEG
    ),
    response_description="The newly created DiagnosticReport resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_diagnostic_report(
    payload: DiagnosticReportCreateSchema,
    request: Request,
    dr_service: DiagnosticReportService = Depends(get_diagnostic_report_service),
):
    created_by = payload.created_by
    dr = await dr_service.create_diagnostic_report(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        dr_service._to_fhir(dr),
        dr_service._to_plain(dr),
        request,
    )


# Declared before /{diagnostic_report_id} to avoid routing conflicts.



@router.get(
    "/{diagnostic_report_id}",
    operation_id="get_diagnostic_report_by_id",
    summary="Retrieve a DiagnosticReport resource by public diagnostic_report_id",
    description=(
        "Fetches a single DiagnosticReport by its public integer `diagnostic_report_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested DiagnosticReport resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_diagnostic_report(
    request: Request,
    dr: DiagnosticReportModel = Depends(resolve_diagnostic_report),
    dr_service: DiagnosticReportService = Depends(get_diagnostic_report_service),
):
    return format_response(
        dr_service._to_fhir(dr),
        dr_service._to_plain(dr),
        request,
    )


# ── Patch DiagnosticReport ─────────────────────────────────────────────────────


@router.patch(
    "/{diagnostic_report_id}",
    operation_id="patch_diagnostic_report",
    summary="Partially update a DiagnosticReport resource",
    description=(
        "Patchable fields: `status`, `code_*`, `subject_display`, `encounter_display`, "
        "`effective_datetime`, `effective_period_start`, `effective_period_end`, `issued`, `conclusion`. "
        "Child arrays (identifier, basedOn, category, performer, resultsInterpreter, specimen, result, "
        "imagingStudy, media, conclusionCode, presentedForm) cannot be changed via PATCH — "
        "delete and re-create the DiagnosticReport to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated DiagnosticReport resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_diagnostic_report(
    payload: DiagnosticReportPatchSchema,
    request: Request,
    dr: DiagnosticReportModel = Depends(resolve_diagnostic_report),
    dr_service: DiagnosticReportService = Depends(get_diagnostic_report_service),
):
    updated_by = payload.updated_by
    updated = await dr_service.patch_diagnostic_report(
        dr.diagnostic_report_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="DiagnosticReport not found")
    return format_response(
        dr_service._to_fhir(updated),
        dr_service._to_plain(updated),
        request,
    )


# ── List DiagnosticReports ─────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_diagnostic_reports",
    summary="List all DiagnosticReport resources",
    description=(
        "Returns a paginated list of DiagnosticReport resources. "
        "Filter by `status`, `patient_id`, `issued_from`, `issued_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated DiagnosticReport resources",
    responses={**_LIST_200},
)
async def list_diagnostic_reports(
    request: Request,
    dr_status: Optional[str] = Query(None, alias="status", description="Filter by status e.g. 'final'."),
    patient_id: Optional[int] = Query(None, description="Filter by patient subject_id."),
    issued_from: Optional[datetime] = Query(None),
    issued_to: Optional[datetime] = Query(None),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    dr_service: DiagnosticReportService = Depends(get_diagnostic_report_service),
):
    items, total = await dr_service.list_diagnostic_reports(
        user_id=user_id,
        org_id=org_id,
        dr_status=dr_status,
        patient_id=patient_id,
        issued_from=issued_from,
        issued_to=issued_to,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [dr_service._to_fhir(dr) for dr in items],
        [dr_service._to_plain(dr) for dr in items],
        total, limit, offset, request,
    )


# ── Delete DiagnosticReport ────────────────────────────────────────────────────


@router.delete(
    "/{diagnostic_report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_diagnostic_report",
    summary="Delete a DiagnosticReport resource",
    description=(
        "Permanently deletes the DiagnosticReport and all its associated child records "
        "(identifier, basedOn, category, performer, resultsInterpreter, specimen, result, "
        "imagingStudy, media, conclusionCode, presentedForm). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_diagnostic_report(
    dr: DiagnosticReportModel = Depends(resolve_diagnostic_report),
    dr_service: DiagnosticReportService = Depends(get_diagnostic_report_service),
):
    await dr_service.delete_diagnostic_report(dr.diagnostic_report_id)
    return None
