from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.service_request_deps import resolve_service_request
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.service_request import get_service_request_service
from app.models.service_request.service_request import ServiceRequestModel
from app.schemas.service_request import ServiceRequestCreateSchema, ServiceRequestPatchSchema
from app.schemas.service_request.response import (
    FHIRServiceRequestSchema,
    FHIRServiceRequestBundle,
    PaginatedServiceRequestResponse,
    PlainServiceRequestResponse,
)
from app.services.service_request_service import ServiceRequestService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "ServiceRequest not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainServiceRequestResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRServiceRequestSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of service requests",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedServiceRequestResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRServiceRequestBundle.model_json_schema())},
        },
    }
}


# ── Create ServiceRequest ──────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_service_request",
    summary="Create a new ServiceRequest resource",
    description=(
        "Records a clinical service request (order, referral, prescription request, etc.). "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id` (public encounter_id). "
        "Supply `requester` as a FHIR reference e.g. `'Practitioner/30001'`. "
        "The caller's `sub` and `activeOrganizationId` JWT claims are automatically bound. "
        + _CONTENT_NEG
    ),
    response_description="The newly created ServiceRequest resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_service_request(
    payload: ServiceRequestCreateSchema,
    request: Request,
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    created_by = payload.created_by
    sr = await sr_service.create_service_request(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        sr_service._to_fhir(sr),
        sr_service._to_plain(sr),
        request,
    )


# Declared before /{service_request_id} to avoid routing conflicts.



@router.get(
    "/{service_request_id}",
    operation_id="get_service_request_by_id",
    summary="Retrieve a ServiceRequest resource by public service_request_id",
    description=(
        "Fetches a single ServiceRequest by its public integer `service_request_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested ServiceRequest resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_service_request(
    request: Request,
    sr: ServiceRequestModel = Depends(resolve_service_request),
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    return format_response(
        sr_service._to_fhir(sr),
        sr_service._to_plain(sr),
        request,
    )


# ── Patch ServiceRequest ───────────────────────────────────────────────────────


@router.patch(
    "/{service_request_id}",
    operation_id="patch_service_request",
    summary="Partially update a ServiceRequest resource",
    description=(
        "Patchable fields: `status`, `intent`, `priority`, `do_not_perform`, `code_*`, "
        "`encounter_display`, all `occurrence_*` variants, `as_needed_*`, `authored_on`, "
        "`requester_display`, `performer_type_*`, all `quantity_*` variants, all `requisition_*` fields, "
        "`instantiates_canonical`, `instantiates_uri`, and `patient_instruction`. "
        "Child arrays (identifier, category, orderDetail, performer, etc.) cannot be changed via PATCH — "
        "delete and re-create the ServiceRequest to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated ServiceRequest resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_service_request(
    payload: ServiceRequestPatchSchema,
    request: Request,
    sr: ServiceRequestModel = Depends(resolve_service_request),
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    updated_by = payload.updated_by
    updated = await sr_service.patch_service_request(
        sr.service_request_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="ServiceRequest not found")
    return format_response(
        sr_service._to_fhir(updated),
        sr_service._to_plain(updated),
        request,
    )


# ── List ServiceRequests ───────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_service_requests",
    summary="List all ServiceRequest resources",
    description=(
        "Returns a paginated list of ServiceRequest resources. "
        "Filter by `status`, `patient_id`, `authored_from`, `authored_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated ServiceRequest resources",
    responses={**_LIST_200},
)
async def list_service_requests(
    request: Request,
    sr_status: Optional[str] = Query(None, alias="status", description="Filter by status e.g. 'active'."),
    patient_id: Optional[int] = Query(None, description="Filter by patient subject_id."),
    encounter_id: Optional[int] = Query(None, description="Filter by public encounter_id — returns service requests linked to that encounter."),
    authored_from: Optional[datetime] = Query(None),
    authored_to: Optional[datetime] = Query(None),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    items, total = await sr_service.list_service_requests(
        user_id=user_id,
        org_id=org_id,
        sr_status=sr_status,
        patient_id=patient_id,
        encounter_id=encounter_id,
        authored_from=authored_from,
        authored_to=authored_to,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [sr_service._to_fhir(sr) for sr in items],
        [sr_service._to_plain(sr) for sr in items],
        total, limit, offset, request,
    )


# ── Delete ServiceRequest ──────────────────────────────────────────────────────


@router.delete(
    "/{service_request_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_service_request",
    summary="Delete a ServiceRequest resource",
    description=(
        "Permanently deletes the ServiceRequest and all its associated child records "
        "(identifier, category, orderDetail, performer, locationCode, locationReference, "
        "reasonCode, reasonReference, insurance, supportingInfo, specimen, bodySite, "
        "note, relevantHistory, basedOn, replaces). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_service_request(
    sr: ServiceRequestModel = Depends(resolve_service_request),
    sr_service: ServiceRequestService = Depends(get_service_request_service),
):
    await sr_service.delete_service_request(sr.service_request_id)
    return None
