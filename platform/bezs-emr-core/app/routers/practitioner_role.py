from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.practitioner_role_deps import resolve_practitioner_role
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.practitioner_role import get_practitioner_role_service
from app.models.practitioner_role.practitioner_role import PractitionerRoleModel
from app.schemas.practitioner_role import PractitionerRoleCreateSchema, PractitionerRolePatchSchema
from app.schemas.practitioner_role.response import (
    FHIRPractitionerRoleSchema,
    FHIRPractitionerRoleBundle,
    FHIRPractitionerBookingBundle,
    PaginatedPractitionerRoleResponse,
    PaginatedPractitionerBookingResponse,
    PlainPractitionerRoleResponse,
)
from app.services.practitioner_role_service import PractitionerRoleService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "PractitionerRole not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainPractitionerRoleResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRPractitionerRoleSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of practitioner roles",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedPractitionerRoleResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRPractitionerRoleBundle.model_json_schema())},
        },
    }
}
_BOOKING_LIST_200 = {
    200: {
        "description": "Paginated list of practitioners for appointment booking",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedPractitionerBookingResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRPractitionerBookingBundle.model_json_schema())},
        },
    }
}


# ── Create PractitionerRole ────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_practitioner_role",
    summary="Create a new PractitionerRole resource",
    description=(
        "A specific set of roles/specialties/services a practitioner may perform at an organization. "
        "Optionally link to a `practitioner` (e.g. `'Practitioner/30001'`) and/or `organization`. "
        "Supply `code`, `specialty`, `location`, `healthcareService`, `contact`, `availability`, "
        "`endpoint`, `characteristic`, `communication`, and `identifier` arrays as needed. "
        + _CONTENT_NEG
    ),
    response_description="The newly created PractitionerRole resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_practitioner_role(
    payload: PractitionerRoleCreateSchema,
    request: Request,
    pr_service: PractitionerRoleService = Depends(get_practitioner_role_service),
):
    created_by = payload.created_by
    pr = await pr_service.create_practitioner_role(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        pr_service._to_fhir(pr),
        pr_service._to_plain(pr),
        request,
    )


# Declared before /{practitioner_role_id} to avoid routing conflicts.



@router.get(
    "/booking",
    operation_id="list_practitioner_roles_for_booking",
    summary="List practitioners available for appointment booking",
    description=(
        "Returns active PractitionerRole resources enriched with the linked Practitioner's name, "
        "gender, photo, and qualifications. Includes specialty, availability schedule "
        "(availableTime / notAvailableTime), location, and healthcare services — everything a "
        "booking UI needs in one call. "
        "Scoped to the caller's organization via JWT `activeOrganizationId`. "
        "Filter by `specialty_code` (SNOMED code) and/or `day_of_week` (mon/tue/wed/thu/fri/sat/sun). "
        "FHIR response embeds the Practitioner as a `contained` resource referenced by `#pr`. "
        + _CONTENT_NEG
    ),
    responses={**_BOOKING_LIST_200},
)
async def list_practitioner_roles_for_booking(
    request: Request,
    specialty_code: Optional[str] = Query(
        None,
        description="Filter by SNOMED specialty code, e.g. '394814009' (General Practice).",
    ),
    day_of_week: Optional[str] = Query(
        None,
        description="Filter by available day: mon | tue | wed | thu | fri | sat | sun.",
    ),
    active: bool = Query(True, description="Filter by active status (default: true)."),
    org_id: Optional[str] = Query(None, description="Filter by organization ID."),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    pr_service: PractitionerRoleService = Depends(get_practitioner_role_service),
):
    items, total, loc_lookup, hs_lookup = await pr_service.list_for_booking(
        active=active,
        org_id=org_id,
        specialty_code=specialty_code,
        day_of_week=day_of_week,
        limit=limit,
        offset=offset,
    )
    fhir_items = [pr_service._to_fhir_booking(p, loc_lookup, hs_lookup) for p in items]
    plain_items = [pr_service._to_plain_booking(p, loc_lookup, hs_lookup) for p in items]
    return format_paginated_response(fhir_items, plain_items, total, limit, offset, request)


# ── Get PractitionerRole by public practitioner_role_id ───────────────────────


@router.get(
    "/{practitioner_role_id}",
    operation_id="get_practitioner_role_by_id",
    summary="Retrieve a PractitionerRole resource by public practitioner_role_id",
    description=(
        "Fetches a single PractitionerRole by its public integer `practitioner_role_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested PractitionerRole resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_practitioner_role(
    request: Request,
    pr: PractitionerRoleModel = Depends(resolve_practitioner_role),
    pr_service: PractitionerRoleService = Depends(get_practitioner_role_service),
):
    return format_response(
        pr_service._to_fhir(pr),
        pr_service._to_plain(pr),
        request,
    )


# ── Patch PractitionerRole ─────────────────────────────────────────────────────


@router.patch(
    "/{practitioner_role_id}",
    operation_id="patch_practitioner_role",
    summary="Partially update a PractitionerRole resource",
    description=(
        "Patchable fields: `active`, `period_start`, `period_end`, `availability_exceptions`. "
        "Child arrays (identifier, code, specialty, location, healthcareService, characteristic, "
        "communication, contact, availability, endpoint) and the `practitioner`/`organization` "
        "references cannot be changed via PATCH — delete and re-create to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated PractitionerRole resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_practitioner_role(
    payload: PractitionerRolePatchSchema,
    request: Request,
    pr: PractitionerRoleModel = Depends(resolve_practitioner_role),
    pr_service: PractitionerRoleService = Depends(get_practitioner_role_service),
):
    updated_by = payload.updated_by
    updated = await pr_service.patch_practitioner_role(
        pr.practitioner_role_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="PractitionerRole not found")
    return format_response(
        pr_service._to_fhir(updated),
        pr_service._to_plain(updated),
        request,
    )


# ── List PractitionerRoles ─────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_practitioner_roles",
    summary="List all PractitionerRole resources",
    description=(
        "Returns a paginated list of PractitionerRole resources. "
        "Filter by `active`, `practitioner_id`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated PractitionerRole resources",
    responses={**_LIST_200},
)
async def list_practitioner_roles(
    request: Request,
    active: Optional[bool] = Query(None, description="Filter by active status."),
    practitioner_id: Optional[int] = Query(None, description="Filter by public practitioner_id."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    pr_service: PractitionerRoleService = Depends(get_practitioner_role_service),
):
    items, total = await pr_service.list_practitioner_roles(
        user_id=user_id, org_id=org_id,
        active=active, practitioner_id=practitioner_id,
        limit=limit, offset=offset,
    )
    return format_paginated_response(
        [pr_service._to_fhir(p) for p in items],
        [pr_service._to_plain(p) for p in items],
        total, limit, offset, request,
    )


# ── Delete PractitionerRole ────────────────────────────────────────────────────


@router.delete(
    "/{practitioner_role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_role",
    summary="Delete a PractitionerRole resource",
    description=(
        "Permanently deletes the PractitionerRole and all its associated child records. "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_practitioner_role(
    pr: PractitionerRoleModel = Depends(resolve_practitioner_role),
    pr_service: PractitionerRoleService = Depends(get_practitioner_role_service),
):
    await pr_service.delete_practitioner_role(pr.practitioner_role_id)
    return None
