from datetime import date as date_type
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.deps.vitals_deps import resolve_vitals
from app.core.schema_utils import inline_schema
from app.di.dependencies.vitals import get_vitals_service
from app.models.vitals.vitals import VitalsModel
from app.schemas.vitals import (
    VitalsCreateSchema,
    VitalsPatchSchema,
    VitalsResponseSchema,
    PaginatedVitalsResponse,
)
from app.services.vitals_service import VitalsService

router = APIRouter()

_ERR_NOT_FOUND = {404: {"description": "Vitals entry not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(VitalsResponseSchema.model_json_schema())}
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of vitals entries",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedVitalsResponse.model_json_schema())}
        },
    }
}


def _serialize(vitals: VitalsModel) -> dict:
    return VitalsResponseSchema(
        id=vitals.vitals_id,
        pseudo_id=vitals.pseudo_id,
        pseudo_id2=vitals.pseudo_id2,
        user_id=vitals.user_id,
        patient_id=vitals.patient_id,
        org_id=vitals.org_id,
        steps=vitals.steps,
        calories_kcal=vitals.calories_kcal,
        distance_meters=vitals.distance_meters,
        total_active_minutes=vitals.total_active_minutes,
        activity_name=vitals.activity_name,
        exercise_duration_minutes=vitals.exercise_duration_minutes,
        active_zone_minutes=vitals.active_zone_minutes,
        fatburn_active_zone_minutes=vitals.fatburn_active_zone_minutes,
        cardio_active_zone_minutes=vitals.cardio_active_zone_minutes,
        peak_active_zone_minutes=vitals.peak_active_zone_minutes,
        resting_heart_rate=vitals.resting_heart_rate,
        heart_rate=vitals.heart_rate,
        heart_rate_variability=vitals.heart_rate_variability,
        stress_management_score=vitals.stress_management_score,
        blood_pressure_systolic=vitals.blood_pressure_systolic,
        blood_pressure_diastolic=vitals.blood_pressure_diastolic,
        sleep_minutes=vitals.sleep_minutes,
        rem_sleep_minutes=vitals.rem_sleep_minutes,
        deep_sleep_minutes=vitals.deep_sleep_minutes,
        light_sleep_minutes=vitals.light_sleep_minutes,
        awake_minutes=vitals.awake_minutes,
        bed_time=vitals.bed_time,
        wake_up_time=vitals.wake_up_time,
        deep_sleep_percent=vitals.deep_sleep_percent,
        rem_sleep_percent=vitals.rem_sleep_percent,
        light_sleep_percent=vitals.light_sleep_percent,
        awake_percent=vitals.awake_percent,
        weight_kg=vitals.weight_kg,
        height_cm=vitals.height_cm,
        age=vitals.age,
        gender=vitals.gender,
        recorded_at=vitals.recorded_at,
        date=vitals.date,
        created_at=vitals.created_at,
        updated_at=vitals.updated_at,
    ).model_dump(exclude_none=True)


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_vitals",
    summary="Record a new vitals entry",
    description=(
        "Creates a vitals record capturing health and activity metrics from a wearable device or manual entry. "
        "Supported metric categories: activity (steps, calories, distance, active minutes, exercise), "
        "heart (resting heart rate, heart rate, HRV, stress score), "
        "blood pressure (systolic, diastolic), "
        "sleep (total, REM, deep, light, awake minutes; bed/wake times; stage percentages), "
        "and body metrics (weight, height, age, gender). "
        "Supply `user_id` and `org_id` in the payload to bind the record; omit to use JWT claims. "
        "The caller's `sub` JWT claim is recorded as `created_by`. "
        "The linked patient is resolved from the user's `sub` claim if `patient_id` is not provided."
    ),
    response_description="The newly created vitals entry",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_vitals(
    payload: VitalsCreateSchema,
    request: Request,
    vitals_service: VitalsService = Depends(get_vitals_service),
):
    created_by = payload.created_by
    vitals = await vitals_service.create_vitals(payload, payload.user_id, payload.org_id, created_by)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=jsonable_encoder(_serialize(vitals)),
    )



