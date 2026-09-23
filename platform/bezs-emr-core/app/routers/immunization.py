from fastapi import APIRouter, Depends, Query, Request, status

from app.deps.immunization_deps import resolve_immunization
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.immunization import get_immunization_service
from app.models.immunization.immunization import ImmunizationModel
from app.schemas.immunization.input import ImmunizationCreateSchema, ImmunizationPatchSchema
from app.schemas.immunization.response import (
    FHIRImmunizationBundle,
    FHIRImmunizationSchema,
    PaginatedImmunizationResponse,
    PlainImmunizationResponse,
)
from app.services.immunization_service import ImmunizationService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Immunization not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainImmunizationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRImmunizationSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of Immunization resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedImmunizationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRImmunizationBundle.model_json_schema())},
        },
    }
}


# ── Create ────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_immunization",
    summary="Create a new Immunization resource",
    description=(
        "Creates a FHIR R4 Immunization resource representing a vaccination event. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Immunization resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_immunization(
    payload: ImmunizationCreateSchema,
    request: Request,
    service: ImmunizationService = Depends(get_immunization_service),
):
    created_by = payload.created_by
    imm = await service.create_immunization(payload, created_by)
    return format_response(
        service._to_fhir(imm),
        service._to_plain(imm),
        request,
    )





@router.get(
    "/{immunization_id}",
    operation_id="get_immunization",
    summary="Retrieve an Immunization by public identifier",
    description="Fetches a single Immunization resource by its public `immunization_id`. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_immunization(
    request: Request,
    imm: ImmunizationModel = Depends(resolve_immunization),
    service: ImmunizationService = Depends(get_immunization_service),
):
    return format_response(
        service._to_fhir(imm),
        service._to_plain(imm),
        request,
    )


# ── Patch ─────────────────────────────────────────────────────────────────────


@router.patch(
    "/{immunization_id}",
    operation_id="patch_immunization",
    summary="Partially update an Immunization",
    description=(
        "Updates an Immunization resource. Only supplied fields are changed. "
        "Child arrays (performers, notes, reactions, etc.) replace the existing list when included. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_immunization(
    payload: ImmunizationPatchSchema,
    request: Request,
    imm: ImmunizationModel = Depends(resolve_immunization),
    service: ImmunizationService = Depends(get_immunization_service),
):
    updated_by = payload.updated_by
    updated = await service.patch_immunization(imm, payload, updated_by)
    return format_response(
        service._to_fhir(updated),
        service._to_plain(updated),
        request,
    )


# ── List ──────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_immunizations",
    summary="List all Immunization resources",
    description=(
        "Returns a paginated list of all Immunization resources accessible to the caller. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_immunizations(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: ImmunizationService = Depends(get_immunization_service),
):
    total, rows = await service.list_immunizations(limit=limit, offset=offset)
    return format_paginated_response(
        [service._to_fhir(imm) for imm in rows],
        [service._to_plain(imm) for imm in rows],
        total, limit, offset, request,
    )


# ── Delete ────────────────────────────────────────────────────────────────────


@router.delete(
    "/{immunization_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_immunization",
    summary="Delete an Immunization resource",
    description="Permanently deletes an Immunization and all its related child records.",
    responses={**_ERR_NOT_FOUND},
)
async def delete_immunization(
    imm: ImmunizationModel = Depends(resolve_immunization),
    service: ImmunizationService = Depends(get_immunization_service),
):
    await service.delete_immunization(imm)
