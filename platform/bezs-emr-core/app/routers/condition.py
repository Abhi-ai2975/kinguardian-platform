from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.condition_deps import resolve_condition
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.condition import get_condition_service
from app.models.condition.condition import ConditionModel
from app.schemas.condition import ConditionCreateSchema, ConditionPatchSchema
from app.schemas.condition.response import (
    FHIRConditionSchema,
    FHIRConditionBundle,
    PaginatedConditionResponse,
    PlainConditionResponse,
)
from app.services.condition_service import ConditionService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Condition not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainConditionResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRConditionSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of conditions",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedConditionResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRConditionBundle.model_json_schema())},
        },
    }
}


# ── Create Condition ───────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_condition",
    summary="Create a new Condition resource",
    description=(
        "Records a clinical condition, problem, diagnosis, or other health matter for a patient. "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id` (public encounter_id). "
        "The caller's `sub` and `activeOrganizationId` JWT claims are automatically bound. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Condition resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_condition(
    payload: ConditionCreateSchema,
    request: Request,
    condition_service: ConditionService = Depends(get_condition_service),
):
    created_by = payload.created_by
    condition = await condition_service.create_condition(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        condition_service._to_fhir(condition),
        condition_service._to_plain(condition),
        request,
    )


# Declared before /{condition_id} to avoid routing conflicts.



@router.get(
    "/{condition_id}",
    operation_id="get_condition_by_id",
    summary="Retrieve a Condition resource by public condition_id",
    description=(
        "Fetches a single Condition by its public integer `condition_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested Condition resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_condition(
    request: Request,
    condition: ConditionModel = Depends(resolve_condition),
    condition_service: ConditionService = Depends(get_condition_service),
):
    return format_response(
        condition_service._to_fhir(condition),
        condition_service._to_plain(condition),
        request,
    )


# ── Patch Condition ────────────────────────────────────────────────────────────


@router.patch(
    "/{condition_id}",
    operation_id="patch_condition",
    summary="Partially update a Condition resource",
    description=(
        "Patchable fields: `clinical_status_*`, `verification_status_*`, `severity_*`, `code_*`, "
        "`recorded_date`, `encounter_display`, and all `onset_*` / `abatement_*` variants. "
        "Child arrays (identifier, category, bodySite, stage, evidence, note) cannot be changed via PATCH — "
        "delete and re-create the Condition to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated Condition resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_condition(
    payload: ConditionPatchSchema,
    request: Request,
    condition: ConditionModel = Depends(resolve_condition),
    condition_service: ConditionService = Depends(get_condition_service),
):
    updated_by = payload.updated_by
    updated = await condition_service.patch_condition(
        condition.condition_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Condition not found")
    return format_response(
        condition_service._to_fhir(updated),
        condition_service._to_plain(updated),
        request,
    )


# ── List Conditions ────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_conditions",
    summary="List all Condition resources",
    description=(
        "Returns a paginated list of Condition resources. "
        "Filter by `clinical_status`, `patient_id`, `recorded_from`, `recorded_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Condition resources",
    responses={**_LIST_200},
)
async def list_conditions(
    request: Request,
    clinical_status: Optional[str] = Query(None, description="Filter by clinicalStatus code e.g. 'active'."),
    patient_id: Optional[int] = Query(None, description="Filter by patient subject_id."),
    encounter_id: Optional[int] = Query(None, description="Filter by public encounter_id — returns conditions linked to that encounter."),
    recorded_from: Optional[datetime] = Query(None),
    recorded_to: Optional[datetime] = Query(None),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    condition_service: ConditionService = Depends(get_condition_service),
):
    conditions, total = await condition_service.list_conditions(
        user_id=user_id,
        org_id=org_id,
        clinical_status=clinical_status,
        patient_id=patient_id,
        encounter_id=encounter_id,
        recorded_from=recorded_from,
        recorded_to=recorded_to,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [condition_service._to_fhir(c) for c in conditions],
        [condition_service._to_plain(c) for c in conditions],
        total, limit, offset, request,
    )


# ── Delete Condition ───────────────────────────────────────────────────────────


@router.delete(
    "/{condition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_condition",
    summary="Delete a Condition resource",
    description=(
        "Permanently deletes the Condition and all its associated child records "
        "(identifier, category, bodySite, stage, evidence, note). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_condition(
    condition: ConditionModel = Depends(resolve_condition),
    condition_service: ConditionService = Depends(get_condition_service),
):
    await condition_service.delete_condition(condition.condition_id)
    return None
