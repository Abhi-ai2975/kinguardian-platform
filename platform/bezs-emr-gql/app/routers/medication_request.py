"""
FastAPI router for MedicationRequest resources.

Endpoints:
  POST   /medication-requests/      — create with all child arrays in the body
  GET    /medication-requests/{id}  — fetch a single MedicationRequest by integer ID
  GET    /medication-requests/      — paginated list with optional filters
  PATCH  /medication-requests/{id}  — partial update (scalar fields only)
  DELETE /medication-requests/{id}  — permanent delete (cascades to all child records)

All routes support content negotiation:
  - `Accept: application/json`      → plain snake_case JSON (default)
  - `Accept: application/fhir+json` → FHIR R4 resource / Bundle

RBAC is enforced via require_permission() for the ("medication_request", <action>) pair.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.medication_request import get_medication_request_service
from app.schemas.medication_request.fhir_schemas import FhirBundleResponse, FhirMedicationRequestResponse
from app.schemas.medication_request.input import (
    ListMedicationRequestsSchema,
    MedicationRequestCreateSchema,
    MedicationRequestPatchSchema,
)
from app.schemas.medication_request.response import MedicationRequestResponse, PaginatedMedicationRequestResponse
from app.services.medication_request_service import MedicationRequestService

# All medication-request routes are prefixed with /medication-requests; tagged for Swagger grouping.
router = APIRouter(prefix="/medication-requests", tags=["MedicationRequests"])

# ── Shared error response descriptors ────────────────────────────────────────

_ERR_NOT_FOUND = {404: {"description": "MedicationRequest not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body or query params failed schema validation"}}

# ── Shared success response descriptors ──────────────────────────────────────

_SINGLE_201 = {
    201: {
        "description": "MedicationRequest created successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(MedicationRequestResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirMedicationRequestResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "MedicationRequest retrieved or updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(MedicationRequestResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirMedicationRequestResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of MedicationRequest resources",
        "content": {
            "application/json": {
                "schema": inline_schema(PaginatedMedicationRequestResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


# ── POST /medication-requests/ ────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_medication_request",
    summary="Create a MedicationRequest",
    description=(
        "Creates a new MedicationRequest — an order or request for medication for a patient. "
        "Both `status` and `intent` are required. "
        "Specify medication via `medication_code_*` (CodeableConcept) or `medication_reference`. "
        "Provide `subject` as a FHIR reference string e.g. `'Patient/10001'`. "
        "Optionally link to an Encounter via `encounter_id`. "
        "All sub-resources (identifier, category, supportingInfo, reasonCode, reasonReference, "
        "basedOn, insurance, note, dosageInstruction with nested additionalInstruction and "
        "doseAndRate, detectedIssue, eventHistory) are submitted in the single request body. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("medication_request", "create"))],
)
async def create_medication_request(
    dto: MedicationRequestCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("medication_request", "create")),
    service: MedicationRequestService = Depends(get_medication_request_service),
) -> JSONResponse:
    """Create a new MedicationRequest resource and return the persisted record."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /medication-requests/{resource_id} ────────────────────────────────────


@router.get(
    "/{resource_id}",
    operation_id="get_medication_request",
    summary="Get a MedicationRequest by ID",
    description=(
        "Fetch a single MedicationRequest by its integer ID. "
        "The response includes all child arrays (dosageInstruction, category, note, etc.). "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("medication_request", "read"))],
)
async def get_medication_request(
    resource_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("medication_request", "read")),
    service: MedicationRequestService = Depends(get_medication_request_service),
) -> JSONResponse:
    """Fetch a single MedicationRequest resource by its primary key."""
    data = await service.get_by_id(resource_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── GET /medication-requests/ ─────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_medication_requests",
    summary="List MedicationRequests",
    description=(
        "Returns a paginated list of MedicationRequest resources. "
        "Filter by `status`, `patient_id`, `encounter_id`, "
        "`authored_from`, `authored_to`, `user_id`, or `org_id`. "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("medication_request", "read"))],
)
async def list_medication_requests(
    request: Request,
    filters: ListMedicationRequestsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("medication_request", "read")),
    service: MedicationRequestService = Depends(get_medication_request_service),
) -> JSONResponse:
    """Return a paginated list of MedicationRequests, optionally filtered."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


# ── PATCH /medication-requests/{resource_id} ─────────────────────────────────


@router.patch(
    "/{resource_id}",
    operation_id="update_medication_request",
    summary="Partially update a MedicationRequest",
    description=(
        "Update specific scalar fields on a MedicationRequest. At least one field must be provided. "
        "Patchable fields: `status`, `intent`, `priority`, `do_not_perform`, `status_reason_*`, "
        "`medication_code_*`, `subject_display`, `encounter_display`, `authored_on`, "
        "`reported_boolean`, `reported_reference_display`, `requester_display`, "
        "`performer_display`, `performer_type_*`, `recorder_display`, "
        "`course_of_therapy_type_*`, `dispense_number_of_repeats_allowed`, "
        "`dispense_validity_period_*`, `dispense_quantity_*`, "
        "`substitution_allowed_boolean`, `substitution_reason_*`, "
        "`instantiates_canonical`, `instantiates_uri`. "
        "Child arrays are immutable after creation. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("medication_request", "update"))],
)
async def update_medication_request(
    resource_id: int,
    dto: MedicationRequestPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("medication_request", "update")),
    service: MedicationRequestService = Depends(get_medication_request_service),
) -> JSONResponse:
    """Partially update a MedicationRequest resource. Returns 422 if the body is empty."""
    data = await service.update(resource_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── DELETE /medication-requests/{resource_id} ────────────────────────────────


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_medication_request",
    summary="Delete a MedicationRequest",
    description=(
        "Permanently deletes the MedicationRequest and all its child records "
        "(identifier, category, supportingInformation, reasonCode, reasonReference, "
        "basedOn, insurance, note, dosageInstruction, detectedIssue, eventHistory). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("medication_request", "delete"))],
)
async def delete_medication_request(
    resource_id: int,
    actor: AuthUser = Depends(require_permission("medication_request", "delete")),
    service: MedicationRequestService = Depends(get_medication_request_service),
) -> None:
    """Permanently delete a MedicationRequest and cascade to all child records."""
    await service.delete(resource_id, actor)
