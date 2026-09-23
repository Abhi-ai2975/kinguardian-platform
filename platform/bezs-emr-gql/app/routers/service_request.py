"""
FastAPI router for ServiceRequest resources.

Endpoints:
  POST   /service-requests/        — create with all child arrays in the body
  GET    /service-requests/{id}    — fetch a single ServiceRequest by integer ID
  GET    /service-requests/        — paginated list with optional filters
  PATCH  /service-requests/{id}    — partial update (scalar fields only)
  DELETE /service-requests/{id}    — permanent delete (cascades to all child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("service_request", <action>) pair.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.service_request import get_service_request_service
from app.schemas.service_request.fhir_schemas import FhirBundleResponse, FhirServiceRequestResponse
from app.schemas.service_request.input import (
    ListServiceRequestsSchema,
    ServiceRequestCreateSchema,
    ServiceRequestPatchSchema,
)
from app.schemas.service_request.response import PaginatedServiceRequestResponse, ServiceRequestResponse
from app.services.service_request_service import ServiceRequestService

# All service-request routes are prefixed with /service-requests; tagged for Swagger grouping.
router = APIRouter(prefix="/service-requests", tags=["ServiceRequests"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "ServiceRequest not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────
# inline_schema() resolves Pydantic v2 $defs/$ref pointers so nested sub-model
# references render correctly in the Swagger UI schema resolver.

_SINGLE_201 = {
    201: {
        "description": "ServiceRequest created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(ServiceRequestResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirServiceRequestResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "ServiceRequest retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(ServiceRequestResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirServiceRequestResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of ServiceRequest resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedServiceRequestResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /service-requests/ ───────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_service_request",
    summary="Create a ServiceRequest",
    description=(
        "Creates a new ServiceRequest — a clinical order, referral, or service request. "
        "Both `status` and `intent` are required. "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id`. "
        "Supply `requester` as a FHIR reference e.g. `'Practitioner/30001'`. "
        "All sub-resources (identifier, category, performer, locationCode, locationReference, "
        "reasonCode, reasonReference, insurance, supportingInfo, specimen, bodySite, "
        "note, relevantHistory, basedOn, replaces) are submitted in the single request body. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("service_request", "create"))],
)
async def create_service_request(
    dto: ServiceRequestCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("service_request", "create")),
    service: ServiceRequestService = Depends(get_service_request_service),
) -> JSONResponse:
    """Create a new ServiceRequest resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /service-requests/{resource_id} ──────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_service_request",
    summary="Get a ServiceRequest by ID",
    description=(
        "Fetch a single ServiceRequest by its integer ID. "
        "The response includes all child arrays (category, performer, reasonCode, etc.). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("service_request", "read"))],
)
async def get_service_request(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("service_request", "read")),
    service: ServiceRequestService = Depends(get_service_request_service),
) -> JSONResponse:
    """Fetch a single ServiceRequest resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /service-requests/ ────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_service_requests",
    summary="List ServiceRequests",
    description=(
        "Returns a paginated list of ServiceRequest resources. "
        "Filter by `status`, `patient_id`, `encounter_id`, "
        "`authored_from`, `authored_to`, `user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("service_request", "read"))],
)
async def list_service_requests(
    request: Request,
    filters: ListServiceRequestsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("service_request", "read")),
    service: ServiceRequestService = Depends(get_service_request_service),
) -> JSONResponse:
    """Return a paginated list of ServiceRequests, optionally filtered."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /service-requests/{resource_id} ────────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_service_request",
    summary="Partially update a ServiceRequest",
    description=(
        "Update specific scalar fields on a ServiceRequest. At least one field must be provided. "
        "Patchable fields: `status`, `intent`, `priority`, `do_not_perform`, `code_*`, "
        "`encounter_display`, all `occurrence_*` variants, `as_needed_*`, `authored_on`, "
        "`requester_display`, `performer_type_*`, all `quantity_*` variants, "
        "all `requisition_*` fields, `instantiates_canonical`, `instantiates_uri`, "
        "`patient_instruction`. "
        "Child arrays (identifier, category, performer, etc.) are immutable after creation. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("service_request", "update"))],
)
async def update_service_request(
    resource_id: int,
    dto: ServiceRequestPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("service_request", "update")),
    service: ServiceRequestService = Depends(get_service_request_service),
) -> JSONResponse:
    """Partially update a ServiceRequest resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /service-requests/{resource_id} ────────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_service_request",
    summary="Delete a ServiceRequest",
    description=(
        "Permanently deletes the ServiceRequest and all its child records "
        "(identifier, category, orderDetail, performer, locationCode, locationReference, "
        "reasonCode, reasonReference, insurance, supportingInfo, specimen, bodySite, "
        "note, relevantHistory, basedOn, replaces). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("service_request", "delete"))],
)
async def delete_service_request(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("service_request", "delete")),
    service: ServiceRequestService = Depends(get_service_request_service),
) -> None:
    """Permanently delete a ServiceRequest and cascade to all child records."""
    await service.delete(resource_id, actor)
