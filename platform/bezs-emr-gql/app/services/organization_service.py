"""
Business logic service for FHIR Organisation resources.

This service is the authoritative home for all business rules applied to Organisation
operations before they are forwarded to the FHIR Server. It sits between the API
route handlers and the OrganizationClient, ensuring that:
  - Duplicate organisation names are rejected before creating (409 Conflict).
  - PATCH requests with an empty payload are rejected early (422) instead of sending
    a no-op update to the FHIR Server.
  - The caller's JWT subject (`sub`) is stamped as `created_by` / `updated_by` on every write.

The service never accesses the database directly; all persistence is delegated to
the FHIR Server via OrganizationClient.

Content negotiation:
    Each method accepts an optional `accept` parameter that is forwarded to
    OrganizationClient, which in turn forwards it to FhirClient as the HTTP Accept
    header. The FHIR Server uses this to decide whether to return plain JSON or
    FHIR R4 format. Internal pre-check calls (e.g. the duplicate detection list in
    `register`) never forward `accept` — they always use plain JSON because the
    result is inspected programmatically, not returned to the client.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.organization import OrganizationClient
from app.schemas.organization.input import ListOrgsSchema, MeOrgsSchema, PatchOrgSchema, RegisterOrgSchema


class OrganizationsService:
    """
    Application service for Organisation CRUD use cases.

    Instantiated per-request by the DI container (OrganizationContainer) via
    Factory provider, so it holds no shared state between requests.
    """

    def __init__(self, client: OrganizationClient):
        """
        Args:
            client: The OrganizationClient injected by the DI container.
                    Provides FHIR Server access for all persistence operations.
        """
        self._client = client

    async def register(self, dto: RegisterOrgSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Create a new Organisation resource, enforcing name uniqueness.

        Performs a pre-check by listing up to 10 organisations matching the requested
        name, then does a case-insensitive exact match to detect true duplicates
        (e.g. "Acme" and "acme" are the same organisation). The limit=10 bounds the
        pre-check query cost; an exact match is done client-side because the FHIR
        Server's `name` filter is a prefix/contains search, not strict equality.

        The duplicate-check list call deliberately omits `accept` so it always
        receives plain JSON — inspecting the plain `data[]` array is simpler than
        navigating a FHIR Bundle `entry[].resource` structure.

        Args:
            dto:    Validated registration payload from the request body.
            actor:  Authenticated user performing the creation.
            accept: Optional Accept header forwarded from the client — controls the
                    format of the created resource returned to the caller.

        Returns:
            The newly created Organisation resource dict (plain JSON or FHIR R4).

        Raises:
            HTTPException 409: If an organisation with the same name already exists.
        """
        # Fetch candidate matches using plain JSON (no accept) — this is an internal
        # pre-check; the FHIR Server name filter is case-insensitive contains, so
        # "Acme" may return "Acme Health" and "ACME" — we filter exactly below.
        result = await self._client.list(name=dto.name, limit=10)

        # Case-insensitive exact match to prevent "Acme" and "ACME" co-existing.
        # `.lower()` on both sides normalises casing without locale-specific collation issues.
        duplicate = next(
            (o for o in result.get("data", []) if o.get("name", "").lower() == dto.name.lower()),
            None,
        )
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Organization with name '{dto.name}' already exists (id: {duplicate['id']}).",
            )

        # exclude_none=True removes optional fields the caller left blank so we don't
        # send null values to the FHIR Server for fields that were not provided.
        payload = dto.model_dump(exclude_none=True, mode="json")

        # Forward accept only to the final create call — the client receives this response.
        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(self, organization_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Fetch a single Organisation by its numeric ID.

        The actor parameter is accepted for interface consistency (all service methods
        receive the actor) and for future use in tenant-scoped read enforcement.
        Currently reads are not filtered by org_id because the FHIR Server enforces
        its own access control.

        Args:
            organization_id: The integer primary key of the Organisation.
            actor:           Authenticated user (currently unused for reads).
            accept:          Optional Accept header forwarded from the client.

        Returns:
            The Organisation resource dict in the requested format, or raises 404.
        """
        return await self._client.get_by_id(organization_id, accept=accept)

    async def list(self, filters: ListOrgsSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Return a paginated, optionally filtered list of Organisation resources.

        All filter and pagination parameters are forwarded to the FHIR Server as-is.
        None values are stripped by OrganizationClient.list() before building the
        query string, so unset filters are simply not applied.

        Args:
            filters: Validated query parameters (name, active, limit, offset).
            actor:   Authenticated user (accepted for interface consistency).
            accept:  Optional Accept header forwarded from the client. When
                     "application/fhir+json", the FHIR Server wraps results in a
                     FHIR Bundle instead of the plain paginated envelope.

        Returns:
            Paginated plain JSON dict or FHIR Bundle depending on `accept`.
        """
        return await self._client.list(
            accept=accept,
            name=filters.name,
            active=filters.active,
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def get_me(self, filters: MeOrgsSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Return Organizations that belong to the calling user's JWT identity.

        Extracts user_id (actor.sub) and org_id (actor.org_id) from the authenticated
        context and passes them as filters to the FHIR Server. The caller cannot supply
        these values — they are always derived from the validated JWT so a user can only
        retrieve their own organizations.

        Args:
            filters: Pagination and optional active-status filter from query params.
            actor:   Authenticated user; provides user_id and org_id for scoping.
            accept:  Optional Accept header forwarded from the client.

        Returns:
            Paginated plain JSON dict or FHIR Bundle depending on `accept`.
        """
        return await self._client.list(
            accept=accept,
            user_id=actor.sub,
            org_id=actor.org_id,
            active=filters.active,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(self, organization_id: int, dto: PatchOrgSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Partially update an Organisation resource.

        Validates that at least one field was provided in the request body before
        forwarding to the FHIR Server. An empty PATCH (all fields None/omitted) is
        a client mistake — sending it would trigger a no-op update with an `updated_by`
        timestamp change, which pollutes the audit trail unnecessarily.

        Args:
            organization_id: The integer primary key of the Organisation to update.
            dto:             Validated partial payload; all fields are Optional.
            actor:           Authenticated user for `updated_by` audit injection.
            accept:          Optional Accept header forwarded from the client.

        Returns:
            The updated Organisation resource dict in the requested format.

        Raises:
            HTTPException 422: If the request body contained no updateable fields.
        """
        # exclude_none=True strips unset Optional fields — what remains is the
        # explicit set of fields the caller wants to change.
        payload = dto.model_dump(exclude_none=True, mode="json")

        # Reject no-op updates explicitly. An empty dict after exclude_none means the
        # caller sent a body with all nulls or an entirely empty JSON object {},
        # which is not a meaningful PATCH operation.
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )
        return await self._client.patch(organization_id, payload, actor, accept=accept)

    async def delete(self, organization_id: int, actor: AuthUser) -> None:
        """
        Delete an Organisation resource from the FHIR Server.

        No `accept` parameter — DELETE returns 204 with no body so content
        negotiation does not apply.

        Args:
            organization_id: The integer primary key of the Organisation to delete.
            actor:           Authenticated user (accepted for interface consistency;
                             the FHIR Server handles its own deletion audit trail).

        Returns:
            None. The operation raises HTTPException on failure (404, 403, etc.).
        """
        await self._client.delete(organization_id)
