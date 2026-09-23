from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app.deps.patient_deps import resolve_patient
from app.core.content_negotiation import format_response, format_paginated_response, wants_fhir
from app.core.schema_utils import inline_schema
from app.di.dependencies.patient import get_patient_service
from app.models.patient.patient import PatientModel
from app.schemas.fhir import (
    FHIRPatientBundle,
    FHIRPatientSchema,
    PaginatedPatientResponse,
    PlainPatientResponse,
    PatientNamesListResponse,
    PatientIdentifiersListResponse,
    PatientTelecomListResponse,
    PatientAddressesListResponse,
    PatientPhotosListResponse,
    PatientContactsListResponse,
    PatientCommunicationsListResponse,
    PatientGeneralPractitionersListResponse,
    PatientLinksListResponse,
    FHIRPatientNamesListResponse,
    FHIRPatientIdentifiersListResponse,
    FHIRPatientTelecomListResponse,
    FHIRPatientAddressesListResponse,
    FHIRPatientPhotosListResponse,
    FHIRPatientContactsListResponse,
    FHIRPatientCommunicationsListResponse,
    FHIRPatientGeneralPractitionersListResponse,
    FHIRPatientLinksListResponse,
)
from app.schemas.resources import (
    PatientCreateSchema,
    PatientFullCreateSchema,
    PatientPatchSchema,
    PatientFullPatchSchema,
    NameCreate,
    NamePatch,
    IdentifierCreate,
    IdentifierPatch,
    TelecomCreate,
    TelecomPatch,
    AddressCreate,
    AddressPatch,
    PhotoCreate,
    PhotoPatch,
    ContactCreate,
    ContactPatch,
    CommunicationCreate,
    CommunicationPatch,
    GeneralPractitionerCreate,
    GeneralPractitionerPatch,
    LinkCreate,
    LinkPatch,
)
from app.fhir.datatypes import (
    fhir_human_name, fhir_identifier, fhir_telecom, fhir_address,
    fhir_photo, fhir_communication, plain_name, plain_identifier, plain_telecom,
    plain_address, plain_photo, plain_communication,
)
from app.fhir.mappers.patient import (
    fhir_contact, fhir_general_practitioner, fhir_link,
    plain_contact, plain_general_practitioner, plain_link,
)
from app.services.patient_service import PatientService

router = APIRouter()


_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "Patient not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainPatientResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRPatientSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of patients",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedPatientResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRPatientBundle.model_json_schema())},
        },
    }
}

_SUBRES_NAMES_200 = {200: {"description": "List of HumanName entries", "content": {
    "application/json": {"schema": inline_schema(PatientNamesListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientNamesListResponse.model_json_schema())},
}}}
_SUBRES_IDENTIFIERS_200 = {200: {"description": "List of business identifiers", "content": {
    "application/json": {"schema": inline_schema(PatientIdentifiersListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientIdentifiersListResponse.model_json_schema())},
}}}
_SUBRES_TELECOM_200 = {200: {"description": "List of contact points", "content": {
    "application/json": {"schema": inline_schema(PatientTelecomListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientTelecomListResponse.model_json_schema())},
}}}
_SUBRES_ADDRESSES_200 = {200: {"description": "List of addresses", "content": {
    "application/json": {"schema": inline_schema(PatientAddressesListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientAddressesListResponse.model_json_schema())},
}}}
_SUBRES_PHOTOS_200 = {200: {"description": "List of photo attachments", "content": {
    "application/json": {"schema": inline_schema(PatientPhotosListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientPhotosListResponse.model_json_schema())},
}}}
_SUBRES_CONTACTS_200 = {200: {"description": "List of contacts (next-of-kin / guardian)", "content": {
    "application/json": {"schema": inline_schema(PatientContactsListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientContactsListResponse.model_json_schema())},
}}}
_SUBRES_COMMUNICATIONS_200 = {200: {"description": "List of communication language entries", "content": {
    "application/json": {"schema": inline_schema(PatientCommunicationsListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientCommunicationsListResponse.model_json_schema())},
}}}
_SUBRES_GPS_200 = {200: {"description": "List of general practitioner references", "content": {
    "application/json": {"schema": inline_schema(PatientGeneralPractitionersListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientGeneralPractitionersListResponse.model_json_schema())},
}}}
_SUBRES_LINKS_200 = {200: {"description": "List of patient link entries", "content": {
    "application/json": {"schema": inline_schema(PatientLinksListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientLinksListResponse.model_json_schema())},
}}}


