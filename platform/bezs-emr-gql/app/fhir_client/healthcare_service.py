"""
Domain-specific HTTP client for FHIR HealthcareService resources.

Thin wrapper around FhirClient that knows the fhir-server path for HealthcareServices.
All HTTP mechanics (error handling, audit field injection, connection pooling) are
handled by FhirClient — this class only provides named methods and the correct path.

The fhir-server registers this resource at /healthcare-services (hyphenated), which
is the FHIR convention for multi-word resource names in REST URLs.
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# FHIR Server endpoint path — hyphenated to match fhir-server's router registration.
# Defined as a module constant so a path change requires a single edit here.
_PATH = "/healthcare-services"


class HealthcareServiceClient:
    """
    Domain client for FHIR HealthcareService CRUD operations.

    Wraps FhirClient with HealthcareService-specific paths and parameter handling.
    Instantiated by the DI container (HealthcareServiceContainer) and injected into
    HealthcareServiceService — never constructed directly in route handlers.

    Content negotiation:
        Every method that returns a body accepts `accept: str | None`. When set to
        "application/fhir+json", the fhir-server returns FHIR R4 format. Internal
        calls (e.g. pre-check queries in the service) should omit `accept` to always
        receive plain JSON for programmatic inspection.
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
        POST /healthcare-services — create a new HealthcareService resource.

        Args:
            data:   Resource payload from HealthcareServiceCreateSchema.model_dump(exclude_none=True).
            actor:  Authenticated user. FhirClient stamps actor.sub as `created_by`.
            accept: Optional Accept header forwarded from the client request.
                    "application/fhir+json" triggers FHIR R4 response format.

        Returns:
            The newly created HealthcareService resource dict in plain JSON or FHIR R4.
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, service_id: int, accept: str | None = None) -> dict:
        """
        GET /healthcare-services/{id} — fetch a single HealthcareService by integer primary key.

        Args:
            service_id: The integer primary key of the HealthcareService resource.
            accept:     Optional Accept header for content negotiation.

        Returns:
            The HealthcareService resource dict, or raises HTTPException 404 if not found.
        """
        return await self._fhir.get(f"{_PATH}/{service_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /healthcare-services — paginated, filtered list of HealthcareService resources.

        Accepts arbitrary keyword arguments so the service can pass named filter
        fields without this method needing to enumerate them. None values are stripped
        before building the query string because `?key=None` would be treated as a
        literal string filter by the fhir-server.

        Args:
            accept:   Optional Accept header. Pass None for internal pre-check calls
                      that must always receive plain JSON regardless of client preference.
            **params: Filter and pagination kwargs (name, active, limit, offset, etc.).

        Returns:
            Paginated plain JSON envelope or FHIR Bundle depending on `accept`.
        """
        # Strip keys with None values to avoid `?key=None` noise in the query string.
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(
        self, service_id: int, data: dict, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        PATCH /healthcare-services/{id} — partial update of a HealthcareService resource.

        Args:
            service_id: The integer primary key of the HealthcareService to update.
            data:       Partial payload (model_dump(exclude_none=True)).
            actor:      Authenticated user. FhirClient stamps actor.sub as `updated_by`.
            accept:     Optional Accept header for content negotiation.

        Returns:
            The updated HealthcareService resource dict in the requested format.
        """
        return await self._fhir.patch(f"{_PATH}/{service_id}", data, actor, accept=accept)

    async def delete(self, service_id: int) -> None:
        """
        DELETE /healthcare-services/{id} — permanently remove a HealthcareService resource.

        No `accept` parameter — DELETE returns 204 with no body so content
        negotiation does not apply.

        Args:
            service_id: The integer primary key of the HealthcareService to delete.
        """
        await self._fhir.delete(f"{_PATH}/{service_id}")
