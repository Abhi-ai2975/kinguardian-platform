from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app.deps.practitioner_deps import resolve_practitioner
from app.core.content_negotiation import format_response, format_paginated_response, wants_fhir
from app.core.schema_utils import inline_schema
from app.di.dependencies.practitioner import get_practitioner_service
from app.models.practitioner import PractitionerModel
from app.schemas.fhir import (
    FHIRPractitionerSchema,
    FHIRPractitionerBundle,
    PaginatedPractitionerResponse,
    PlainPractitionerResponse,
    PractitionerNamesListResponse,
    PractitionerIdentifiersListResponse,
    PractitionerTelecomListResponse,
    PractitionerAddressesListResponse,
    PractitionerPhotosListResponse,
    PractitionerQualificationsListResponse,
    PractitionerCommunicationsListResponse,
    FHIRPractitionerNamesListResponse,
    FHIRPractitionerIdentifiersListResponse,
    FHIRPractitionerTelecomListResponse,
    FHIRPractitionerAddressesListResponse,
    FHIRPractitionerPhotosListResponse,
    FHIRPractitionerQualificationsListResponse,
    FHIRPractitionerCommunicationsListResponse,
)
from app.schemas.practitioner import (
    PractitionerCreateSchema,
    PractitionerFullCreateSchema,
    PractitionerPatchSchema,
    PractitionerFullPatchSchema,
    PractitionerNameCreate,
    PractitionerNamePatch,
    PractitionerIdentifierCreate,
    PractitionerIdentifierPatch,
    PractitionerTelecomCreate,
    PractitionerTelecomPatch,
    PractitionerAddressCreate,
    PractitionerAddressPatch,
    PractitionerPhotoCreate,
    PractitionerPhotoPatch,
    PractitionerQualificationCreate,
    PractitionerQualificationPatch,
    PractitionerCommunicationCreate,
    PractitionerCommunicationPatch,
)
from app.fhir.datatypes import (
    fhir_human_name, fhir_identifier, fhir_telecom, fhir_address,
    fhir_photo, fhir_communication, plain_name, plain_identifier, plain_telecom,
    plain_address, plain_photo, plain_communication,
)
from app.fhir.mappers.practitioner import fhir_qualification, plain_qualification
from app.services.practitioner_service import PractitionerService

router = APIRouter()


_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Practitioner not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainPractitionerResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRPractitionerSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of practitioners",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedPractitionerResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRPractitionerBundle.model_json_schema())},
        },
    }
}

_SUBRES_NAMES_200 = {200: {"description": "List of HumanName entries", "content": {
    "application/json": {"schema": inline_schema(PractitionerNamesListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPractitionerNamesListResponse.model_json_schema())},
}}}
_SUBRES_IDENTIFIERS_200 = {200: {"description": "List of business identifiers", "content": {
    "application/json": {"schema": inline_schema(PractitionerIdentifiersListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPractitionerIdentifiersListResponse.model_json_schema())},
}}}
_SUBRES_TELECOM_200 = {200: {"description": "List of contact points", "content": {
    "application/json": {"schema": inline_schema(PractitionerTelecomListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPractitionerTelecomListResponse.model_json_schema())},
}}}
_SUBRES_ADDRESSES_200 = {200: {"description": "List of addresses", "content": {
    "application/json": {"schema": inline_schema(PractitionerAddressesListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPractitionerAddressesListResponse.model_json_schema())},
}}}
_SUBRES_PHOTOS_200 = {200: {"description": "List of photo attachments", "content": {
    "application/json": {"schema": inline_schema(PractitionerPhotosListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPractitionerPhotosListResponse.model_json_schema())},
}}}
_SUBRES_QUALIFICATIONS_200 = {200: {"description": "List of qualifications", "content": {
    "application/json": {"schema": inline_schema(PractitionerQualificationsListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPractitionerQualificationsListResponse.model_json_schema())},
}}}
_SUBRES_COMMUNICATIONS_200 = {200: {"description": "List of communication language entries", "content": {
    "application/json": {"schema": inline_schema(PractitionerCommunicationsListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPractitionerCommunicationsListResponse.model_json_schema())},
}}}


