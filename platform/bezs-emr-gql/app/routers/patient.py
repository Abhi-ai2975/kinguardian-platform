"""
API router for FHIR Patient resources.

Exposes 42 endpoints under /patients:
  Core (6):
    POST   /patients/                              — create a new Patient
    GET    /patients/me                            — get the caller's own Patient record
    GET    /patients/{patient_id}                  — fetch a single Patient by ID
    GET    /patients/                              — paginated list with filters
    PATCH  /patients/{patient_id}                  — partial update (scalar fields only)
    DELETE /patients/{patient_id}                  — permanent delete (cascades to child records)

  Sub-resources (9 types × 4 endpoints = 36):
    POST   /patients/{patient_id}/<sub>            — add a sub-resource item
    GET    /patients/{patient_id}/<sub>            — list all items for this sub-resource
    PATCH  /patients/{patient_id}/<sub>/{id}       — update a specific item
    DELETE /patients/{patient_id}/<sub>/{id}       — remove a specific item

  Sub-resource types: names, identifiers, telecom, addresses, photos,
  contacts, communications, general-practitioners, links.

Route ordering is critical: /me must appear before /{patient_id} so FastAPI
does not attempt to cast the literal string "me" as an integer.

Content negotiation:
  Accept: application/json         → plain snake_case JSON (default)
  Accept: application/fhir+json    → FHIR R4 resource / Bundle

Sub-resource list responses always return plain JSON ({data: [...], total: N})
regardless of the Accept header — they are not FHIR-bundled.

RBAC: all endpoints require the "patient" permission. Mutation sub-resource
endpoints (add/patch/delete) use the "update" action since they mutate the
parent Patient. Only the top-level DELETE uses "delete".
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import AuthUser
from app.auth.rbac import require_permission
from app.core.content_negotiation import format_paginated_response, format_response, get_accept_header
from app.core.schema_utils import inline_schema
from app.di.dependencies.patient import get_patient_service
from app.schemas.patient.fhir_schemas import FhirBundleResponse, FhirPatientResponse
from app.schemas.patient.input import (
    AddressCreateSchema,
    AddressPatchSchema,
    CommunicationCreateSchema,
    CommunicationPatchSchema,
    ContactCreateSchema,
    ContactPatchSchema,
    GeneralPractitionerCreateSchema,
    GeneralPractitionerPatchSchema,
    IdentifierCreateSchema,
    IdentifierPatchSchema,
    LinkCreateSchema,
    LinkPatchSchema,
    ListPatientsSchema,
    NameCreateSchema,
    NamePatchSchema,
    PatientCreateSchema,
    PatientFullCreateSchema,
    PatientFullPatchSchema,
    PatientPatchSchema,
    PhotoCreateSchema,
    PhotoPatchSchema,
    TelecomCreateSchema,
    TelecomPatchSchema,
)
from app.schemas.patient.response import (
    PaginatedPatientResponse,
    PatientAddressListResponse,
    PatientCommunicationListResponse,
    PatientContactListResponse,
    PatientGeneralPractitionerListResponse,
    PatientIdentifierListResponse,
    PatientLinkListResponse,
    PatientNameListResponse,
    PatientPhotoListResponse,
    PatientResponse,
    PatientTelecomListResponse,
)
from app.services.patient_service import PatientService

router = APIRouter(prefix="/patients", tags=["Patients"])

# ── Shared error response dicts ───────────────────────────────────────────────
_ERR_NOT_FOUND = {404: {"description": "Patient not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error"}}

# ── Dual-format success response dicts for core Patient endpoints ─────────────
# inline_schema() resolves Pydantic $defs/$ref so sub-model references don't
# break when embedded in the OpenAPI responses dict (Swagger UI resolver limit).

_SINGLE_201 = {
    201: {
        "description": "Patient created successfully",
        "content": {
            "application/json": {"schema": inline_schema(PatientResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FhirPatientResponse.model_json_schema())},
        },
    }
}

_SINGLE_200 = {
    200: {
        "description": "Patient retrieved/updated successfully",
        "content": {
            "application/json": {"schema": inline_schema(PatientResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FhirPatientResponse.model_json_schema())},
        },
    }
}

_LIST_200 = {
    200: {
        "description": "Paginated list of Patients",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedPatientResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FhirBundleResponse.model_json_schema())},
        },
    }
}

# ── Sub-resource list response dicts (plain JSON only — not FHIR bundled) ────

_SUBRES_NAMES_200 = {
    200: {
        "description": "List of Patient names",
        "content": {"application/json": {"schema": inline_schema(PatientNameListResponse.model_json_schema())}},
    }
}

_SUBRES_IDENTIFIERS_200 = {
    200: {
        "description": "List of Patient identifiers",
        "content": {"application/json": {"schema": inline_schema(PatientIdentifierListResponse.model_json_schema())}},
    }
}

_SUBRES_TELECOM_200 = {
    200: {
        "description": "List of Patient telecom entries",
        "content": {"application/json": {"schema": inline_schema(PatientTelecomListResponse.model_json_schema())}},
    }
}

_SUBRES_ADDRESSES_200 = {
    200: {
        "description": "List of Patient addresses",
        "content": {"application/json": {"schema": inline_schema(PatientAddressListResponse.model_json_schema())}},
    }
}

_SUBRES_PHOTOS_200 = {
    200: {
        "description": "List of Patient photos",
        "content": {"application/json": {"schema": inline_schema(PatientPhotoListResponse.model_json_schema())}},
    }
}

_SUBRES_CONTACTS_200 = {
    200: {
        "description": "List of Patient contacts",
        "content": {"application/json": {"schema": inline_schema(PatientContactListResponse.model_json_schema())}},
    }
}

_SUBRES_COMMUNICATIONS_200 = {
    200: {
        "description": "List of Patient communication preferences",
        "content": {"application/json": {"schema": inline_schema(PatientCommunicationListResponse.model_json_schema())}},
    }
}

_SUBRES_GPS_200 = {
    200: {
        "description": "List of Patient general practitioners",
        "content": {"application/json": {"schema": inline_schema(PatientGeneralPractitionerListResponse.model_json_schema())}},
    }
}

_SUBRES_LINKS_200 = {
    200: {
        "description": "List of Patient links",
        "content": {"application/json": {"schema": inline_schema(PatientLinkListResponse.model_json_schema())}},
    }
}


# ── Core endpoints ────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_patient",
    summary="Create a Patient",
    description=(
        "Creates a new Patient resource. "
        "`user_id` and `org_id` are required for tenant scoping. "
        "`created_by` is stamped automatically from the caller's JWT — do not supply it. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "create"))],
)
async def create_patient(
    dto: PatientCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "create")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    """Create a new Patient. Forwards Accept header for content negotiation."""
    data = await service.create(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.post(
    "/full",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_patient_full",
    summary="Create a Patient with all sub-resources atomically",
    description=(
        "Creates a Patient and any combination of sub-resources (names, identifiers, telecom, "
        "addresses, photos, contacts, communications, general_practitioners, links) in a single "
        "atomic request. The fhir-server wraps all inserts in one DB transaction — if any "
        "sub-resource insert fails the entire request rolls back and nothing is persisted. "
        "All sub-resource arrays are optional; omit any to skip those sub-resources. "
        "`created_by` is stamped automatically from the caller's JWT — do not supply it. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "create"))],
)
async def create_patient_full(
    dto: PatientFullCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "create")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    """Create a Patient and all provided sub-resources atomically in one fhir-server request."""
    data = await service.create_full(dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


# ── PATCH /patients/{patient_id}/full ────────────────────────────────────────


@router.patch(
    "/{patient_id}/full",
    operation_id="update_patient_full",
    summary="Update a Patient's scalar fields and/or rewrite sub-resource arrays",
    description=(
        "Partially update a Patient resource and any combination of its sub-resource arrays "
        "(names, identifiers, telecom, addresses, photos, contacts, communications, "
        "general_practitioners, links) in a single call. "
        "Array semantics: **omit / null** → leave sub-resource untouched; "
        "**[]** → delete all records of that type; "
        "**[{...}]** → replace all records with the provided items. "
        "Scalar fields follow standard PATCH semantics — omitted means unchanged. "
        "At least one field or array must be provided. "
        "`updated_by` is stamped automatically from the caller's JWT. "
        "Send `Accept: application/fhir+json` to receive the result in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def update_patient_full(
    patient_id: int,
    dto: PatientFullPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    """Update a Patient's scalar fields and/or rewrite sub-resource arrays in one call."""
    data = await service.update_full(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/me",
    operation_id="get_my_patient",
    summary="Get the current user's Patient record",
    description=(
        "Returns the Patient record linked to the authenticated caller. "
        "`user_id` and `org_id` are resolved from the JWT — no parameters required. "
        "Returns 404 if no Patient record has been created for this user yet. "
        "Send `Accept: application/fhir+json` to receive the resource in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def get_my_patient(
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    """Fetch the Patient belonging to the authenticated caller via JWT identity."""
    data = await service.get_me(actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}",
    operation_id="get_patient",
    summary="Get a Patient by ID",
    description=(
        "Retrieves a single Patient by its integer ID. "
        "The response includes all sub-resource arrays (name, identifier, telecom, etc.). "
        "Send `Accept: application/fhir+json` to receive the resource in FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def get_patient(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    """Fetch a single Patient by ID. Forwards Accept header for content negotiation."""
    data = await service.get_by_id(patient_id, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/",
    operation_id="list_patients",
    summary="List Patients",
    description=(
        "Returns a paginated list of Patient resources. "
        "Filter by `family_name` or `given_name` (partial, case-insensitive), "
        "`gender`, `active`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination (default limit: 50, max: 200). "
        "Send `Accept: application/fhir+json` to receive a FHIR Bundle searchset."
    ),
    responses={**_LIST_200},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patients(
    request: Request,
    filters: ListPatientsSchema = Depends(),
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    """List Patients with optional filters. Forwards Accept header for content negotiation."""
    data = await service.list(filters, actor, accept=get_accept_header(request))
    return format_paginated_response(data, request)


@router.patch(
    "/{patient_id}",
    operation_id="update_patient",
    summary="Partially update a Patient",
    description=(
        "Update specific scalar fields on a Patient. At least one field must be provided. "
        "Patchable fields: `active`, `gender`, `birth_date`, `deceased_boolean`, "
        "`deceased_datetime`, `marital_status_*`, `multiple_birth_*`, `managing_organization*`. "
        "Sub-resource arrays (name, identifier, telecom, etc.) are managed via dedicated "
        "sub-resource endpoints. "
        "`updated_by` is stamped automatically from the caller's JWT. "
        "Send `Accept: application/fhir+json` for FHIR R4 format."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def update_patient(
    patient_id: int,
    dto: PatientPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    """Partially update a Patient. Forwards Accept header for content negotiation."""
    data = await service.update(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient",
    summary="Delete a Patient",
    description=(
        "Permanently deletes the Patient and all its associated sub-resource records "
        "(name, identifier, telecom, address, photo, contact, communication, "
        "general_practitioner, link). This operation is irreversible."
    ),
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "delete"))],
)
async def delete_patient(
    patient_id: int,
    actor: AuthUser = Depends(require_permission("patient", "delete")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    """Delete a Patient. No content negotiation — 204 carries no body."""
    await service.delete(patient_id, actor)


# ── Sub-resource: Names ───────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/names",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_name",
    summary="Add a name to a Patient",
    description="Adds a HumanName to the Patient. Returns the full updated Patient resource.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_name(
    patient_id: int,
    dto: NameCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_name(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/names",
    operation_id="list_patient_names",
    summary="List a Patient's names",
    description="Returns all HumanName entries for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_NAMES_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_names(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_names(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/names/{name_id}",
    operation_id="patch_patient_name",
    summary="Update a Patient name",
    description="Partially updates a specific HumanName. Returns the full updated Patient resource.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_name(
    patient_id: int,
    name_id: int,
    dto: NamePatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_name(patient_id, name_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/names/{name_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_name",
    summary="Delete a Patient name",
    description="Removes a specific HumanName from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_name(
    patient_id: int,
    name_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_name(patient_id, name_id, actor)


# ── Sub-resource: Identifiers ─────────────────────────────────────────────────


@router.post(
    "/{patient_id}/identifiers",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_identifier",
    summary="Add an identifier to a Patient",
    description="Adds an Identifier to the Patient. Returns the full updated Patient resource.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_identifier(
    patient_id: int,
    dto: IdentifierCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_identifier(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/identifiers",
    operation_id="list_patient_identifiers",
    summary="List a Patient's identifiers",
    description="Returns all Identifiers for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_IDENTIFIERS_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_identifiers(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_identifiers(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/identifiers/{identifier_id}",
    operation_id="patch_patient_identifier",
    summary="Update a Patient identifier",
    description="Partially updates a specific Identifier. Returns the full updated Patient resource.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_identifier(
    patient_id: int,
    identifier_id: int,
    dto: IdentifierPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_identifier(patient_id, identifier_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/identifiers/{identifier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_identifier",
    summary="Delete a Patient identifier",
    description="Removes a specific Identifier from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_identifier(
    patient_id: int,
    identifier_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_identifier(patient_id, identifier_id, actor)


# ── Sub-resource: Telecom ─────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/telecom",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_telecom",
    summary="Add a telecom entry to a Patient",
    description="Adds a ContactPoint to the Patient. Returns the full updated Patient resource.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_telecom(
    patient_id: int,
    dto: TelecomCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_telecom(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/telecom",
    operation_id="list_patient_telecom",
    summary="List a Patient's telecom entries",
    description="Returns all ContactPoint entries for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_TELECOM_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_telecom(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_telecom(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/telecom/{telecom_id}",
    operation_id="patch_patient_telecom",
    summary="Update a Patient telecom entry",
    description="Partially updates a specific ContactPoint. Returns the full updated Patient resource.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_telecom(
    patient_id: int,
    telecom_id: int,
    dto: TelecomPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_telecom(patient_id, telecom_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/telecom/{telecom_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_telecom",
    summary="Delete a Patient telecom entry",
    description="Removes a specific ContactPoint from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_telecom(
    patient_id: int,
    telecom_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_telecom(patient_id, telecom_id, actor)


# ── Sub-resource: Addresses ───────────────────────────────────────────────────


@router.post(
    "/{patient_id}/addresses",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_address",
    summary="Add an address to a Patient",
    description="Adds an Address to the Patient. Returns the full updated Patient resource.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_address(
    patient_id: int,
    dto: AddressCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_address(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/addresses",
    operation_id="list_patient_addresses",
    summary="List a Patient's addresses",
    description="Returns all Addresses for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_ADDRESSES_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_addresses(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_addresses(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/addresses/{address_id}",
    operation_id="patch_patient_address",
    summary="Update a Patient address",
    description="Partially updates a specific Address. Returns the full updated Patient resource.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_address(
    patient_id: int,
    address_id: int,
    dto: AddressPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_address(patient_id, address_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/addresses/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_address",
    summary="Delete a Patient address",
    description="Removes a specific Address from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_address(
    patient_id: int,
    address_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_address(patient_id, address_id, actor)


# ── Sub-resource: Photos ──────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/photos",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_photo",
    summary="Add a photo to a Patient",
    description="Adds an Attachment (photo) to the Patient. Returns the full updated Patient resource.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_photo(
    patient_id: int,
    dto: PhotoCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_photo(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/photos",
    operation_id="list_patient_photos",
    summary="List a Patient's photos",
    description="Returns all Attachment (photo) entries for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_PHOTOS_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_photos(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_photos(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/photos/{photo_id}",
    operation_id="patch_patient_photo",
    summary="Update a Patient photo",
    description="Partially updates a specific photo Attachment. Returns the full updated Patient resource.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_photo(
    patient_id: int,
    photo_id: int,
    dto: PhotoPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_photo(patient_id, photo_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_photo",
    summary="Delete a Patient photo",
    description="Removes a specific photo Attachment from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_photo(
    patient_id: int,
    photo_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_photo(patient_id, photo_id, actor)


# ── Sub-resource: Contacts ────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/contacts",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_contact",
    summary="Add a contact to a Patient",
    description=(
        "Adds a contact person (next-of-kin, guardian, emergency contact) to the Patient. "
        "Contact includes nested relationship[] and telecom[] arrays. "
        "Returns the full updated Patient resource."
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_contact(
    patient_id: int,
    dto: ContactCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_contact(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/contacts",
    operation_id="list_patient_contacts",
    summary="List a Patient's contacts",
    description="Returns all contacts for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_CONTACTS_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_contacts(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_contacts(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/contacts/{contact_id}",
    operation_id="patch_patient_contact",
    summary="Update a Patient contact",
    description=(
        "Partially updates a specific contact. When relationship or telecom arrays "
        "are provided, they replace the existing array entirely. "
        "Returns the full updated Patient resource."
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_contact(
    patient_id: int,
    contact_id: int,
    dto: ContactPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_contact(patient_id, contact_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_contact",
    summary="Delete a Patient contact",
    description="Removes a specific contact and its child relationship/telecom records from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_contact(
    patient_id: int,
    contact_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_contact(patient_id, contact_id, actor)


# ── Sub-resource: Communications ──────────────────────────────────────────────


@router.post(
    "/{patient_id}/communications",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_communication",
    summary="Add a communication preference to a Patient",
    description="Adds a language/communication preference to the Patient. Returns the full updated Patient resource.",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_communication(
    patient_id: int,
    dto: CommunicationCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_communication(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/communications",
    operation_id="list_patient_communications",
    summary="List a Patient's communication preferences",
    description="Returns all communication language preferences for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_COMMUNICATIONS_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_communications(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_communications(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/communications/{comm_id}",
    operation_id="patch_patient_communication",
    summary="Update a Patient communication preference",
    description="Partially updates a specific communication entry. Returns the full updated Patient resource.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_communication(
    patient_id: int,
    comm_id: int,
    dto: CommunicationPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_communication(patient_id, comm_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/communications/{comm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_communication",
    summary="Delete a Patient communication preference",
    description="Removes a specific communication entry from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_communication(
    patient_id: int,
    comm_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_communication(patient_id, comm_id, actor)


# ── Sub-resource: General Practitioners ──────────────────────────────────────


@router.post(
    "/{patient_id}/general-practitioners",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_general_practitioner",
    summary="Add a general practitioner to a Patient",
    description=(
        "Adds a generalPractitioner reference to the Patient. "
        "reference_type must be Organization, Practitioner, or PractitionerRole. "
        "Returns the full updated Patient resource."
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_general_practitioner(
    patient_id: int,
    dto: GeneralPractitionerCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_general_practitioner(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/general-practitioners",
    operation_id="list_patient_general_practitioners",
    summary="List a Patient's general practitioners",
    description="Returns all generalPractitioner references for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_GPS_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_general_practitioners(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_general_practitioners(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/general-practitioners/{gp_id}",
    operation_id="patch_patient_general_practitioner",
    summary="Update a Patient general practitioner reference",
    description="Partially updates a specific generalPractitioner reference. Returns the full updated Patient resource.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_general_practitioner(
    patient_id: int,
    gp_id: int,
    dto: GeneralPractitionerPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_general_practitioner(patient_id, gp_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/general-practitioners/{gp_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_general_practitioner",
    summary="Delete a Patient general practitioner reference",
    description="Removes a specific generalPractitioner reference from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_general_practitioner(
    patient_id: int,
    gp_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_general_practitioner(patient_id, gp_id, actor)


# ── Sub-resource: Links ───────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/links",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_link",
    summary="Add a link to a Patient",
    description=(
        "Links this Patient to another Patient or RelatedPerson resource. "
        "type must be one of: replaced-by, replaces, refer, seealso. "
        "Returns the full updated Patient resource."
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def add_patient_link(
    patient_id: int,
    dto: LinkCreateSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.add_link(patient_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.get(
    "/{patient_id}/links",
    operation_id="list_patient_links",
    summary="List a Patient's links",
    description="Returns all links for the Patient as {data: [...], total: N}.",
    responses={**_SUBRES_LINKS_200, **_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "read"))],
)
async def list_patient_links(
    patient_id: int,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "read")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.list_links(patient_id, actor)
    return format_response(data, request)


@router.patch(
    "/{patient_id}/links/{link_id}",
    operation_id="patch_patient_link",
    summary="Update a Patient link",
    description="Partially updates a specific link. Returns the full updated Patient resource.",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def patch_patient_link(
    patient_id: int,
    link_id: int,
    dto: LinkPatchSchema,
    request: Request,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> JSONResponse:
    data = await service.patch_link(patient_id, link_id, dto, actor, accept=get_accept_header(request))
    return format_response(data, request)


@router.delete(
    "/{patient_id}/links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_link",
    summary="Delete a Patient link",
    description="Removes a specific link from the Patient.",
    responses={**_ERR_NOT_FOUND},
    dependencies=[Depends(require_permission("patient", "update"))],
)
async def delete_patient_link(
    patient_id: int,
    link_id: int,
    actor: AuthUser = Depends(require_permission("patient", "update")),
    service: PatientService = Depends(get_patient_service),
) -> None:
    await service.delete_link(patient_id, link_id, actor)
