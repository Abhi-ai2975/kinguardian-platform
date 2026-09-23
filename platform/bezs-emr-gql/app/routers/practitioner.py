"""
FastAPI router for Practitioner resources.

Core CRUD surface:
  POST   /practitioners/                — create a new Practitioner
  GET    /practitioners/me              — fetch the caller's own Practitioner (JWT)
  GET    /practitioners/{resource_id}   — fetch a single Practitioner by integer ID
  GET    /practitioners/                — paginated list with optional filters
  PATCH  /practitioners/{resource_id}   — partial update (scalar fields only)
  DELETE /practitioners/{resource_id}   — permanent delete (cascades to child records)

Sub-resource endpoints (7 types × 4 verbs = 28 routes):
  POST   /practitioners/{id}/names
  GET    /practitioners/{id}/names
  PATCH  /practitioners/{id}/names/{name_id}
  DELETE /practitioners/{id}/names/{name_id}
  (same pattern for identifiers, telecom, addresses, photos, qualifications, communications)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("practitioner", <action>) pair.

CRITICAL route ordering: GET /me must be registered BEFORE GET /{resource_id}
to prevent FastAPI matching the literal string "me" as an integer path segment.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.practitioner import get_practitioner_service
from app.schemas.practitioner.fhir_schemas import FhirBundleResponse, FhirPractitionerResponse
from app.schemas.practitioner.input import (
    ListPractitionersSchema,
    PractitionerAddressCreateSchema,
    PractitionerAddressPatchSchema,
    PractitionerCommunicationCreateSchema,
    PractitionerCommunicationPatchSchema,
    PractitionerCreateSchema,
    PractitionerFullCreateSchema,
    PractitionerFullPatchSchema,
    PractitionerIdentifierCreateSchema,
    PractitionerIdentifierPatchSchema,
    PractitionerNameCreateSchema,
    PractitionerNamePatchSchema,
    PractitionerPatchSchema,
    PractitionerPhotoCreateSchema,
    PractitionerPhotoPatchSchema,
    PractitionerQualificationCreateSchema,
    PractitionerQualificationPatchSchema,
    PractitionerTelecomCreateSchema,
    PractitionerTelecomPatchSchema,
)
from app.schemas.practitioner.response import (
    PaginatedPractitionerResponse,
    PractitionerAddressListResponse,
    PractitionerCommunicationListResponse,
    PractitionerIdentifierListResponse,
    PractitionerNameListResponse,
    PractitionerPhotoListResponse,
    PractitionerQualificationListResponse,
    PractitionerResponse,
    PractitionerTelecomListResponse,
)
from app.services.practitioner_service import PractitionerService

# All practitioner routes are prefixed with /practitioners; tagged for Swagger grouping.
router = APIRouter(prefix="/practitioners", tags=["Practitioners"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "Practitioner not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────
# inline_schema() resolves Pydantic v2 $defs/$ref pointers so nested sub-model
# references (e.g. PlainQualification → PlainQualificationIdentifier) render
# correctly in the Swagger UI schema resolver.

_SINGLE_201 = {
    201: {
        "description": "Practitioner created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(PractitionerResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirPractitionerResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Practitioner retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(PractitionerResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirPractitionerResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Practitioner resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedPractitionerResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}

# Sub-resource list response: {data: [...], total: N} — no limit/offset envelope.
_NAME_LIST_200 = {200: {"description": "List of practitioner names", "content": {"application/json": {"schema": inline_schema(PractitionerNameListResponse.model_json_schema())}}}}
_IDENTIFIER_LIST_200 = {200: {"description": "List of practitioner identifiers", "content": {"application/json": {"schema": inline_schema(PractitionerIdentifierListResponse.model_json_schema())}}}}
_TELECOM_LIST_200 = {200: {"description": "List of practitioner contact points", "content": {"application/json": {"schema": inline_schema(PractitionerTelecomListResponse.model_json_schema())}}}}
_ADDRESS_LIST_200 = {200: {"description": "List of practitioner addresses", "content": {"application/json": {"schema": inline_schema(PractitionerAddressListResponse.model_json_schema())}}}}
_PHOTO_LIST_200 = {200: {"description": "List of practitioner photos", "content": {"application/json": {"schema": inline_schema(PractitionerPhotoListResponse.model_json_schema())}}}}
_QUALIFICATION_LIST_200 = {200: {"description": "List of practitioner qualifications", "content": {"application/json": {"schema": inline_schema(PractitionerQualificationListResponse.model_json_schema())}}}}
_COMMUNICATION_LIST_200 = {200: {"description": "List of practitioner communication languages", "content": {"application/json": {"schema": inline_schema(PractitionerCommunicationListResponse.model_json_schema())}}}}


# ── POST /practitioners/ ─────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_practitioner",
    summary="Create a Practitioner",
    description=(
        "Creates a new Practitioner record with top-level scalar fields. "
        "Child sub-resources (name, identifier, telecom, address, photo, "
        "qualification, communication) are added via separate sub-routes. "
        "Stamps `created_by` from the caller's JWT — do not supply this field. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "create"))],
)
async def create_practitioner(
    dto: PractitionerCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "create")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Create a new Practitioner resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.post(
    "/full",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_practitioner_full",
    summary="Create a Practitioner with all sub-resources atomically",
    description=(
        "Creates a Practitioner and any combination of sub-resources (names, identifiers, telecom, "
        "addresses, photos, qualifications, communications) in a single atomic request. "
        "The fhir-server wraps all inserts in one DB transaction — if any sub-resource insert "
        "fails the entire request rolls back and nothing is persisted. "
        "All sub-resource arrays are optional; omit any to skip those sub-resources. "
        "`created_by` is stamped automatically from the caller's JWT — do not supply it. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "create"))],
)
async def create_practitioner_full(
    dto: PractitionerFullCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "create")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Create a Practitioner and all provided sub-resources atomically in one fhir-server request."""
    data = await service.create_full(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── PATCH /practitioners/{practitioner_id}/full ───────────────────────────────


@router.patch(
    "/{resource_id}/full",
    operation_id="update_practitioner_full",
    summary="Update a Practitioner's scalar fields and/or rewrite sub-resource arrays",
    description=(
        "Partially update a Practitioner resource and any combination of its sub-resource arrays "
        "(names, identifiers, telecom, addresses, photos, qualifications, communications) "
        "in a single call. "
        "Array semantics: **omit / null** → leave sub-resource untouched; "
        "**[]** → delete all records of that type; "
        "**[{...}]** → replace all records with the provided items. "
        "Scalar fields follow standard PATCH semantics — omitted means unchanged. "
        "At least one field or array must be provided. "
        "`updated_by` is stamped automatically from the caller's JWT. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner_full(
    resource_id: int,
    dto: PractitionerFullPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Update a Practitioner's scalar fields and/or rewrite sub-resource arrays in one call."""
    data = await service.update_full(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /practitioners/me ────────────────────────────────────────────────────
# MUST be registered before GET /{resource_id} so FastAPI does not interpret
# the literal string "me" as an integer path parameter.


@router.get(
    "/me",
    operation_id="get_my_practitioner",
    summary="Get the caller's own Practitioner record",
    description=(
        "Returns the Practitioner record linked to the authenticated user's JWT subject. "
        "Looks up by `user_id == actor.sub`. Returns 404 if no record is found. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def get_my_practitioner(
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Return the Practitioner record for the authenticated user (JWT subject lookup)."""
    data = await service.get_me(actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /practitioners/{resource_id} ─────────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_practitioner",
    summary="Get a Practitioner by ID",
    description=(
        "Fetch a single Practitioner by its integer ID. "
        "The response includes all child sub-resources (name, identifier, telecom, etc.). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def get_practitioner(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Fetch a single Practitioner resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /practitioners/ ───────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_practitioners",
    summary="List Practitioners",
    description=(
        "Returns a paginated list of Practitioner resources. "
        "Filter by `family_name` or `given_name` (partial, case-insensitive name search), "
        "`active`, `user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def list_practitioners(
    request: Request,
    filters: ListPractitionersSchema = Depends(),
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Return a paginated list of Practitioners, optionally filtered by name or status."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /practitioners/{resource_id} ───────────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_practitioner",
    summary="Partially update a Practitioner",
    description=(
        "Update specific scalar fields on a Practitioner. At least one field must be provided. "
        "Patchable fields: `active`, `gender`, `birth_date`, `deceased_boolean`, `deceased_datetime`. "
        "Child arrays are managed via separate sub-routes and cannot be patched here. "
        "Stamps `updated_by` from the caller's JWT automatically. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner(
    resource_id: int,
    dto: PractitionerPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Partially update a Practitioner resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /practitioners/{resource_id} ──────────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner",
    summary="Delete a Practitioner",
    description=(
        "Permanently deletes the Practitioner and all its child records "
        "(name, identifier, telecom, address, photo, qualification, communication). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "delete"))],
)
async def delete_practitioner(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("practitioner", "delete")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> None:
    """Permanently delete a Practitioner and cascade to all child records."""
    await service.delete(resource_id, actor)


# ═══════════════════════════════════════════════════════════════════════════════
# Sub-resource: Names
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/{practitioner_id}/names",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_name",
    summary="Add a name to a Practitioner",
    description="Add a HumanName record to the Practitioner. Returns the full updated Practitioner.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def add_practitioner_name(
    practitioner_id: int,
    dto: PractitionerNameCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Add a HumanName to the specified Practitioner."""
    data = await service.add_name(practitioner_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{practitioner_id}/names",
    operation_id="list_practitioner_names",
    summary="List a Practitioner's names",
    description="Returns all HumanName records for the specified Practitioner as {data, total}.",
    responses={**_NAME_LIST_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def list_practitioner_names(
    practitioner_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """List all names for the specified Practitioner."""
    data = await service.list_names(practitioner_id, accept=get_accept_header(request))
    return format_response(data, request)


@router.patch(
    "/{practitioner_id}/names/{name_id}",
    operation_id="update_practitioner_name",
    summary="Update a Practitioner name",
    description="Partially update a specific HumanName record. Returns the full updated Practitioner.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner_name(
    practitioner_id: int,
    name_id: int,
    dto: PractitionerNamePatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Update a specific name on a Practitioner."""
    data = await service.patch_name(practitioner_id, name_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{practitioner_id}/names/{name_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_name",
    summary="Delete a Practitioner name",
    description="Remove a specific HumanName record from the Practitioner.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def delete_practitioner_name(
    practitioner_id: int,
    name_id: int,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> None:
    """Remove a specific name from a Practitioner."""
    await service.delete_name(practitioner_id, name_id, actor)


# ═══════════════════════════════════════════════════════════════════════════════
# Sub-resource: Identifiers
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/{practitioner_id}/identifiers",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_identifier",
    summary="Add an identifier to a Practitioner",
    description="Add an Identifier record (NPI, license, DEA, etc.) to the Practitioner. Returns full Practitioner.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def add_practitioner_identifier(
    practitioner_id: int,
    dto: PractitionerIdentifierCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Add an Identifier to the specified Practitioner."""
    data = await service.add_identifier(practitioner_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{practitioner_id}/identifiers",
    operation_id="list_practitioner_identifiers",
    summary="List a Practitioner's identifiers",
    description="Returns all Identifier records for the specified Practitioner as {data, total}.",
    responses={**_IDENTIFIER_LIST_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def list_practitioner_identifiers(
    practitioner_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """List all identifiers for the specified Practitioner."""
    data = await service.list_identifiers(practitioner_id, accept=get_accept_header(request))
    return format_response(data, request)


@router.patch(
    "/{practitioner_id}/identifiers/{identifier_id}",
    operation_id="update_practitioner_identifier",
    summary="Update a Practitioner identifier",
    description="Partially update a specific Identifier record. Returns the full updated Practitioner.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner_identifier(
    practitioner_id: int,
    identifier_id: int,
    dto: PractitionerIdentifierPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Update a specific identifier on a Practitioner."""
    data = await service.patch_identifier(practitioner_id, identifier_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{practitioner_id}/identifiers/{identifier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_identifier",
    summary="Delete a Practitioner identifier",
    description="Remove a specific Identifier record from the Practitioner.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def delete_practitioner_identifier(
    practitioner_id: int,
    identifier_id: int,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> None:
    """Remove a specific identifier from a Practitioner."""
    await service.delete_identifier(practitioner_id, identifier_id, actor)


# ═══════════════════════════════════════════════════════════════════════════════
# Sub-resource: Telecom
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/{practitioner_id}/telecom",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_telecom",
    summary="Add a contact point to a Practitioner",
    description="Add a ContactPoint (phone, email, etc.) to the Practitioner. Returns full Practitioner.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def add_practitioner_telecom(
    practitioner_id: int,
    dto: PractitionerTelecomCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Add a ContactPoint to the specified Practitioner."""
    data = await service.add_telecom(practitioner_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{practitioner_id}/telecom",
    operation_id="list_practitioner_telecom",
    summary="List a Practitioner's contact points",
    description="Returns all ContactPoint records for the specified Practitioner as {data, total}.",
    responses={**_TELECOM_LIST_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def list_practitioner_telecom(
    practitioner_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """List all contact points for the specified Practitioner."""
    data = await service.list_telecom(practitioner_id, accept=get_accept_header(request))
    return format_response(data, request)


@router.patch(
    "/{practitioner_id}/telecom/{telecom_id}",
    operation_id="update_practitioner_telecom",
    summary="Update a Practitioner contact point",
    description="Partially update a specific ContactPoint record. Returns the full updated Practitioner.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner_telecom(
    practitioner_id: int,
    telecom_id: int,
    dto: PractitionerTelecomPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Update a specific contact point on a Practitioner."""
    data = await service.patch_telecom(practitioner_id, telecom_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{practitioner_id}/telecom/{telecom_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_telecom",
    summary="Delete a Practitioner contact point",
    description="Remove a specific ContactPoint record from the Practitioner.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def delete_practitioner_telecom(
    practitioner_id: int,
    telecom_id: int,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> None:
    """Remove a specific contact point from a Practitioner."""
    await service.delete_telecom(practitioner_id, telecom_id, actor)


# ═══════════════════════════════════════════════════════════════════════════════
# Sub-resource: Addresses
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/{practitioner_id}/addresses",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_address",
    summary="Add an address to a Practitioner",
    description="Add an Address record to the Practitioner. Returns the full updated Practitioner.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def add_practitioner_address(
    practitioner_id: int,
    dto: PractitionerAddressCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Add an Address to the specified Practitioner."""
    data = await service.add_address(practitioner_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{practitioner_id}/addresses",
    operation_id="list_practitioner_addresses",
    summary="List a Practitioner's addresses",
    description="Returns all Address records for the specified Practitioner as {data, total}.",
    responses={**_ADDRESS_LIST_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def list_practitioner_addresses(
    practitioner_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """List all addresses for the specified Practitioner."""
    data = await service.list_addresses(practitioner_id, accept=get_accept_header(request))
    return format_response(data, request)


@router.patch(
    "/{practitioner_id}/addresses/{address_id}",
    operation_id="update_practitioner_address",
    summary="Update a Practitioner address",
    description="Partially update a specific Address record. Returns the full updated Practitioner.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner_address(
    practitioner_id: int,
    address_id: int,
    dto: PractitionerAddressPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Update a specific address on a Practitioner."""
    data = await service.patch_address(practitioner_id, address_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{practitioner_id}/addresses/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_address",
    summary="Delete a Practitioner address",
    description="Remove a specific Address record from the Practitioner.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def delete_practitioner_address(
    practitioner_id: int,
    address_id: int,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> None:
    """Remove a specific address from a Practitioner."""
    await service.delete_address(practitioner_id, address_id, actor)


# ═══════════════════════════════════════════════════════════════════════════════
# Sub-resource: Photos
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/{practitioner_id}/photos",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_photo",
    summary="Add a photo to a Practitioner",
    description="Add a photo Attachment to the Practitioner. Returns the full updated Practitioner.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def add_practitioner_photo(
    practitioner_id: int,
    dto: PractitionerPhotoCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Add a photo Attachment to the specified Practitioner."""
    data = await service.add_photo(practitioner_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{practitioner_id}/photos",
    operation_id="list_practitioner_photos",
    summary="List a Practitioner's photos",
    description="Returns all photo Attachment records for the specified Practitioner as {data, total}.",
    responses={**_PHOTO_LIST_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def list_practitioner_photos(
    practitioner_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """List all photos for the specified Practitioner."""
    data = await service.list_photos(practitioner_id, accept=get_accept_header(request))
    return format_response(data, request)


@router.patch(
    "/{practitioner_id}/photos/{photo_id}",
    operation_id="update_practitioner_photo",
    summary="Update a Practitioner photo",
    description="Partially update a specific photo Attachment. Returns the full updated Practitioner.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner_photo(
    practitioner_id: int,
    photo_id: int,
    dto: PractitionerPhotoPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Update a specific photo on a Practitioner."""
    data = await service.patch_photo(practitioner_id, photo_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{practitioner_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_photo",
    summary="Delete a Practitioner photo",
    description="Remove a specific photo Attachment from the Practitioner.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def delete_practitioner_photo(
    practitioner_id: int,
    photo_id: int,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> None:
    """Remove a specific photo from a Practitioner."""
    await service.delete_photo(practitioner_id, photo_id, actor)


# ═══════════════════════════════════════════════════════════════════════════════
# Sub-resource: Qualifications
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/{practitioner_id}/qualifications",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_qualification",
    summary="Add a qualification to a Practitioner",
    description=(
        "Add a qualification (certification, license, training) to the Practitioner. "
        "Optionally includes nested identifiers (e.g. license number). "
        "Returns the full updated Practitioner."
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def add_practitioner_qualification(
    practitioner_id: int,
    dto: PractitionerQualificationCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Add a qualification to the specified Practitioner."""
    data = await service.add_qualification(practitioner_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{practitioner_id}/qualifications",
    operation_id="list_practitioner_qualifications",
    summary="List a Practitioner's qualifications",
    description="Returns all qualification records for the specified Practitioner as {data, total}.",
    responses={**_QUALIFICATION_LIST_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def list_practitioner_qualifications(
    practitioner_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """List all qualifications for the specified Practitioner."""
    data = await service.list_qualifications(practitioner_id, accept=get_accept_header(request))
    return format_response(data, request)


@router.patch(
    "/{practitioner_id}/qualifications/{qualification_id}",
    operation_id="update_practitioner_qualification",
    summary="Update a Practitioner qualification",
    description=(
        "Partially update a specific qualification. When `identifier` is provided "
        "it replaces all existing qualification identifiers entirely (full array replacement). "
        "Returns the full updated Practitioner."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner_qualification(
    practitioner_id: int,
    qualification_id: int,
    dto: PractitionerQualificationPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Update a specific qualification on a Practitioner."""
    data = await service.patch_qualification(practitioner_id, qualification_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{practitioner_id}/qualifications/{qualification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_qualification",
    summary="Delete a Practitioner qualification",
    description="Remove a specific qualification record from the Practitioner.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def delete_practitioner_qualification(
    practitioner_id: int,
    qualification_id: int,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> None:
    """Remove a specific qualification from a Practitioner."""
    await service.delete_qualification(practitioner_id, qualification_id, actor)


# ═══════════════════════════════════════════════════════════════════════════════
# Sub-resource: Communications
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/{practitioner_id}/communications",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_communication",
    summary="Add a communication language to a Practitioner",
    description="Add a language/communication preference to the Practitioner. Returns the full updated Practitioner.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def add_practitioner_communication(
    practitioner_id: int,
    dto: PractitionerCommunicationCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Add a language preference to the specified Practitioner."""
    data = await service.add_communication(practitioner_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{practitioner_id}/communications",
    operation_id="list_practitioner_communications",
    summary="List a Practitioner's communication languages",
    description="Returns all language preference records for the specified Practitioner as {data, total}.",
    responses={**_COMMUNICATION_LIST_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "read"))],
)
async def list_practitioner_communications(
    practitioner_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "read")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """List all language preferences for the specified Practitioner."""
    data = await service.list_communications(practitioner_id, accept=get_accept_header(request))
    return format_response(data, request)


@router.patch(
    "/{practitioner_id}/communications/{communication_id}",
    operation_id="update_practitioner_communication",
    summary="Update a Practitioner communication language",
    description="Partially update a specific language preference. Returns the full updated Practitioner.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def update_practitioner_communication(
    practitioner_id: int,
    communication_id: int,
    dto: PractitionerCommunicationPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> JSONResponse:
    """Update a specific language preference on a Practitioner."""
    data = await service.patch_communication(practitioner_id, communication_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{practitioner_id}/communications/{communication_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_communication",
    summary="Delete a Practitioner communication language",
    description="Remove a specific language preference record from the Practitioner.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("practitioner", "update"))],
)
async def delete_practitioner_communication(
    practitioner_id: int,
    communication_id: int,
    actor: AuthUser = Depends(require_permission("practitioner", "update")),
    service: PractitionerService = Depends(get_practitioner_service),
) -> None:
    """Remove a specific language preference from a Practitioner."""
    await service.delete_communication(practitioner_id, communication_id, actor)
