from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.device_request_deps import resolve_device_request
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.device_request import get_device_request_service
from app.models.device_request.device_request import DeviceRequestModel
from app.schemas.device_request import DeviceRequestCreateSchema, DeviceRequestPatchSchema
from app.schemas.device_request.response import (
    FHIRDeviceRequestSchema,
    FHIRDeviceRequestBundle,
    PaginatedDeviceRequestResponse,
    PlainDeviceRequestResponse,
)
from app.services.device_request_service import DeviceRequestService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "DeviceRequest not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainDeviceRequestResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRDeviceRequestSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of device requests",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedDeviceRequestResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRDeviceRequestBundle.model_json_schema())},
        },
    }
}


# ── Create DeviceRequest ───────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_device_request",
    summary="Create a new DeviceRequest resource",
    description=(
        "Records a request for a device (e.g. wheelchair, insulin pump, hearing aid) for a patient. "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Identify the device via `code_reference` (e.g. `'Device/10001'`) or `code_concept_*` fields. "
        "Optionally link to an Encounter via `encounter_id` (public encounter_id). "
        "The caller's `sub` and `activeOrganizationId` JWT claims are automatically bound. "
        + _CONTENT_NEG
    ),
    response_description="The newly created DeviceRequest resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_device_request(
    payload: DeviceRequestCreateSchema,
    request: Request,
    dr_service: DeviceRequestService = Depends(get_device_request_service),
):
    created_by = payload.created_by
    dr = await dr_service.create_device_request(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        dr_service._to_fhir(dr),
        dr_service._to_plain(dr),
        request,
    )


# Declared before /{device_request_id} to avoid routing conflicts.



@router.get(
    "/{device_request_id}",
    operation_id="get_device_request_by_id",
    summary="Retrieve a DeviceRequest resource by public device_request_id",
    description=(
        "Fetches a single DeviceRequest by its public integer `device_request_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested DeviceRequest resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_device_request(
    request: Request,
    dr: DeviceRequestModel = Depends(resolve_device_request),
    dr_service: DeviceRequestService = Depends(get_device_request_service),
):
    return format_response(
        dr_service._to_fhir(dr),
        dr_service._to_plain(dr),
        request,
    )


# ── Patch DeviceRequest ────────────────────────────────────────────────────────


@router.patch(
    "/{device_request_id}",
    operation_id="patch_device_request",
    summary="Partially update a DeviceRequest resource",
    description=(
        "Patchable fields: `status`, `intent`, `priority`, `code_concept_*`, `code_reference_display`, "
        "`subject_display`, `encounter_display`, all `occurrence_*` variants, `authored_on`, "
        "`requester_display`, `performer_type_*`, `performer_reference_display`, "
        "all `group_identifier_*` fields, `instantiates_canonical`, `instantiates_uri`. "
        "Child arrays (identifier, basedOn, priorRequest, parameter, reasonCode, reasonReference, "
        "insurance, supportingInfo, note, relevantHistory) cannot be changed via PATCH — "
        "delete and re-create the DeviceRequest to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated DeviceRequest resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_device_request(
    payload: DeviceRequestPatchSchema,
    request: Request,
    dr: DeviceRequestModel = Depends(resolve_device_request),
    dr_service: DeviceRequestService = Depends(get_device_request_service),
):
    updated_by = payload.updated_by
    updated = await dr_service.patch_device_request(
        dr.device_request_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="DeviceRequest not found")
    return format_response(
        dr_service._to_fhir(updated),
        dr_service._to_plain(updated),
        request,
    )


# ── List DeviceRequests ────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_device_requests",
    summary="List all DeviceRequest resources",
    description=(
        "Returns a paginated list of DeviceRequest resources. "
        "Filter by `status`, `patient_id`, `authored_from`, `authored_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated DeviceRequest resources",
    responses={**_LIST_200},
)
async def list_device_requests(
    request: Request,
    dr_status: Optional[str] = Query(None, alias="status", description="Filter by status e.g. 'active'."),
    patient_id: Optional[int] = Query(None, description="Filter by patient subject_id."),
    authored_from: Optional[datetime] = Query(None),
    authored_to: Optional[datetime] = Query(None),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    dr_service: DeviceRequestService = Depends(get_device_request_service),
):
    items, total = await dr_service.list_device_requests(
        user_id=user_id,
        org_id=org_id,
        dr_status=dr_status,
        patient_id=patient_id,
        authored_from=authored_from,
        authored_to=authored_to,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [dr_service._to_fhir(dr) for dr in items],
        [dr_service._to_plain(dr) for dr in items],
        total, limit, offset, request,
    )


# ── Delete DeviceRequest ───────────────────────────────────────────────────────


@router.delete(
    "/{device_request_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_device_request",
    summary="Delete a DeviceRequest resource",
    description=(
        "Permanently deletes the DeviceRequest and all its associated child records "
        "(identifier, basedOn, priorRequest, parameter, reasonCode, reasonReference, "
        "insurance, supportingInfo, note, relevantHistory). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_device_request(
    dr: DeviceRequestModel = Depends(resolve_device_request),
    dr_service: DeviceRequestService = Depends(get_device_request_service),
):
    await dr_service.delete_device_request(dr.device_request_id)
    return None
