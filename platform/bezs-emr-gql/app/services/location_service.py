"""
Business logic service for FHIR Location resources.

This service is the authoritative home for all business rules applied to Location
operations before they are forwarded to the fhir-server. It sits between the API
route handlers and LocationClient, ensuring that:
  - PATCH requests with an empty payload are rejected early (422) instead of sending
    a no-op update to the fhir-server.
  - user_id and org_id (required by the fhir-server for tenant scoping) are supplied
    by the caller in the request body and forwarded as-is.
  - The caller's JWT subject (actor.sub) is stamped as created_by / updated_by on every
    write (the actual injection happens in FhirClient.post() / FhirClient.patch()).

The service never accesses the database directly; all persistence is delegated to
the fhir-server via LocationClient.

Content negotiation:
    Each method accepts an optional `accept` parameter that is forwarded through
    LocationClient to FhirClient as the HTTP Accept header. The fhir-server uses this
    to decide whether to return plain JSON or FHIR R4 format. Internal calls (e.g.
    any pre-check queries) must never forward `accept` — they always use plain JSON
    for programmatic inspection.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.location import LocationClient
from app.schemas.location.input import ListLocationsSchema, LocationCreateSchema, LocationPatchSchema


class LocationService:
    """
    Application service for Location CRUD use cases.

    Instantiated per-request by the DI container (LocationContainer) via Factory
    provider, so it holds no shared state between requests.
    """

    def __init__(self, client: LocationClient):
        """
        Args:
            client: The LocationClient injected by the DI container.
                    Provides fhir-server access for all persistence operations.
        """
        self._client = client

    async def create(
        self, dto: LocationCreateSchema, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        Create a new Location resource on the fhir-server.

        Forwards the caller's payload (including user_id and org_id) to the fhir-server.
        Only created_by is injected automatically — by FhirClient.post() from actor.sub.

        Args:
            dto:    Validated creation payload from LocationCreateSchema.
                    Must include user_id and org_id for fhir-server tenant scoping.
            actor:  Authenticated user performing the creation.
            accept: Optional Accept header forwarded from the client — controls the
                    format of the created resource returned to the caller.

        Returns:
            The newly created Location resource dict (plain JSON or FHIR R4).
        """
        # exclude_none=True removes Optional fields the caller left blank.
        # user_id and org_id are required by the fhir-server and come from the payload.
        # created_by is injected by FhirClient.post() from actor.sub — no action needed here.
        payload = dto.model_dump(exclude_none=True, mode="json")

        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(
        self, location_id: int, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        Fetch a single Location by its numeric primary key.

        The actor parameter is accepted for interface consistency (all service methods
        receive the actor) and for future use in tenant-scoped read enforcement.

        Args:
            location_id: The integer primary key of the Location.
            actor:       Authenticated user (currently unused for reads).
            accept:      Optional Accept header forwarded from the client.

        Returns:
            The Location resource dict in the requested format, or raises 404.
        """
        return await self._client.get_by_id(location_id, accept=accept)

    async def list(
        self, filters: ListLocationsSchema, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        Return a paginated, optionally filtered list of Location resources.

        All filter and pagination parameters are forwarded to the fhir-server as-is.
        None values are stripped by LocationClient.list() before building the query
        string, so unset filters are simply not applied.

        Args:
            filters: Validated query parameters (org_id, status, limit, offset).
            actor:   Authenticated user (accepted for interface consistency).
            accept:  Optional Accept header forwarded from the client. When
                     "application/fhir+json", the fhir-server wraps results in a
                     FHIR Bundle instead of the plain paginated envelope.

        Returns:
            Paginated plain JSON dict or FHIR Bundle depending on `accept`.
        """
        return await self._client.list(
            accept=accept,
            org_id=filters.org_id,
            status=filters.status,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        location_id: int,
        dto: LocationPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update a Location resource.

        Validates that at least one field was provided in the request body before
        forwarding to the fhir-server. An empty PATCH (all fields None/omitted) is a
        client mistake — sending it would trigger a no-op update with an `updated_by`
        timestamp change, polluting the audit trail unnecessarily.

        FhirClient.patch() injects updated_by=actor.sub automatically.

        Args:
            location_id: The integer primary key of the Location to update.
            dto:         Validated partial payload; all fields are Optional.
            actor:       Authenticated user for `updated_by` audit injection.
            accept:      Optional Accept header forwarded from the client.

        Returns:
            The updated Location resource dict in the requested format.

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

        return await self._client.patch(location_id, payload, actor, accept=accept)

    async def delete(self, location_id: int, actor: AuthUser) -> None:
        """
        Delete a Location resource from the fhir-server.

        No `accept` parameter — DELETE returns 204 with no body so content
        negotiation does not apply.

        Args:
            location_id: The integer primary key of the Location to delete.
            actor:       Authenticated user (accepted for interface consistency;
                         the fhir-server handles its own deletion audit trail).

        Returns:
            None. The operation raises HTTPException on failure (404, 403, etc.).
        """
        await self._client.delete(location_id)
