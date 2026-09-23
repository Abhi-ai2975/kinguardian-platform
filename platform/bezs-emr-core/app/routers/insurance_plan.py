from fastapi import APIRouter, Depends, Query, Request, status

from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.deps.insurance_plan_deps import resolve_insurance_plan
from app.di.dependencies.insurance_plan import get_insurance_plan_service
from app.models.insurance_plan.insurance_plan import InsurancePlanModel
from app.schemas.insurance_plan.input import InsurancePlanCreateSchema, InsurancePlanPatchSchema
from app.schemas.insurance_plan.response import (
    FHIRInsurancePlanBundle,
    FHIRInsurancePlanSchema,
    PaginatedInsurancePlanResponse,
    PlainInsurancePlanResponse,
)
from app.services.insurance_plan_service import InsurancePlanService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "InsurancePlan not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainInsurancePlanResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRInsurancePlanSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of InsurancePlan resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedInsurancePlanResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRInsurancePlanBundle.model_json_schema())},
        },
    }
}


# ── Create ────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_insurance_plan",
    summary="Create a new InsurancePlan resource",
    description=(
        "Creates a FHIR R4 InsurancePlan resource representing a health insurance product. "
        "Optional: status, name, period, ownedBy, administeredBy, type, alias, coverageArea, "
        "contact, endpoint, network, coverage, plan. "
        + _CONTENT_NEG
    ),
    response_description="The newly created InsurancePlan resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_insurance_plan(
    payload: InsurancePlanCreateSchema,
    request: Request,
    insurance_plan_service: InsurancePlanService = Depends(get_insurance_plan_service),
):
    ip = await insurance_plan_service.create_insurance_plan(
        payload, payload.user_id, payload.org_id, payload.created_by
    )
    return format_response(
        insurance_plan_service._to_fhir(ip),
        insurance_plan_service._to_plain(ip),
        request,
    )


# ── Get /me ───────────────────────────────────────────────────────────────────


@router.get(
    "/me",
    operation_id="list_my_insurance_plans",
    summary="List InsurancePlan resources for the authenticated user",
    description=(
        "Returns paginated InsurancePlan resources scoped to the authenticated user's org. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_my_insurance_plans(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    insurance_plan_service: InsurancePlanService = Depends(get_insurance_plan_service),
):
    user_id = request.state.user.get("sub")
    org_id = request.state.user.get("activeOrganizationId")
    rows, total = await insurance_plan_service.get_me(user_id, org_id, limit, offset)
    return format_paginated_response(
        [insurance_plan_service._to_fhir(ip) for ip in rows],
        [insurance_plan_service._to_plain(ip) for ip in rows],
        total, limit, offset, request,
    )


# ── Get by ID ─────────────────────────────────────────────────────────────────


@router.get(
    "/{insurance_plan_id}",
    operation_id="get_insurance_plan",
    summary="Retrieve an InsurancePlan by public identifier",
    description="Fetches a single InsurancePlan resource by its public `insurance_plan_id`. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_insurance_plan(
    request: Request,
    insurance_plan: InsurancePlanModel = Depends(resolve_insurance_plan),
    insurance_plan_service: InsurancePlanService = Depends(get_insurance_plan_service),
):
    return format_response(
        insurance_plan_service._to_fhir(insurance_plan),
        insurance_plan_service._to_plain(insurance_plan),
        request,
    )


# ── Patch ─────────────────────────────────────────────────────────────────────


@router.patch(
    "/{insurance_plan_id}",
    operation_id="patch_insurance_plan",
    summary="Partially update an InsurancePlan",
    description=(
        "Updates an InsurancePlan resource. Only supplied fields are changed. "
        "Child arrays (coverages, plans, contacts, etc.) replace the existing list when included. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_insurance_plan(
    payload: InsurancePlanPatchSchema,
    request: Request,
    insurance_plan: InsurancePlanModel = Depends(resolve_insurance_plan),
    insurance_plan_service: InsurancePlanService = Depends(get_insurance_plan_service),
):
    updated = await insurance_plan_service.patch_insurance_plan(
        insurance_plan.insurance_plan_id, payload, payload.updated_by
    )
    return format_response(
        insurance_plan_service._to_fhir(updated),
        insurance_plan_service._to_plain(updated),
        request,
    )


# ── List ──────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_insurance_plans",
    summary="List all InsurancePlan resources",
    description=(
        "Returns a paginated list of all InsurancePlan resources accessible to the caller. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_insurance_plans(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    insurance_plan_service: InsurancePlanService = Depends(get_insurance_plan_service),
):
    rows, total = await insurance_plan_service.list_insurance_plans(limit=limit, offset=offset)
    return format_paginated_response(
        [insurance_plan_service._to_fhir(ip) for ip in rows],
        [insurance_plan_service._to_plain(ip) for ip in rows],
        total, limit, offset, request,
    )


# ── Delete ────────────────────────────────────────────────────────────────────


@router.delete(
    "/{insurance_plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_insurance_plan",
    summary="Delete an InsurancePlan resource",
    description="Permanently deletes an InsurancePlan and all its related child records.",
    responses={**_ERR_NOT_FOUND},
)
async def delete_insurance_plan(
    insurance_plan: InsurancePlanModel = Depends(resolve_insurance_plan),
    insurance_plan_service: InsurancePlanService = Depends(get_insurance_plan_service),
):
    await insurance_plan_service.delete_insurance_plan(insurance_plan.insurance_plan_id)
