"""
Low-level async HTTP client for communicating with the downstream FHIR Server.

This class is the single point of contact between this middleware service and the
FHIR Server that owns all persistence. It wraps httpx.AsyncClient to:
  - Set a shared base URL and Content-Type header on every request.
  - Automatically inject audit fields (created_by / updated_by) into write request
    bodies from the caller's JWT subject so the FHIR Server can record audit trails
    without callers needing to remember to include those fields.
  - Normalise HTTP error responses into FastAPI HTTPExceptions with the status code
    and detail message forwarded from the FHIR Server's own error body.

The client is managed as a Singleton by the DI container (app.di.core.CoreContainer)
so the underlying httpx connection pool is shared and reused across all requests.
`aclose()` must be called during application shutdown to drain the pool cleanly.
"""

import httpx
from fastapi import HTTPException

from app.auth.models import AuthUser


class FhirClient:
    """
    Async HTTP wrapper around the FHIR Server REST API.

    All domain-specific clients (e.g. OrganizationClient) depend on this class to
    perform the actual HTTP calls. This separation keeps FHIR-path knowledge in the
    domain clients while error handling and actor injection live here once.
    """

    def __init__(self, base_url: str):
        """
        Initialise the HTTP client with the FHIR Server base URL.

        Args:
            base_url: Root URL of the FHIR Server (e.g. http://localhost:8001/api/fhir/v1).
                      All path arguments passed to post/get/patch/delete are appended
                      to this base URL by httpx automatically.
        """
        # timeout=10.0 seconds balances user-facing latency with avoiding indefinite
        # hangs if the FHIR Server is slow or unreachable. Adjust if bulk operations
        # are introduced that legitimately take longer.
        # follow_redirects=True: FastAPI routers emit 307 Temporary Redirect when a
        # trailing-slash variant of a URL is requested (e.g. /organizations →
        # /organizations/). Without this flag httpx returns the 307 as-is and the
        # middleware propagates it to the caller instead of following through.
        self._http = httpx.AsyncClient(
            base_url=base_url,
            headers={"Content-Type": "application/json"},
            timeout=10.0,
            follow_redirects=True,
        )

    async def _handle(self, r: httpx.Response) -> dict | None:
        """
        Normalise an httpx response into a Python dict or raise HTTPException.

        Handles three cases:
          1. 204 No Content — successful operation with no body (e.g. DELETE). Returns None.
          2. 4xx/5xx — raises HTTPException with the FHIR Server's status code and
             the `detail` field from its JSON error body (falls back to raw text if
             the body is not valid JSON).
          3. 2xx with body — parses and returns the JSON dict.

        Args:
            r: The raw httpx.Response from the FHIR Server.

        Returns:
            Parsed JSON dict for successful responses with a body, or None for 204.

        Raises:
            HTTPException: Forwarding the FHIR Server's status code and error detail
                to the API consumer. This preserves semantic errors (e.g. 404 Not Found,
                409 Conflict) without re-mapping them at this layer.
        """
        # 204 means success but no body — return None so callers don't try to parse.
        if r.status_code == 204:
            return None
        try:
            # raise_for_status() raises httpx.HTTPStatusError on 4xx/5xx.
            r.raise_for_status()
        except httpx.HTTPStatusError:
            # Forward the FHIR Server's own error detail to the API consumer.
            # Try to extract a `detail` field from the JSON body first; fall back to
            # the raw response text if the body is not valid JSON (e.g. HTML error page).
            try:
                detail = r.json().get("detail", r.text)
            except Exception:
                detail = r.text
            raise HTTPException(status_code=r.status_code, detail=detail)
        return r.json()

    async def post(self, path: str, data: dict, actor: AuthUser, accept: str | None = None, inject_audit: bool = True) -> dict:
        """
        Send a POST (create) request to the FHIR Server.

        Injects actor identity fields into the request body so the FHIR Server
        can record who created the resource without requiring callers to include
        those fields manually in every service call.

        Args:
            path:         FHIR Server endpoint path relative to base_url (e.g. "/organizations").
            data:         Resource payload from the schema's model_dump().
            actor:        Authenticated user performing the operation — only `sub` is used
                          to stamp `created_by`; org/tenant scoping is handled by the FHIR Server.
            accept:       Optional Accept header value forwarded from the client request.
                          When set to "application/fhir+json", the FHIR Server returns the
                          resource in FHIR R4 format instead of plain JSON.
            inject_audit: When True (default), injects `created_by` from actor.sub.
                          Pass False for sub-resource endpoints whose input schemas use
                          extra="forbid" and do not declare a created_by field.

        Returns:
            The newly created resource dict — in FHIR R4 or plain JSON format
            depending on the `accept` value.
        """
        # Inject the audit field unless the caller opts out (e.g. sub-resource schemas
        # that use extra="forbid" and have no created_by field).
        body = {**data, "created_by": actor.sub} if inject_audit else data
        # Forward the Accept header per-request so the FHIR Server applies content
        # negotiation. httpx merges per-request headers with client-level headers.
        extra_headers = {"Accept": accept} if accept else {}
        r = await self._http.post(path, json=body, headers=extra_headers)
        return await self._handle(r)

    async def patch(self, path: str, data: dict, actor: AuthUser, accept: str | None = None, inject_audit: bool = True) -> dict:
        """
        Send a PATCH (partial update) request to the FHIR Server.

        Injects `updated_by` so the FHIR Server can record who last modified the
        resource without callers needing to supply it.

        Args:
            path:         FHIR Server endpoint path including the resource ID.
            data:         Partial payload from the schema's model_dump(exclude_none=True, mode="json").
            actor:        Authenticated user performing the operation.
            accept:       Optional Accept header forwarded from the client request for
                          content negotiation — same semantics as in post().
            inject_audit: When True (default), injects `updated_by` from actor.sub.
                          Pass False for sub-resource endpoints whose input schemas use
                          extra="forbid" and do not declare an updated_by field.

        Returns:
            The updated resource dict in FHIR R4 or plain JSON format.
        """
        body = {**data, "updated_by": actor.sub} if inject_audit else data
        extra_headers = {"Accept": accept} if accept else {}
        r = await self._http.patch(path, json=body, headers=extra_headers)
        return await self._handle(r)

    async def get(self, path: str, params: dict | None = None, accept: str | None = None) -> dict:
        """
        Send a GET request to the FHIR Server.

        No actor injection is needed for reads because the FHIR Server does not
        update audit fields on GET operations.

        Args:
            path:   FHIR Server endpoint path (resource collection or specific resource).
            params: Optional query parameters dict (e.g. {"name": "Acme", "limit": 10}).
            accept: Optional Accept header forwarded from the client request.
                    When "application/fhir+json", the FHIR Server returns FHIR R4 format.
                    Omit (or pass None) for internal calls that always need plain JSON
                    (e.g. duplicate-detection pre-checks in the service layer).

        Returns:
            The resource or paginated collection dict from the FHIR Server, in the
            format determined by the `accept` value.
        """
        extra_headers = {"Accept": accept} if accept else {}
        r = await self._http.get(path, params=params, headers=extra_headers)
        return await self._handle(r)

    async def delete(self, path: str) -> None:
        """
        Send a DELETE request to the FHIR Server.

        The FHIR Server returns 204 on success; _handle() converts that to None
        which this method discards, so callers simply await without checking a return.

        Args:
            path: FHIR Server endpoint path including the resource ID to delete.
        """
        r = await self._http.delete(path)
        await self._handle(r)

    async def aclose(self) -> None:
        """
        Close the underlying httpx connection pool gracefully.

        Must be called during application shutdown (app.main lifespan teardown)
        to allow in-flight requests to complete and release socket resources.
        Failing to call this leaks file descriptors and may cause ResourceWarning
        in test environments.
        """
        await self._http.aclose()
