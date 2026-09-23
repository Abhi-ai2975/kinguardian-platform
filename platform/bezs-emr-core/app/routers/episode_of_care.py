from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status

from app.deps.episode_of_care_deps import resolve_episode_of_care
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.episode_of_care import get_episode_of_care_service
from app.models.episode_of_care.enums import EpisodeOfCareStatus
from app.models.episode_of_care.episode_of_care import EpisodeOfCareModel
from app.schemas.episode_of_care.input import EpisodeOfCareCreateSchema, EpisodeOfCarePatchSchema
from app.schemas.episode_of_care.response import (
    FHIREpisodeOfCareBundle,
    FHIREpisodeOfCareSchema,
    PaginatedEpisodeOfCareResponse,
    PlainEpisodeOfCareResponse,
)
from app.services.episode_of_care_service import EpisodeOfCareService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "EpisodeOfCare not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainEpisodeOfCareResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIREpisodeOfCareSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of EpisodeOfCare resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedEpisodeOfCareResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIREpisodeOfCareBundle.model_json_schema())},
        },
    }
}


# ── Create ────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_episode_of_care",
    summary="Create a new EpisodeOfCare resource",
    description=(
        "Creates a FHIR R4 EpisodeOfCare resource grouping encounters for a patient "
        "around a specific care issue. " + _CONTENT_NEG
    ),
    response_description="The newly created EpisodeOfCare resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_episode_of_care(
    payload: EpisodeOfCareCreateSchema,
    request: Request,
    service: EpisodeOfCareService = Depends(get_episode_of_care_service),
):
    created_by = payload.created_by
    eoc = await service.create_episode_of_care(payload, created_by)
    return format_response(
        service._to_fhir(eoc),
        service._to_plain(eoc),
        request,
    )





@router.get(
    "/{episode_of_care_id}",
    operation_id="get_episode_of_care",
    summary="Retrieve an EpisodeOfCare by public identifier",
    description="Fetches a single EpisodeOfCare resource by its public `episode_of_care_id`. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_episode_of_care(
    request: Request,
    eoc: EpisodeOfCareModel = Depends(resolve_episode_of_care),
    service: EpisodeOfCareService = Depends(get_episode_of_care_service),
):
    return format_response(
        service._to_fhir(eoc),
        service._to_plain(eoc),
        request,
    )


# ── Patch ─────────────────────────────────────────────────────────────────────


@router.patch(
    "/{episode_of_care_id}",
    operation_id="patch_episode_of_care",
    summary="Partially update an EpisodeOfCare",
    description=(
        "Updates an EpisodeOfCare resource. Only supplied fields are changed. "
        "Child arrays (diagnoses, identifiers, etc.) replace the existing list when included. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_episode_of_care(
    payload: EpisodeOfCarePatchSchema,
    request: Request,
    eoc: EpisodeOfCareModel = Depends(resolve_episode_of_care),
    service: EpisodeOfCareService = Depends(get_episode_of_care_service),
):
    updated_by = payload.updated_by
    updated = await service.patch_episode_of_care(eoc, payload, updated_by)
    return format_response(
        service._to_fhir(updated),
        service._to_plain(updated),
        request,
    )


# ── List ──────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_episode_of_cares",
    summary="List all EpisodeOfCare resources",
    description=(
        "Returns a paginated list of all EpisodeOfCare resources accessible to the caller. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_episode_of_cares(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    episode_status: Optional[EpisodeOfCareStatus] = Query(None, alias="status"),
    patient_id: Optional[int] = Query(None),
    service: EpisodeOfCareService = Depends(get_episode_of_care_service),
):
    total, rows = await service.list_episode_of_cares(
        user_id=None,
        org_id=None,
        episode_status=episode_status,
        patient_id=patient_id,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [service._to_fhir(e) for e in rows],
        [service._to_plain(e) for e in rows],
        total, limit, offset, request,
    )


# ── Delete ────────────────────────────────────────────────────────────────────


@router.delete(
    "/{episode_of_care_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_episode_of_care",
    summary="Delete an EpisodeOfCare resource",
    description="Permanently deletes an EpisodeOfCare and all its related child records.",
    responses={**_ERR_NOT_FOUND},
)
async def delete_episode_of_care(
    eoc: EpisodeOfCareModel = Depends(resolve_episode_of_care),
    service: EpisodeOfCareService = Depends(get_episode_of_care_service),
):
    await service.delete_episode_of_care(eoc)
