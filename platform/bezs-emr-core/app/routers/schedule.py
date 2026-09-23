from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.schedule_deps import resolve_schedule
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.schedule import get_schedule_service
from app.models.schedule.schedule import ScheduleModel
from app.schemas.schedule import ScheduleCreateSchema, SchedulePatchSchema
from app.schemas.schedule.response import (
    FHIRScheduleSchema,
    FHIRScheduleBundle,
    PaginatedScheduleResponse,
    PlainScheduleResponse,
)
from app.services.schedule_service import ScheduleService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Schedule not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainScheduleResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRScheduleSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of schedules",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedScheduleResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRScheduleBundle.model_json_schema())},
        },
    }
}


# ── Create Schedule ────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_schedule",
    summary="Create a new Schedule resource",
    description=(
        "A container for slots of time that may be available for booking appointments. "
        "Provide at least one `actor` reference (e.g. `'Practitioner/30001'`). "
        "Optionally set `planningHorizon` via `planning_horizon_start`/`planning_horizon_end`, "
        "`serviceCategory`, `serviceType`, `specialty`, and `identifier` arrays. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Schedule resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_schedule(
    payload: ScheduleCreateSchema,
    request: Request,
    sched_service: ScheduleService = Depends(get_schedule_service),
):
    created_by = payload.created_by
    sched = await sched_service.create_schedule(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        sched_service._to_fhir(sched),
        sched_service._to_plain(sched),
        request,
    )


# Declared before /{schedule_id} to avoid routing conflicts.



@router.get(
    "/{schedule_id}",
    operation_id="get_schedule_by_id",
    summary="Retrieve a Schedule resource by public schedule_id",
    description=(
        "Fetches a single Schedule by its public integer `schedule_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested Schedule resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_schedule(
    request: Request,
    sched: ScheduleModel = Depends(resolve_schedule),
    sched_service: ScheduleService = Depends(get_schedule_service),
):
    return format_response(
        sched_service._to_fhir(sched),
        sched_service._to_plain(sched),
        request,
    )


# ── Patch Schedule ─────────────────────────────────────────────────────────────


@router.patch(
    "/{schedule_id}",
    operation_id="patch_schedule",
    summary="Partially update a Schedule resource",
    description=(
        "Patchable fields: `active`, `comment`, `planning_horizon_start`, `planning_horizon_end`. "
        "Child arrays (identifier, serviceCategory, serviceType, specialty, actor) cannot be "
        "changed via PATCH — delete and re-create the Schedule to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated Schedule resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_schedule(
    payload: SchedulePatchSchema,
    request: Request,
    sched: ScheduleModel = Depends(resolve_schedule),
    sched_service: ScheduleService = Depends(get_schedule_service),
):
    updated_by = payload.updated_by
    updated = await sched_service.patch_schedule(
        sched.schedule_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return format_response(
        sched_service._to_fhir(updated),
        sched_service._to_plain(updated),
        request,
    )


# ── List Schedules ─────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_schedules",
    summary="List all Schedule resources",
    description=(
        "Returns a paginated list of Schedule resources. "
        "Filter by `active`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Schedule resources",
    responses={**_LIST_200},
)
async def list_schedules(
    request: Request,
    active: Optional[bool] = Query(None, description="Filter by active status."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sched_service: ScheduleService = Depends(get_schedule_service),
):
    items, total = await sched_service.list_schedules(
        user_id=user_id, org_id=org_id, active=active, limit=limit, offset=offset
    )
    return format_paginated_response(
        [sched_service._to_fhir(s) for s in items],
        [sched_service._to_plain(s) for s in items],
        total, limit, offset, request,
    )


# ── Delete Schedule ────────────────────────────────────────────────────────────


@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_schedule",
    summary="Delete a Schedule resource",
    description=(
        "Permanently deletes the Schedule and all its associated child records "
        "(identifier, serviceCategory, serviceType, specialty, actor). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_schedule(
    sched: ScheduleModel = Depends(resolve_schedule),
    sched_service: ScheduleService = Depends(get_schedule_service),
):
    await sched_service.delete_schedule(sched.schedule_id)
    return None