# ── Create ─────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_patient",
    summary="Create a new Patient resource",
    description=(
        "Creates a Patient with core demographic scalar fields (gender, birth date, active status, "
        "marital status, deceased, managing organization). "
        "Names, identifiers, telecom, addresses, photos, contacts, communications, "
        "general practitioners, and links must be added via the dedicated sub-resource endpoints. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_patient(
    payload: PatientCreateSchema,
    request: Request,
    patient_service: PatientService = Depends(get_patient_service),
):
    created_by = payload.created_by
    patient = await patient_service.create_patient(payload, payload.user_id, payload.org_id, created_by)
    return format_response(patient_service._to_fhir(patient), patient_service._to_plain(patient), request)


@router.post(
    "/full",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_patient_full",
    summary="Create a Patient resource with all sub-resources in one request",
    description=(
        "Creates a Patient and any combination of sub-resources (names, identifiers, telecom, "
        "addresses, photos, contacts, communications, general practitioners, links) atomically "
        "in a single DB transaction — if any insert fails the entire request rolls back. "
        "All sub-resource lists are optional; omit any to skip those sub-resources. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_patient_full(
    payload: PatientFullCreateSchema,
    request: Request,
    patient_service: PatientService = Depends(get_patient_service),
):
    patient = await patient_service.create_patient_full(
        payload, payload.user_id, payload.org_id, payload.created_by
    )
    return format_response(patient_service._to_fhir(patient), patient_service._to_plain(patient), request)



@router.get(
    "/{patient_id}",
    operation_id="get_patient_by_id",
    summary="Retrieve a Patient resource by public patient_id",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND},
)
async def get_patient(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    return format_response(patient_service._to_fhir(patient), patient_service._to_plain(patient), request)


# ── Patch ──────────────────────────────────────────────────────────────────────


@router.patch(
    "/{patient_id}",
    operation_id="patch_patient",
    summary="Partially update a Patient resource",
    description=(
        "Only supplied fields are written; omitted fields are left unchanged. "
        "Patchable scalar fields: gender, birth_date, active, deceased, marital status, "
        "multiple birth, managing organization. "
        "To modify sub-resources (names, identifiers, etc.) use the dedicated endpoints. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_patient(
    payload: PatientPatchSchema,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated_by = payload.updated_by
    updated = await patient_service.patch_patient(patient.patient_id, payload, updated_by)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/full",
    operation_id="patch_patient_full",
    summary="Atomically update a Patient and replace any sub-resource lists in one request",
    description=(
        "Patches a Patient's scalar fields (same semantics as `PATCH /{patient_id}`) AND "
        "replaces sub-resource lists atomically in a single DB transaction. "
        "For each list that is **provided** (even `[]`): all existing rows are deleted and the "
        "new items are inserted. Lists that are **omitted** (null / not in body) are left untouched. "
        "Contacts with nested relationship / telecom grandchildren are handled correctly. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_patient_full(
    payload: PatientFullPatchSchema,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_patient_full(patient.patient_id, payload, payload.updated_by)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── List ───────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_patients",
    summary="List all Patient resources",
    description=(
        "Returns a paginated list of Patient resources. "
        "Filter by `family_name` or `given_name` (searches across the patient_name table), "
        "`gender`, `active`, `user_id`, or `org_id`. "
        + _CONTENT_NEG
    ),
    responses={**_LIST_200},
)
async def list_patients(
    request: Request,
    family_name: Optional[str] = Query(None, description="Filter by family (last) name — partial match."),
    given_name: Optional[str] = Query(None, description="Filter by given name — partial match."),
    gender: Optional[str] = Query(None, description="male|female|other|unknown"),
    active: Optional[bool] = Query(None),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    patient_service: PatientService = Depends(get_patient_service),
):
    patients, total = await patient_service.list_patients(
        user_id=user_id, org_id=org_id, family_name=family_name,
        given_name=given_name, gender=gender, active=active,
        limit=limit, offset=offset,
    )
    return format_paginated_response(
        [patient_service._to_fhir(p) for p in patients],
        [patient_service._to_plain(p) for p in patients],
        total, limit, offset, request,
    )


# ── Delete ─────────────────────────────────────────────────────────────────────


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient",
    summary="Delete a Patient resource",
    description="Permanently deletes the Patient and all associated sub-resources. Returns 204 on success.",
    responses={**_ERR_NOT_FOUND},
)
async def delete_patient(
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    await patient_service.delete_patient(patient.patient_id)
    return None


# ── Sub-resource: Names ────────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/names",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_name",
    summary="Add a name to a Patient",
    description=(
        "Appends a HumanName record to the Patient. "
        "`use` values: usual|official|temp|nickname|anonymous|old|maiden. "
        "`given`, `prefix`, `suffix` accept lists of strings. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_name(
    payload: NameCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_name(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: Identifiers ──────────────────────────────────────────────────


@router.post(
    "/{patient_id}/identifiers",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_identifier",
    summary="Add an identifier to a Patient",
    description=(
        "Appends a business identifier (e.g. MRN, SSN, passport). "
        "`system` is a URI namespace; `value` is the identifier string within that namespace. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_identifier(
    payload: IdentifierCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_identifier(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: Telecom ──────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/telecom",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_telecom",
    summary="Add a contact point (telecom) to a Patient",
    description=(
        "Appends a contact point. `system`: phone|fax|email|pager|url|sms|other. "
        "`use`: home|work|temp|old|mobile. `rank`: preferred order (1 = highest). "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_telecom(
    payload: TelecomCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_telecom(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: Addresses ────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/addresses",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_address",
    summary="Add an address to a Patient",
    description=(
        "Appends an address. `use`: home|work|temp|old|billing. `type`: postal|physical|both. "
        "`line` accepts a list of address lines. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_address(
    payload: AddressCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_address(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: Photos ───────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/photos",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_photo",
    summary="Add a photo (Attachment) to a Patient",
    description=(
        "Appends a photo attachment. Provide either `url` (external link) or "
        "`data` (base64-encoded binary). `content_type` is a MIME type (e.g. image/png). "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_photo(
    payload: PhotoCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_photo(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: Contacts ─────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/contacts",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_contact",
    summary="Add a contact (next-of-kin / guardian) to a Patient",
    description=(
        "Appends a contact BackboneElement. Accepts flattened name and address fields, "
        "plus nested `relationship[]` and `telecom[]` arrays. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_contact(
    payload: ContactCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_contact(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: Communications ──────────────────────────────────────────────


@router.post(
    "/{patient_id}/communications",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_communication",
    summary="Add a communication language to a Patient",
    description=(
        "Appends a preferred communication language. `language_code` is an ISO-639-1 code (e.g. en, fr). "
        "Set `preferred: true` to mark this as the patient's primary language. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_communication(
    payload: CommunicationCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_communication(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: General Practitioners ───────────────────────────────────────


@router.post(
    "/{patient_id}/general-practitioners",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_general_practitioner",
    summary="Add a general practitioner reference to a Patient",
    description=(
        "Appends a reference to the patient's nominated primary care provider. "
        "`reference_type`: Organization|Practitioner|PractitionerRole. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_general_practitioner(
    payload: GeneralPractitionerCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_general_practitioner(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: Links ────────────────────────────────────────────────────────


@router.post(
    "/{patient_id}/links",
    status_code=status.HTTP_201_CREATED,
    operation_id="add_patient_link",
    summary="Add a link to a related Patient or RelatedPerson",
    description=(
        "`other_type`: Patient|RelatedPerson. "
        "`type`: replaced-by|replaces|refer|seealso. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_201, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def add_link(
    payload: LinkCreate,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.add_link(patient.patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


# ── Sub-resource: Names — GET + DELETE ────────────────────────────────────────


@router.get(
    "/{patient_id}/names",
    operation_id="list_patient_names",
    summary="List all names for a Patient",
    description=(
        "Returns all HumanName entries attached to this Patient. "
        "Each item includes `id` — use it to remove a specific name via "
        "`DELETE /{patient_id}/names/{name_id}`."
    ),
    responses={**_SUBRES_NAMES_200, **_ERR_NOT_FOUND},
)
async def list_names(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_names(patient.patient_id)
    plain = [plain_name(n) for n in items]
    if wants_fhir(request):
        fhir = [{"id": n.id, **fhir_human_name(n)} for n in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/names/{name_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_name",
    summary="Remove a name entry from a Patient",
    description=(
        "Permanently deletes a single HumanName entry. "
        "The `name_id` is the `id` returned by `GET /{patient_id}/names`. "
        "Returns 404 if the name does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_name(
    name_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_name(patient.patient_id, name_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Name not found on this Patient")
    return None


# ── Sub-resource: Identifiers — GET + DELETE ──────────────────────────────────


@router.get(
    "/{patient_id}/identifiers",
    operation_id="list_patient_identifiers",
    summary="List all business identifiers for a Patient",
    description=(
        "Returns all business identifiers (e.g. MRN, social security, passport) attached to this Patient. "
        "Each item includes `id` — use it to remove a specific identifier via "
        "`DELETE /{patient_id}/identifiers/{identifier_id}`."
    ),
    responses={**_SUBRES_IDENTIFIERS_200, **_ERR_NOT_FOUND},
)
async def list_identifiers(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_identifiers(patient.patient_id)
    plain = [plain_identifier(i) for i in items]
    if wants_fhir(request):
        fhir = [{"id": i.id, **fhir_identifier(i)} for i in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/identifiers/{identifier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_identifier",
    summary="Remove a business identifier from a Patient",
    description=(
        "Permanently deletes a single business identifier. "
        "The `identifier_id` is the `id` returned by `GET /{patient_id}/identifiers`. "
        "Returns 404 if the identifier does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_identifier(
    identifier_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_identifier(patient.patient_id, identifier_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Identifier not found on this Patient")
    return None


# ── Sub-resource: Telecom — GET + DELETE ──────────────────────────────────────


@router.get(
    "/{patient_id}/telecom",
    operation_id="list_patient_telecom",
    summary="List all contact points (telecom) for a Patient",
    description=(
        "Returns all contact points (phone, email, fax, etc.) attached to this Patient. "
        "Each item includes `id` — use it to remove a specific contact point via "
        "`DELETE /{patient_id}/telecom/{telecom_id}`."
    ),
    responses={**_SUBRES_TELECOM_200, **_ERR_NOT_FOUND},
)
async def list_telecom(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_telecoms(patient.patient_id)
    plain = [plain_telecom(t) for t in items]
    if wants_fhir(request):
        fhir = [{"id": t.id, **fhir_telecom(t)} for t in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/telecom/{telecom_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_telecom",
    summary="Remove a contact point from a Patient",
    description=(
        "Permanently deletes a single contact point (phone, email, etc.). "
        "The `telecom_id` is the `id` returned by `GET /{patient_id}/telecom`. "
        "Returns 404 if the contact point does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_telecom(
    telecom_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_telecom(patient.patient_id, telecom_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Telecom not found on this Patient")
    return None


# ── Sub-resource: Addresses — GET + DELETE ────────────────────────────────────


@router.get(
    "/{patient_id}/addresses",
    operation_id="list_patient_addresses",
    summary="List all addresses for a Patient",
    description=(
        "Returns all postal and physical addresses attached to this Patient. "
        "Each item includes `id` — use it to remove a specific address via "
        "`DELETE /{patient_id}/addresses/{address_id}`."
    ),
    responses={**_SUBRES_ADDRESSES_200, **_ERR_NOT_FOUND},
)
async def list_addresses(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_addresses(patient.patient_id)
    plain = [plain_address(a) for a in items]
    if wants_fhir(request):
        fhir = [{"id": a.id, **fhir_address(a)} for a in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/addresses/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_address",
    summary="Remove an address from a Patient",
    description=(
        "Permanently deletes a single address entry. "
        "The `address_id` is the `id` returned by `GET /{patient_id}/addresses`. "
        "Returns 404 if the address does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_address(
    address_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_address(patient.patient_id, address_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Address not found on this Patient")
    return None


# ── Sub-resource: Photos — GET + DELETE ───────────────────────────────────────


@router.get(
    "/{patient_id}/photos",
    operation_id="list_patient_photos",
    summary="List all photos (Attachments) for a Patient",
    description=(
        "Returns all photo attachments stored for this Patient. "
        "Each item includes `id` — use it to remove a specific photo via "
        "`DELETE /{patient_id}/photos/{photo_id}`."
    ),
    responses={**_SUBRES_PHOTOS_200, **_ERR_NOT_FOUND},
)
async def list_photos(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_photos(patient.patient_id)
    plain = [plain_photo(p) for p in items]
    if wants_fhir(request):
        fhir = [{"id": p.id, **fhir_photo(p)} for p in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_photo",
    summary="Remove a photo from a Patient",
    description=(
        "Permanently deletes a single photo attachment. "
        "The `photo_id` is the `id` returned by `GET /{patient_id}/photos`. "
        "Returns 404 if the photo does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_photo(
    photo_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_photo(patient.patient_id, photo_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Photo not found on this Patient")
    return None


# ── Sub-resource: Contacts — GET + DELETE ─────────────────────────────────────


@router.get(
    "/{patient_id}/contacts",
    operation_id="list_patient_contacts",
    summary="List all contacts (next-of-kin / guardian) for a Patient",
    description=(
        "Returns all contact BackboneElements (next-of-kin, guardians, emergency contacts) for this Patient. "
        "Each item includes `id` — use it to remove a specific contact via "
        "`DELETE /{patient_id}/contacts/{contact_id}`."
    ),
    responses={**_SUBRES_CONTACTS_200, **_ERR_NOT_FOUND},
)
async def list_contacts(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_contacts(patient.patient_id)
    plain = [plain_contact(c) for c in items]
    if wants_fhir(request):
        fhir = [{"id": c.id, **fhir_contact(c)} for c in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_contact",
    summary="Remove a contact entry from a Patient",
    description=(
        "Permanently deletes a single contact (next-of-kin, guardian, emergency contact). "
        "The `contact_id` is the `id` returned by `GET /{patient_id}/contacts`. "
        "Cascades to all nested relationship, telecom, additional name, and additional address rows. "
        "Returns 404 if the contact does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_contact(
    contact_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_contact(patient.patient_id, contact_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contact not found on this Patient")
    return None


# ── Sub-resource: Communications — GET + DELETE ───────────────────────────────


@router.get(
    "/{patient_id}/communications",
    operation_id="list_patient_communications",
    summary="List all communication languages for a Patient",
    description=(
        "Returns all preferred communication language entries for this Patient. "
        "Each item includes `id` — use it to remove a specific language via "
        "`DELETE /{patient_id}/communications/{comm_id}`."
    ),
    responses={**_SUBRES_COMMUNICATIONS_200, **_ERR_NOT_FOUND},
)
async def list_communications(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_communications(patient.patient_id)
    plain = [plain_communication(cm) for cm in items]
    if wants_fhir(request):
        fhir = [{"id": cm.id, **fhir_communication(cm)} for cm in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/communications/{comm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_communication",
    summary="Remove a communication language from a Patient",
    description=(
        "Permanently deletes a single communication language entry. "
        "The `comm_id` is the `id` returned by `GET /{patient_id}/communications`. "
        "Returns 404 if the entry does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_communication(
    comm_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_communication(patient.patient_id, comm_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Communication not found on this Patient")
    return None


# ── Sub-resource: General Practitioners — GET + DELETE ────────────────────────


@router.get(
    "/{patient_id}/general-practitioners",
    operation_id="list_patient_general_practitioners",
    summary="List all general practitioner references for a Patient",
    description=(
        "Returns all nominated primary care provider references for this Patient. "
        "Reference types: Organization, Practitioner, PractitionerRole. "
        "Each item includes `id` — use it to remove a specific reference via "
        "`DELETE /{patient_id}/general-practitioners/{gp_id}`."
    ),
    responses={**_SUBRES_GPS_200, **_ERR_NOT_FOUND},
)
async def list_general_practitioners(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_general_practitioners(patient.patient_id)
    plain = [plain_general_practitioner(gp) for gp in items]
    if wants_fhir(request):
        fhir = [{"id": gp.id, **fhir_general_practitioner(gp)} for gp in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/general-practitioners/{gp_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_general_practitioner",
    summary="Remove a general practitioner reference from a Patient",
    description=(
        "Permanently deletes a single general practitioner reference. "
        "The `gp_id` is the `id` returned by `GET /{patient_id}/general-practitioners`. "
        "Returns 404 if the reference does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_general_practitioner(
    gp_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_general_practitioner(patient.patient_id, gp_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="General practitioner not found on this Patient")
    return None


# ── Sub-resource: Links — GET + DELETE ────────────────────────────────────────


@router.get(
    "/{patient_id}/links",
    operation_id="list_patient_links",
    summary="List all patient links for a Patient",
    description=(
        "Returns all links to related Patient or RelatedPerson resources. "
        "Link types: replaced-by | replaces | refer | seealso. "
        "Each item includes `id` — use it to remove a specific link via "
        "`DELETE /{patient_id}/links/{link_id}`."
    ),
    responses={**_SUBRES_LINKS_200, **_ERR_NOT_FOUND},
)
async def list_links(
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    items = await patient_service.get_links(patient.patient_id)
    plain = [plain_link(lk) for lk in items]
    if wants_fhir(request):
        fhir = [{"id": lk.id, **fhir_link(lk)} for lk in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})


@router.delete(
    "/{patient_id}/links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_patient_link",
    summary="Remove a link from a Patient",
    description=(
        "Permanently deletes a single patient link entry. "
        "The `link_id` is the `id` returned by `GET /{patient_id}/links`. "
        "Returns 404 if the link does not exist or belongs to a different Patient."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_link(
    link_id: int,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    deleted = await patient_service.delete_link(patient.patient_id, link_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Link not found on this Patient")
    return None


# ── Sub-resource PATCH routes ──────────────────────────────────────────────────


@router.patch(
    "/{patient_id}/names/{name_id}",
    operation_id="patch_patient_name",
    summary="Update a name entry on a Patient",
    description=(
        "Partially updates a single HumanName entry. Only supplied fields are written; omitted fields are left unchanged. "
        "The `name_id` is the `id` returned by `GET /{patient_id}/names`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_name(
    name_id: int,
    payload: NamePatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_name(patient.patient_id, name_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Name not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/identifiers/{identifier_id}",
    operation_id="patch_patient_identifier",
    summary="Update a business identifier on a Patient",
    description=(
        "Partially updates a single business identifier. Only supplied fields are written. "
        "The `identifier_id` is the `id` returned by `GET /{patient_id}/identifiers`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_identifier(
    identifier_id: int,
    payload: IdentifierPatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_identifier(patient.patient_id, identifier_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Identifier not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/telecom/{telecom_id}",
    operation_id="patch_patient_telecom",
    summary="Update a contact point on a Patient",
    description=(
        "Partially updates a single contact point (phone, email, etc.). Only supplied fields are written. "
        "The `telecom_id` is the `id` returned by `GET /{patient_id}/telecom`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_telecom(
    telecom_id: int,
    payload: TelecomPatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_telecom(patient.patient_id, telecom_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Telecom not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/addresses/{address_id}",
    operation_id="patch_patient_address",
    summary="Update an address on a Patient",
    description=(
        "Partially updates a single address entry. Only supplied fields are written. "
        "The `address_id` is the `id` returned by `GET /{patient_id}/addresses`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_address(
    address_id: int,
    payload: AddressPatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_address(patient.patient_id, address_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Address not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/photos/{photo_id}",
    operation_id="patch_patient_photo",
    summary="Update a photo attachment on a Patient",
    description=(
        "Partially updates a single photo attachment. Only supplied fields are written. "
        "The `photo_id` is the `id` returned by `GET /{patient_id}/photos`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_photo(
    photo_id: int,
    payload: PhotoPatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_photo(patient.patient_id, photo_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Photo not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/contacts/{contact_id}",
    operation_id="patch_patient_contact",
    summary="Update a contact entry on a Patient",
    description=(
        "Partially updates a single contact (next-of-kin / guardian). Only supplied fields are written. "
        "If `relationship` is supplied, all existing relationship entries are replaced. "
        "If `telecom` is supplied, all existing contact telecoms are replaced. "
        "The `contact_id` is the `id` returned by `GET /{patient_id}/contacts`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_contact(
    contact_id: int,
    payload: ContactPatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_contact(patient.patient_id, contact_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Contact not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/communications/{comm_id}",
    operation_id="patch_patient_communication",
    summary="Update a communication language on a Patient",
    description=(
        "Partially updates a single communication language entry. Only supplied fields are written. "
        "The `comm_id` is the `id` returned by `GET /{patient_id}/communications`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_communication(
    comm_id: int,
    payload: CommunicationPatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_communication(patient.patient_id, comm_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Communication not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/general-practitioners/{gp_id}",
    operation_id="patch_patient_general_practitioner",
    summary="Update a general practitioner reference on a Patient",
    description=(
        "Partially updates a single general practitioner reference. Only supplied fields are written. "
        "The `gp_id` is the `id` returned by `GET /{patient_id}/general-practitioners`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_general_practitioner(
    gp_id: int,
    payload: GeneralPractitionerPatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_general_practitioner(patient.patient_id, gp_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="General practitioner not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)


@router.patch(
    "/{patient_id}/links/{link_id}",
    operation_id="patch_patient_link",
    summary="Update a link entry on a Patient",
    description=(
        "Partially updates a single patient link. Only supplied fields are written. "
        "The `link_id` is the `id` returned by `GET /{patient_id}/links`. "
        + _CONTENT_NEG
    ),
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_link(
    link_id: int,
    payload: LinkPatch,
    request: Request,
    patient: PatientModel = Depends(resolve_patient),
    patient_service: PatientService = Depends(get_patient_service),
):
    updated = await patient_service.patch_link(patient.patient_id, link_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Link not found on this Patient")
    return format_response(patient_service._to_fhir(updated), patient_service._to_plain(updated), request)
