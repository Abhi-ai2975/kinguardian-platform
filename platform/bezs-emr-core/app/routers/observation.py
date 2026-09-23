from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.observation_deps import resolve_observation
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.observation import get_observation_service
from app.models.observation.observation import ObservationModel
from app.schemas.observation import ObservationCreateSchema, ObservationPatchSchema
from app.schemas.observation.response import (
    FHIRObservationSchema,
    FHIRObservationBundle,
    PaginatedObservationResponse,
    PlainObservationResponse,
)
from app.services.observation_service import ObservationService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Observation not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainObservationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRObservationSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of observations",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedObservationResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRObservationBundle.model_json_schema())},
        },
    }
}


# ── Create Observation ─────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_observation",
    summary="Create a new Observation resource",
    description=(
        "Records a measurement or assertion about a patient or other subject. "
        "Requires `status` and `code_code`. "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id` (public encounter_id). "
        "Supply value[x] via one of the `value_*` field groups (valueQuantity, valueCodeableConcept, "
        "valueString, valueBoolean, valueInteger, valueRange, valueRatio, valueSampledData, "
        "valueTime, valueDateTime, valuePeriod). "
        + _CONTENT_NEG
    ),
    response_description="The newly created Observation resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_observation(
    payload: ObservationCreateSchema,
    request: Request,
    obs_service: ObservationService = Depends(get_observation_service),
):
    created_by = payload.created_by
    obs = await obs_service.create_observation(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        obs_service._to_fhir(obs),
        obs_service._to_plain(obs),
        request,
    )


# Declared before /{observation_id} to avoid routing conflicts.



@router.get(
    "/{observation_id}",
    operation_id="get_observation_by_id",
    summary="Retrieve an Observation resource by public observation_id",
    description=(
        "Fetches a single Observation by its public integer `observation_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested Observation resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_observation(
    request: Request,
    obs: ObservationModel = Depends(resolve_observation),
    obs_service: ObservationService = Depends(get_observation_service),
):
    return format_response(
        obs_service._to_fhir(obs),
        obs_service._to_plain(obs),
        request,
    )


# ── Patch Observation ──────────────────────────────────────────────────────────


@router.patch(
    "/{observation_id}",
    operation_id="patch_observation",
    summary="Partially update an Observation resource",
    description=(
        "Patchable fields: `status`, `code_*`, `subject_display`, `encounter_display`, "
        "`effective_date_time`, `effective_period_*`, `effective_instant`, `issued`, "
        "`data_absent_reason_*`, `body_site_*`, `method_*`, `specimen_display`, `device_display`, "
        "and all `value_*` fields (valueQuantity, valueCodeableConcept, valueString, valueBoolean, "
        "valueInteger, valueRange, valueRatio, valueSampledData, valueTime, valueDateTime, valuePeriod). "
        "Child arrays (identifier, basedOn, partOf, category, focus, performer, interpretation, note, "
        "referenceRange, hasMember, derivedFrom, component) cannot be changed via PATCH — "
        "delete and re-create the Observation to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated Observation resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_observation(
    payload: ObservationPatchSchema,
    request: Request,
    obs: ObservationModel = Depends(resolve_observation),
    obs_service: ObservationService = Depends(get_observation_service),
):
    updated_by = payload.updated_by
    updated = await obs_service.patch_observation(
        obs.observation_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Observation not found")
    return format_response(
        obs_service._to_fhir(updated),
        obs_service._to_plain(updated),
        request,
    )


# ── List Observations ──────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_observations",
    summary="List all Observation resources",
    description=(
        "Returns a paginated list of Observation resources. "
        "Filter by `status`, `patient_id`, `effective_from`, `effective_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Observation resources",
    responses={**_LIST_200},
)
async def list_observations(
    request: Request,
    obs_status: Optional[str] = Query(None, alias="status", description="Filter by status e.g. 'final'."),
    patient_id: Optional[int] = Query(None, description="Filter by patient subject_id."),
    encounter_id: Optional[int] = Query(None, description="Filter by public encounter_id — returns observations linked to that encounter."),
    effective_from: Optional[datetime] = Query(None, description="Filter by effectiveDateTime >= this value."),
    effective_to: Optional[datetime] = Query(None, description="Filter by effectiveDateTime <= this value."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    obs_service: ObservationService = Depends(get_observation_service),
):
    items, total = await obs_service.list_observations(
        user_id=user_id,
        org_id=org_id,
        obs_status=obs_status,
        patient_id=patient_id,
        encounter_id=encounter_id,
        effective_from=effective_from,
        effective_to=effective_to,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [obs_service._to_fhir(obs) for obs in items],
        [obs_service._to_plain(obs) for obs in items],
        total, limit, offset, request,
    )


# ── Delete Observation ─────────────────────────────────────────────────────────


@router.delete(
    "/{observation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_observation",
    summary="Delete an Observation resource",
    description=(
        "Permanently deletes the Observation and all its associated child records "
        "(identifier, basedOn, partOf, category, focus, performer, interpretation, note, "
        "referenceRange, hasMember, derivedFrom, component and their nested children). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_observation(
    obs: ObservationModel = Depends(resolve_observation),
    obs_service: ObservationService = Depends(get_observation_service),
):
    await obs_service.delete_observation(obs.observation_id)
    return None
