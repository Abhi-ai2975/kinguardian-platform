"""
FastAPI router for Appointment resources.

Endpoints:
  POST   /appointments/book          — simplified booking: validate slot, create Appointment, mark Slot busy
  POST   /appointments/              — create a new Appointment (with all child arrays in body)
  GET    /appointments/me            — caller's own appointments (paginated, from JWT)
  GET    /appointments/{id}          — fetch a single Appointment by integer ID
  GET    /appointments/              — paginated list with optional filters
  PATCH  /appointments/{id}          — partial update (scalar fields only — arrays immutable)
  DELETE /appointments/{id}          — permanent delete (cascades to all child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("appointment", <action>) pair.

CRITICAL route ordering: GET /me must be registered BEFORE GET /{appointment_id}
to prevent FastAPI matching the literal string "me" as an integer path segment.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.appointment import get_appointment_service
from app.schemas.appointment.fhir_schemas import FhirAppointmentResponse, FhirBundleResponse
from app.schemas.appointment.input import (
    AppointmentCreateSchema,
    AppointmentPatchSchema,
    BookAppointmentInput,
    ListAppointmentsSchema,
    MeAppointmentsSchema,
    RescheduleAppointmentInput,
)
from app.schemas.appointment.response import AppointmentResponse, PaginatedAppointmentResponse
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["Appointments"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "Appointment not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}
_ERR_SLOT_CONFLICT = {409: {"description": "Slot is not available — already booked or blocked"}}

# ── Shared success response descriptors ──────────────────────────────────────
# inline_schema() resolves Pydantic v2 $defs/$ref pointers so nested sub-model
# references (e.g. AppointmentResponse → PlainAppointmentParticipant) render
# correctly in the Swagger UI schema resolver.

_SINGLE_201 = {
    201: {
        "description": "Appointment created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(AppointmentResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirAppointmentResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Appointment retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(AppointmentResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirAppointmentResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Appointment resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedAppointmentResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /appointments/book ──────────────────────────────────────────────────
# Registered before POST / so FastAPI does not confuse the literal path segment
# "book" with the root collection endpoint. Both are POST so ordering matters.


@router.post(
    "/book",
    status_code=status.HTTP_201_CREATED,
    operation_id="book_appointment",
    summary="Book an Appointment with a Practitioner",
    description=(
        "Simplified booking endpoint. Provide a Practitioner ID, a free Slot ID, "
        "and a Patient ID — the service validates slot availability, builds the FHIR "
        "participant array automatically, creates the Appointment, and marks the Slot "
        "as busy in a single call. "
        "Returns 409 Conflict if the Slot is no longer free. "
        "Rolls back the created Appointment if the Slot busy-update fails. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION, **_ERR_SLOT_CONFLICT},
    dependencies=[Depends(require_permission("appointment", "create"))],
)
async def book_appointment(
    dto: BookAppointmentInput,
    request: Request,
    actor: AuthUser = Depends(require_permission("appointment", "create")),
    service: AppointmentService = Depends(get_appointment_service),
) -> JSONResponse:
    """
    Book a Practitioner appointment for a Patient against a specific free Slot.

    The service layer handles:
      1. Slot availability check (must be status='free').
      2. Appointment creation with auto-built participant array.
      3. Slot status update to 'busy' (rollback on failure).
    """
    data = await service.book(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── POST /appointments/ ──────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_appointment",
    summary="Create an Appointment",
    description=(
        "Creates a new Appointment resource. "
        "All child arrays (participant, slot, reason, service_type, note, etc.) are "
        "embedded in this single request body — the fhir-server has no separate "
        "sub-resource routes for Appointment. "
        "At least one `participant` entry is required. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("appointment", "create"))],
)
async def create_appointment(
    dto: AppointmentCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("appointment", "create")),
    service: AppointmentService = Depends(get_appointment_service),
) -> JSONResponse:
    """Create a new Appointment and return the persisted record with all child arrays."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /appointments/me ─────────────────────────────────────────────────────
# MUST be registered before GET /{appointment_id} so FastAPI does not interpret
# the literal string "me" as an integer path parameter.


