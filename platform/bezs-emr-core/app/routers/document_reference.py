from fastapi import APIRouter, Depends, Query, Request, status

from app.deps.document_reference_deps import resolve_document_reference
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.document_reference import get_document_reference_service
from app.models.document_reference.document_reference import DocumentReferenceModel
from app.schemas.document_reference.input import DocumentReferenceCreateSchema, DocumentReferencePatchSchema
from app.schemas.document_reference.response import (
    FHIRDocumentReferenceBundle,
    FHIRDocumentReferenceSchema,
    PaginatedDocumentReferenceResponse,
    PlainDocumentReferenceResponse,
)
from app.services.document_reference_service import DocumentReferenceService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "DocumentReference not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainDocumentReferenceResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRDocumentReferenceSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of DocumentReference resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedDocumentReferenceResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRDocumentReferenceBundle.model_json_schema())},
        },
    }
}


# ── Create ────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_document_reference",
    summary="Create a new DocumentReference resource",
    description=(
        "Creates a FHIR R4 DocumentReference resource. "
        "Supports content attachments, relationships, security labels, and clinical context. "
        + _CONTENT_NEG
    ),
    response_description="The newly created DocumentReference resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_document_reference(
    payload: DocumentReferenceCreateSchema,
    request: Request,
    service: DocumentReferenceService = Depends(get_document_reference_service),
):
    created_by = payload.created_by
    dr = await service.create_document_reference(payload, payload.user_id, payload.org_id, created_by)
    return format_response(
        service._to_fhir(dr),
        service._to_plain(dr),
        request,
    )





@router.get(
    "/{document_reference_id}",
    operation_id="get_document_reference",
    summary="Retrieve a DocumentReference by public identifier",
    description="Fetches a single DocumentReference resource by its public `document_reference_id`. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_document_reference(
    request: Request,
    dr: DocumentReferenceModel = Depends(resolve_document_reference),
    service: DocumentReferenceService = Depends(get_document_reference_service),
):
    return format_response(
        service._to_fhir(dr),
        service._to_plain(dr),
        request,
    )


# ── Patch ─────────────────────────────────────────────────────────────────────


@router.patch(
    "/{document_reference_id}",
    operation_id="patch_document_reference",
    summary="Partially update a DocumentReference",
    description=(
        "Updates a DocumentReference resource. Only supplied fields are changed. "
        "Child arrays (content, authors, security labels, etc.) replace the existing list when included. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_document_reference(
    payload: DocumentReferencePatchSchema,
    request: Request,
    dr: DocumentReferenceModel = Depends(resolve_document_reference),
    service: DocumentReferenceService = Depends(get_document_reference_service),
):
    updated_by = payload.updated_by
    updated = await service.patch_document_reference(dr.document_reference_id, payload, updated_by)
    return format_response(
        service._to_fhir(updated),
        service._to_plain(updated),
        request,
    )


# ── List ──────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_document_references",
    summary="List all DocumentReference resources",
    description=(
        "Returns a paginated list of all DocumentReference resources accessible to the caller. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_document_references(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: DocumentReferenceService = Depends(get_document_reference_service),
):
    rows, total = await service.list_document_references(limit=limit, offset=offset)
    return format_paginated_response(
        [service._to_fhir(dr) for dr in rows],
        [service._to_plain(dr) for dr in rows],
        total, limit, offset, request,
    )


# ── Delete ────────────────────────────────────────────────────────────────────


@router.delete(
    "/{document_reference_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_document_reference",
    summary="Delete a DocumentReference resource",
    description="Permanently deletes a DocumentReference and all its related child records.",
    responses={**_ERR_NOT_FOUND},
)
async def delete_document_reference(
    dr: DocumentReferenceModel = Depends(resolve_document_reference),
    service: DocumentReferenceService = Depends(get_document_reference_service),
):
    await service.delete_document_reference(dr.document_reference_id)
