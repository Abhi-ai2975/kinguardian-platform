"""
API router for FHIR Organisation resources.

Exposes CRUD endpoints under /organizations. Each handler is intentionally thin:
it validates the schema (Pydantic), calls the service, and returns the formatted
response. All business logic lives in OrganizationsService.

Content negotiation:
    Every handler that returns a body accepts a `request: Request` parameter so it
    can read the client's Accept header and forward it through the service/client
    layers to the FHIR Server. The FHIR Server performs the actual format
    transformation (plain JSON ↔ FHIR R4). The handler wraps the result in a
    JSONResponse with the matching Content-Type via format_response().

    Clients signal their preferred format via:
        Accept: application/fhir+json    → FHIR R4 Organization / Bundle
        Accept: application/json         → Plain JSON (default)

OpenAPI docs:
    Both response schemas (plain and FHIR R4) are documented in the `responses`
    dict so Swagger UI shows the full contract for each format. `response_model` is
    intentionally omitted from the decorators because the handlers return JSONResponse
    directly — FastAPI bypasses response_model validation for JSONResponse returns,
    and the schema documentation is fully covered by the explicit `responses` entries.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import (
    format_response,
    format_paginated_response,
    get_accept_header,
)
from app.core.schema_utils import inline_schema
from app.di.dependencies.organization import get_organization_service
from app.schemas.organization.fhir_schemas import FhirBundleResponse, FhirOrgResponse
from app.schemas.organization.input import ListOrgsSchema, MeOrgsSchema, PatchOrgSchema, RegisterOrgSchema
from app.schemas.organization.response import OrgResponse, PaginatedOrgResponse
from app.services.organization_service import OrganizationsService

router = APIRouter(prefix="/organizations", tags=["Organizations"])

# ── Shared error response dicts (reused across multiple routes) ────────────────
_ERR_NOT_FOUND = {404: {"description": "Organization not found"}}
_ERR_CONFLICT = {409: {"description": "Organization with that name already exists"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

# ── Dual-format success response dicts for OpenAPI documentation ───────────────
# These document both content types that the FHIR Server can return depending on
# the client's Accept header. FastAPI merges these into the generated OpenAPI spec
# so Swagger UI shows both schemas under the correct status code.

_SINGLE_201 = {
    201: {
        "description": "Organization created successfully",
        "content": {
            # Default plain JSON shape — returned when no Accept header is sent.
            # inline_schema() resolves Pydantic's $defs/$ref so sub-model references
            # don't break when this schema is embedded inside the OpenAPI responses dict.
            "application/json": {"schema": inline_schema(OrgResponse.model_json_schema())},
            # FHIR R4 shape — returned when Accept: application/fhir+json is sent.
            "application/fhir+json": {"schema": inline_schema(FhirOrgResponse.model_json_schema())},
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Organization retrieved/updated successfully",
        "content": {
            "application/json": {"schema": inline_schema(OrgResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FhirOrgResponse.model_json_schema())},
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Organizations",
        "content": {
            # Plain JSON paginated envelope: { total, limit, offset, data: [...] }
            "application/json": {"schema": inline_schema(PaginatedOrgResponse.model_json_schema())},
            # FHIR Bundle: { resourceType: "Bundle", type: "searchset", total, entry: [...] }
            "application/fhir+json": {"schema": inline_schema(FhirBundleResponse.model_json_schema())},
        },
    }
}


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="register_organization",
    summary="Register a new Organization",
    description=(
        "Creates a new Organization. "
        "Enforces that `name` and `type` are provided (FHIR leaves these optional). "
        "Deduplicates by name — returns 409 if an organization with the same name already exists. "
        "Stamps `created_by` from the caller's JWT — do not supply this field. "
        "Send `Accept: application/fhir+json` to receive the created resource in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_CONFLICT, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("org", "create"))],
)
async def register_organization(
    dto: RegisterOrgSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("org", "create")),
    service: OrganizationsService = Depends(get_organization_service),
) -> JSONResponse:
    """
    Register a new organisation. Forwards the client's Accept header to the FHIR
    Server so it returns the created resource in the requested format.
    """
    # Extract Accept header to forward — None means the FHIR Server defaults to plain JSON.
    accept = get_accept_header(request)
    data = await service.register(dto, actor, accept=accept)
    return format_response(data, request)


@router.get(
    "/me",
    operation_id="get_my_organizations",
    summary="Get Organizations for the current user",
    description=(
        "Returns Organizations scoped to the calling user's JWT identity. "
        "`user_id` and `org_id` are derived from the token — the caller cannot override them. "
        "Supports `active` filter and `limit`/`offset` pagination. "
        "Send `Accept: application/fhir+json` to receive results as a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("org", "read"))],
)
async def get_my_organizations(
    request: Request,
    filters: MeOrgsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("org", "read")),
    service: OrganizationsService = Depends(get_organization_service),
) -> JSONResponse:
    """
    List Organizations owned by the current user. Scoping by user_id and org_id
    is enforced server-side using JWT claims — no identity params are accepted from
    the query string.
    """
    accept = get_accept_header(request)
    data = await service.get_me(filters, actor, accept=accept)
    return format_paginated_response(data, request)


@router.get(
    "/{organization_id}",
    operation_id="get_organization",
    summary="Get an Organization by ID",
    description=(
        "Retrieves a single Organization by its public integer ID. "
        "Send `Accept: application/fhir+json` to receive the resource in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("org", "read"))],
)
async def get_organization(
    organization_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("org", "read")),
    service: OrganizationsService = Depends(get_organization_service),
) -> JSONResponse:
    """
    Fetch a single organisation by ID. Forwards Accept header for content negotiation.
    """
    accept = get_accept_header(request)
    data = await service.get_by_id(organization_id, actor, accept=accept)
    return format_response(data, request)


@router.get(
    "/",
    operation_id="list_organizations",
    summary="List Organizations",
    description=(
        "Returns a paginated list of Organizations. "
        "Filter by `name` (case-insensitive substring) and `active` status. "
        "Use `limit` and `offset` for pagination. "
        "Send `Accept: application/fhir+json` to receive results as a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("org", "read"))],
)
async def list_organizations(
    request: Request,
    filters: ListOrgsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("org", "read")),
    service: OrganizationsService = Depends(get_organization_service),
) -> JSONResponse:
    """
    List organisations with optional filters. Forwards Accept header so the FHIR Server
    returns either a plain paginated envelope or a FHIR Bundle searchset.
    """
    accept = get_accept_header(request)
    data = await service.list(filters, actor, accept=accept)
    return format_paginated_response(data, request)


@router.patch(
    "/{organization_id}",
    operation_id="update_organization",
    summary="Partially update an Organization",
    description=(
        "Patchable fields: `active`, `name`, `partof_display`. "
        "Child arrays (identifier, type, alias, telecom, address, contact, endpoint) "
        "are not patchable — delete and re-create to correct those. "
        "At least one field must be provided. "
        "Send `Accept: application/fhir+json` to receive the updated resource in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("org", "update"))],
)
async def update_organization(
    organization_id: int,
    dto: PatchOrgSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("org", "update")),
    service: OrganizationsService = Depends(get_organization_service),
) -> JSONResponse:
    """
    Partially update an organisation. Forwards Accept header for content negotiation.
    """
    accept = get_accept_header(request)
    data = await service.update(organization_id, dto, actor, accept=accept)
    return format_response(data, request)


@router.delete(
    "/{organization_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_organization",
    summary="Delete an Organization",
    description=(
        "Permanently deletes the Organization and all its associated child records. "
        "This operation is irreversible."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("org", "delete"))],
)
async def delete_organization(
    organization_id: int,
    actor: AuthUser = Depends(require_permission("org", "delete")),
    service: OrganizationsService = Depends(get_organization_service),
) -> None:
    """
    Delete an organisation. No content negotiation — DELETE returns 204 with no body.
    """
    await service.delete(organization_id, actor)
