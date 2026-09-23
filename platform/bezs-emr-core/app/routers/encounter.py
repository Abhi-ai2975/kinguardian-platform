from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.encounter_deps import resolve_encounter
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.encounter import get_encounter_service
from app.models.encounter.encounter import EncounterModel
from app.schemas.encounter import EncounterCreateSchema, EncounterPatchSchema
from app.schemas.fhir import (
    FHIREncounterSchema,
    FHIREncounterBundle,
    PaginatedEncounterResponse,
    PlainEncounterResponse,
)
from app.services.encounter_service import EncounterService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Encounter not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainEncounterResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIREncounterSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of encounters",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedEncounterResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIREncounterBundle.model_json_schema())},
        },
    }
}


# ── Create Encounter ───────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_encounter",
    summary="Create a new Encounter resource",
    description=(
        "Creates an Encounter — a clinical interaction between a patient and one or more providers. "
        "All sub-resources (identifiers, status history, class history, types, episode-of-care references, "
        "based-on references, participants, reason codes, reason references, diagnoses, accounts, "
        "hospitalization, and locations) are submitted as part of a single document in the request body. "
        "References use public IDs: `Patient/10001`, `Practitioner/30001`, `Condition/12345`. "
        "The caller's `sub` and `activeOrganizationId` JWT claims are automatically bound to the record. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Encounter resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_encounter(
    payload: EncounterCreateSchema,
    request: Request,
    encounter_service: EncounterService = Depends(get_encounter_service),
):
    created_by = payload.created_by
    encounter = await encounter_service.create_encounter(payload, payload.user_id, payload.org_id, created_by)
    return format_response(
        encounter_service._to_fhir(encounter),
        encounter_service._to_plain(encounter),
        request,
    )


# Declared before /{encounter_id} to avoid routing conflicts.



@router.get(
    "/{encounter_id}",
    operation_id="get_encounter_by_id",
    summary="Retrieve an Encounter resource by public encounter_id",
    description=(
        "Fetches a single Encounter by its public integer `encounter_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested Encounter resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_encounter(
    request: Request,
    encounter: EncounterModel = Depends(resolve_encounter),
    encounter_service: EncounterService = Depends(get_encounter_service),
):
    return format_response(
        encounter_service._to_fhir(encounter),
        encounter_service._to_plain(encounter),
        request,
    )


# ── Patch Encounter ────────────────────────────────────────────────────────


@router.patch(
    "/{encounter_id}",
    operation_id="patch_encounter",
    summary="Partially update an Encounter resource",
    description=(
        "Patchable fields: `status`, `period_end`, `service_type_*`, `priority_*`. "
        "Structural data (subject, participants, types, diagnoses, locations) cannot be changed after creation — "
        "delete and re-create the Encounter to correct structural errors. "
        + _CONTENT_NEG
    ),
    response_description="The updated Encounter resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_encounter(
    payload: EncounterPatchSchema,
    request: Request,
    encounter: EncounterModel = Depends(resolve_encounter),
    encounter_service: EncounterService = Depends(get_encounter_service),
):
    updated_by = payload.updated_by
    updated = await encounter_service.patch_encounter(encounter.encounter_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return format_response(
        encounter_service._to_fhir(updated),
        encounter_service._to_plain(updated),
        request,
    )


# ── List Encounters ────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_encounters",
    summary="List all Encounter resources",
    description=(
        "Returns a paginated list of Encounter resources. "
        "Filter by `status`, `patient_id`, `class_code`, `period_start_from`, `period_start_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Encounter resources",
    responses={**_LIST_200},
)
async def list_encounters(
    request: Request,
    enc_status: Optional[str] = Query(None, alias="status"),
    patient_id: Optional[int] = Query(None, description="Filter by public patient_id."),
    appointment_id: Optional[int] = Query(None, description="Filter by public appointment_id — returns encounters linked to that appointment via Encounter.appointment[]."),
    actual_period_start_from: Optional[datetime] = Query(None),
    actual_period_start_to: Optional[datetime] = Query(None),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    encounter_service: EncounterService = Depends(get_encounter_service),
):
    encounters, total = await encounter_service.list_encounters(
        user_id=user_id, org_id=org_id, status=enc_status, patient_id=patient_id,
        appointment_id=appointment_id,
        actual_period_start_from=actual_period_start_from,
        actual_period_start_to=actual_period_start_to,
        limit=limit, offset=offset,
    )
    return format_paginated_response(
        [encounter_service._to_fhir(e) for e in encounters],
        [encounter_service._to_plain(e) for e in encounters],
        total, limit, offset, request,
    )


# ── Delete Encounter ───────────────────────────────────────────────────────


@router.delete(
    "/{encounter_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_encounter",
    summary="Delete an Encounter resource",
    description=(
        "Permanently deletes the Encounter and all its sub-resources. "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_encounter(
    encounter: EncounterModel = Depends(resolve_encounter),
    encounter_service: EncounterService = Depends(get_encounter_service),
):
    await encounter_service.delete_encounter(encounter.encounter_id)
    return None
