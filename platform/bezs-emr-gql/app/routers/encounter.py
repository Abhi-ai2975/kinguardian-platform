"""
FastAPI router for Encounter resources.

Endpoints:
  POST   /encounters/              — create with all child arrays in the body
  GET    /encounters/{id}          — fetch a single Encounter by integer ID
  GET    /encounters/              — paginated list with optional filters
  PATCH  /encounters/{id}          — partial update (scalar fields only)
  DELETE /encounters/{id}          — permanent delete (cascades to all child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R5 resource / Bundle

RBAC is enforced via require_permission() for the ("encounter", <action>) pair.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.encounter import get_encounter_service
from app.schemas.encounter.fhir_schemas import FhirBundleResponse, FhirEncounterResponse
from app.schemas.encounter.input import EncounterCreateSchema, EncounterPatchSchema, ListEncountersSchema
from app.schemas.encounter.response import EncounterResponse, PaginatedEncounterResponse
from app.services.encounter_service import EncounterService

# All encounter routes are prefixed with /encounters; tagged for Swagger grouping.
router = APIRouter(prefix="/encounters", tags=["Encounters"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "Encounter not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────
# inline_schema() resolves Pydantic v2 $defs/$ref pointers so deeply nested
# sub-model references (PlainEncounterParticipant → PlainEncounterParticipantType,
# PlainEncounterReason → PlainEncounterReasonValue, etc.) render correctly in
# the Swagger UI schema resolver rather than showing as broken $ref links.

_SINGLE_201 = {
    201: {
        "description": "Encounter created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(EncounterResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirEncounterResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Encounter retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(EncounterResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirEncounterResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Encounter resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedEncounterResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /encounters/ ─────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_encounter",
    summary="Create an Encounter",
    description=(
        "Creates a new Encounter — a clinical interaction between a patient and one or more providers. "
        "All sub-resources (identifiers, status history, class history, types, episode-of-care references, "
        "based-on references, participants, reasons, diagnoses, accounts, admission, "
        "and locations) are submitted as part of a single document in the request body. "
        "References use public IDs: `Patient/10001`, `Practitioner/30001`, `Condition/12345`. "
        "Stamps `created_by` from the caller's JWT — do not supply this field. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R5 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("encounter", "create"))],
)
async def create_encounter(
    dto: EncounterCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("encounter", "create")),
    service: EncounterService = Depends(get_encounter_service),
) -> JSONResponse:
    """Create a new Encounter resource and return the persisted record with all child arrays."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /encounters/{resource_id} ─────────────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_encounter",
    summary="Get an Encounter by ID",
    description=(
        "Fetch a single Encounter by its integer ID. "
        "The response includes all child arrays (participant, diagnosis, location, "
        "reason, identifier, etc.). "
        "Send `Accept: application/fhir+json` for FHIR R5 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("encounter", "read"))],
)
async def get_encounter(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("encounter", "read")),
    service: EncounterService = Depends(get_encounter_service),
) -> JSONResponse:
    """Fetch a single Encounter resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /encounters/ ──────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_encounters",
    summary="List Encounters",
    description=(
        "Returns a paginated list of Encounter resources. "
        "Filter by `status`, `patient_id`, `appointment_id`, "
        "`actual_period_start_from`, `actual_period_start_to`, `user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("encounter", "read"))],
)
async def list_encounters(
    request: Request,
    filters: ListEncountersSchema = Depends(),
    actor: AuthUser = Depends(require_permission("encounter", "read")),
    service: EncounterService = Depends(get_encounter_service),
) -> JSONResponse:
    """Return a paginated list of Encounters, optionally filtered."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /encounters/{resource_id} ──────────────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_encounter",
    summary="Partially update an Encounter",
    description=(
        "Update specific scalar fields on an Encounter. At least one field must be provided. "
        "Patchable fields: `status`, `actual_period_end`, `priority_*` (system, code, display, text), "
        "`subject_status_*` (system, code, display, text), `planned_end_date`. "
        "Structural arrays (participant, diagnosis, location, reason, etc.) and the subject "
        "reference are immutable after creation — delete and re-create the Encounter to change those. "
        "Stamps `updated_by` from the caller's JWT automatically. "
        "Send `Accept: application/fhir+json` for FHIR R5 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("encounter", "update"))],
)
async def update_encounter(
    resource_id: int,
    dto: EncounterPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("encounter", "update")),
    service: EncounterService = Depends(get_encounter_service),
) -> JSONResponse:
    """Partially update an Encounter resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /encounters/{resource_id} ─────────────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_encounter",
    summary="Delete an Encounter",
    description=(
        "Permanently deletes the Encounter and all its child records "
        "(participant, diagnosis, location, reason, identifier, status history, "
        "class history, virtual service, account, admission, etc.). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("encounter", "delete"))],
)
async def delete_encounter(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("encounter", "delete")),
    service: EncounterService = Depends(get_encounter_service),
) -> None:
    """Permanently delete an Encounter and cascade to all child records."""
    await service.delete(resource_id, actor)
