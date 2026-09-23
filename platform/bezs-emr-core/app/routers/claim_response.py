from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.claim_response_deps import resolve_claim_response
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.claim_response import get_claim_response_service
from app.models.claim_response.claim_response import ClaimResponseModel
from app.schemas.claim_response.input import (
    ClaimResponseCreateSchema,
    ClaimResponsePatchSchema,
)
from app.schemas.claim_response.response import (
    FHIRClaimResponseBundle,
    FHIRClaimResponseSchema,
    PaginatedClaimResponseResponse,
    PlainClaimResponseResponse,
)
from app.services.claim_response_service import ClaimResponseService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "ClaimResponse not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {
                "schema": inline_schema(PlainClaimResponseResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FHIRClaimResponseSchema.model_json_schema())
            },
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of claim responses",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedClaimResponseResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FHIRClaimResponseBundle.model_json_schema())
            },
        },
    }
}


# ── Create ClaimResponse ───────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_claim_response",
    summary="Create a new ClaimResponse resource",
    description=(
        "Creates a FHIR R4 ClaimResponse adjudication result. "
        "Required fields: `status`, `use`, `outcome`, `created`, "
        "`patient` (e.g. 'Patient/10001'), and `insurer` (e.g. 'Organization/190001'). "
        + _CONTENT_NEG
    ),
    response_description="The newly created ClaimResponse resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_claim_response(
    payload: ClaimResponseCreateSchema,
    request: Request,
    cr_service: ClaimResponseService = Depends(get_claim_response_service),
):
    created_by = payload.created_by
    claim_response = await cr_service.create_claim_response(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        cr_service._to_fhir(claim_response),
        cr_service._to_plain(claim_response),
        request,
    )


# Declared before /{claim_response_id} to avoid routing conflicts.



@router.get(
    "/{claim_response_id}",
    operation_id="get_claim_response_by_id",
    summary="Retrieve a ClaimResponse resource by public claim_response_id",
    description=(
        "Fetches a single ClaimResponse by its public integer `claim_response_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested ClaimResponse resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_claim_response(
    request: Request,
    claim_response: ClaimResponseModel = Depends(resolve_claim_response),
    cr_service: ClaimResponseService = Depends(get_claim_response_service),
):
    return format_response(
        cr_service._to_fhir(claim_response),
        cr_service._to_plain(claim_response),
        request,
    )


# ── Patch ClaimResponse ────────────────────────────────────────────────────────


@router.patch(
    "/{claim_response_id}",
    operation_id="patch_claim_response",
    summary="Partially update a ClaimResponse resource",
    description=(
        "Patchable fields: `status`, `use`, `outcome`, `disposition`, `pre_auth_ref`, "
        "`pre_auth_period_*`, `payee_type_*`, `payment_*`, `funds_reserve_*`, "
        "`form_code_*`, and all `form_*` attachment fields. "
        "Child arrays (items, addItems, totals, processNotes, errors, etc.) cannot be "
        "changed via PATCH — delete and re-create the ClaimResponse to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated ClaimResponse resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_claim_response(
    payload: ClaimResponsePatchSchema,
    request: Request,
    claim_response: ClaimResponseModel = Depends(resolve_claim_response),
    cr_service: ClaimResponseService = Depends(get_claim_response_service),
):
    updated_by = payload.updated_by
    updated = await cr_service.patch_claim_response(
        claim_response.claim_response_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="ClaimResponse not found")
    return format_response(
        cr_service._to_fhir(updated),
        cr_service._to_plain(updated),
        request,
    )


# ── List ClaimResponses ────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_claim_responses",
    summary="List all ClaimResponse resources",
    description=(
        "Returns a paginated list of ClaimResponse resources. "
        "Filter by `status`, `use`, `outcome`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated ClaimResponse resources",
    responses={**_LIST_200},
)
async def list_claim_responses(
    request: Request,
    cr_status: Optional[str] = Query(None, alias="status", description="Filter by status e.g. 'active'."),
    use: Optional[str] = Query(None, description="Filter by use e.g. 'claim'."),
    outcome: Optional[str] = Query(None, description="Filter by outcome e.g. 'complete'."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    cr_service: ClaimResponseService = Depends(get_claim_response_service),
):
    items, total = await cr_service.list_claim_responses(
        user_id=user_id,
        org_id=org_id,
        cr_status=cr_status,
        use=use,
        outcome=outcome,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [cr_service._to_fhir(cr) for cr in items],
        [cr_service._to_plain(cr) for cr in items],
        total, limit, offset, request,
    )


# ── Delete ClaimResponse ───────────────────────────────────────────────────────


@router.delete(
    "/{claim_response_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_claim_response",
    summary="Delete a ClaimResponse resource",
    description=(
        "Permanently deletes the ClaimResponse and all its associated child records "
        "(identifiers, items, addItems, adjudications, totals, processNotes, "
        "communicationRequests, insurances, errors, and all nested records). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_claim_response(
    claim_response: ClaimResponseModel = Depends(resolve_claim_response),
    cr_service: ClaimResponseService = Depends(get_claim_response_service),
):
    await cr_service.delete_claim_response(claim_response.claim_response_id)
    return None
