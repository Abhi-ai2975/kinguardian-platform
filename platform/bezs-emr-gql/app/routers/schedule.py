"""
API router for FHIR Schedule resources.

Exposes CRUD endpoints under /schedules. Each handler is intentionally thin:
it validates the schema (Pydantic), calls the service, and returns the formatted
response. All business logic lives in ScheduleService.

A Schedule is a container for time slots associated with one or more actors
(Practitioner, HealthcareService, Location, etc.) during a planning horizon.
Slots are created separately and reference back to a Schedule.

Content negotiation:
    Every handler that returns a body accepts a `request: Request` parameter so it
    can read the client's Accept header and forward it through the service/client
    layers to the fhir-server. The fhir-server performs the actual format
    transformation (plain JSON ↔ FHIR R4). The handler wraps the result in a
    JSONResponse with the matching Content-Type via format_response().

    Clients signal their preferred format via:
        Accept: application/fhir+json    → FHIR R4 Schedule / Bundle
        Accept: application/json         → Plain JSON (default)

OpenAPI docs:
    Both response schemas are documented in the `responses` dict so Swagger UI
    shows the full contract for each format. `response_model` is intentionally
    omitted — handlers return JSONResponse directly and the schema is documented
    via explicit `responses` entries with inline_schema()-wrapped Pydantic schemas.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import (
    format_paginated_response,
    format_response,
    get_accept_header,
)
from app.core.schema_utils import inline_schema
from app.di.dependencies.schedule import get_schedule_service
from app.schemas.schedule.fhir_schemas import FhirBundleResponse, FhirScheduleResponse
from app.schemas.schedule.input import (
    ListSchedulesSchema,
    ScheduleCreateSchema,
    SchedulePatchSchema,
)
from app.schemas.schedule.response import PaginatedScheduleResponse, ScheduleResponse
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/schedules", tags=["Schedules"])

# ── Shared error response dicts ────────────────────────────────────────────────
_ERR_NOT_FOUND = {404: {"description": "Schedule not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

# ── Dual-format success response dicts for OpenAPI documentation ───────────────
# inline_schema() resolves Pydantic's $defs/$ref so sub-model references don't
# break the Swagger UI resolver when embedded inside the OpenAPI responses dict.

_SINGLE_201 = {
    201: {
        "description": "Schedule created successfully",
        "content": {
            "application/json": {"schema": inline_schema(ScheduleResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FhirScheduleResponse.model_json_schema())},
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Schedule retrieved/updated successfully",
        "content": {
            "application/json": {"schema": inline_schema(ScheduleResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FhirScheduleResponse.model_json_schema())},
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Schedules",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedScheduleResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FhirBundleResponse.model_json_schema())},
        },
    }
}


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_schedule",
    summary="Create a Schedule",
    description=(
        "Creates a new FHIR Schedule resource. "
        "Supply `user_id` and `org_id` in the body for tenant scoping. "
        "Stamps `created_by` from the caller's JWT — do not supply this field. "
        "The `actor` array defines which Practitioner, HealthcareService, Location, etc. "
        "this schedule provides availability for. "
        "Send `Accept: application/fhir+json` to receive the created resource in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("schedule", "create"))],
)
async def create_schedule(
    dto: ScheduleCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("schedule", "create")),
    service: ScheduleService = Depends(get_schedule_service),
) -> JSONResponse:
    """
    Create a new Schedule. Forwards the client's Accept header to the fhir-server
    so it returns the created resource in the requested format.
    """
    accept = get_accept_header(request)
    data = await service.create(dto, actor, accept=accept)
    return format_response(data, request)


@router.get(
    "/{schedule_id}",
    operation_id="get_schedule",
    summary="Get a Schedule by ID",
    description=(
        "Retrieves a single Schedule by its public integer ID. "
        "Send `Accept: application/fhir+json` to receive the resource in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("schedule", "read"))],
)
async def get_schedule(
    schedule_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("schedule", "read")),
    service: ScheduleService = Depends(get_schedule_service),
) -> JSONResponse:
    """Fetch a single Schedule by ID. Forwards Accept header for content negotiation."""
    accept = get_accept_header(request)
    data = await service.get_by_id(schedule_id, actor, accept=accept)
    return format_response(data, request)


@router.get(
    "/",
    operation_id="list_schedules",
    summary="List Schedules",
    description=(
        "Returns a paginated list of Schedules. "
        "Filter by `active` status. "
        "Use `limit` and `offset` for pagination. "
        "Send `Accept: application/fhir+json` to receive results as a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("schedule", "read"))],
)
async def list_schedules(
    request: Request,
    filters: ListSchedulesSchema = Depends(),
    actor: AuthUser = Depends(require_permission("schedule", "read")),
    service: ScheduleService = Depends(get_schedule_service),
) -> JSONResponse:
    """
    List Schedules with optional filters. Forwards Accept header so the fhir-server
    returns either a plain paginated envelope or a FHIR Bundle searchset.
    """
    accept = get_accept_header(request)
    data = await service.list(filters, actor, accept=accept)
    return format_paginated_response(data, request)


@router.patch(
    "/{schedule_id}",
    operation_id="update_schedule",
    summary="Partially update a Schedule",
    description=(
        "Updates specific scalar fields on a Schedule. At least one field must be provided. "
        "Patchable fields: active, comment, planning_horizon_start, planning_horizon_end. "
        "Array sub-resources (identifier, service_category, service_type, specialty, actor) "
        "are not patchable — delete and re-create to change those. "
        "Send `Accept: application/fhir+json` to receive the updated resource in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("schedule", "update"))],
)
async def update_schedule(
    schedule_id: int,
    dto: SchedulePatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("schedule", "update")),
    service: ScheduleService = Depends(get_schedule_service),
) -> JSONResponse:
    """Partially update a Schedule. Forwards Accept header for content negotiation."""
    accept = get_accept_header(request)
    data = await service.update(schedule_id, dto, actor, accept=accept)
    return format_response(data, request)


@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_schedule",
    summary="Delete a Schedule",
    description=(
        "Permanently deletes the Schedule and all its associated Slots. "
        "This operation is irreversible."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("schedule", "delete"))],
)
async def delete_schedule(
    schedule_id: int,
    actor: AuthUser = Depends(require_permission("schedule", "delete")),
    service: ScheduleService = Depends(get_schedule_service),
) -> None:
    """Delete a Schedule. No content negotiation — DELETE returns 204 with no body."""
    await service.delete(schedule_id, actor)
