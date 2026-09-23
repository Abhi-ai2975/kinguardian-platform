from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.slot_deps import resolve_slot
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.slot import get_slot_service
from app.models.slot.slot import SlotModel
from app.schemas.slot import SlotCreateSchema, SlotPatchSchema
from app.schemas.slot.response import (
    FHIRSlotSchema,
    FHIRSlotBundle,
    PaginatedSlotResponse,
    PlainSlotResponse,
)
from app.services.slot_service import SlotService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Slot not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainSlotResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRSlotSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of slots",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedSlotResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRSlotBundle.model_json_schema())},
        },
    }
}


# ── Create Slot ────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_slot",
    summary="Create a new Slot resource",
    description=(
        "A slot of time on a schedule that may be available for booking appointments. "
        "Requires a `schedule` reference (e.g. `'Schedule/200001'`) and a `status` "
        "(busy | free | busy-unavailable | busy-tentative | entered-in-error). "
        "Optionally set `start`/`end`, `overbooked`, `comment`, `appointmentType`, "
        "`serviceCategory`, `serviceType`, `specialty`, and `identifier` arrays. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Slot resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_slot(
    payload: SlotCreateSchema,
    request: Request,
    slot_service: SlotService = Depends(get_slot_service),
):
    created_by = payload.created_by
    slot = await slot_service.create_slot(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        slot_service._to_fhir(slot),
        slot_service._to_plain(slot),
        request,
    )


# Declared before /{slot_id} to avoid routing conflicts.



@router.get(
    "/{slot_id}",
    operation_id="get_slot_by_id",
    summary="Retrieve a Slot resource by public slot_id",
    description=(
        "Fetches a single Slot by its public integer `slot_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested Slot resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_slot(
    request: Request,
    slot: SlotModel = Depends(resolve_slot),
    slot_service: SlotService = Depends(get_slot_service),
):
    return format_response(
        slot_service._to_fhir(slot),
        slot_service._to_plain(slot),
        request,
    )


# ── Patch Slot ─────────────────────────────────────────────────────────────────


@router.patch(
    "/{slot_id}",
    operation_id="patch_slot",
    summary="Partially update a Slot resource",
    description=(
        "Patchable fields: `status`, `start`, `end`, `overbooked`, `comment`, "
        "`appointment_type_system`, `appointment_type_code`, `appointment_type_display`, "
        "`appointment_type_text`. "
        "Child arrays (identifier, serviceCategory, serviceType, specialty) and the "
        "`schedule` reference cannot be changed via PATCH — delete and re-create the Slot "
        "to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated Slot resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_slot(
    payload: SlotPatchSchema,
    request: Request,
    slot: SlotModel = Depends(resolve_slot),
    slot_service: SlotService = Depends(get_slot_service),
):
    updated_by = payload.updated_by
    updated = await slot_service.patch_slot(slot.slot_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=404, detail="Slot not found")
    return format_response(
        slot_service._to_fhir(updated),
        slot_service._to_plain(updated),
        request,
    )


# ── List Slots ─────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_slots",
    summary="List all Slot resources",
    description=(
        "Returns a paginated list of Slot resources. "
        "Filter by `status`, `schedule_id`, `practitioner_role_id`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Slot resources",
    responses={**_LIST_200},
)
async def list_slots(
    request: Request,
    slot_status: Optional[str] = Query(
        None, alias="status",
        description="Filter by slot status (busy | free | busy-unavailable | busy-tentative | entered-in-error).",
    ),
    schedule_id: Optional[int] = Query(None, description="Filter by public schedule_id."),
    practitioner_role_id: Optional[int] = Query(None, description="Filter by public practitioner_role_id — returns slots belonging to that practitioner's schedule."),
    date: Optional[str] = Query(None, description="Filter by exact start date (YYYY-MM-DD). Returns all slots whose start falls on this date."),
    start_from: Optional[str] = Query(None, description="Filter slots with start >= this value (ISO datetime or YYYY-MM-DD)."),
    start_to: Optional[str] = Query(None, description="Filter slots with start <= this value (ISO datetime or YYYY-MM-DD)."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    slot_service: SlotService = Depends(get_slot_service),
):
    items, total = await slot_service.list_slots(
        user_id=user_id, org_id=org_id,
        slot_status=slot_status, schedule_id=schedule_id,
        practitioner_role_id=practitioner_role_id,
        date=date, start_from=start_from, start_to=start_to,
        limit=limit, offset=offset,
    )
    return format_paginated_response(
        [slot_service._to_fhir(s) for s in items],
        [slot_service._to_plain(s) for s in items],
        total, limit, offset, request,
    )


# ── Delete Slot ────────────────────────────────────────────────────────────────


@router.delete(
    "/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_slot",
    summary="Delete a Slot resource",
    description=(
        "Permanently deletes the Slot and all its associated child records "
        "(identifier, serviceCategory, serviceType, specialty). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_slot(
    slot: SlotModel = Depends(resolve_slot),
    slot_service: SlotService = Depends(get_slot_service),
):
    await slot_service.delete_slot(slot.slot_id)
    return None
