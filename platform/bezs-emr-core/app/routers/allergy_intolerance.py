from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app.deps.allergy_intolerance_deps import resolve_allergy_intolerance
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.allergy_intolerance import get_allergy_intolerance_service
from app.models.allergy_intolerance.allergy_intolerance import AllergyIntoleranceModel
from app.schemas.allergy_intolerance.input import (
    AllergyIntoleranceCreateSchema,
    AllergyIntolerancePatchSchema,
)
from app.schemas.allergy_intolerance.response import (
    FHIRAllergyIntoleranceBundle,
    FHIRAllergyIntoleranceSchema,
    PaginatedAllergyIntoleranceResponse,
    PlainAllergyIntoleranceResponse,
)
from app.services.allergy_intolerance_service import AllergyIntoleranceService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "AllergyIntolerance not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainAllergyIntoleranceResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRAllergyIntoleranceSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of AllergyIntolerance resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedAllergyIntoleranceResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRAllergyIntoleranceBundle.model_json_schema())},
        },
    }
}


# ── Create ─────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_allergy_intolerance",
    summary="Create a new AllergyIntolerance resource",
    description=(
        "Creates a FHIR R4 AllergyIntolerance resource. "
        "Required: `patient`. Optional: `clinicalStatus`, `verificationStatus`, `type`, "
        "`category`, `criticality`, `code`, `encounter`, `onset[x]`, `reactions`, `notes`. "
        + _CONTENT_NEG
    ),
    response_description="The newly created AllergyIntolerance resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_allergy_intolerance(
    payload: AllergyIntoleranceCreateSchema,
    request: Request,
    allergy_intolerance_service: AllergyIntoleranceService = Depends(get_allergy_intolerance_service),
):
    created_by = payload.created_by
    ai = await allergy_intolerance_service.create_allergy_intolerance(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        allergy_intolerance_service._to_fhir(ai),
        allergy_intolerance_service._to_plain(ai),
        request,
    )


# ── Get my allergy intolerances ────────────────────────────────────────────────



@router.get(
    "/{allergy_intolerance_id}",
    operation_id="get_allergy_intolerance",
    summary="Retrieve a single AllergyIntolerance by public ID",
    description="Fetches a single AllergyIntolerance resource by its public allergy_intolerance_id. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_allergy_intolerance(
    request: Request,
    ai: AllergyIntoleranceModel = Depends(resolve_allergy_intolerance),
    allergy_intolerance_service: AllergyIntoleranceService = Depends(get_allergy_intolerance_service),
):
    return format_response(
        allergy_intolerance_service._to_fhir(ai),
        allergy_intolerance_service._to_plain(ai),
        request,
    )


# ── Patch ──────────────────────────────────────────────────────────────────────


@router.patch(
    "/{allergy_intolerance_id}",
    operation_id="patch_allergy_intolerance",
    summary="Partially update an AllergyIntolerance resource",
    description=(
        "Updates fields on an AllergyIntolerance. Provide only the fields to change. "
        "Child arrays (categories, notes, reactions, identifiers) are fully replaced when supplied. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def patch_allergy_intolerance(
    request: Request,
    payload: AllergyIntolerancePatchSchema,
    ai: AllergyIntoleranceModel = Depends(resolve_allergy_intolerance),
    allergy_intolerance_service: AllergyIntoleranceService = Depends(get_allergy_intolerance_service),
):
    updated_by = payload.updated_by
    updated = await allergy_intolerance_service.patch_allergy_intolerance(
        ai.allergy_intolerance_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AllergyIntolerance not found")
    return format_response(
        allergy_intolerance_service._to_fhir(updated),
        allergy_intolerance_service._to_plain(updated),
        request,
    )


# ── List ───────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_allergy_intolerances",
    summary="List AllergyIntolerance resources",
    description="Returns a paginated list of AllergyIntolerance resources. " + _CONTENT_NEG,
    responses={**_LIST_200},
)
async def list_allergy_intolerances(
    request: Request,
    clinical_status: Optional[str] = Query(None, alias="clinicalStatus", description="Filter by clinical status code."),
    allergy_type: Optional[str] = Query(None, alias="type", description="Filter by type (allergy | intolerance)."),
    criticality: Optional[str] = Query(None, description="Filter by criticality."),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    allergy_intolerance_service: AllergyIntoleranceService = Depends(get_allergy_intolerance_service),
):
    rows, total = await allergy_intolerance_service.list_allergy_intolerances(
        clinical_status=clinical_status,
        allergy_type=allergy_type,
        criticality=criticality,
        limit=limit,
        offset=offset,
    )
    return format_paginated_response(
        [allergy_intolerance_service._to_fhir(r) for r in rows],
        [allergy_intolerance_service._to_plain(r) for r in rows],
        total, limit, offset, request,
    )


# ── Delete ─────────────────────────────────────────────────────────────────────


@router.delete(
    "/{allergy_intolerance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_allergy_intolerance",
    summary="Delete an AllergyIntolerance resource",
    description="Permanently deletes an AllergyIntolerance and all its child resources.",
    responses={**_ERR_NOT_FOUND, 204: {"description": "AllergyIntolerance deleted"}},
)
async def delete_allergy_intolerance(
    ai: AllergyIntoleranceModel = Depends(resolve_allergy_intolerance),
    allergy_intolerance_service: AllergyIntoleranceService = Depends(get_allergy_intolerance_service),
):
    await allergy_intolerance_service.delete_allergy_intolerance(ai.allergy_intolerance_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
