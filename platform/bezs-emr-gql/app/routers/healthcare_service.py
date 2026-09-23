"""
API router for FHIR HealthcareService resources.

Exposes CRUD endpoints under /healthcare-services. Each handler is intentionally thin:
it validates the schema (Pydantic), calls the service, and returns the formatted
response. All business logic lives in HealthcareServiceService.

Content negotiation:
    Every handler that returns a body accepts a `request: Request` parameter so it
    can read the client's Accept header and forward it through the service/client
    layers to the fhir-server. The fhir-server performs the actual format
    transformation (plain JSON ↔ FHIR R4). The handler wraps the result in a
    JSONResponse with the matching Content-Type via format_response().

    Clients signal their preferred format via:
        Accept: application/fhir+json    → FHIR R4 HealthcareService / Bundle
        Accept: application/json         → Plain JSON (default)

OpenAPI docs:
    Both response schemas (plain and FHIR R4) are documented in the `responses`
    dict so Swagger UI shows the full contract for each format. `response_model` is
    intentionally omitted from the decorators because the handlers return JSONResponse
    directly — FastAPI bypasses response_model validation for JSONResponse returns,
    and the schema documentation is fully covered by the explicit `responses` entries.

    inline_schema() is applied to all Pydantic-generated schemas before embedding them
    in `responses` to resolve $ref/$defs pointers that cause Swagger UI resolver errors
    when the schema is not at the document root.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import (
    format_paginated_response,
    format_response,
    get_accept_header,
)
from app.core.schema_utils import inline_schema
from app.di.dependencies.healthcare_service import get_healthcare_service_service
from app.schemas.healthcare_service.fhir_schemas import (
    FhirBundleResponse,
    FhirHealthcareServiceResponse,
)
from app.schemas.healthcare_service.input import (
    HealthcareServiceCreateSchema,
    HealthcareServicePatchSchema,
    ListHealthcareServicesSchema,
)
from app.schemas.healthcare_service.response import (
    HealthcareServiceResponse,
    PaginatedHealthcareServiceResponse,
)
from app.services.healthcare_service_service import HealthcareServiceService

router = APIRouter(prefix="/healthcare-services", tags=["HealthcareServices"])

# ── Shared error response dicts ────────────────────────────────────────────────
_ERR_NOT_FOUND = {404: {"description": "HealthcareService not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

# ── Dual-format success response dicts for OpenAPI documentation ───────────────
# These document both content types that the fhir-server can return depending on
# the client's Accept header. FastAPI merges these into the generated OpenAPI spec
# so Swagger UI shows both schemas under the correct status code.
#
# inline_schema() resolves Pydantic's $defs/$ref so sub-model references don't
# break the Swagger UI resolver when this schema is embedded inside the OpenAPI
# responses dict (Swagger resolves #/$defs/X from document root, not from the
# embedded object — inline_schema() prevents this by substituting all $ref in place).

_SINGLE_201 = {
    201: {
        "description": "HealthcareService created successfully",
        "content": {
            # Default plain JSON shape — returned when no Accept header is sent.
            "application/json": {
                "schema": inline_schema(HealthcareServiceResponse.model_json_schema())
            },
            # FHIR R4 shape — returned when Accept: application/fhir+json is sent.
            "application/fhir+json": {
                "schema": inline_schema(FhirHealthcareServiceResponse.model_json_schema())
            },
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "HealthcareService retrieved/updated successfully",
        "content": {
            "application/json": {
                "schema": inline_schema(HealthcareServiceResponse.model_json_schema())
            },
            "application/fhir+json": {
                "schema": inline_schema(FhirHealthcareServiceResponse.model_json_schema())
            },
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of HealthcareServices",
        "content": {
            # Plain JSON paginated envelope: { total, limit, offset, data: [...] }
            "application/json": {
                "schema": inline_schema(PaginatedHealthcareServiceResponse.model_json_schema())
            },
            # FHIR Bundle: { resourceType: "Bundle", type: "searchset", total, entry: [...] }
            "application/fhir+json": {
                "schema": inline_schema(FhirBundleResponse.model_json_schema())
            },
        },
    }
}


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_healthcare_service",
    summary="Create a HealthcareService",
    description=(
        "Creates a new FHIR HealthcareService resource. "
        "Supply `user_id` and `org_id` in the body for tenant scoping. "
        "Stamps `created_by` from the caller's JWT — do not supply this field. "
        "Send `Accept: application/fhir+json` to receive the created resource in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("healthcare_service", "create"))],
)
async def create_healthcare_service(
    dto: HealthcareServiceCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("healthcare_service", "create")),
    service: HealthcareServiceService = Depends(get_healthcare_service_service),
) -> JSONResponse:
    """
    Create a new HealthcareService resource. Forwards the client's Accept header to
    the fhir-server so it returns the created resource in the requested format.
    """
    # Extract the Accept header to forward — None means fhir-server defaults to plain JSON.
    accept = get_accept_header(request)
    data = await service.create(dto, actor, accept=accept)
    return format_response(data, request)


@router.get(
    "/{service_id}",
    operation_id="get_healthcare_service",
    summary="Get a HealthcareService by ID",
    description=(
        "Retrieves a single HealthcareService by its public integer ID. "
        "Send `Accept: application/fhir+json` to receive the resource in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("healthcare_service", "read"))],
)
async def get_healthcare_service(
    service_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("healthcare_service", "read")),
    service: HealthcareServiceService = Depends(get_healthcare_service_service),
) -> JSONResponse:
    """
    Fetch a single HealthcareService by ID. Forwards Accept header for content negotiation.
    """
    accept = get_accept_header(request)
    data = await service.get_by_id(service_id, actor, accept=accept)
    return format_response(data, request)


@router.get(
    "/",
    operation_id="list_healthcare_services",
    summary="List HealthcareServices",
    description=(
        "Returns a paginated list of HealthcareServices. "
        "Filter by `name` (case-insensitive substring) and `active` status. "
        "Use `limit` and `offset` for pagination. "
        "Send `Accept: application/fhir+json` to receive results as a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("healthcare_service", "read"))],
)
async def list_healthcare_services(
    request: Request,
    filters: ListHealthcareServicesSchema = Depends(),
    actor: AuthUser = Depends(require_permission("healthcare_service", "read")),
    service: HealthcareServiceService = Depends(get_healthcare_service_service),
) -> JSONResponse:
    """
    List HealthcareServices with optional filters. Forwards Accept header so the
    fhir-server returns either a plain paginated envelope or a FHIR Bundle searchset.
    """
    accept = get_accept_header(request)
    data = await service.list(filters, actor, accept=accept)
    return format_paginated_response(data, request)


@router.patch(
    "/{service_id}",
    operation_id="update_healthcare_service",
    summary="Partially update a HealthcareService",
    description=(
        "Updates specific scalar fields on a HealthcareService. "
        "At least one field must be provided. "
        "Patchable fields: active, name, comment, extra_details, appointment_required, "
        "availability_exceptions, photo_*. "
        "Array sub-resources (identifier, category, type, specialty, location, telecom, "
        "coverage_area, eligibility, available_time, not_available, endpoint, etc.) are not "
        "patchable — delete and re-create to correct those. "
        "Send `Accept: application/fhir+json` to receive the updated resource in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("healthcare_service", "update"))],
)
async def update_healthcare_service(
    service_id: int,
    dto: HealthcareServicePatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("healthcare_service", "update")),
    service: HealthcareServiceService = Depends(get_healthcare_service_service),
) -> JSONResponse:
    """
    Partially update a HealthcareService. Forwards Accept header for content negotiation.
    """
    accept = get_accept_header(request)
    data = await service.update(service_id, dto, actor, accept=accept)
    return format_response(data, request)


@router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_healthcare_service",
    summary="Delete a HealthcareService",
    description=(
        "Permanently deletes the HealthcareService and all its associated child records. "
        "This operation is irreversible."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("healthcare_service", "delete"))],
)
async def delete_healthcare_service(
    service_id: int,
    actor: AuthUser = Depends(require_permission("healthcare_service", "delete")),
    service: HealthcareServiceService = Depends(get_healthcare_service_service),
) -> None:
    """
    Delete a HealthcareService. No content negotiation — DELETE returns 204 with no body.
    """
    await service.delete(service_id, actor)