# ── Create Practitioner ────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_practitioner",
    summary="Create a new Practitioner resource",
    description=(
        "Creates a Practitioner with core demographics (active status, gender, birth date). "
        "The caller's `sub` claim and `activeOrganizationId` from the JWT are automatically bound to the record. "
        "Names, identifiers, telecom, addresses, photos, qualifications, and communications must be added "
        "via the dedicated sub-resource endpoints after creation. "
        + _CONTENT_NEG
    ),
    response_description="The newly created Practitioner resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_practitioner(
    payload: PractitionerCreateSchema,
    request: Request,
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    created_by = payload.created_by
    practitioner = await practitioner_service.create_practitioner(payload, payload.user_id, payload.org_id, created_by)
    return format_response(
        practitioner_service._to_fhir(practitioner),
        practitioner_service._to_plain(practitioner),
        request,
    )


@router.post(
    "/full",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_practitioner_full",
    summary="Create a Practitioner resource with all sub-resources in one request",
    description=(
        "Creates a Practitioner and any combination of sub-resources (names, identifiers, telecom, "
        "addresses, photos, qualifications, communications) atomically in a single DB transaction — "
        "if any insert fails the entire request rolls back. "
        "All sub-resource lists are optional; omit any to skip those sub-resources. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_practitioner_full(
    payload: PractitionerFullCreateSchema,
    request: Request,
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    practitioner = await practitioner_service.create_practitioner_full(
        payload, payload.user_id, payload.org_id, payload.created_by
    )
    return format_response(
        practitioner_service._to_fhir(practitioner),
        practitioner_service._to_plain(practitioner),
        request,
    )


# Declared before /{practitioner_id} so "me" is not matched by the int path param.



@router.get(
    "/{practitioner_id}",
    operation_id="get_practitioner_by_id",
    summary="Retrieve a Practitioner resource by public practitioner_id",
    description=(
        "Fetches a single Practitioner by its public integer `practitioner_id`. "
        "Access is subject to organization-scoped authorization. "
        + _CONTENT_NEG
    ),
    response_description="The requested Practitioner resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_practitioner(
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    return format_response(
        practitioner_service._to_fhir(practitioner),
        practitioner_service._to_plain(practitioner),
        request,
    )


# ── Patch Practitioner ─────────────────────────────────────────────────────


@router.patch(
    "/{practitioner_id}",
    operation_id="patch_practitioner",
    summary="Partially update a Practitioner resource",
    description=(
        "Only supplied fields are written; omitted fields are left unchanged. "
        "Patchable fields: active, gender, birth_date, deceased_boolean, deceased_datetime. "
        "To modify names, identifiers, telecom, addresses, photos, qualifications, or communications, "
        "use the dedicated sub-resource endpoints. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_practitioner(
    payload: PractitionerPatchSchema,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated_by = payload.updated_by
    updated = await practitioner_service.patch_practitioner(practitioner.practitioner_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


@router.patch(
    "/{practitioner_id}/full",
    operation_id="patch_practitioner_full",
    summary="Atomically update a Practitioner and replace any sub-resource lists in one request",
    description=(
        "Patches a Practitioner's scalar fields (same semantics as `PATCH /{practitioner_id}`) AND "
        "replaces sub-resource lists atomically in a single DB transaction. "
        "For each list that is **provided** (even `[]`): all existing rows are deleted and the "
        "new items are inserted. Lists that are **omitted** (null / not in body) are left untouched. "
        "Qualifications with nested identifiers are handled correctly. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_practitioner_full(
    payload: PractitionerFullPatchSchema,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.patch_practitioner_full(
        practitioner.practitioner_id, payload, payload.updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


# ── List Practitioners ─────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_practitioners",
    summary="List all Practitioner resources",
    description=(
        "Returns a paginated list of Practitioners. "
        "Filter by `family_name` or `given_name` (searches across the practitioner_name table), "
        "`active`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated Practitioner resources",
    responses={**_LIST_200},
)
async def list_practitioners(
    request: Request,
    family_name: Optional[str] = Query(None, description="Filter by family (last) name — partial match, case-insensitive."),
    given_name: Optional[str] = Query(None, description="Filter by given (first) name — partial match, case-insensitive."),
    active: Optional[bool] = Query(None, description="Filter by active status."),
    user_id: Optional[str] = Query(None, description="Filter by user_id (JWT sub claim)."),
    org_id: Optional[str] = Query(None, description="Filter by organization ID."),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    practitioners, total = await practitioner_service.list_practitioners(
        user_id=user_id, org_id=org_id, family_name=family_name,
        given_name=given_name, active=active,
        limit=limit, offset=offset,
    )
    return format_paginated_response(
        [practitioner_service._to_fhir(p) for p in practitioners],
        [practitioner_service._to_plain(p) for p in practitioners],
        total, limit, offset, request,
    )


# ── Delete Practitioner ────────────────────────────────────────────────────


@router.delete(
    "/{practitioner_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner",
    summary="Delete a Practitioner resource",
    description=(
        "Permanently deletes the Practitioner and all associated sub-resources "
        "(names, identifiers, telecom, addresses, photos, qualifications, communications). "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_practitioner(
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    await practitioner_service.delete_practitioner(practitioner.practitioner_id)
    return None


# ── Sub-resource: Names ────────────────────────────────────────────────────


@router.post(
    "/{practitioner_id}/names",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_name",
    summary="Add a HumanName to a Practitioner",
    description=(
        "Appends a name to the Practitioner. "
        "Supports `use` (usual | official | temp | nickname | anonymous | old | maiden), "
        "`family`, `given[]`, `prefix[]`, `suffix[]`, `text`, and an optional validity `period`. "
        "Returns the full updated Practitioner resource. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource with the new name appended",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_name(
    payload: PractitionerNameCreate,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.add_name(practitioner.practitioner_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


# ── Sub-resource: Identifiers ──────────────────────────────────────────────


@router.post(
    "/{practitioner_id}/identifiers",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_identifier",
    summary="Add a business identifier to a Practitioner (e.g. NPI, license, DEA)",
    description=(
        "Appends a business identifier to the Practitioner. "
        "`system` is a URI namespace (e.g. `http://hl7.org/fhir/sid/us-npi`); "
        "`value` is the identifier string within that namespace. "
        "Optional `type_system`, `type_code`, `type_display`, `type_text` describe the identifier category. "
        "Returns the full updated Practitioner resource. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource with the new identifier appended",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_identifier(
    payload: PractitionerIdentifierCreate,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.add_identifier(practitioner.practitioner_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


# ── Sub-resource: Telecom ──────────────────────────────────────────────────


@router.post(
    "/{practitioner_id}/telecom",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_telecom",
    summary="Add a contact point (telecom) to a Practitioner",
    description=(
        "Appends a contact point to the Practitioner. "
        "`system`: phone | fax | email | pager | url | sms | other. "
        "`use`: home | work | temp | old | mobile. "
        "Returns the full updated Practitioner resource. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource with the new contact point appended",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_telecom(
    payload: PractitionerTelecomCreate,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.add_telecom(practitioner.practitioner_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


# ── Sub-resource: Addresses ────────────────────────────────────────────────


@router.post(
    "/{practitioner_id}/addresses",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_address",
    summary="Add an address to a Practitioner",
    description=(
        "Appends a postal or physical address to the Practitioner. "
        "`use`: home | work | temp | old | billing. "
        "`type`: postal | physical | both. "
        "`line` is an array of street address lines. "
        "Returns the full updated Practitioner resource. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource with the new address appended",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_address(
    payload: PractitionerAddressCreate,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.add_address(practitioner.practitioner_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


# ── Sub-resource: Photos ───────────────────────────────────────────────────


@router.post(
    "/{practitioner_id}/photos",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_photo",
    summary="Add a photo (Attachment) to a Practitioner",
    description=(
        "Appends a photo attachment to the Practitioner. "
        "Provide `data` (base64-encoded image) or `url` pointing to the image, "
        "plus `content_type` (MIME type, e.g. `image/png`). "
        "Returns the full updated Practitioner resource. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource with the new photo appended",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_photo(
    payload: PractitionerPhotoCreate,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.add_photo(practitioner.practitioner_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


# ── Sub-resource: Qualifications ───────────────────────────────────────────


@router.post(
    "/{practitioner_id}/qualifications",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_qualification",
    summary="Add a professional qualification to a Practitioner",
    description=(
        "Records a degree, certification, accreditation, or license held by the Practitioner "
        "(e.g. MD, board certification, NPI, DEA number). "
        "Provide `code_system`, `code_code`, `code_display` for the qualification type "
        "(e.g. SNOMED CT code for MD), an optional validity `period`, and optional `issuer_id` / `issuer_display`. "
        "Returns the full updated Practitioner resource. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource with the new qualification appended",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_qualification(
    payload: PractitionerQualificationCreate,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.add_qualification(practitioner.practitioner_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


# ── Sub-resource: Communications ──────────────────────────────────────────


@router.post(
    "/{practitioner_id}/communications",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_practitioner_communication",
    summary="Add a communication language to a Practitioner",
    description=(
        "Records a language the Practitioner can use in patient communication. "
        "`language_code` is an ISO-639-1 code (e.g. `en`, `fr`, `de`). "
        "Set `preferred: true` to mark this as the practitioner's preferred language. "
        "Returns the full updated Practitioner resource. "
        + _CONTENT_NEG
    ),
    response_description="The updated Practitioner resource with the new communication language appended",
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_communication(
    payload: PractitionerCommunicationCreate,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.add_communication(practitioner.practitioner_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Practitioner not found")
    return format_response(
        practitioner_service._to_fhir(updated),
        practitioner_service._to_plain(updated),
        request,
    )


# ── Sub-resource GETs ─────────────────────────────────────────────────────────


@router.get(
    "/{practitioner_id}/names",
    operation_id="list_practitioner_names",
    summary="List all HumanName entries for a Practitioner",
    description=(
        "Returns all HumanName entries attached to this Practitioner. "
        "Each item includes `id` — use it to remove a specific name via "
        "`DELETE /{practitioner_id}/names/{name_id}`."
    ),
    responses={**_SUBRES_NAMES_200, **_ERR_NOT_FOUND},
)
async def list_names(
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    items = await practitioner_service.get_names(practitioner.practitioner_id)
    plain = [plain_name(n) for n in items]
    if wants_fhir(request):
        fhir = [{"id": n.id, **fhir_human_name(n)} for n in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.get(
    "/{practitioner_id}/identifiers",
    operation_id="list_practitioner_identifiers",
    summary="List all business identifiers for a Practitioner",
    description=(
        "Returns all business identifiers (NPI, DEA, license numbers, etc.) attached to this Practitioner. "
        "Each item includes `id` — use it to remove a specific identifier via "
        "`DELETE /{practitioner_id}/identifiers/{identifier_id}`."
    ),
    responses={**_SUBRES_IDENTIFIERS_200, **_ERR_NOT_FOUND},
)
async def list_identifiers(
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    items = await practitioner_service.get_identifiers(practitioner.practitioner_id)
    plain = [plain_identifier(i) for i in items]
    if wants_fhir(request):
        fhir = [{"id": i.id, **fhir_identifier(i)} for i in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.get(
    "/{practitioner_id}/telecom",
    operation_id="list_practitioner_telecom",
    summary="List all contact points (telecom) for a Practitioner",
    description=(
        "Returns all contact points (phone, email, fax, pager, etc.) for this Practitioner. "
        "Each item includes `id` — use it to remove a specific contact point via "
        "`DELETE /{practitioner_id}/telecom/{telecom_id}`."
    ),
    responses={**_SUBRES_TELECOM_200, **_ERR_NOT_FOUND},
)
async def list_telecom(
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    items = await practitioner_service.get_telecoms(practitioner.practitioner_id)
    plain = [plain_telecom(t) for t in items]
    if wants_fhir(request):
        fhir = [{"id": t.id, **fhir_telecom(t)} for t in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.get(
    "/{practitioner_id}/addresses",
    operation_id="list_practitioner_addresses",
    summary="List all addresses for a Practitioner",
    description=(
        "Returns all postal and physical addresses for this Practitioner. "
        "Each item includes `id` — use it to remove a specific address via "
        "`DELETE /{practitioner_id}/addresses/{address_id}`."
    ),
    responses={**_SUBRES_ADDRESSES_200, **_ERR_NOT_FOUND},
)
async def list_addresses(
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    items = await practitioner_service.get_addresses(practitioner.practitioner_id)
    plain = [plain_address(a) for a in items]
    if wants_fhir(request):
        fhir = [{"id": a.id, **fhir_address(a)} for a in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.get(
    "/{practitioner_id}/photos",
    operation_id="list_practitioner_photos",
    summary="List all photos for a Practitioner",
    description=(
        "Returns all photo attachments stored for this Practitioner. "
        "Each item includes `id` — use it to remove a specific photo via "
        "`DELETE /{practitioner_id}/photos/{photo_id}`."
    ),
    responses={**_SUBRES_PHOTOS_200, **_ERR_NOT_FOUND},
)
async def list_photos(
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    items = await practitioner_service.get_photos(practitioner.practitioner_id)
    plain = [plain_photo(p) for p in items]
    if wants_fhir(request):
        fhir = [{"id": p.id, **fhir_photo(p)} for p in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.get(
    "/{practitioner_id}/qualifications",
    operation_id="list_practitioner_qualifications",
    summary="List all qualifications for a Practitioner",
    description=(
        "Returns all degrees, certifications, accreditations, and licenses for this Practitioner "
        "(e.g. MD, board certification, NPI, DEA number). "
        "Each qualification includes its nested identifiers and issuing organization reference. "
        "Each item includes `id` — use it to remove a specific qualification via "
        "`DELETE /{practitioner_id}/qualifications/{qualification_id}`."
    ),
    responses={**_SUBRES_QUALIFICATIONS_200, **_ERR_NOT_FOUND},
)
async def list_qualifications(
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    items = await practitioner_service.get_qualifications(practitioner.practitioner_id)
    plain = [plain_qualification(q) for q in items]
    if wants_fhir(request):
        fhir = [{"id": q.id, **fhir_qualification(q)} for q in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.get(
    "/{practitioner_id}/communications",
    operation_id="list_practitioner_communications",
    summary="List all communication languages for a Practitioner",
    description=(
        "Returns all languages this Practitioner can use in patient communication. "
        "Each item includes `id` — use it to remove a specific language entry via "
        "`DELETE /{practitioner_id}/communications/{comm_id}`."
    ),
    responses={**_SUBRES_COMMUNICATIONS_200, **_ERR_NOT_FOUND},
)
async def list_communications(
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    items = await practitioner_service.get_communications(practitioner.practitioner_id)
    plain = [plain_communication(c) for c in items]
    if wants_fhir(request):
        fhir = [{"id": c.id, **fhir_communication(c)} for c in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


# ── Sub-resource DELETEs ──────────────────────────────────────────────────────


@router.delete(
    "/{practitioner_id}/names/{name_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_name",
    summary="Remove a HumanName entry from a Practitioner",
    description=(
        "Permanently deletes a single HumanName entry. "
        "The `name_id` is the `id` returned by `GET /{practitioner_id}/names`. "
        "Returns 404 if the name does not exist or belongs to a different Practitioner."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_name(
    name_id: int,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    deleted = await practitioner_service.delete_name(practitioner.practitioner_id, name_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Name not found")
    return None


@router.delete(
    "/{practitioner_id}/identifiers/{identifier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_identifier",
    summary="Remove a business identifier from a Practitioner",
    description=(
        "Permanently deletes a single business identifier. "
        "The `identifier_id` is the `id` returned by `GET /{practitioner_id}/identifiers`. "
        "Returns 404 if the identifier does not exist or belongs to a different Practitioner."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_identifier(
    identifier_id: int,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    deleted = await practitioner_service.delete_identifier(practitioner.practitioner_id, identifier_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Identifier not found")
    return None


@router.delete(
    "/{practitioner_id}/telecom/{telecom_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_telecom",
    summary="Remove a contact point from a Practitioner",
    description=(
        "Permanently deletes a single contact point (phone, email, etc.). "
        "The `telecom_id` is the `id` returned by `GET /{practitioner_id}/telecom`. "
        "Returns 404 if the contact point does not exist or belongs to a different Practitioner."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_telecom(
    telecom_id: int,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    deleted = await practitioner_service.delete_telecom(practitioner.practitioner_id, telecom_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Telecom not found")
    return None


@router.delete(
    "/{practitioner_id}/addresses/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_address",
    summary="Remove an address from a Practitioner",
    description=(
        "Permanently deletes a single address entry. "
        "The `address_id` is the `id` returned by `GET /{practitioner_id}/addresses`. "
        "Returns 404 if the address does not exist or belongs to a different Practitioner."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_address(
    address_id: int,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    deleted = await practitioner_service.delete_address(practitioner.practitioner_id, address_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Address not found")
    return None


@router.delete(
    "/{practitioner_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_photo",
    summary="Remove a photo from a Practitioner",
    description=(
        "Permanently deletes a single photo attachment. "
        "The `photo_id` is the `id` returned by `GET /{practitioner_id}/photos`. "
        "Returns 404 if the photo does not exist or belongs to a different Practitioner."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_photo(
    photo_id: int,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    deleted = await practitioner_service.delete_photo(practitioner.practitioner_id, photo_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Photo not found")
    return None


@router.delete(
    "/{practitioner_id}/qualifications/{qualification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_qualification",
    summary="Remove a qualification from a Practitioner",
    description=(
        "Permanently deletes a single qualification and all its nested identifiers. "
        "The `qualification_id` is the `id` returned by `GET /{practitioner_id}/qualifications`. "
        "Returns 404 if the qualification does not exist or belongs to a different Practitioner."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_qualification(
    qualification_id: int,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    deleted = await practitioner_service.delete_qualification(practitioner.practitioner_id, qualification_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Qualification not found")
    return None


@router.delete(
    "/{practitioner_id}/communications/{comm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_practitioner_communication",
    summary="Remove a communication language from a Practitioner",
    description=(
        "Permanently deletes a single communication language entry. "
        "The `comm_id` is the `id` returned by `GET /{practitioner_id}/communications`. "
        "Returns 404 if the entry does not exist or belongs to a different Practitioner."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_communication(
    comm_id: int,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    deleted = await practitioner_service.delete_communication(practitioner.practitioner_id, comm_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Communication not found")
    return None


# ── Sub-resource PATCH routes ──────────────────────────────────────────────────


@router.patch(
    "/{practitioner_id}/names/{name_id}",
    operation_id="patch_practitioner_name",
    summary="Update a name entry on a Practitioner",
    description=(
        "Partially updates a single HumanName entry. Only supplied fields are written; omitted fields are left unchanged. "
        "The `name_id` is the `id` returned by `GET /{practitioner_id}/names`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_name(
    name_id: int,
    payload: PractitionerNamePatch,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.patch_name(practitioner.practitioner_id, name_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Name not found on this Practitioner")
    return format_response(practitioner_service._to_fhir(updated), practitioner_service._to_plain(updated), request)


@router.patch(
    "/{practitioner_id}/identifiers/{identifier_id}",
    operation_id="patch_practitioner_identifier",
    summary="Update a business identifier on a Practitioner",
    description=(
        "Partially updates a single business identifier. Only supplied fields are written. "
        "The `identifier_id` is the `id` returned by `GET /{practitioner_id}/identifiers`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_identifier(
    identifier_id: int,
    payload: PractitionerIdentifierPatch,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.patch_identifier(practitioner.practitioner_id, identifier_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Identifier not found on this Practitioner")
    return format_response(practitioner_service._to_fhir(updated), practitioner_service._to_plain(updated), request)


@router.patch(
    "/{practitioner_id}/telecom/{telecom_id}",
    operation_id="patch_practitioner_telecom",
    summary="Update a contact point on a Practitioner",
    description=(
        "Partially updates a single contact point (phone, email, etc.). Only supplied fields are written. "
        "The `telecom_id` is the `id` returned by `GET /{practitioner_id}/telecom`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_telecom(
    telecom_id: int,
    payload: PractitionerTelecomPatch,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.patch_telecom(practitioner.practitioner_id, telecom_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Telecom not found on this Practitioner")
    return format_response(practitioner_service._to_fhir(updated), practitioner_service._to_plain(updated), request)


@router.patch(
    "/{practitioner_id}/addresses/{address_id}",
    operation_id="patch_practitioner_address",
    summary="Update an address on a Practitioner",
    description=(
        "Partially updates a single address entry. Only supplied fields are written. "
        "The `address_id` is the `id` returned by `GET /{practitioner_id}/addresses`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_address(
    address_id: int,
    payload: PractitionerAddressPatch,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.patch_address(practitioner.practitioner_id, address_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Address not found on this Practitioner")
    return format_response(practitioner_service._to_fhir(updated), practitioner_service._to_plain(updated), request)


@router.patch(
    "/{practitioner_id}/photos/{photo_id}",
    operation_id="patch_practitioner_photo",
    summary="Update a photo attachment on a Practitioner",
    description=(
        "Partially updates a single photo attachment. Only supplied fields are written. "
        "The `photo_id` is the `id` returned by `GET /{practitioner_id}/photos`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_photo(
    photo_id: int,
    payload: PractitionerPhotoPatch,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.patch_photo(practitioner.practitioner_id, photo_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Photo not found on this Practitioner")
    return format_response(practitioner_service._to_fhir(updated), practitioner_service._to_plain(updated), request)


@router.patch(
    "/{practitioner_id}/qualifications/{qualification_id}",
    operation_id="patch_practitioner_qualification",
    summary="Update a qualification on a Practitioner",
    description=(
        "Partially updates a single qualification. Only supplied fields are written. "
        "If `identifier` is supplied, all existing qualification identifiers are replaced. "
        "The `qualification_id` is the `id` returned by `GET /{practitioner_id}/qualifications`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_qualification(
    qualification_id: int,
    payload: PractitionerQualificationPatch,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.patch_qualification(practitioner.practitioner_id, qualification_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Qualification not found on this Practitioner")
    return format_response(practitioner_service._to_fhir(updated), practitioner_service._to_plain(updated), request)


@router.patch(
    "/{practitioner_id}/communications/{comm_id}",
    operation_id="patch_practitioner_communication",
    summary="Update a communication language on a Practitioner",
    description=(
        "Partially updates a single communication language entry. Only supplied fields are written. "
        "The `comm_id` is the `id` returned by `GET /{practitioner_id}/communications`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_communication(
    comm_id: int,
    payload: PractitionerCommunicationPatch,
    request: Request,
    practitioner: PractitionerModel = Depends(resolve_practitioner),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
):
    updated = await practitioner_service.patch_communication(practitioner.practitioner_id, comm_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Communication not found on this Practitioner")
    return format_response(practitioner_service._to_fhir(updated), practitioner_service._to_plain(updated), request)
