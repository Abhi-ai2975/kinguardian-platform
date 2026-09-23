from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.organization_deps import resolve_organization
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.organization import get_organization_service
from app.models.organization.organization import OrganizationModel
from app.schemas.organization import OrganizationCreateSchema, OrganizationPatchSchema
from app.schemas.organization.response import (
    FHIROrganizationSchema,
    FHIROrganizationBundle,
    PaginatedOrganizationResponse,
    PlainOrganizationResponse,
)
from app.services.organization_service import OrganizationService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Organization not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainOrganizationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIROrganizationSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of organizations",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedOrganizationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIROrganizationBundle.model_json_schema())},
        },
    }
}


# ── Create Organization ────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_organization",
    summary="Create a new Organization resource",
    description=(
        "Records a formally or informally recognized grouping of people or organizations "
        "formed for the purpose of achieving some form of collective action. "
        "Optionally link to a parent organization via `partof` (e.g. `'Organization/190001'`). "
        "Supply `identifier`, `type`, `alias`, `telecom`, `address`, `contact`, and `endpoint` arrays. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Organization resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_organization(
    payload: OrganizationCreateSchema,
    request: Request,
    org_service: OrganizationService = Depends(get_organization_service),
):
    created_by = payload.created_by
    org = await org_service.create_organization(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        org_service._to_fhir(org),
        org_service._to_plain(org),
        request,
    )


# Declared before /{organization_id} to avoid routing conflicts.



@router.get(
    "/{organization_id}",
    operation_id="get_organization_by_id",
    summary="Retrieve an Organization resource by public organization_id",
    description=(
        "Fetches a single Organization by its public integer `organization_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested Organization resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_organization(
    request: Request,
    org: OrganizationModel = Depends(resolve_organization),
    org_service: OrganizationService = Depends(get_organization_service),
):
    return format_response(
        org_service._to_fhir(org),
        org_service._to_plain(org),
        request,
    )


# ── Patch Organization ─────────────────────────────────────────────────────────


@router.patch(
    "/{organization_id}",
    operation_id="patch_organization",
    summary="Partially update an Organization resource",
    description=(
        "Patchable fields: `active`, `name`, `partof_display`. "
        "Child arrays (identifier, type, alias, telecom, address, contact, endpoint) "
        "cannot be changed via PATCH — delete and re-create the Organization to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated Organization resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_organization(
    payload: OrganizationPatchSchema,
    request: Request,
    org: OrganizationModel = Depends(resolve_organization),
    org_service: OrganizationService = Depends(get_organization_service),
):
    updated_by = payload.updated_by
    updated = await org_service.patch_organization(
        org.organization_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Organization not found")
    return format_response(
        org_service._to_fhir(updated),
        org_service._to_plain(updated),
        request,
    )


# ── List Organizations ─────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_organizations",
    summary="List all Organization resources",
    description=(
        "Returns a paginated list of Organization resources. "
        "Filter by `active`, `name` (substring), `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Organization resources",
    responses={**_LIST_200},
)
async def list_organizations(
    request: Request,
    active: Optional[bool] = Query(None, description="Filter by active status."),
    name: Optional[str] = Query(None, description="Case-insensitive substring match on organization name."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    org_service: OrganizationService = Depends(get_organization_service),
):
    items, total = await org_service.list_organizations(
        user_id=user_id,
        org_id=org_id,
        active=active,
        name=name,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [org_service._to_fhir(org) for org in items],
        [org_service._to_plain(org) for org in items],
        total, limit, offset, request,
    )


# ── Delete Organization ────────────────────────────────────────────────────────


@router.delete(
    "/{organization_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_organization",
    summary="Delete an Organization resource",
    description=(
        "Permanently deletes the Organization and all its associated child records "
        "(identifier, type, alias, telecom, address, contact and their nested telecoms, endpoint). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_organization(
    org: OrganizationModel = Depends(resolve_organization),
    org_service: OrganizationService = Depends(get_organization_service),
):
    await org_service.delete_organization(org.organization_id)
    return None