@router.get(
    "/me",
    operation_id="get_my_appointments",
    summary="List the caller's own Appointments",
    description=(
        "Returns a paginated list of Appointments linked to the authenticated user's JWT subject. "
        "Filters by `user_id == actor.sub`. Optional filters: `status`, `start_from`, `start_to`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("appointment", "read"))],
)
async def get_my_appointments(
    request: Request,
    filters: MeAppointmentsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("appointment", "read")),
    service: AppointmentService = Depends(get_appointment_service),
) -> JSONResponse:
    """Return a paginated list of Appointments for the authenticated user (JWT subject lookup)."""
    data = await service.get_me(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── POST /appointments/{appointment_id}/reschedule ───────────────────────────
# MUST be registered before GET/PATCH /{appointment_id} so FastAPI does not
# attempt to match the literal path segment "reschedule" as an integer ID.


@router.post(
    "/{appointment_id}/reschedule",
    operation_id="reschedule_appointment",
    summary="Reschedule an Appointment to a different Slot",
    description=(
        "Moves an existing Appointment to a new free Slot. "
        "Provide the new `new_slot_id` — the service handles the full swap atomically:\n\n"
        "1. Fetches the current appointment to discover the old slot reference.\n"
        "2. Validates the new slot is free (raises 409 if already booked).\n"
        "3. Frees the old slot so it becomes available for other bookings.\n"
        "4. Updates the appointment's `start`/`end` to match the new slot's times.\n"
        "5. Marks the new slot as busy.\n\n"
        "Full rollback is applied if any step after Step 3 fails. "
        "The appointment's internal slot reference is not updated (fhir-server limitation — "
        "child arrays are immutable via PATCH). Only the timing fields are changed. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={
        **_SINGLE_200,
        **_ERR_NOT_FOUND,
        **_ERR_VALIDATION,
        **_ERR_SLOT_CONFLICT,
    },
    dependencies=[Depends(require_permission("appointment", "update"))],
)
async def reschedule_appointment(
    appointment_id: int,
    dto: RescheduleAppointmentInput,
    request: Request,
    actor: AuthUser = Depends(require_permission("appointment", "update")),
    service: AppointmentService = Depends(get_appointment_service),
) -> JSONResponse:
    """
    Reschedule an Appointment by swapping it from its current Slot to a new free Slot.

    The service atomically frees the old slot, updates the appointment timing,
    and marks the new slot as busy — with full rollback on any failure.
    """
    data = await service.reschedule(appointment_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /appointments/{appointment_id} ───────────────────────────────────────


@router.get(
    "/{appointment_id}",
    operation_id="get_appointment",
    summary="Get an Appointment by ID",
    description=(
        "Fetch a single Appointment by its integer ID. "
        "The response includes all child arrays (participant, slot, reason, note, etc.). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("appointment", "read"))],
)
async def get_appointment(
    appointment_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("appointment", "read")),
    service: AppointmentService = Depends(get_appointment_service),
) -> JSONResponse:
    """Fetch a single Appointment resource by its primary key."""
    data = await service.get_by_id(appointment_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /appointments/ ───────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_appointments",
    summary="List Appointments",
    description=(
        "Returns a paginated list of Appointment resources. "
        "Filter by `status`, `patient_id`, `practitioner_id`, time range (`start_from`/`start_to`), "
        "`user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("appointment", "read"))],
)
async def list_appointments(
    request: Request,
    filters: ListAppointmentsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("appointment", "read")),
    service: AppointmentService = Depends(get_appointment_service),
) -> JSONResponse:
    """Return a paginated list of Appointments with optional filters."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /appointments/{appointment_id} ─────────────────────────────────────


@router.patch(
    "/{appointment_id}",
    operation_id="update_appointment",
    summary="Partially update an Appointment",
    description=(
        "Update specific scalar fields on an Appointment. At least one field must be provided. "
        "Patchable fields: `status`, `start`, `end`, `minutes_duration`, `description`, "
        "`cancellation_date`, `priority_*`, `recurrence_id`, `occurrence_changed`, `cancelation_reason_*`. "
        "Child arrays (participant, slot, reason, etc.) are immutable after creation. "
        "Stamps `updated_by` from the caller's JWT automatically. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("appointment", "update"))],
)
async def update_appointment(
    appointment_id: int,
    dto: AppointmentPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("appointment", "update")),
    service: AppointmentService = Depends(get_appointment_service),
) -> JSONResponse:
    """Partially update an Appointment resource. Returns 422 if the body is empty."""
    data = await service.update(appointment_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /appointments/{appointment_id} ────────────────────────────────────


@router.delete(
    "/{appointment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_appointment",
    summary="Delete an Appointment",
    description=(
        "Permanently deletes the Appointment and all its child records "
        "(participant, slot, reason, note, virtual_service, recurrence_template, etc.). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("appointment", "delete"))],
)
async def delete_appointment(
    appointment_id: int,
    actor: AuthUser = Depends(require_permission("appointment", "delete")),
    service: AppointmentService = Depends(get_appointment_service),
) -> None:
    """Permanently delete an Appointment and cascade to all child records."""
    await service.delete(appointment_id, actor)
