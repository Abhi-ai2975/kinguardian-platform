"""
FastAPI router for PractitionerRole resources.

Exposes the standard CRUD surface for PractitionerRole:
  GET    /practitioner-roles/booking         — enriched list for booking UIs (name, photo, availability)
  POST   /practitioner-roles/                — create a new PractitionerRole
  GET    /practitioner-roles/{resource_id}   — fetch a single PractitionerRole by ID
  GET    /practitioner-roles/                — paginated list with optional filters
  PATCH  /practitioner-roles/{resource_id}   — partial update (scalar fields only)
  DELETE /practitioner-roles/{resource_id}   — permanent delete (cascades to children)

Unlike Practitioner, PractitionerRole accepts all child arrays (code, specialty,
location, healthcare_service, etc.) in the create body.

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("practitioner_role", <action>) pair.
"""

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.practitioner_role import get_practitioner_role_service
from app.schemas.practitioner_role.fhir_schemas import FhirBundleResponse, FhirPractitionerRoleResponse
from app.schemas.practitioner_role.input import (
    ListPractitionerRolesSchema,
    PractitionerRoleCreateSchema,
    PractitionerRolePatchSchema,
)
from app.schemas.practitioner_role.response import (
    PaginatedPractitionerBookingResponse,
    PaginatedPractitionerRoleResponse,
    PractitionerRoleResponse,
)
from app.services.practitioner_role_service import PractitionerRoleService

# All practitioner-role routes use hyphen prefix (matching the fhir-server).
router = APIRouter(prefix="/practitioner-roles", tags=["PractitionerRoles"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "PractitionerRole not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────
# inline_schema() resolves Pydantic v2 $defs/$ref pointers so deeply nested
# sub-model references (PlainPRContact → PlainPRContactName, PlainPRAvailability →
# PlainPRAvailableTime, etc.) render correctly in the Swagger UI schema resolver.

_SINGLE_201 = {
    201: {
        "description": "PractitionerRole created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(PractitionerRoleResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirPractitionerRoleResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "PractitionerRole retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(PractitionerRoleResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirPractitionerRoleResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of PractitionerRole resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedPractitionerRoleResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}

_BOOKING_LIST_200 = {
    200: {
        "description": "Paginated list of practitioners enriched for booking UIs",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedPractitionerBookingResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── GET /practitioner-roles/booking ──────────────────────────────────────────
# MUST be registered before GET /{resource_id} to prevent FastAPI routing the
# literal string "booking" as an integer path parameter.


@router.get(
    "/booking",
    operation_id="list_practitioner_roles_for_booking",
    summary="List practitioners available for appointment booking",
    description=(
        "Returns active PractitionerRole resources enriched with the linked Practitioner's "
        "name, gender, photo, and qualifications. Also includes specialty, availability "
        "schedule (availableTime / notAvailableTime), location, and healthcare services — "
        "everything a booking UI needs in one call without a second request. "
        "Filter by `specialty_code` (SNOMED code e.g. '394814009') and/or `day_of_week` "
        "(mon | tue | wed | thu | fri | sat | sun). "
        "Send `Accept: application/fhir+json` to receive FHIR R4 Bundle with the "
        "Practitioner embedded as a `contained` resource."
    ),
    responses={**_BOOKING_LIST_200},
    dependencies=[Depends(require_permission("practitioner_role", "read"))],
)
async def list_practitioner_roles_for_booking(
    request: Request,
    specialty_code: str | None = None,
    day_of_week: str | None = None,
    org_id: str | None = Query(None, description="Filter by organization ID."),
    active: bool = True,
    limit: int = 50,
    offset: int = 0,
    actor: AuthUser = Depends(require_permission("practitioner_role", "read")),
    service: PractitionerRoleService = Depends(get_practitioner_role_service),
) -> JSONResponse:
    """
    Return practitioners enriched with name, photo, qualifications, and availability
    for use in booking UIs. Proxies to fhir-server's /practitioner-roles/booking endpoint.
    """
    data = await service.list_for_booking(
        active=active,
        specialty_code=specialty_code,
        day_of_week=day_of_week,
        org_id=org_id,
        limit=limit,
        offset=offset,
        accept=get_accept_header(request),
    )
    return format_paginated_response(data, request)


# ── POST /practitioner-roles/ ─────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_practitioner_role",
    summary="Create a PractitionerRole",
    description=(
        "Creates a new PractitionerRole — the role a Practitioner plays at an Organisation "
        "and Location, including their availability schedule and specialties. "
        "Child arrays (code, specialty, location, healthcare_service, characteristic, "
        "communication, contact, availability, endpoint) can be included in the create body. "
        "Stamps `created_by` from the caller's JWT — do not supply this field. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner_role", "create"))],
)
async def create_practitioner_role(
    dto: PractitionerRoleCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner_role", "create")),
    service: PractitionerRoleService = Depends(get_practitioner_role_service),
) -> JSONResponse:
    """Create a new PractitionerRole resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /practitioner-roles/{resource_id} ─────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_practitioner_role",
    summary="Get a PractitionerRole by ID",
    description=(
        "Fetch a single PractitionerRole by its integer ID. "
        "The response includes all child arrays (code, specialty, location, "
        "healthcare_service, characteristic, communication, contact, "
        "availability, endpoint). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner_role", "read"))],
)
async def get_practitioner_role(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner_role", "read")),
    service: PractitionerRoleService = Depends(get_practitioner_role_service),
) -> JSONResponse:
    """Fetch a single PractitionerRole resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /practitioner-roles/ ──────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_practitioner_roles",
    summary="List PractitionerRoles",
    description=(
        "Returns a paginated list of PractitionerRole resources. "
        "Filter by `active`, `practitioner_id`, `user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("practitioner_role", "read"))],
)
async def list_practitioner_roles(
    request: Request,
    filters: ListPractitionerRolesSchema = Depends(),
    actor: AuthUser = Depends(require_permission("practitioner_role", "read")),
    service: PractitionerRoleService = Depends(get_practitioner_role_service),
) -> JSONResponse:
    """Return a paginated list of PractitionerRoles, optionally filtered."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /practitioner-roles/{resource_id} ───────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_practitioner_role",
    summary="Partially update a PractitionerRole",
    description=(
        "Update specific scalar fields on a PractitionerRole. At least one field must be provided. "
        "Patchable fields: `active`, `period_start`, `period_end`, `availability_exceptions`. "
        "Child arrays (code, specialty, location, healthcare_service, characteristic, "
        "communication, contact, availability, endpoint) cannot be patched here. "
        "Stamps `updated_by` from the caller's JWT automatically. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner_role", "update"))],
)
async def update_practitioner_role(
    resource_id: int,
    dto: PractitionerRolePatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner_role", "update")),
    service: PractitionerRoleService = Depends(get_practitioner_role_service),
) -> JSONResponse:
    """Partially update a PractitionerRole resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /practitioner-roles/{resource_id} ──────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_role",
    summary="Delete a PractitionerRole",
    description=(
        "Permanently deletes the PractitionerRole and all its child records "
        "(identifier, code, specialty, location, healthcare_service, characteristic, "
        "communication, contact, availability, endpoint). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner_role", "delete"))],
)
async def delete_practitioner_role(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("practitioner_role", "delete")),
    service: PractitionerRoleService = Depends(get_practitioner_role_service),
) -> None:
    """Permanently delete a PractitionerRole and cascade to all child records."""
    await service.delete(resource_id, actor)
