from fastapi import APIRouter, Depends, Query, Request, status

from app.deps.related_person_deps import resolve_related_person
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.related_person import get_related_person_service
from app.models.related_person.related_person import RelatedPersonModel
from app.schemas.related_person.input import RelatedPersonCreateSchema, RelatedPersonPatchSchema
from app.schemas.related_person.response import (
    FHIRRelatedPersonBundle,
    FHIRRelatedPersonSchema,
    PaginatedRelatedPersonResponse,
    PlainRelatedPersonResponse,
)
from app.services.related_person_service import RelatedPersonService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "RelatedPerson not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainRelatedPersonResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRRelatedPersonSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of RelatedPerson resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedRelatedPersonResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRRelatedPersonBundle.model_json_schema())},
        },
    }
}


# ── Create ────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_related_person",
    summary="Create a new RelatedPerson resource",
    description=(
        "Creates a FHIR R4 RelatedPerson resource. "
        "Optional fields include patient reference, relationship codes, names, telecoms, "
        "addresses, photos, period, identifiers, and communication preferences. "
        + _CONTENT_NEG
    ),
    response_description="The newly created RelatedPerson resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_related_person(
    payload: RelatedPersonCreateSchema,
    request: Request,
    service: RelatedPersonService = Depends(get_related_person_service),
):
    created_by = payload.created_by
    rp = await service.create_related_person(payload, payload.user_id, payload.org_id, created_by)
    return format_response(
        service._to_fhir(rp),
        service._to_plain(rp),
        request,
    )





@router.get(
    "/{related_person_id}",
    operation_id="get_related_person",
    summary="Retrieve a RelatedPerson by public identifier",
    description="Fetches a single RelatedPerson resource by its public `related_person_id`. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_related_person(
    request: Request,
    rp: RelatedPersonModel = Depends(resolve_related_person),
    service: RelatedPersonService = Depends(get_related_person_service),
):
    return format_response(
        service._to_fhir(rp),
        service._to_plain(rp),
        request,
    )


# ── Patch ─────────────────────────────────────────────────────────────────────


@router.patch(
    "/{related_person_id}",
    operation_id="patch_related_person",
    summary="Partially update a RelatedPerson",
    description=(
        "Updates a RelatedPerson resource. Only supplied fields are changed. "
        "Child arrays (names, telecoms, addresses, etc.) replace the existing list when included. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_related_person(
    payload: RelatedPersonPatchSchema,
    request: Request,
    rp: RelatedPersonModel = Depends(resolve_related_person),
    service: RelatedPersonService = Depends(get_related_person_service),
):
    updated_by = payload.updated_by
    updated = await service.patch_related_person(rp.related_person_id, payload, updated_by)
    return format_response(
        service._to_fhir(updated),
        service._to_plain(updated),
        request,
    )


# ── List ──────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_related_persons",
    summary="List all RelatedPerson resources",
    description=(
        "Returns a paginated list of all RelatedPerson resources accessible to the caller. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_related_persons(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: RelatedPersonService = Depends(get_related_person_service),
):
    rows, total = await service.list_related_persons(limit=limit, offset=offset)
    return format_paginated_response(
        [service._to_fhir(rp) for rp in rows],
        [service._to_plain(rp) for rp in rows],
        total, limit, offset, request,
    )


# ── Delete ────────────────────────────────────────────────────────────────────


@router.delete(
    "/{related_person_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_related_person",
    summary="Delete a RelatedPerson resource",
    description="Permanently deletes a RelatedPerson and all its related child records.",
    responses={**_ERR_NOT_FOUND},
)
async def delete_related_person(
    rp: RelatedPersonModel = Depends(resolve_related_person),
    service: RelatedPersonService = Depends(get_related_person_service),
):
    await service.delete_related_person(rp.related_person_id)
