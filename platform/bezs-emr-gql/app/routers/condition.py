"""
FastAPI router for Condition resources.

Endpoints:
  POST   /conditions/        — create with all child arrays in the body
  GET    /conditions/{id}    — fetch a single Condition by integer ID
  GET    /conditions/        — paginated list with optional filters
  PATCH  /conditions/{id}    — partial update (scalar fields only)
  DELETE /conditions/{id}    — permanent delete (cascades to all child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("condition", <action>) pair.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.condition import get_condition_service
from app.schemas.condition.fhir_schemas import FhirBundleResponse, FhirConditionResponse
from app.schemas.condition.input import (
    ConditionCreateSchema,
    ConditionPatchSchema,
    ListConditionsSchema,
)
from app.schemas.condition.response import ConditionResponse, PaginatedConditionResponse
from app.services.condition_service import ConditionService

# All condition routes are prefixed with /conditions; tagged for Swagger grouping.
router = APIRouter(prefix="/conditions", tags=["Conditions"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "Condition not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────

_SINGLE_201 = {
    201: {
        "description": "Condition created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(ConditionResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirConditionResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Condition retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(ConditionResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirConditionResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Condition resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedConditionResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /conditions/ ────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_condition",
    summary="Create a Condition",
    description=(
        "Creates a new Condition — a clinical problem, diagnosis, or health matter for a patient. "
        "All fields are optional; provide at minimum `subject` and `code_code` for a useful record. "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id`. "
        "All sub-resources (identifier, category, bodySite, stage with nested assessment, "
        "evidence with nested code and detail, note) are submitted in the single request body. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("condition", "create"))],
)
async def create_condition(
    dto: ConditionCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("condition", "create")),
    service: ConditionService = Depends(get_condition_service),
) -> JSONResponse:
    """Create a new Condition resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /conditions/{resource_id} ────────────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_condition",
    summary="Get a Condition by ID",
    description=(
        "Fetch a single Condition by its integer ID. "
        "The response includes all child arrays (category, bodySite, stage, evidence, note). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("condition", "read"))],
)
async def get_condition(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("condition", "read")),
    service: ConditionService = Depends(get_condition_service),
) -> JSONResponse:
    """Fetch a single Condition resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /conditions/ ─────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_conditions",
    summary="List Conditions",
    description=(
        "Returns a paginated list of Condition resources. "
        "Filter by `clinical_status`, `patient_id`, `encounter_id`, "
        "`recorded_from`, `recorded_to`, `user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("condition", "read"))],
)
async def list_conditions(
    request: Request,
    filters: ListConditionsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("condition", "read")),
    service: ConditionService = Depends(get_condition_service),
) -> JSONResponse:
    """Return a paginated list of Conditions, optionally filtered."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /conditions/{resource_id} ──────────────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_condition",
    summary="Partially update a Condition",
    description=(
        "Update specific scalar fields on a Condition. At least one field must be provided. "
        "Patchable fields: `clinical_status_*`, `verification_status_*`, `severity_*`, `code_*`, "
        "`recorded_date`, `encounter_display`, and all `onset_*` / `abatement_*` variants. "
        "Child arrays (identifier, category, bodySite, stage, evidence, note) are immutable "
        "after creation — delete and re-create the Condition to change those. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("condition", "update"))],
)
async def update_condition(
    resource_id: int,
    dto: ConditionPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("condition", "update")),
    service: ConditionService = Depends(get_condition_service),
) -> JSONResponse:
    """Partially update a Condition resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /conditions/{resource_id} ─────────────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_condition",
    summary="Delete a Condition",
    description=(
        "Permanently deletes the Condition and all its child records "
        "(identifier, category, bodySite, stage with assessment, evidence with code and detail, note). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("condition", "delete"))],
)
async def delete_condition(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("condition", "delete")),
    service: ConditionService = Depends(get_condition_service),
) -> None:
    """Permanently delete a Condition and cascade to all child records."""
    await service.delete(resource_id, actor)