@router.get(
    "/{vitals_id}",
    operation_id="get_vitals_by_id",
    summary="Retrieve a vitals entry by public vitals_id",
    description=(
        "Fetches a single vitals record by its public integer `vitals_id`. "
        "Access is subject to organization-scoped authorization."
    ),
    response_description="The requested vitals entry",
    responses={
        **_SINGLE_200,
        403: {"description": "Forbidden — caller lacks permission or the entry belongs to a different organization"},
        **_ERR_NOT_FOUND,
    },
)
async def get_vitals(
    request: Request,
    vitals: VitalsModel = Depends(resolve_vitals),
    vitals_service: VitalsService = Depends(get_vitals_service),
):
    return JSONResponse(content=jsonable_encoder(_serialize(vitals)))


@router.patch(
    "/{vitals_id}",
    operation_id="patch_vitals",
    summary="Partially update a vitals entry",
    description=(
        "Only supplied metric fields are written; omitted fields are left unchanged. "
        "All metric fields in VitalsCreateSchema are patchable. "
        "`user_id`, `patient_id`, `org_id`, and `recorded_at` cannot be changed after creation. "
        "The caller's `sub` JWT claim is recorded as `updated_by`."
    ),
    response_description="The updated vitals entry",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_vitals(
    payload: VitalsPatchSchema,
    request: Request,
    vitals: VitalsModel = Depends(resolve_vitals),
    vitals_service: VitalsService = Depends(get_vitals_service),
):
    updated_by = payload.updated_by
    updated = await vitals_service.patch_vitals(vitals.vitals_id, payload, updated_by=updated_by)
    if not updated:
        raise HTTPException(status_code=404, detail="Vitals not found")
    return JSONResponse(content=jsonable_encoder(_serialize(updated)))


@router.get(
    "/",
    operation_id="list_vitals",
    summary="List vitals entries with optional filters",
    description=(
        "Returns a paginated list of vitals entries accessible to the caller. "
        "Filter by `user_id`, `patient_id`, `org_id`, exact `date` (YYYY-MM-DD), "
        "or a `recorded_at` datetime range (`recorded_at_from` / `recorded_at_to`). "
        "Results are ordered by `recorded_at` descending (newest first)."
    ),
    response_description="Paginated vitals entries",
    responses={**_LIST_200},
)
async def list_vitals(
    request: Request,
    user_id: Optional[str] = None,
    patient_id: Optional[int] = None,
    org_id: Optional[str] = None,
    date: Optional[date_type] = Query(None, description="Exact match on the date field (YYYY-MM-DD)."),
    recorded_at_from: Optional[datetime] = Query(None, description="recorded_at >= this datetime (ISO 8601)."),
    recorded_at_to: Optional[datetime] = Query(None, description="recorded_at <= this datetime (ISO 8601)."),
    limit: int = Query(50, ge=1, le=200, description="Max records to return (1–200)."),
    offset: int = Query(0, ge=0, description="Number of records to skip for pagination."),
    vitals_service: VitalsService = Depends(get_vitals_service),
):
    records, total = await vitals_service.list_vitals(
        user_id=user_id,
        patient_id=patient_id,
        org_id=org_id,
        date_filter=date,
        recorded_at_from=recorded_at_from,
        recorded_at_to=recorded_at_to,
        limit=limit,
        offset=offset,
    )
    return JSONResponse(content=jsonable_encoder({
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [_serialize(v) for v in records],
    }))


@router.delete(
    "/{vitals_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_vitals",
    summary="Delete a vitals entry",
    description=(
        "Permanently deletes the vitals record. "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_vitals(
    vitals: VitalsModel = Depends(resolve_vitals),
    vitals_service: VitalsService = Depends(get_vitals_service),
):
    await vitals_service.delete_vitals(vitals.vitals_id)
    return None
