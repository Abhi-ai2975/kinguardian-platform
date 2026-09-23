"""
Domain-specific HTTP client for FHIR Schedule resources.

Thin wrapper around FhirClient that knows the fhir-server path for Schedules.
All HTTP mechanics (error handling, audit field injection, connection pooling)
are handled by FhirClient — this class only provides named methods and the
correct resource path.

A Schedule defines a container of time slots for one or more actors
(Practitioner, HealthcareService, Location, etc.) during a planning horizon.
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# FHIR Server endpoint path for Schedule resources.
# Defined as a module constant so a path change requires a single edit.
_PATH = "/schedules"


class ScheduleClient:
    """
    Domain client for FHIR Schedule CRUD operations.

    Wraps FhirClient with Schedule-specific paths and parameter handling.
    Instantiated by the DI container (ScheduleContainer) and injected into
    ScheduleService — never constructed directly in route handlers.

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
        POST /schedules — create a new Schedule resource on the fhir-server.

        Args:
            data:   Resource payload from ScheduleCreateSchema.model_dump(exclude_none=True).
            actor:  Authenticated user. FhirClient stamps actor.sub as `created_by`.
            accept: Optional Accept header forwarded from the client request.
                    "application/fhir+json" triggers FHIR R4 response format.

        Returns:
            The newly created Schedule resource dict in plain JSON or FHIR R4.
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, schedule_id: int, accept: str | None = None) -> dict:
        """
        GET /schedules/{id} — fetch a single Schedule by integer primary key.

        Args:
            schedule_id: The integer primary key of the Schedule resource.
            accept:      Optional Accept header for content negotiation.

        Returns:
            The Schedule resource dict, or raises HTTPException 404 if not found.
        """
        return await self._fhir.get(f"{_PATH}/{schedule_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /schedules — paginated, filtered list of Schedule resources.

        None values are stripped before building the query string to avoid
        sending `?key=None` noise to the fhir-server.

        Args:
            accept:   Optional Accept header. Pass None for internal pre-check calls
                      that must always receive plain JSON.
            **params: Filter and pagination kwargs (active, limit, offset, etc.).

        Returns:
            Paginated plain JSON envelope or FHIR Bundle depending on `accept`.
        """
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(
        self, schedule_id: int, data: dict, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        PATCH /schedules/{id} — partial update of a Schedule resource.

        Args:
            schedule_id: The integer primary key of the Schedule to update.
            data:        Partial payload (model_dump(exclude_none=True)).
            actor:       Authenticated user. FhirClient stamps actor.sub as `updated_by`.
            accept:      Optional Accept header for content negotiation.

        Returns:
            The updated Schedule resource dict in the requested format.
        """
        return await self._fhir.patch(f"{_PATH}/{schedule_id}", data, actor, accept=accept)

    async def delete(self, schedule_id: int) -> None:
        """
        DELETE /schedules/{id} — permanently remove a Schedule resource.

        No `accept` parameter — DELETE returns 204 with no body so content
        negotiation does not apply.

        Args:
            schedule_id: The integer primary key of the Schedule to delete.
        """
        await self._fhir.delete(f"{_PATH}/{schedule_id}")
