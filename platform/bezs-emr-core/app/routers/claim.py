from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.claim_deps import resolve_claim
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.claim import get_claim_service
from app.models.claim.claim import ClaimModel
from app.schemas.claim.input import ClaimCreateSchema, ClaimPatchSchema
from app.schemas.claim.response import (
    FHIRClaimBundle,
    FHIRClaimSchema,
    PaginatedClaimResponse,
    PlainClaimResponse,
)
from app.services.claim_service import ClaimService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Claim not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainClaimResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRClaimSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of claims",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedClaimResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRClaimBundle.model_json_schema())},
        },
    }
}


# ── Create Claim ───────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_claim",
    summary="Create a new Claim resource",
    description=(
        "Creates a FHIR R4 Claim resource for submitting a request for adjudication of costs. "
        "Required fields: `status`, `use`, `created`, `patient` (e.g. 'Patient/10001'), "
        "`provider` (e.g. 'Practitioner/30001'), and at least one `insurance` entry. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Claim resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_claim(
    payload: ClaimCreateSchema,
    request: Request,
    claim_service: ClaimService = Depends(get_claim_service),
):
    created_by = payload.created_by
    claim = await claim_service.create_claim(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        claim_service._to_fhir(claim),
        claim_service._to_plain(claim),
        request,
    )


# Declared before /{claim_id} to avoid routing conflicts.



@router.get(
    "/{claim_id}",
    operation_id="get_claim_by_id",
    summary="Retrieve a Claim resource by public claim_id",
    description=(
        "Fetches a single Claim by its public integer `claim_id`. "
        + _CONTENT_NEG
    ),
    response_description="The requested Claim resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_claim(
    request: Request,
    claim: ClaimModel = Depends(resolve_claim),
    claim_service: ClaimService = Depends(get_claim_service),
):
    return format_response(
        claim_service._to_fhir(claim),
        claim_service._to_plain(claim),
        request,
    )


# ── Patch Claim ────────────────────────────────────────────────────────────────


@router.patch(
    "/{claim_id}",
    operation_id="patch_claim",
    summary="Partially update a Claim resource",
    description=(
        "Patchable fields: `status`, `use`, `priority_*`, `billable_period_*`, "
        "`payee_*`, `facility_*`, `sub_type_*`, and other scalar fields on the main table. "
        "Child arrays (identifiers, diagnoses, procedures, insurance, items, etc.) cannot be "
        "changed via PATCH — delete and re-create the Claim to correct those. "
        + _CONTENT_NEG
    ),
    response_description="The updated Claim resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_claim(
    payload: ClaimPatchSchema,
    request: Request,
    claim: ClaimModel = Depends(resolve_claim),
    claim_service: ClaimService = Depends(get_claim_service),
):
    updated_by = payload.updated_by
    updated = await claim_service.patch_claim(claim.claim_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=404, detail="Claim not found")
    return format_response(
        claim_service._to_fhir(updated),
        claim_service._to_plain(updated),
        request,
    )


# ── List Claims ────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_claims",
    summary="List all Claim resources",
    description=(
        "Returns a paginated list of Claim resources. "
        "Filter by `status`, `use`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Claim resources",
    responses={**_LIST_200},
)
async def list_claims(
    request: Request,
    claim_status: Optional[str] = Query(None, alias="status", description="Filter by status e.g. 'active'."),
    use: Optional[str] = Query(None, description="Filter by use e.g. 'claim'."),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    claim_service: ClaimService = Depends(get_claim_service),
):
    claims, total = await claim_service.list_claims(
        user_id=user_id,
        org_id=org_id,
        claim_status=claim_status,
        use=use,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [claim_service._to_fhir(c) for c in claims],
        [claim_service._to_plain(c) for c in claims],
        total, limit, offset, request,
    )


# ── Delete Claim ───────────────────────────────────────────────────────────────


@router.delete(
    "/{claim_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_claim",
    summary="Delete a Claim resource",
    description=(
        "Permanently deletes the Claim and all its associated child records "
        "(identifiers, related, care team, supporting info, diagnoses, procedures, "
        "insurance, items, and all nested details). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_claim(
    claim: ClaimModel = Depends(resolve_claim),
    claim_service: ClaimService = Depends(get_claim_service),
):
    await claim_service.delete_claim(claim.claim_id)
    return None
