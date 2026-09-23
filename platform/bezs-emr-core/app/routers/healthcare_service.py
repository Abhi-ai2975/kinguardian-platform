from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.healthcare_service_deps import resolve_healthcare_service
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.healthcare_service import get_healthcare_service_service
from app.models.healthcare_service.healthcare_service import HealthcareServiceModel
from app.schemas.healthcare_service import (
    HealthcareServiceCreateSchema,
    HealthcareServicePatchSchema,
)
from app.schemas.healthcare_service.response import (
    FHIRHealthcareServiceBundle,
    FHIRHealthcareServiceSchema,
    PaginatedHealthcareServiceResponse,
    PlainHealthcareServiceResponse,
)
from app.services.healthcare_service_service import HealthcareServiceService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "HealthcareService not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {
                "schema": inline_schema(PlainHealthcareServiceResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FHIRHealthcareServiceSchema.model_json_schema())
            },
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of healthcare services",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedHealthcareServiceResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FHIRHealthcareServiceBundle.model_json_schema())
            },
        },
    }
}


# ── Create HealthcareService ───────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_healthcare_service",
    summary="Create a new HealthcareService resource",
    description=(
        "Creates a FHIR R4 HealthcareService describing a specific healthcare service "
        "offered by an organization. Supports all R4 fields including categories, types, "
        "specialties, locations, telecom, eligibility, available times, and more. "
        + _CONTENT_NEG
    ),
    response_description="The newly created HealthcareService resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_healthcare_service(
    payload: HealthcareServiceCreateSchema,
    request: Request,
    hs_service: HealthcareServiceService = Depends(get_healthcare_service_service),
):
    created_by = payload.created_by
    hs = await hs_service.create_healthcare_service(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        hs_service._to_fhir(hs),
        hs_service._to_plain(hs),
        request,
    )


# Declared before /{healthcare_service_id} to avoid routing conflicts.



@router.get(
    "/{healthcare_service_id}",
    operation_id="get_healthcare_service_by_id",
    summary="Retrieve a HealthcareService resource by public healthcare_service_id",
    description=(
        "Fetches a single HealthcareService by its public integer `healthcare_service_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested HealthcareService resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_healthcare_service(
    request: Request,
    hs: HealthcareServiceModel = Depends(resolve_healthcare_service),
    hs_service: HealthcareServiceService = Depends(get_healthcare_service_service),
):
    return format_response(
        hs_service._to_fhir(hs),
        hs_service._to_plain(hs),
        request,
    )


# ── Patch HealthcareService ────────────────────────────────────────────────────


@router.patch(
    "/{healthcare_service_id}",
    operation_id="patch_healthcare_service",
    summary="Partially update a HealthcareService resource",
    description=(
        "Patchable scalar fields: `active`, `name`, `comment`, `extra_details`, "
        "`appointment_required`, `availability_exceptions`, and all `photo_*` attachment fields. "
        "Child arrays (category, type, specialty, location, telecom, etc.) and the "
        "`provided_by` reference cannot be changed via PATCH — delete and re-create the "
        "HealthcareService to change those. "
        + _CONTENT_NEG
    ),
    response_description="The updated HealthcareService resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_healthcare_service(
    payload: HealthcareServicePatchSchema,
    request: Request,
    hs: HealthcareServiceModel = Depends(resolve_healthcare_service),
    hs_service: HealthcareServiceService = Depends(get_healthcare_service_service),
):
    updated_by = payload.updated_by
    updated = await hs_service.patch_healthcare_service(
        hs.healthcare_service_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="HealthcareService not found")
    return format_response(
        hs_service._to_fhir(updated),
        hs_service._to_plain(updated),
        request,
    )


# ── List HealthcareServices ────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_healthcare_services",
    summary="List all HealthcareService resources",
    description=(
        "Returns a paginated list of HealthcareService resources. "
        "Filter by `active`, `name`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated HealthcareService resources",
    responses={**_LIST_200},
)
async def list_healthcare_services(
    request: Request,
    active: Optional[bool] = Query(None, description="Filter by active status."),
    name: Optional[str] = Query(None, description="Filter by service name (case-insensitive partial match)."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    hs_service: HealthcareServiceService = Depends(get_healthcare_service_service),
):
    items, total = await hs_service.list_healthcare_services(
        user_id=user_id, org_id=org_id,
        active=active, name=name,
        limit=limit, offset=offset,
    )
    return format_paginated_response(
        [hs_service._to_fhir(hs) for hs in items],
        [hs_service._to_plain(hs) for hs in items],
        total, limit, offset, request,
    )


# ── Delete HealthcareService ───────────────────────────────────────────────────


@router.delete(
    "/{healthcare_service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_healthcare_service",
    summary="Delete a HealthcareService resource",
    description=(
        "Permanently deletes the HealthcareService and all its associated child records. "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_healthcare_service(
    hs: HealthcareServiceModel = Depends(resolve_healthcare_service),
    hs_service: HealthcareServiceService = Depends(get_healthcare_service_service),
):
    await hs_service.delete_healthcare_service(hs.healthcare_service_id)
    return None
