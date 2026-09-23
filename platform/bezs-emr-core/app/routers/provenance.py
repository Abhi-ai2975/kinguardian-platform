from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app.deps.provenance_deps import resolve_provenance
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.provenance import get_provenance_service
from app.models.provenance.provenance import ProvenanceModel
from app.schemas.provenance.input import (
    ProvenanceCreateSchema,
    ProvenancePatchSchema,
)
from app.schemas.provenance.response import (
    FHIRProvenanceBundle,
    FHIRProvenanceSchema,
    PaginatedProvenanceResponse,
    PlainProvenanceResponse,
)
from app.services.provenance_service import ProvenanceService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Provenance not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainProvenanceResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRProvenanceSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of Provenance resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedProvenanceResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRProvenanceBundle.model_json_schema())},
        },
    }
}


# ── Create ──────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_provenance",
    summary="Create a new Provenance resource",
    description=(
        "Creates a FHIR R4 Provenance resource. "
        "Required: `recorded`, `targets` (1..*), `agents` (1..*). "
        "Optional: `occurred[x]`, `location`, `activity`, `policy`, `reason`, `entity`, `signature`. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Provenance resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_provenance(
    payload: ProvenanceCreateSchema,
    request: Request,
    provenance_service: ProvenanceService = Depends(get_provenance_service),
):
    created_by = payload.created_by
    prov = await provenance_service.create_provenance(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        provenance_service._to_fhir(prov),
        provenance_service._to_plain(prov),
        request,
    )


# ── Get my provenances ──────────────────────────────────────────────────────────



@router.get(
    "/{provenance_id}",
    operation_id="get_provenance",
    summary="Retrieve a single Provenance by public ID",
    description="Fetches a single Provenance resource by its public provenance_id. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_provenance(
    request: Request,
    prov: ProvenanceModel = Depends(resolve_provenance),
    provenance_service: ProvenanceService = Depends(get_provenance_service),
):
    return format_response(
        provenance_service._to_fhir(prov),
        provenance_service._to_plain(prov),
        request,
    )


# ── Patch ────────────────────────────────────────────────────────────────────────


@router.patch(
    "/{provenance_id}",
    operation_id="patch_provenance",
    summary="Partially update a Provenance resource",
    description=(
        "Updates fields on a Provenance. Provide only the fields to change. "
        "Child arrays (targets, policies, reasons, agents, entities, signatures) are fully replaced when supplied. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def patch_provenance(
    request: Request,
    payload: ProvenancePatchSchema,
    prov: ProvenanceModel = Depends(resolve_provenance),
    provenance_service: ProvenanceService = Depends(get_provenance_service),
):
    updated_by = payload.updated_by
    updated = await provenance_service.patch_provenance(prov.provenance_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provenance not found")
    return format_response(
        provenance_service._to_fhir(updated),
        provenance_service._to_plain(updated),
        request,
    )


# ── List ─────────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_provenances",
    summary="List Provenance resources",
    description="Returns a paginated list of Provenance resources. " + _CONTENT_NEG,
    responses={**_LIST_200},
)
async def list_provenances(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    provenance_service: ProvenanceService = Depends(get_provenance_service),
):
    rows, total = await provenance_service.list_provenances(limit=limit, offset=offset)
    return format_paginated_response(
        [provenance_service._to_fhir(r) for r in rows],
        [provenance_service._to_plain(r) for r in rows],
        total, limit, offset, request,
    )


# ── Delete ───────────────────────────────────────────────────────────────────────


@router.delete(
    "/{provenance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_provenance",
    summary="Delete a Provenance resource",
    description="Permanently deletes a Provenance and all its child resources.",
    responses={**_ERR_NOT_FOUND, 204: {"description": "Provenance deleted"}},
)
async def delete_provenance(
    prov: ProvenanceModel = Depends(resolve_provenance),
    provenance_service: ProvenanceService = Depends(get_provenance_service),
):
    await provenance_service.delete_provenance(prov.provenance_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
