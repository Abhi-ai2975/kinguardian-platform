from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app.core.schema_utils import inline_schema
from app.di.dependencies.terminology import get_terminology_service
from app.schemas.terminology import (
    AddConceptMapRequest,
    AuditLogListResponse,
    CodeSystemListResponse,
    ConceptMapListResponse,
    ConceptsForFieldResponse,
    CreateConceptRequest,
    LookupBatchRequest,
    LookupBatchResponse,
    LookupRequest,
    LookupResult,
    OrgConceptListResponse,
    OrgConceptResponse,
    PatchConceptRequest,
    SearchResponse,
    TranslateRequest,
    TranslateResponse,
    ValidateRequest,
    ValidateResponse,
    ValueSetExpandResponse,
    ValueSetListResponse,
)
from app.services.terminology_service import TerminologyService

router = APIRouter()

_CS_LIST_200 = {200: {"content": {"application/json": {"schema": inline_schema(CodeSystemListResponse.model_json_schema())}}}}
_VS_LIST_200 = {200: {"content": {"application/json": {"schema": inline_schema(ValueSetListResponse.model_json_schema())}}}}
_VS_EXPAND_200 = {200: {"content": {"application/json": {"schema": inline_schema(ValueSetExpandResponse.model_json_schema())}}}}
_SEARCH_200 = {200: {"content": {"application/json": {"schema": inline_schema(SearchResponse.model_json_schema())}}}}
_LOOKUP_200 = {200: {"content": {"application/json": {"schema": inline_schema(LookupResult.model_json_schema())}}}}
_LOOKUP_BATCH_200 = {200: {"content": {"application/json": {"schema": inline_schema(LookupBatchResponse.model_json_schema())}}}}
_CONCEPTS_FIELD_200 = {200: {"content": {"application/json": {"schema": inline_schema(ConceptsForFieldResponse.model_json_schema())}}}}
_VALIDATE_200 = {200: {"content": {"application/json": {"schema": inline_schema(ValidateResponse.model_json_schema())}}}}
_TRANSLATE_200 = {200: {"content": {"application/json": {"schema": inline_schema(TranslateResponse.model_json_schema())}}}}
_CONCEPT_MAPS_200 = {200: {"content": {"application/json": {"schema": inline_schema(ConceptMapListResponse.model_json_schema())}}}}
_ORG_CONCEPT_200 = {200: {"content": {"application/json": {"schema": inline_schema(OrgConceptListResponse.model_json_schema())}}}}
_ORG_CONCEPT_SINGLE_200 = {200: {"content": {"application/json": {"schema": inline_schema(OrgConceptResponse.model_json_schema())}}}}
_AUDIT_LOG_200 = {200: {"content": {"application/json": {"schema": inline_schema(AuditLogListResponse.model_json_schema())}}}}


