"""
FastAPI router for Observation resources.

Endpoints:
  POST   /observations/        — create with all child arrays in the body
  GET    /observations/{id}    — fetch a single Observation by integer ID
  GET    /observations/        — paginated list with optional filters
  PATCH  /observations/{id}    — partial update (scalar fields only)
  DELETE /observations/{id}    — permanent delete (cascades to all child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("observation", <action>) pair.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.observation import get_observation_service
from app.schemas.observation.fhir_schemas import FhirBundleResponse, FhirObservationResponse
from app.schemas.observation.input import (
    ListObservationsSchema,
    ObservationCreateSchema,
    ObservationPatchSchema,
)
from app.schemas.observation.response import ObservationResponse, PaginatedObservationResponse
from app.services.observation_service import ObservationService

# All observation routes are prefixed with /observations; tagged for Swagger grouping.
router = APIRouter(prefix="/observations", tags=["Observations"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "Observation not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────

_SINGLE_201 = {
    201: {
        "description": "Observation created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(ObservationResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirObservationResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Observation retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(ObservationResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirObservationResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Observation resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedObservationResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /observations/ ───────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_observation",
    summary="Create an Observation",
    description=(
        "Creates a new Observation — a measurement or assertion about a patient. "
        "`status` is required. `code_code` should be provided for meaningful observations. "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id`. "
        "Supply value[x] via one of the `value_*` field groups (Quantity, CodeableConcept, "
        "String, Boolean, Integer, Range, Ratio, SampledData, Time, DateTime, Period). "
        "All sub-resources (identifier, basedOn, partOf, category, focus, performer, "
        "interpretation, note, referenceRange with nested appliesTo, hasMember, derivedFrom, "
        "component with nested interpretation and referenceRange) are submitted inline. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("observation", "create"))],
)
async def create_observation(
    dto: ObservationCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("observation", "create")),
    service: ObservationService = Depends(get_observation_service),
) -> JSONResponse:
    """Create a new Observation resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /observations/{resource_id} ──────────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_observation",
    summary="Get an Observation by ID",
    description=(
        "Fetch a single Observation by its integer ID. "
        "The response includes all child arrays (category, component, referenceRange, etc.). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("observation", "read"))],
)
async def get_observation(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("observation", "read")),
    service: ObservationService = Depends(get_observation_service),
) -> JSONResponse:
    """Fetch a single Observation resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /observations/ ────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_observations",
    summary="List Observations",
    description=(
        "Returns a paginated list of Observation resources. "
        "Filter by `status`, `patient_id`, `encounter_id`, "
        "`effective_from`, `effective_to`, `user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("observation", "read"))],
)
async def list_observations(
    request: Request,
    filters: ListObservationsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("observation", "read")),
    service: ObservationService = Depends(get_observation_service),
) -> JSONResponse:
    """Return a paginated list of Observations, optionally filtered."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /observations/{resource_id} ────────────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_observation",
    summary="Partially update an Observation",
    description=(
        "Update specific scalar fields on an Observation. At least one field must be provided. "
        "Patchable fields: `status`, `code_*`, `subject_display`, `encounter_display`, "
        "`effective_date_time`, `effective_period_*`, `effective_instant`, `issued`, "
        "`data_absent_reason_*`, `body_site_*`, `method_*`, `specimen_display`, `device_display`, "
        "and all `value_*` fields (valueQuantity, valueCodeableConcept, valueString, "
        "valueBoolean, valueInteger, valueTime, valueDateTime, valuePeriod). "
        "Child arrays are immutable after creation. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("observation", "update"))],
)
async def update_observation(
    resource_id: int,
    dto: ObservationPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("observation", "update")),
    service: ObservationService = Depends(get_observation_service),
) -> JSONResponse:
    """Partially update an Observation resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /observations/{resource_id} ───────────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_observation",
    summary="Delete an Observation",
    description=(
        "Permanently deletes the Observation and all its child records "
        "(identifier, basedOn, partOf, category, focus, performer, interpretation, "
        "note, referenceRange with nested appliesTo, hasMember, derivedFrom, "
        "component with nested interpretation and referenceRange). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("observation", "delete"))],
)
async def delete_observation(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("observation", "delete")),
    service: ObservationService = Depends(get_observation_service),
) -> None:
    """Permanently delete an Observation and cascade to all child records."""
    await service.delete(resource_id, actor)
