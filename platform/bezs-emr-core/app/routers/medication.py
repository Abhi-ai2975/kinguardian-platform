from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app.deps.medication_deps import resolve_medication
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.medication import get_medication_service
from app.models.medication.medication import MedicationModel
from app.schemas.medication.input import MedicationCreateSchema, MedicationPatchSchema
from app.schemas.medication.response import (
    FHIRMedicationBundle,
    FHIRMedicationSchema,
    PaginatedMedicationResponse,
    PlainMedicationResponse,
)
from app.services.medication_service import MedicationService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Medication not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainMedicationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRMedicationSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of medication resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedMedicationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRMedicationBundle.model_json_schema())},
        },
    }
}


# ── Create ─────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_medication",
    summary="Create a new Medication resource",
    description=(
        "Creates a FHIR R4 Medication resource. "
        "Optional fields: `code`, `status` (active | inactive | entered-in-error), `form`, "
        "`manufacturer`, `amount` (Ratio), `batch`, `ingredients`. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Medication resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_medication(
    payload: MedicationCreateSchema,
    request: Request,
    medication_service: MedicationService = Depends(get_medication_service),
):
    created_by = payload.created_by
    medication = await medication_service.create_medication(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        medication_service._to_fhir(medication),
        medication_service._to_plain(medication),
        request,
    )


# ── Get my medications ─────────────────────────────────────────────────────────



@router.get(
    "/{medication_id}",
    operation_id="get_medication",
    summary="Retrieve a single Medication by public ID",
    description="Fetches a single Medication resource by its public medication_id. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_medication(
    request: Request,
    medication: MedicationModel = Depends(resolve_medication),
    medication_service: MedicationService = Depends(get_medication_service),
):
    return format_response(
        medication_service._to_fhir(medication),
        medication_service._to_plain(medication),
        request,
    )


# ── Patch ──────────────────────────────────────────────────────────────────────


@router.patch(
    "/{medication_id}",
    operation_id="patch_medication",
    summary="Partially update a Medication resource",
    description="Updates scalar fields on a Medication. Child arrays (ingredients, identifiers) are not modified via PATCH.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def patch_medication(
    request: Request,
    payload: MedicationPatchSchema,
    medication: MedicationModel = Depends(resolve_medication),
    medication_service: MedicationService = Depends(get_medication_service),
):
    updated_by = payload.updated_by
    updated = await medication_service.patch_medication(medication.medication_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return format_response(
        medication_service._to_fhir(updated),
        medication_service._to_plain(updated),
        request,
    )


# ── List ───────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_medications",
    summary="List Medication resources",
    description="Returns a paginated list of Medication resources. " + _CONTENT_NEG,
    responses={**_LIST_200},
)
async def list_medications(
    request: Request,
    medication_status: Optional[str] = Query(None, alias="status", description="Filter by status."),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    medication_service: MedicationService = Depends(get_medication_service),
):
    rows, total = await medication_service.list_medications(
        medication_status=medication_status, limit=limit, offset=offset
    )
    return format_paginated_response(
        [medication_service._to_fhir(r) for r in rows],
        [medication_service._to_plain(r) for r in rows],
        total, limit, offset, request,
    )


# ── Delete ─────────────────────────────────────────────────────────────────────


@router.delete(
    "/{medication_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_medication",
    summary="Delete a Medication resource",
    description="Permanently deletes a Medication and all its child resources (ingredients, identifiers).",
    responses={**_ERR_NOT_FOUND, 204: {"description": "Medication deleted"}},
)
async def delete_medication(
    medication: MedicationModel = Depends(resolve_medication),
    medication_service: MedicationService = Depends(get_medication_service),
):
    await medication_service.delete_medication(medication.medication_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