@router.get(
    "/code-systems",
    operation_id="list_terminology_code_systems",
    summary="List all loaded code systems",
    description="Returns all active terminology code systems loaded in the platform (FHIR R4, ICD-10-CM, LOINC, RxNorm, SNOMED CT).",
    responses=_CS_LIST_200,
    tags=["Terminology"],
)
async def list_code_systems(
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.list_code_systems()
    return JSONResponse(content=result.model_dump())


@router.get(
    "/value-sets",
    operation_id="list_terminology_value_sets",
    summary="List value sets",
    description="Returns paginated value sets. Supports keyword search by name, title, or canonical URL.",
    responses=_VS_LIST_200,
    tags=["Terminology"],
)
async def list_value_sets(
    q: str | None = Query(None, description="Keyword filter on name, title, or canonical URL"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.list_value_sets(q, limit, offset)
    return JSONResponse(content=result.model_dump())


@router.get(
    "/value-sets/{value_set_id}/expand",
    operation_id="expand_terminology_value_set",
    summary="Expand a value set",
    description="Returns the paginated list of concepts belonging to a value set. Supports optional full-text search within the set.",
    responses={**_VS_EXPAND_200, 404: {"description": "Value set not found"}},
    tags=["Terminology"],
)
async def expand_value_set(
    value_set_id: int,
    q: str | None = Query(None, description="Full-text search within the value set"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.expand_value_set(value_set_id, q, limit, offset)
    if result is None:
        raise HTTPException(status_code=404, detail="Value set not found")
    return JSONResponse(content=result.model_dump())


@router.get(
    "/search",
    operation_id="search_terminology_concepts",
    summary="Full-text search across all concepts",
    description=(
        "Searches concept display names using PostgreSQL trigram similarity. "
        "Results are ranked by relevance. Optionally filter by code system canonical URL."
    ),
    responses=_SEARCH_200,
    tags=["Terminology"],
)
async def search_concepts(
    q: str = Query(..., description="Search query, e.g. 'diabetes' or 'heart attack'"),
    system: str | None = Query(
        None,
        description="Filter by code system canonical URL, e.g. 'http://snomed.info/sct'",
    ),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.search_concepts(q, system, limit, offset)
    return JSONResponse(content=result.model_dump())


@router.post(
    "/lookup",
    operation_id="lookup_terminology_concept",
    summary="Look up a concept by system and code",
    description="Returns full concept details for a given code system URL and code. Returns found=false if the code does not exist.",
    responses=_LOOKUP_200,
    tags=["Terminology"],
)
async def lookup_concept(
    body: LookupRequest,
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.lookup(body)
    return JSONResponse(content=result.model_dump())


@router.post(
    "/lookup-batch",
    operation_id="lookup_terminology_concepts_batch",
    summary="Bulk concept lookup",
    description="Look up multiple concepts in a single request. Each item returns found=true/false independently.",
    responses=_LOOKUP_BATCH_200,
    tags=["Terminology"],
)
async def lookup_concepts_batch(
    body: LookupBatchRequest,
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.lookup_batch(body)
    return JSONResponse(content=result.model_dump())


@router.get(
    "/concepts",
    operation_id="get_terminology_concepts_for_field",
    summary="Get allowed concepts for a FHIR resource field",
    description=(
        "Returns the value set concepts bound to a specific FHIR resource field. "
        "Used to populate dropdowns and validate user input. "
        "Example: ?resource=Condition&field=clinicalStatus"
    ),
    responses=_CONCEPTS_FIELD_200,
    tags=["Terminology"],
)
async def get_concepts_for_field(
    resource: str = Query(..., description="FHIR resource type, e.g. 'Condition'"),
    field: str = Query(..., description="Field name, e.g. 'clinicalStatus'"),
    q: str | None = Query(None, description="Optional full-text search within the value set"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.get_concepts_for_field(resource, field, q, limit, offset)
    return JSONResponse(content=result.model_dump())


@router.post(
    "/validate",
    operation_id="validate_terminology_code",
    summary="Validate a code against a FHIR resource field binding",
    description=(
        "Checks whether a given system+code is valid for a specific FHIR resource field. "
        "Respects binding strength: required fields reject codes outside the value set, "
        "extensible/preferred fields allow extensions."
    ),
    responses=_VALIDATE_200,
    tags=["Terminology"],
)
async def validate_code(
    body: ValidateRequest,
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.validate(body)
    return JSONResponse(content=result.model_dump())


@router.post(
    "/translate",
    operation_id="translate_terminology_concept",
    summary="Translate a concept to another code system",
    description="Looks up existing cross-system mappings for a given code. Returns all stored translations to the target system.",
    responses=_TRANSLATE_200,
    tags=["Terminology"],
)
async def translate_concept(
    body: TranslateRequest,
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.translate(body)
    return JSONResponse(content=result.model_dump())


@router.get(
    "/concept-maps",
    operation_id="list_concept_maps",
    summary="List cross-system concept mappings",
    description="Returns all stored concept mappings. Optionally filter by source or target code system URL.",
    responses=_CONCEPT_MAPS_200,
    tags=["Terminology"],
)
async def list_concept_maps(
    source_system: str | None = Query(None, description="Filter by source code system canonical URL"),
    target_system: str | None = Query(None, description="Filter by target code system canonical URL"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.list_concept_maps(source_system, target_system, limit, offset)
    return JSONResponse(content=result.model_dump())


@router.post(
    "/concept-maps",
    operation_id="add_concept_map",
    summary="Manually add a concept map entry",
    description="Creates a cross-system mapping between two concepts that are already loaded in the database.",
    responses={
        200: {"content": {"application/json": {"schema": {"type": "object"}}}},
        422: {"description": "Source or target concept not found in DB"},
    },
    tags=["Terminology"],
)
async def add_concept_map(
    body: AddConceptMapRequest,
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.add_concept_map(body)
    return JSONResponse(content=result)


@router.get(
    "/org-concepts",
    operation_id="list_org_concepts",
    summary="List this org's custom terminology concepts",
    description=(
        "Returns all custom concepts created by the organization identified by the X-Org-ID header. "
        "Supports filtering by code system and full-text search."
    ),
    responses=_ORG_CONCEPT_200,
    tags=["Terminology"],
)
async def list_org_concepts(
    request: Request,
    code_system_url: str | None = Query(None, description="Filter by code system canonical URL"),
    q: str | None = Query(None, description="Full-text search"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: TerminologyService = Depends(get_terminology_service),
):
    org_id = request.state.user.get("activeOrganizationId")
    if not org_id:
        raise HTTPException(status_code=403, detail="Organization context required. Pass X-Org-ID header.")
    result = await service.list_org_concepts(org_id, code_system_url, q, limit, offset)
    return JSONResponse(content=result.model_dump())


@router.post(
    "/org-concepts",
    operation_id="create_org_concept",
    summary="Create an org-specific custom concept",
    description=(
        "Adds a custom terminology code scoped to the organization identified by the X-Org-ID header. "
        "The code_system_url must reference an existing code system in the database. "
        "The code must be unique within the org's namespace for that code system."
    ),
    responses={
        201: {"content": {"application/json": {"schema": inline_schema(OrgConceptResponse.model_json_schema())}}},
        403: {"description": "Organization context required (X-Org-ID header missing)"},
        404: {"description": "Code system not found"},
        409: {"description": "Code already exists for this org and code system"},
    },
    tags=["Terminology"],
)
async def create_org_concept(
    body: CreateConceptRequest,
    request: Request,
    service: TerminologyService = Depends(get_terminology_service),
):
    org_id = request.state.user.get("activeOrganizationId")
    user_id = request.state.user.get("sub")
    if not org_id:
        raise HTTPException(status_code=403, detail="Organization context required. Pass X-Org-ID header.")
    try:
        result = await service.create_concept(body, org_id, user_id)
    except Exception as exc:
        if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
            raise HTTPException(
                status_code=409,
                detail=f"Code '{body.code}' already exists for this org in {body.code_system_url}.",
            )
        raise
    if result is None:
        raise HTTPException(status_code=404, detail=f"Code system not found: {body.code_system_url}")
    return JSONResponse(content=result.model_dump(), status_code=201)


@router.get(
    "/org-concepts/{concept_id}",
    operation_id="get_org_concept",
    summary="Get a single org-specific concept",
    description="Returns a custom concept by its database ID. Only returns concepts belonging to the org in X-Org-ID header.",
    responses={**_ORG_CONCEPT_SINGLE_200, 404: {"description": "Concept not found"}},
    tags=["Terminology"],
)
async def get_org_concept(
    concept_id: int,
    request: Request,
    service: TerminologyService = Depends(get_terminology_service),
):
    org_id = request.state.user.get("activeOrganizationId")
    if not org_id:
        raise HTTPException(status_code=403, detail="Organization context required. Pass X-Org-ID header.")
    result = await service.get_org_concept(concept_id, org_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Concept not found.")
    return JSONResponse(content=result.model_dump())


@router.patch(
    "/org-concepts/{concept_id}",
    operation_id="patch_org_concept",
    summary="Update an org-specific concept",
    description="Updates the display name or definition of a custom concept. Only the creating organization can update it.",
    responses={**_ORG_CONCEPT_SINGLE_200, 404: {"description": "Concept not found"}},
    tags=["Terminology"],
)
async def patch_org_concept(
    concept_id: int,
    body: PatchConceptRequest,
    request: Request,
    service: TerminologyService = Depends(get_terminology_service),
):
    org_id = request.state.user.get("activeOrganizationId")
    if not org_id:
        raise HTTPException(status_code=403, detail="Organization context required. Pass X-Org-ID header.")
    result = await service.patch_concept(concept_id, body, org_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Concept not found.")
    return JSONResponse(content=result.model_dump())


@router.delete(
    "/org-concepts/{concept_id}",
    operation_id="delete_org_concept",
    summary="Delete an org-specific concept",
    description="Permanently removes a custom concept. Only the creating organization can delete it.",
    responses={204: {"description": "Deleted"}, 404: {"description": "Concept not found"}},
    tags=["Terminology"],
)
async def delete_org_concept(
    concept_id: int,
    request: Request,
    service: TerminologyService = Depends(get_terminology_service),
):
    org_id = request.state.user.get("activeOrganizationId")
    if not org_id:
        raise HTTPException(status_code=403, detail="Organization context required. Pass X-Org-ID header.")
    deleted = await service.delete_concept(concept_id, org_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Concept not found.")
    from fastapi.responses import Response
    return Response(status_code=204)


@router.get(
    "/audit-log",
    operation_id="list_terminology_audit_log",
    summary="List terminology governance audit log",
    description=(
        "Returns a paginated audit trail of all org-concept changes. "
        "Filterable by action (org_concept.created, org_concept.updated, org_concept.deleted), "
        "performer (user sub), or specific concept ID."
    ),
    responses=_AUDIT_LOG_200,
    tags=["Terminology"],
)
async def list_audit_log(
    action: str | None = Query(None, description="Filter by action type, e.g. 'org_concept.created'"),
    performed_by: str | None = Query(None, description="Filter by user sub who performed the action"),
    concept_id: int | None = Query(None, description="Filter by concept ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    service: TerminologyService = Depends(get_terminology_service),
):
    result = await service.list_audit_log(action, performed_by, concept_id, limit, offset)
    return JSONResponse(content=result.model_dump())
