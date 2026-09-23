"""
HTTP client for the Terminology service.

The terminology service lives at /api/v1/terminology on the fhir-server — a different
base path from the FHIR resources at /api/fhir/v1. It gets its own httpx client
(not the shared FhirClient) for two reasons:
  1. Different base URL — FhirClient is configured against /api/fhir/v1.
  2. Terminology POSTs (lookup, validate) are read-only queries and must NOT
     have `created_by` injected — they are not resource mutations.

This client is stateless and registered as a Singleton in CoreContainer so that
the httpx connection pool is shared and reused across all terminology requests.
"""

import httpx
from fastapi import HTTPException


class TerminologyClient:
    """
    HTTP client for the terminology endpoints on the fhir-server.

    Provides thin wrappers for the five terminology operations exposed by fhir-gql:
      - search:       Full-text concept search
      - concepts:     Value-set concepts bound to a specific FHIR resource field
      - lookup:       Look up a single concept by system + code
      - lookup_batch: Bulk concept lookup
      - validate:     Validate a code against a FHIR resource field binding

    No actor injection, no Accept header threading — terminology is always plain JSON.
    """

    def __init__(self, base_url: str) -> None:
        """
        Initialise the HTTP client pointed at the terminology service base URL.

        Args:
            base_url: Root URL of the terminology service
                      (e.g. http://localhost:8001/api/v1/terminology).
                      All path arguments are appended to this by httpx.
        """
        # Timeout consistent with FhirClient — 10 seconds balances user-facing latency
        # against hanging on slow terminology database queries.
        # follow_redirects=True: same trailing-slash redirect issue as FhirClient —
        # FastAPI emits 307 for paths without trailing slash; httpx must follow them.
        self._http = httpx.AsyncClient(
            base_url=base_url,
            headers={"Content-Type": "application/json"},
            timeout=10.0,
            follow_redirects=True,
        )

    async def _handle(self, r: httpx.Response) -> dict:
        """
        Normalise an httpx response into a dict or raise HTTPException.

        On 4xx/5xx the fhir-server's error detail is forwarded directly so the
        caller receives a meaningful message rather than a generic proxy error.

        Args:
            r: The raw httpx.Response from the terminology service.

        Returns:
            Parsed JSON dict on success.

        Raises:
            HTTPException: With the fhir-server's status code and detail message.
        """
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError:
            try:
                detail = r.json().get("detail", r.text)
            except Exception:
                detail = r.text
            raise HTTPException(status_code=r.status_code, detail=detail)
        return r.json()

    async def search(
        self,
        q: str,
        system: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> dict:
        """
        GET /search — full-text search across all loaded terminology concepts.

        Searches concept display names using PostgreSQL trigram similarity.
        Results are ranked by relevance. Optionally filter by code system URL.

        Args:
            q:       Required search query (e.g. 'diabetes', 'heart attack').
            system:  Optional code system canonical URL to scope the search.
            limit:   Maximum results per page.
            offset:  Records to skip.

        Returns:
            SearchResponse dict: {total, limit, offset, data: [ConceptResponse]}.
        """
        params: dict = {"q": q, "limit": limit, "offset": offset}
        if system is not None:
            params["system"] = system
        r = await self._http.get("/search", params=params)
        return await self._handle(r)

    async def get_concepts_for_field(
        self,
        resource: str,
        field: str,
        q: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """
        GET /concepts — return allowed concepts for a specific FHIR resource field.

        Looks up the value set binding for the given resource.field and returns
        the concepts in that set. Used to populate dropdowns and validate user input.

        Args:
            resource: FHIR resource type, e.g. 'Condition'.
            field:    Field name on that resource, e.g. 'clinicalStatus'.
            q:        Optional full-text search within the value set.
            limit:    Maximum results per page.
            offset:   Records to skip.

        Returns:
            ConceptsForFieldResponse dict with value_set info and matching concepts.
        """
        params: dict = {"resource": resource, "field": field, "limit": limit, "offset": offset}
        if q is not None:
            params["q"] = q
        r = await self._http.get("/concepts", params=params)
        return await self._handle(r)

    async def lookup(self, system: str, code: str) -> dict:
        """
        POST /lookup — look up a single concept by code system URL and code.

        Returns full concept details including display name and definition.
        Returns found=false (not a 404) if the code does not exist, so callers
        can handle unknown codes without catching exceptions.

        Args:
            system: Canonical URL of the code system (e.g. 'http://snomed.info/sct').
            code:   The concept code to look up.

        Returns:
            LookupResult dict: {found, concept?, code_system?}.
        """
        r = await self._http.post("/lookup", json={"system": system, "code": code})
        return await self._handle(r)

    async def lookup_batch(self, items: list[dict]) -> dict:
        """
        POST /lookup-batch — bulk concept lookup in a single round-trip.

        Each item is looked up independently; found=true/false is returned per item.
        Useful for validating multiple codes from a form submission at once.

        Args:
            items: List of {system, code} dicts.

        Returns:
            LookupBatchResponse dict: {results: [LookupResult]}.
        """
        r = await self._http.post("/lookup-batch", json={"items": items})
        return await self._handle(r)

    async def validate(self, resource: str, field: str, system: str, code: str) -> dict:
        """
        POST /validate — validate a code against a FHIR resource field binding.

        Checks whether the given system+code is valid for the specified resource field.
        Respects binding strength: required bindings reject codes outside the value set;
        extensible/preferred bindings return valid=true with a warning message.

        Args:
            resource: FHIR resource type, e.g. 'Condition'.
            field:    Field name, e.g. 'clinicalStatus'.
            system:   Code system canonical URL.
            code:     The code to validate.

        Returns:
            ValidateResponse dict: {valid, in_value_set, binding_strength?, concept?, message}.
        """
        r = await self._http.post(
            "/validate",
            json={"resource": resource, "field": field, "system": system, "code": code},
        )
        return await self._handle(r)

    async def aclose(self) -> None:
        """
        Close the underlying httpx connection pool gracefully.

        Must be called during application shutdown alongside FhirClient.aclose().
        """
        await self._http.aclose()
