"""
FastAPI router for Slot resources.

Exposes the standard CRUD surface for Slot:
  POST   /slots/                — create a new Slot
  GET    /slots/{resource_id}   — fetch a single Slot by integer ID
  GET    /slots/                — paginated list with optional filters
  PATCH  /slots/{resource_id}   — partial update (scalar fields only)
  DELETE /slots/{resource_id}   — permanent delete (cascades to child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

inline_schema() is used everywhere in the `responses=` dict to resolve
Pydantic's $defs/$ref pointers, which would otherwise produce broken
schema references in the Swagger UI resolver.

RBAC is enforced via require_permission() — each route checks the
caller's permissions for the ("slot", <action>) pair before the handler runs.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.slot import get_slot_service
from app.schemas.slot.fhir_schemas import FhirBundleResponse, FhirSlotResponse
from app.schemas.slot.input import ListSlotsSchema, SlotCreateSchema, SlotGenerateSchema, SlotPatchSchema
from app.schemas.slot.response import PaginatedSlotResponse, SlotGenerateResponse, SlotResponse
from app.services.slot_service import SlotService

# All slot routes are prefixed with /slots; tagged for Swagger grouping.
router = APIRouter(prefix="/slots", tags=["Slots"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "Slot not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────
# inline_schema() resolves Pydantic v2 $defs/$ref pointers so nested sub-model
# references (e.g. PlainSlotIdentifier inside SlotResponse) render correctly in
# the Swagger UI schema resolver rather than showing as broken $ref links.

_SINGLE_201 = {
    201: {
        "description": "Slot created successfully",
        "content": {
            # Plain JSON shape (snake_case, flat columns for child records)
            "application/json": {
                "schema": inline_schema(SlotResponse.model_json_schema())
            },
            # FHIR R4 shape (camelCase, nested CodeableConcept / Reference datatypes)
            "application/fhir+json": {
                "schema": inline_schema(FhirSlotResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Slot retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(SlotResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirSlotResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Slot resources",
        "content": {
            # application/json → PaginatedSlotResponse { total, limit, offset, data[] }
            "application/json": {
                "schema": inline_schema(PaginatedSlotResponse.model_json_schema())
            },
            # application/fhir+json → FHIR Bundle searchset { resourceType, type, total, entry[] }
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /slots/generate ─────────────────────────────────────────────────────
# Registered BEFORE /{resource_id} to prevent FastAPI treating "generate" as an
# integer path parameter.


@router.post(
    "/generate",
    status_code=status.HTTP_201_CREATED,
    operation_id="generate_slots",
    summary="Auto-generate Slots for a Schedule",
    description=(
        "Automatically creates one free Slot per `slot_duration_minutes` interval "
        "between `generation_start` and `generation_end` for the given `schedule_id`. "
        "\n\n"
        "**service_category**, **service_type**, and **specialty** are optional overrides. "
        "When omitted they are auto-inherited in this priority order:\n"
        "  1. Fields already stored on the Schedule resource.\n"
        "  2. `specialty[]` from the PractitionerRole actor listed on the Schedule.\n\n"
        "**appointment_type** fields are optional — FHIR convention is to set "
        "`appointmentType` on the Appointment at booking time, not on the Slot at "
        "generation time. Pre-set here only when every slot in the batch shares "
        "the same type (e.g. a dedicated ROUTINE session).\n\n"
        "Uses a partial-failure model: successfully created slots are NOT rolled back "
        "if later ones fail. `failed_count` and `errors[]` report any failures."
    ),
    response_model=SlotGenerateResponse,
    responses={
        201: {"description": "Slots generated — see generated_count and slot_ids"},
        **_ERR_VALIDATION,
        404: {"description": "Schedule not found"},
    },
    dependencies=[Depends(require_permission("slot", "create"))],
)
async def generate_slots(
    dto: SlotGenerateSchema,
    actor: AuthUser = Depends(require_permission("slot", "create")),
    service: SlotService = Depends(get_slot_service),
) -> SlotGenerateResponse:
    """Generate Slots for a Schedule within a time window at a fixed duration interval."""
    return await service.generate(dto, actor)


# ── POST /slots/ ──────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_slot",
    summary="Create a Slot",
    description=(
        "Creates a new Slot — a bookable time window on a Schedule. "
        "Requires a `schedule` reference (e.g. `'Schedule/200001'`) and a `status` "
        "(busy | free | busy-unavailable | busy-tentative | entered-in-error). "
        "Stamps `created_by` from the caller's JWT — do not supply this field. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("slot", "create"))],
)
async def create_slot(
    dto: SlotCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("slot", "create")),
    service: SlotService = Depends(get_slot_service),
) -> JSONResponse:
    """Create a new Slot resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /slots/{resource_id} ─────────────────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_slot",
    summary="Get a Slot by ID",
    description=(
        "Fetch a single Slot by its integer ID. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("slot", "read"))],
)
async def get_slot(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("slot", "read")),
    service: SlotService = Depends(get_slot_service),
) -> JSONResponse:
    """Fetch a single Slot resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /slots/ ───────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_slots",
    summary="List Slots",
    description=(
        "Returns a paginated list of Slot resources. "
        "Filter by `status`, `schedule_id`, `practitioner_role_id`, `user_id`, or `org_id`. "
        "Narrow by date using `date` (exact YYYY-MM-DD), `start_from`, or `start_to` (ISO datetime or date). "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("slot", "read"))],
)
async def list_slots(
    request: Request,
    filters: ListSlotsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("slot", "read")),
    service: SlotService = Depends(get_slot_service),
) -> JSONResponse:
    """Return a paginated list of Slots, optionally filtered by status, schedule, or practitioner role."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /slots/{resource_id} ───────────────────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_slot",
    summary="Partially update a Slot",
    description=(
        "Update specific scalar fields on a Slot. At least one field must be provided. "
        "Patchable fields: `status`, `start`, `end`, `overbooked`, `comment`, "
        "`appointment_type_system`, `appointment_type_code`, `appointment_type_display`, "
        "`appointment_type_text`. "
        "Arrays (identifier, serviceCategory, serviceType, specialty) and the `schedule` "
        "reference are not patchable — delete and re-create the Slot to change those. "
        "Stamps `updated_by` from the caller's JWT automatically. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("slot", "update"))],
)
async def update_slot(
    resource_id: int,
    dto: SlotPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("slot", "update")),
    service: SlotService = Depends(get_slot_service),
) -> JSONResponse:
    """Partially update a Slot resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /slots/{resource_id} ──────────────────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_slot",
    summary="Delete a Slot",
    description=(
        "Permanently deletes the Slot and all its child records "
        "(identifier, serviceCategory, serviceType, specialty). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("slot", "delete"))],
)
async def delete_slot(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("slot", "delete")),
    service: SlotService = Depends(get_slot_service),
) -> None:
    """Permanently delete a Slot and cascade to all child records."""
    await service.delete(resource_id, actor)
