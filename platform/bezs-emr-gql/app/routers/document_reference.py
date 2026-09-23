"""
FastAPI router for DocumentReference resources.

Endpoints:
  POST   /document-references/        — create with content and context in the body
  GET    /document-references/{id}    — fetch a single DocumentReference by integer ID
  GET    /document-references/        — paginated list
  PATCH  /document-references/{id}    — partial update (scalars + replaceable arrays)
  DELETE /document-references/{id}    — permanent delete (cascades to all child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("document_reference", <action>) pair.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.document_reference import get_document_reference_service
from app.schemas.document_reference.fhir_schemas import FhirBundleResponse, FhirDocumentReferenceResponse
from app.schemas.document_reference.input import (
    DocumentReferenceCreateSchema,
    DocumentReferencePatchSchema,
    ListDocumentReferencesSchema,
)
from app.schemas.document_reference.response import DocumentReferenceResponse, PaginatedDocumentReferenceResponse
from app.services.document_reference_service import DocumentReferenceService

# All document reference routes are prefixed with /document-references; tagged for Swagger grouping.
router = APIRouter(prefix="/document-references", tags=["DocumentReferences"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "DocumentReference not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────

_SINGLE_201 = {
    201: {
        "description": "DocumentReference created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(DocumentReferenceResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirDocumentReferenceResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "DocumentReference retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(DocumentReferenceResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirDocumentReferenceResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of DocumentReference resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedDocumentReferenceResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /document-references/ ───────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_document_reference",
    summary="Create a DocumentReference",
    description=(
        "Creates a new DocumentReference — a pointer to a document (file, PDF, image) "
        "stored in an external system such as FilNest. "
        "Both `status` (`current`) and `content` (at least one item with `attachment.url`) "
        "are required. "
        "Use `context.related` to link this document to a DiagnosticReport and/or ServiceRequest "
        "for clinical traceability. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("document_reference", "create"))],
)
async def create_document_reference(
    dto: DocumentReferenceCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("document_reference", "create")),
    service: DocumentReferenceService = Depends(get_document_reference_service),
) -> JSONResponse:
    """Create a new DocumentReference resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /document-references/{resource_id} ───────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_document_reference",
    summary="Get a DocumentReference by ID",
    description=(
        "Fetch a single DocumentReference by its integer ID. "
        "The response includes all child arrays (content, authors, security_labels, "
        "identifiers, categories, relates_to, context). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("document_reference", "read"))],
)
async def get_document_reference(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("document_reference", "read")),
    service: DocumentReferenceService = Depends(get_document_reference_service),
) -> JSONResponse:
    """Fetch a single DocumentReference resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /document-references/ ────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_document_references",
    summary="List DocumentReferences",
    description=(
        "Returns a paginated list of DocumentReference resources. "
        "Use `limit` and `offset` for pagination. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("document_reference", "read"))],
)
async def list_document_references(
    request: Request,
    filters: ListDocumentReferencesSchema = Depends(),
    actor: AuthUser = Depends(require_permission("document_reference", "read")),
    service: DocumentReferenceService = Depends(get_document_reference_service),
) -> JSONResponse:
    """Return a paginated list of DocumentReferences."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /document-references/{resource_id} ─────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_document_reference",
    summary="Partially update a DocumentReference",
    description=(
        "Update fields on a DocumentReference. At least one field must be provided. "
        "Patchable scalars: `status`, `doc_status`, `type_*`, `subject`, `subject_display`, "
        "`date`, `description`, `authenticator`, `custodian`, `master_identifier_*`. "
        "Replaceable arrays: `content`, `authors`, `security_labels`, `identifiers`, "
        "`categories`, `relates_to`, `context` — when supplied they replace the existing list. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("document_reference", "update"))],
)
async def update_document_reference(
    resource_id: int,
    dto: DocumentReferencePatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("document_reference", "update")),
    service: DocumentReferenceService = Depends(get_document_reference_service),
) -> JSONResponse:
    """Partially update a DocumentReference resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /document-references/{resource_id} ────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_document_reference",
    summary="Delete a DocumentReference",
    description=(
        "Permanently deletes the DocumentReference and all its child records "
        "(content, authors, security_labels, identifiers, categories, relates_to, "
        "context sub-records). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("document_reference", "delete"))],
)
async def delete_document_reference(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("document_reference", "delete")),
    service: DocumentReferenceService = Depends(get_document_reference_service),
) -> None:
    """Permanently delete a DocumentReference and cascade to all child records."""
    await service.delete(resource_id, actor)
