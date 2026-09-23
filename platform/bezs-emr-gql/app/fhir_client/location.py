"""
Domain-specific HTTP client for FHIR Location resources.

Thin wrapper around FhirClient that knows the fhir-server path for Locations.
All HTTP mechanics (error handling, audit field injection, connection pooling)
are handled by FhirClient — this class only provides named methods and the
correct resource path.

Keeping path knowledge here (not in the service layer) means that if the
fhir-server renames the endpoint, only this file needs to change.
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# FHIR Server endpoint path for Location resources.
# Defined as a module constant so path changes require a single edit.
_PATH = "/locations"


class LocationClient:
    """
    Domain client for FHIR Location CRUD operations.

    Wraps FhirClient with Location-specific paths and parameter handling.
    Instantiated by the DI container (LocationContainer) and injected into
    LocationService — never constructed directly in route handlers.

    Content negotiation:
        Every method that returns a body accepts `accept: str | None`. When
        set to "application/fhir+json", the fhir-server returns the resource in
        FHIR R4 format. Internal calls (e.g. pre-check queries in the service)
        should omit `accept` to always receive plain JSON for programmatic inspection.
    """

    def __init__(self, fhir: FhirClient):
        """
        Args:
            fhir: The shared FhirClient singleton injected by the DI container.
                  All HTTP calls are delegated to this instance so the connection
                  pool is shared across all domain clients in the application.
        """
        self._fhir = fhir

    async def create(self, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        POST /locations — create a new Location resource on the fhir-server.

        Args:
            data:   Resource payload from LocationCreateSchema.model_dump(exclude_none=True),
                    already supplemented with user_id and org_id by the service layer.
            actor:  Authenticated user. FhirClient stamps actor.sub as `created_by`.
            accept: Optional Accept header forwarded from the client request.
                    "application/fhir+json" triggers FHIR R4 response format.

        Returns:
            The newly created Location resource dict in plain JSON or FHIR R4 format.
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, location_id: int, accept: str | None = None) -> dict:
        """
        GET /locations/{id} — fetch a single Location by integer primary key.

        Args:
            location_id: The integer primary key of the Location resource.
            accept:      Optional Accept header for content negotiation.

        Returns:
            The Location resource dict, or raises HTTPException 404 if not found.
        """
        return await self._fhir.get(f"{_PATH}/{location_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /locations — paginated, filtered list of Location resources.

        Accepts arbitrary keyword arguments so the service can pass named filter
        fields without this method needing to enumerate them. None values are
        stripped before the query string is built because `?name=None` would be
        treated as a literal string filter by the fhir-server.

        Args:
            accept:   Optional Accept header. Pass None for internal pre-check calls
                      that must always receive plain JSON regardless of client preference.
            **params: Filter and pagination kwargs (name, status, limit, offset, etc.).

        Returns:
            Paginated plain JSON envelope or FHIR Bundle depending on `accept`.
        """
        # Strip keys with None values to avoid `?key=None` noise in the query string.
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(
        self, location_id: int, data: dict, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        PATCH /locations/{id} — partial update of a Location resource.

        Args:
            location_id: The integer primary key of the Location to update.
            data:        Partial payload (model_dump(exclude_none=True)) — only
                         the fields the caller explicitly wants to change.
            actor:       Authenticated user. FhirClient stamps actor.sub as `updated_by`.
            accept:      Optional Accept header for content negotiation.

        Returns:
            The updated Location resource dict in the requested format.
        """
        return await self._fhir.patch(f"{_PATH}/{location_id}", data, actor, accept=accept)

    async def delete(self, location_id: int) -> None:
        """
        DELETE /locations/{id} — permanently remove a Location resource.

        No `accept` parameter — DELETE returns 204 with no body so content
        negotiation does not apply.

        Args:
            location_id: The integer primary key of the Location to delete.
        """
        await self._fhir.delete(f"{_PATH}/{location_id}")
