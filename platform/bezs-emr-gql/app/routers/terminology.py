"""
Router for the Terminology proxy endpoints.

This router proxies the five terminology endpoints exposed by the fhir-server:

  GET  /terminology/search         — full-text concept search (trigram similarity)
  GET  /terminology/concepts       — value-set concepts bound to a FHIR resource field
  POST /terminology/lookup         — look up a single concept by system + code
  POST /terminology/lookup-batch   — bulk concept lookup in one round-trip
  POST /terminology/validate       — validate a code against a FHIR field binding

All five endpoints are read-only (no mutations), so they all use the "read" action
for RBAC and never stamp created_by / updated_by. No FHIR content negotiation —
terminology is always plain JSON, never application/fhir+json.

The router is mounted at /api/v1/terminology (not inside the /api/fhir/v1 FHIR
namespace) because terminology is a shared clinical knowledge service, not a
FHIR resource endpoint.
"""

from typing import Optional

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from app.auth.rbac import require_permission
from app.di.dependencies.terminology import get_terminology_client
from app.fhir_client.terminology import TerminologyClient
from app.schemas.terminology import (
    ConceptsForFieldResponse,
    LookupBatchRequest,
    LookupBatchResponse,
    LookupRequest,
    LookupResult,
    SearchResponse,
    ValidateRequest,
    ValidateResponse,
)

router = APIRouter(prefix="/terminology", tags=["Terminology"])

# ── Shared error response docs ─────────────────────────────────────────────────

# 404 is returned by fhir-server when the requested code system or field binding
# does not exist in the loaded terminology data.
_ERR_NOT_FOUND = {404: {"description": "Code system, value set, or field binding not found"}}

# 422 is returned when required query parameters are missing or malformed.
_ERR_VALIDATION = {422: {"description": "Validation error — missing or invalid parameters"}}

# ── Search ─────────────────────────────────────────────────────────────────────


@router.get(
    "/search",
    operation_id="terminology_search",
    summary="Search terminology concepts",
    description=(
        "Full-text search across all loaded terminology concepts using PostgreSQL trigram similarity. "
        "Results are ranked by relevance to the query string. "
        "Optionally scope the search to a specific code system via the `system` parameter. "
        "Useful for clinical autocomplete inputs (e.g. 'diab' → 'Diabetes mellitus')."
    ),
    response_model=SearchResponse,
    responses={**_ERR_VALIDATION},
    dependencies=[Depends(require_permission("terminology", "read"))],
    status_code=status.HTTP_200_OK,
)
async def search_concepts(
    q: str,
    system: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    client: TerminologyClient = Depends(get_terminology_client),
) -> JSONResponse:
    """
    Proxy GET /search to the terminology service.

    Args:
        q:      Required search query string (e.g. 'diabetes', 'heart failure').
        system: Optional canonical code system URL to filter results
                (e.g. 'http://snomed.info/sct').
        limit:  Maximum concepts per page (default 20).
        offset: Records to skip for pagination (default 0).
        client: Injected TerminologyClient Singleton.

    Returns:
        JSONResponse with SearchResponse body: {total, limit, offset, data: [ConceptResponse]}.
    """
    data = await client.search(q=q, system=system, limit=limit, offset=offset)
    return JSONResponse(content=data)


# ── Concepts for field ─────────────────────────────────────────────────────────


@router.get(
    "/concepts",
    operation_id="terminology_concepts_for_field",
    summary="Get allowed concepts for a FHIR resource field",
    description=(
        "Returns the value-set concepts bound to a specific field on a FHIR resource. "
        "Use this to populate dropdown menus in clinical forms and to determine which codes "
        "are valid for a given field before submitting a resource. "
        "Optionally filter concepts within the value set using the `q` search parameter. "
        "Example: `?resource=Condition&field=clinicalStatus` returns active, recurrence, "
        "relapse, inactive, remission, resolved."
    ),
    response_model=ConceptsForFieldResponse,
    responses={**_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("terminology", "read"))],
    status_code=status.HTTP_200_OK,
)
async def get_concepts_for_field(
    resource: str,
    field: str,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    client: TerminologyClient = Depends(get_terminology_client),
) -> JSONResponse:
    """
    Proxy GET /concepts to the terminology service.

    Args:
        resource: FHIR resource type (e.g. 'Condition', 'Observation').
        field:    Field name on that resource (e.g. 'clinicalStatus', 'status').
        q:        Optional full-text filter within the bound value set.
        limit:    Maximum concepts per page (default 50).
        offset:   Records to skip for pagination (default 0).
        client:   Injected TerminologyClient Singleton.

    Returns:
        JSONResponse with ConceptsForFieldResponse body including value_set metadata
        and the list of allowed concepts.
    """
    data = await client.get_concepts_for_field(
        resource=resource, field=field, q=q, limit=limit, offset=offset
    )
    return JSONResponse(content=data)


