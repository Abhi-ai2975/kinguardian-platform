from fastapi import APIRouter, Depends, Query, Request, status

from app.deps.audit_event_deps import resolve_audit_event
from app.core.content_negotiation import format_paginated_response, format_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.audit_event import get_audit_event_service
from app.models.audit_event.audit_event import AuditEventModel
from app.schemas.audit_event.input import AuditEventCreateSchema, AuditEventPatchSchema
from app.schemas.audit_event.response import (
    FHIRAuditEventBundle,
    FHIRAuditEventSchema,
    PaginatedAuditEventResponse,
    PlainAuditEventResponse,
)
from app.services.audit_event_service import AuditEventService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "AuditEvent not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainAuditEventResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRAuditEventSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of AuditEvent resources",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedAuditEventResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRAuditEventBundle.model_json_schema())},
        },
    }
}


# ── Create ────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_audit_event",
    summary="Create a new AuditEvent resource",
    description=(
        "Creates a FHIR R4 AuditEvent resource representing a security or privacy relevant activity. "
        + _CONTENT_NEG
    ),
    response_description="The newly created AuditEvent resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_audit_event(
    payload: AuditEventCreateSchema,
    request: Request,
    service: AuditEventService = Depends(get_audit_event_service),
):
    created_by = payload.created_by
    event = await service.create_audit_event(payload, created_by)
    return format_response(
        service._to_fhir(event),
        service._to_plain(event),
        request,
    )





@router.get(
    "/{audit_event_id}",
    operation_id="get_audit_event",
    summary="Retrieve an AuditEvent by public identifier",
    description="Fetches a single AuditEvent resource by its public `audit_event_id`. " + _CONTENT_NEG,
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_audit_event(
    request: Request,
    event: AuditEventModel = Depends(resolve_audit_event),
    service: AuditEventService = Depends(get_audit_event_service),
):
    return format_response(
        service._to_fhir(event),
        service._to_plain(event),
        request,
    )


# ── Patch ─────────────────────────────────────────────────────────────────────


@router.patch(
    "/{audit_event_id}",
    operation_id="patch_audit_event",
    summary="Partially update an AuditEvent",
    description=(
        "Updates an AuditEvent resource. Only supplied fields are changed. "
        "Child arrays (agents, entities, etc.) replace the existing list when included. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_audit_event(
    payload: AuditEventPatchSchema,
    request: Request,
    event: AuditEventModel = Depends(resolve_audit_event),
    service: AuditEventService = Depends(get_audit_event_service),
):
    updated_by = payload.updated_by
    updated = await service.patch_audit_event(event, payload, updated_by)
    return format_response(
        service._to_fhir(updated),
        service._to_plain(updated),
        request,
    )


# ── List ──────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_audit_events",
    summary="List all AuditEvent resources",
    description=(
        "Returns a paginated list of all AuditEvent resources accessible to the caller. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_audit_events(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: AuditEventService = Depends(get_audit_event_service),
):
    total, rows = await service.list_audit_events(
        user_id=None, org_id=None, limit=limit, offset=offset
    )
    return format_paginated_response(
        [service._to_fhir(e) for e in rows],
        [service._to_plain(e) for e in rows],
        total, limit, offset, request,
    )


# ── Delete ────────────────────────────────────────────────────────────────────


@router.delete(
    "/{audit_event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_audit_event",
    summary="Delete an AuditEvent resource",
    description="Permanently deletes an AuditEvent and all its related child records.",
    responses={**_ERR_NOT_FOUND},
)
async def delete_audit_event(
    event: AuditEventModel = Depends(resolve_audit_event),
    service: AuditEventService = Depends(get_audit_event_service),
):
    await service.delete_audit_event(event)
