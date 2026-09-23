from fastapi import APIRouter, Depends, Query, Request, status

from app.deps.specimen_deps import resolve_specimen
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.specimen import get_specimen_service
from app.models.specimen.specimen import SpecimenModel
from app.schemas.specimen.input import SpecimenCreateSchema, SpecimenPatchSchema
from app.schemas.specimen.response import (
    FHIRSpecimenBundle,
    FHIRSpecimenSchema,
    PaginatedSpecimenResponse,
    PlainSpecimenResponse,
)
from app.services.specimen_service import SpecimenService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Specimen not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainSpecimenResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRSpecimenSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of Specimen resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedSpecimenResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRSpecimenBundle.model_json_schema())},
        },
    }
}


# ── Create ────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_specimen",
    summary="Create a new Specimen resource",
    description=(
        "Creates a FHIR R4 Specimen resource. "
        "Supports collection details, processing steps, containers, conditions, and annotations. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Specimen resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_specimen(
    payload: SpecimenCreateSchema,
    request: Request,
    service: SpecimenService = Depends(get_specimen_service),
):
    created_by = payload.created_by
    sp = await service.create_specimen(payload, payload.user_id, payload.org_id, created_by)
    return format_response(
        service._to_fhir(sp),
        service._to_plain(sp),
        request,
    )





@router.get(
    "/{specimen_id}",
    operation_id="get_specimen",
    summary="Retrieve a Specimen by public identifier",
    description="Fetches a single Specimen resource by its public `specimen_id`. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_specimen(
    request: Request,
    sp: SpecimenModel = Depends(resolve_specimen),
    service: SpecimenService = Depends(get_specimen_service),
):
    return format_response(
        service._to_fhir(sp),
        service._to_plain(sp),
        request,
    )


# ── Patch ─────────────────────────────────────────────────────────────────────


@router.patch(
    "/{specimen_id}",
    operation_id="patch_specimen",
    summary="Partially update a Specimen",
    description=(
        "Updates a Specimen resource. Only supplied fields are changed. "
        "Child arrays (processing, containers, conditions, etc.) replace the existing list when included. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_specimen(
    payload: SpecimenPatchSchema,
    request: Request,
    sp: SpecimenModel = Depends(resolve_specimen),
    service: SpecimenService = Depends(get_specimen_service),
):
    updated_by = payload.updated_by
    updated = await service.patch_specimen(sp.specimen_id, payload, updated_by)
    return format_response(
        service._to_fhir(updated),
        service._to_plain(updated),
        request,
    )


# ── List ──────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_specimens",
    summary="List all Specimen resources",
    description=(
        "Returns a paginated list of all Specimen resources accessible to the caller. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_specimens(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: SpecimenService = Depends(get_specimen_service),
):
    rows, total = await service.list_specimens(limit=limit, offset=offset)
    return format_paginated_response(
        [service._to_fhir(sp) for sp in rows],
        [service._to_plain(sp) for sp in rows],
        total, limit, offset, request,
    )


# ── Delete ────────────────────────────────────────────────────────────────────


@router.delete(
    "/{specimen_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_specimen",
    summary="Delete a Specimen resource",
    description="Permanently deletes a Specimen and all its related child records.",
    responses={**_ERR_NOT_FOUND},
)
async def delete_specimen(
    sp: SpecimenModel = Depends(resolve_specimen),
    service: SpecimenService = Depends(get_specimen_service),
):
    await service.delete_specimen(sp.specimen_id)