# ── Lookup single ──────────────────────────────────────────────────────────────


@router.post(
    "/lookup",
    operation_id="terminology_lookup",
    summary="Look up a single terminology concept",
    description=(
        "Looks up a single concept by its canonical code system URL and code. "
        "Returns `found: false` (not a 404) when the code does not exist, so callers "
        "can handle unknown codes without catching exceptions. "
        "Returns full concept details — display name, definition, and code system metadata — "
        "when found."
    ),
    response_model=LookupResult,
    responses={**_ERR_VALIDATION},
    dependencies=[Depends(require_permission("terminology", "read"))],
    status_code=status.HTTP_200_OK,
)
async def lookup_concept(
    body: LookupRequest,
    client: TerminologyClient = Depends(get_terminology_client),
) -> JSONResponse:
    """
    Proxy POST /lookup to the terminology service.

    Args:
        body:   LookupRequest with `system` (canonical code system URL) and `code`.
        client: Injected TerminologyClient Singleton.

    Returns:
        JSONResponse with LookupResult body: {found, concept?, code_system?}.
    """
    data = await client.lookup(system=body.system, code=body.code)
    return JSONResponse(content=data)


# ── Lookup batch ───────────────────────────────────────────────────────────────


@router.post(
    "/lookup-batch",
    operation_id="terminology_lookup_batch",
    summary="Bulk concept lookup",
    description=(
        "Look up multiple concepts in a single round-trip. "
        "Each item is resolved independently; per-item `found` flags tell callers "
        "which codes exist without multiple API calls. "
        "Useful for validating all codes in a submitted clinical form at once. "
        "Maximum 100 items per request."
    ),
    response_model=LookupBatchResponse,
    responses={**_ERR_VALIDATION},
    dependencies=[Depends(require_permission("terminology", "read"))],
    status_code=status.HTTP_200_OK,
)
async def lookup_concepts_batch(
    body: LookupBatchRequest,
    client: TerminologyClient = Depends(get_terminology_client),
) -> JSONResponse:
    """
    Proxy POST /lookup-batch to the terminology service.

    Args:
        body:   LookupBatchRequest with a list of {system, code} items.
        client: Injected TerminologyClient Singleton.

    Returns:
        JSONResponse with LookupBatchResponse body: {results: [LookupResult]},
        results in the same order as the input items.
    """
    items = [item.model_dump() for item in body.items]
    data = await client.lookup_batch(items=items)
    return JSONResponse(content=data)


# ── Validate ───────────────────────────────────────────────────────────────────


@router.post(
    "/validate",
    operation_id="terminology_validate",
    summary="Validate a code against a FHIR resource field binding",
    description=(
        "Checks whether a given system+code is acceptable for the specified FHIR resource field. "
        "Respects binding strength: required bindings reject codes outside the value set; "
        "extensible and preferred bindings return `valid: true` with an informational message. "
        "Returns `in_value_set` separately from `valid` so callers know whether a code is "
        "literally in the bound value set versus merely tolerated by binding strength."
    ),
    response_model=ValidateResponse,
    responses={**_ERR_NOT_FOUND, **_ERR_VALIDATION},
    dependencies=[Depends(require_permission("terminology", "read"))],
    status_code=status.HTTP_200_OK,
)
async def validate_concept(
    body: ValidateRequest,
    client: TerminologyClient = Depends(get_terminology_client),
) -> JSONResponse:
    """
    Proxy POST /validate to the terminology service.

    Args:
        body:   ValidateRequest with resource, field, system, and code.
        client: Injected TerminologyClient Singleton.

    Returns:
        JSONResponse with ValidateResponse body:
        {valid, in_value_set, binding_strength?, concept?, value_set?, message}.
    """
    data = await client.validate(
        resource=body.resource,
        field=body.field,
        system=body.system,
        code=body.code,
    )
    return JSONResponse(content=data)
