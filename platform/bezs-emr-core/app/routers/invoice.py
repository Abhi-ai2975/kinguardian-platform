from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app.deps.invoice_deps import resolve_invoice
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.invoice import get_invoice_service
from app.models.invoice.invoice import InvoiceModel
from app.schemas.invoice.input import InvoiceCreateSchema, InvoicePatchSchema
from app.schemas.invoice.response import (
    FHIRInvoiceBundle,
    FHIRInvoiceSchema,
    PaginatedInvoiceResponse,
    PlainInvoiceResponse,
)
from app.services.invoice_service import InvoiceService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Invoice not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainInvoiceResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRInvoiceSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of invoices",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedInvoiceResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRInvoiceBundle.model_json_schema())},
        },
    }
}


# ── Create ─────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_invoice",
    summary="Create a new Invoice resource",
    description=(
        "Creates a FHIR R4 Invoice resource. "
        "Required field: `status` (draft | issued | balanced | cancelled | entered-in-error). "
        + _CONTENT_NEG
    ),
    response_description="The newly created Invoice resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_invoice(
    payload: InvoiceCreateSchema,
    request: Request,
    invoice_service: InvoiceService = Depends(get_invoice_service),
):
    created_by = payload.created_by
    invoice = await invoice_service.create_invoice(
        payload, payload.user_id, payload.org_id, created_by
    )
    return format_response(
        invoice_service._to_fhir(invoice),
        invoice_service._to_plain(invoice),
        request,
    )


# ── Get my invoices ────────────────────────────────────────────────────────────



@router.get(
    "/{invoice_id}",
    operation_id="get_invoice",
    summary="Retrieve a single Invoice by public ID",
    description="Fetches a single Invoice resource by its public invoice_id. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_invoice(
    request: Request,
    invoice: InvoiceModel = Depends(resolve_invoice),
    invoice_service: InvoiceService = Depends(get_invoice_service),
):
    return format_response(
        invoice_service._to_fhir(invoice),
        invoice_service._to_plain(invoice),
        request,
    )


# ── Patch ──────────────────────────────────────────────────────────────────────


@router.patch(
    "/{invoice_id}",
    operation_id="patch_invoice",
    summary="Partially update an Invoice resource",
    description="Updates scalar fields on an Invoice. Child arrays are not modified via PATCH.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def patch_invoice(
    request: Request,
    payload: InvoicePatchSchema,
    invoice: InvoiceModel = Depends(resolve_invoice),
    invoice_service: InvoiceService = Depends(get_invoice_service),
):
    updated_by = payload.updated_by
    updated = await invoice_service.patch_invoice(invoice.invoice_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return format_response(
        invoice_service._to_fhir(updated),
        invoice_service._to_plain(updated),
        request,
    )


# ── List ───────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_invoices",
    summary="List Invoice resources",
    description="Returns a paginated list of Invoice resources. " + _CONTENT_NEG,
    responses={**_LIST_200},
)
async def list_invoices(
    request: Request,
    invoice_status: Optional[str] = Query(None, alias="status", description="Filter by status."),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    invoice_service: InvoiceService = Depends(get_invoice_service),
):
    rows, total = await invoice_service.list_invoices(
        invoice_status=invoice_status, limit=limit, offset=offset
    )
    return format_paginated_response(
        [invoice_service._to_fhir(r) for r in rows],
        [invoice_service._to_plain(r) for r in rows],
        total, limit, offset, request,
    )


# ── Delete ─────────────────────────────────────────────────────────────────────


@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_invoice",
    summary="Delete an Invoice resource",
    description="Permanently deletes an Invoice and all its child resources.",
    responses={**_ERR_NOT_FOUND, 204: {"description": "Invoice deleted"}},
)
async def delete_invoice(
    invoice: InvoiceModel = Depends(resolve_invoice),
    invoice_service: InvoiceService = Depends(get_invoice_service),
):
    await invoice_service.delete_invoice(invoice.invoice_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
