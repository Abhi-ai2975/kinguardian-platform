from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app.deps.location_deps import resolve_location
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.location import get_location_service
from app.models.location.location import LocationModel
from app.schemas.location.input import LocationCreateSchema, LocationPatchSchema
from app.schemas.location.response import (
    FHIRLocationBundle,
    FHIRLocationSchema,
    PaginatedLocationResponse,
    PlainLocationResponse,
)
from app.services.location_service import LocationService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Location not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainLocationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRLocationSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of locations",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedLocationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRLocationBundle.model_json_schema())},
        },
    }
}


# ── Create ─────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_location",
    summary="Create a new Location resource",
    description=(
        "Creates a FHIR R4 Location resource. "
        "Optional field: `status` (active | suspended | inactive). "
        + _CONTENT_NEG
    ),
    response_description="The newly created Location resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_location(
    payload: LocationCreateSchema,
    request: Request,
    location_service: LocationService = Depends(get_location_service),
):
    created_by = payload.created_by
    location = await location_service.create_location(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        location_service._to_fhir(location),
        location_service._to_plain(location),
        request,
    )


# ── Get my locations ───────────────────────────────────────────────────────────



@router.get(
    "/{location_id}",
    operation_id="get_location",
    summary="Retrieve a single Location by public ID",
    description="Fetches a single Location resource by its public location_id. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_location(
    request: Request,
    location: LocationModel = Depends(resolve_location),
    location_service: LocationService = Depends(get_location_service),
):
    return format_response(
        location_service._to_fhir(location),
        location_service._to_plain(location),
        request,
    )


# ── Patch ──────────────────────────────────────────────────────────────────────


@router.patch(
    "/{location_id}",
    operation_id="patch_location",
    summary="Partially update a Location resource",
    description="Updates scalar fields on a Location. Child arrays are not modified via PATCH.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def patch_location(
    request: Request,
    payload: LocationPatchSchema,
    location: LocationModel = Depends(resolve_location),
    location_service: LocationService = Depends(get_location_service),
):
    updated_by = payload.updated_by
    updated = await location_service.patch_location(location.location_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return format_response(
        location_service._to_fhir(updated),
        location_service._to_plain(updated),
        request,
    )


# ── List ───────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_locations",
    summary="List Location resources",
    description="Returns a paginated list of Location resources. " + _CONTENT_NEG,
    responses={**_LIST_200},
)
async def list_locations(
    request: Request,
    org_id: Optional[str] = Query(None, description="Filter by organization ID."),
    location_status: Optional[str] = Query(None, alias="status", description="Filter by status."),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    location_service: LocationService = Depends(get_location_service),
):
    rows, total = await location_service.list_locations(
        org_id=org_id, location_status=location_status, limit=limit, offset=offset
    )
    return format_paginated_response(
        [location_service._to_fhir(r) for r in rows],
        [location_service._to_plain(r) for r in rows],
        total, limit, offset, request,
    )


# ── Delete ─────────────────────────────────────────────────────────────────────


@router.delete(
    "/{location_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_location",
    summary="Delete a Location resource",
    description="Permanently deletes a Location and all its child resources.",
    responses={**_ERR_NOT_FOUND, 204: {"description": "Location deleted"}},
)
async def delete_location(
    location: LocationModel = Depends(resolve_location),
    location_service: LocationService = Depends(get_location_service),
):
    await location_service.delete_location(location.location_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
