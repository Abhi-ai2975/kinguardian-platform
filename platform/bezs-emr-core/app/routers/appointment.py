from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.appointment_deps import resolve_appointment
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.appointment import get_appointment_service
from app.models.appointment.appointment import AppointmentModel
from app.schemas.appointment import AppointmentCreateSchema, AppointmentPatchSchema
from app.schemas.fhir import (
    FHIRAppointmentSchema,
    FHIRAppointmentBundle,
    PaginatedAppointmentResponse,
    PlainAppointmentResponse,
)
from app.services.appointment_service import AppointmentService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Appointment not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

# Pre-computed inline schemas (evaluated once at import time)
_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainAppointmentResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRAppointmentSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of appointments",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedAppointmentResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRAppointmentBundle.model_json_schema())},
        },
    }
}


# ── Create Appointment ─────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_appointment",
    summary="Create a new Appointment resource",
    description=(
        "Books a scheduled healthcare event for one or more participants (patient and/or practitioners). "
        "At least one participant is required. "
        "Participant references use public IDs: `Patient/10001`, `Practitioner/30001`. "
        "Provide `start` and `end` as ISO 8601 datetimes, or supply `minutes_duration` instead of `end`. "
        "The caller's `sub` and `activeOrganizationId` JWT claims are automatically bound to the record. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Appointment resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_appointment(
    payload: AppointmentCreateSchema,
    request: Request,
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    created_by = payload.created_by
    appointment = await appointment_service.create_appointment(payload, payload.user_id, payload.org_id, created_by)
    return format_response(
        appointment_service._to_fhir(appointment),
        appointment_service._to_plain(appointment),
        request,
    )


# Declared before /{appointment_id} to avoid routing conflicts.



@router.get(
    "/{appointment_id}",
    operation_id="get_appointment_by_id",
    summary="Retrieve an Appointment resource by public appointment_id",
    description=(
        "Fetches a single Appointment by its public integer `appointment_id`. "
        "Access is subject to organization-scoped authorization — the appointment must belong to the caller's active organization. "
        + _CONTENT_NEG
    ),
    response_description="The requested Appointment resource",
    responses={
        **_SINGLE_200,
        403: {"description": "Forbidden — caller lacks `appointment:read` permission or the appointment belongs to a different organization"},
        **_ERR_NOT_FOUND,
    },
)
async def get_appointment(
    request: Request,
    appointment: AppointmentModel = Depends(resolve_appointment),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    return format_response(
        appointment_service._to_fhir(appointment),
        appointment_service._to_plain(appointment),
        request,
    )


# ── Patch Appointment ──────────────────────────────────────────────────────


@router.patch(
    "/{appointment_id}",
    operation_id="patch_appointment",
    summary="Partially update an Appointment resource",
    description=(
        "Patchable fields: `status`, `start`, `end`, `minutes_duration`, `description`, "
        "`cancellation_date`, `priority_code/display/system/text`, `recurrence_id`, `occurrence_changed`. "
        "Participants and service fields (service type, specialty, reason) cannot be changed after creation — "
        "delete and re-create the Appointment to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated Appointment resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_appointment(
    payload: AppointmentPatchSchema,
    request: Request,
    appointment: AppointmentModel = Depends(resolve_appointment),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    updated_by = payload.updated_by
    updated = await appointment_service.patch_appointment(
        appointment.appointment_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return format_response(
        appointment_service._to_fhir(updated),
        appointment_service._to_plain(updated),
        request,
    )


# ── List Appointments ──────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_appointments",
    summary="List all Appointment resources",
    description=(
        "Returns a paginated list of Appointment resources. "
        "Filter by `status`, `patient_id`, `start_from`, `start_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Appointment resources",
    responses={**_LIST_200},
)
async def list_appointments(
    request: Request,
    appt_status: Optional[str] = Query(None, alias="status"),
    patient_id: Optional[int] = Query(None, description="Filter by public patient_id."),
    practitioner_id: Optional[int] = Query(None, description="Filter by public practitioner_id — returns appointments where this practitioner is a participant."),
    start_from: Optional[datetime] = Query(None),
    start_to: Optional[datetime] = Query(None),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    appointments, total = await appointment_service.list_appointments(
        user_id=user_id, org_id=org_id, status=appt_status, patient_id=patient_id,
        practitioner_id=practitioner_id,
        start_from=start_from, start_to=start_to, limit=limit, offset=offset,
    )
    return format_paginated_response(
        [appointment_service._to_fhir(a) for a in appointments],
        [appointment_service._to_plain(a) for a in appointments],
        total, limit, offset, request,
    )


# ── Delete Appointment ─────────────────────────────────────────────────────


@router.delete(
    "/{appointment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_appointment",
    summary="Delete an Appointment resource",
    description=(
        "Permanently deletes the Appointment and all its associated participant records. "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_appointment(
    appointment: AppointmentModel = Depends(resolve_appointment),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    await appointment_service.delete_appointment(appointment.appointment_id)
    return None
