from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.procedure_deps import resolve_procedure
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.procedure import get_procedure_service
from app.models.procedure.procedure import ProcedureModel
from app.schemas.procedure import ProcedureCreateSchema, ProcedurePatchSchema
from app.schemas.procedure.response import (
    FHIRProcedureSchema,
    FHIRProcedureBundle,
    PaginatedProcedureResponse,
    PlainProcedureResponse,
)
from app.services.procedure_service import ProcedureService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Procedure not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainProcedureResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRProcedureSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of procedures",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedProcedureResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRProcedureBundle.model_json_schema())},
        },
    }
}


# ── Create Procedure ───────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_procedure",
    summary="Create a new Procedure resource",
    description=(
        "Records an action that is or was performed on or for a patient. "
        "Requires `status`. Provide `subject` as a FHIR reference e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id` (public encounter_id). "
        "Supply `performed[x]` via one of: `performed_datetime`, `performed_period_*`, "
        "`performed_string`, `performed_age_*`, or `performed_range_*`. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Procedure resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_procedure(
    payload: ProcedureCreateSchema,
    request: Request,
    proc_service: ProcedureService = Depends(get_procedure_service),
):
    created_by = payload.created_by
    proc = await proc_service.create_procedure(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        proc_service._to_fhir(proc),
        proc_service._to_plain(proc),
        request,
    )


# Declared before /{procedure_id} to avoid routing conflicts.



@router.get(
    "/{procedure_id}",
    operation_id="get_procedure_by_id",
    summary="Retrieve a Procedure resource by public procedure_id",
    description=(
        "Fetches a single Procedure by its public integer `procedure_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested Procedure resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_procedure(
    request: Request,
    proc: ProcedureModel = Depends(resolve_procedure),
    proc_service: ProcedureService = Depends(get_procedure_service),
):
    return format_response(
        proc_service._to_fhir(proc),
        proc_service._to_plain(proc),
        request,
    )


# ── Patch Procedure ────────────────────────────────────────────────────────────


@router.patch(
    "/{procedure_id}",
    operation_id="patch_procedure",
    summary="Partially update a Procedure resource",
    description=(
        "Patchable fields: `status`, `status_reason_*`, `category_*`, `code_*`, "
        "`subject_display`, `encounter_display`, `performed_datetime`, `performed_period_*`, "
        "`performed_string`, `performed_age_*`, `performed_range_*`, `recorder_display`, "
        "`asserter_display`, `location_display`, `outcome_*`, `instantiates_canonical`, `instantiates_uri`. "
        "Child arrays (identifier, basedOn, partOf, performer, reasonCode, reasonReference, bodySite, "
        "report, complication, complicationDetail, followUp, note, focalDevice, usedReference, usedCode) "
        "cannot be changed via PATCH — delete and re-create the Procedure to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated Procedure resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_procedure(
    payload: ProcedurePatchSchema,
    request: Request,
    proc: ProcedureModel = Depends(resolve_procedure),
    proc_service: ProcedureService = Depends(get_procedure_service),
):
    updated_by = payload.updated_by
    updated = await proc_service.patch_procedure(
        proc.procedure_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return format_response(
        proc_service._to_fhir(updated),
        proc_service._to_plain(updated),
        request,
    )


# ── List Procedures ────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_procedures",
    summary="List all Procedure resources",
    description=(
        "Returns a paginated list of Procedure resources. "
        "Filter by `status`, `patient_id`, `performed_from`, `performed_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Procedure resources",
    responses={**_LIST_200},
)
async def list_procedures(
    request: Request,
    proc_status: Optional[str] = Query(None, alias="status", description="Filter by status e.g. 'completed'."),
    patient_id: Optional[int] = Query(None, description="Filter by patient subject_id."),
    performed_from: Optional[datetime] = Query(None, description="Filter by performedDateTime >= this value."),
    performed_to: Optional[datetime] = Query(None, description="Filter by performedDateTime <= this value."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    proc_service: ProcedureService = Depends(get_procedure_service),
):
    items, total = await proc_service.list_procedures(
        user_id=user_id,
        org_id=org_id,
        proc_status=proc_status,
        patient_id=patient_id,
        performed_from=performed_from,
        performed_to=performed_to,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [proc_service._to_fhir(p) for p in items],
        [proc_service._to_plain(p) for p in items],
        total, limit, offset, request,
    )


# ── Delete Procedure ───────────────────────────────────────────────────────────


@router.delete(
    "/{procedure_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_procedure",
    summary="Delete a Procedure resource",
    description=(
        "Permanently deletes the Procedure and all its associated child records "
        "(identifier, basedOn, partOf, performer, reasonCode, reasonReference, bodySite, "
        "report, complication, complicationDetail, followUp, note, focalDevice, usedReference, usedCode). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_procedure(
    proc: ProcedureModel = Depends(resolve_procedure),
    proc_service: ProcedureService = Depends(get_procedure_service),
):
    await proc_service.delete_procedure(proc.procedure_id)
    return None
