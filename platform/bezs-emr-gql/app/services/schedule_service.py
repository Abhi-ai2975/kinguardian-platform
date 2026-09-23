"""
Business logic service for FHIR Schedule resources.

This service is the authoritative home for all business rules applied to Schedule
operations before they are forwarded to the fhir-server. It sits between the API
route handlers and ScheduleClient, ensuring that:
  - PATCH requests with an empty payload are rejected early (422) instead of sending
    a no-op update to the fhir-server.
  - The caller's JWT subject (actor.sub) is stamped as created_by / updated_by on
    every write (the actual injection happens in FhirClient.post() / FhirClient.patch()).

The service never accesses the database directly; all persistence is delegated to
the fhir-server via ScheduleClient.

Content negotiation:
    Each method accepts an optional `accept` parameter forwarded through ScheduleClient
    to FhirClient as the HTTP Accept header. The fhir-server uses this to decide
    whether to return plain JSON or FHIR R4 format.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.schedule import ScheduleClient
from app.schemas.schedule.input import (
    ListSchedulesSchema,
    ScheduleCreateSchema,
    SchedulePatchSchema,
)


class ScheduleService:
    """
    Application service for Schedule CRUD use cases.

    Instantiated per-request by the DI container (ScheduleContainer) via Factory
    provider, so it holds no shared state between requests.
    """

    def __init__(self, client: ScheduleClient):
        """
        Args:
            client: The ScheduleClient injected by the DI container.
                    Provides fhir-server access for all persistence operations.
        """
        self._client = client

    async def create(
        self, dto: ScheduleCreateSchema, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        Create a new Schedule resource on the fhir-server.

        Forwards the caller's payload (including user_id and org_id if provided)
        to the fhir-server. FhirClient.post() automatically injects created_by=actor.sub.

        Args:
            dto:    Validated creation payload from ScheduleCreateSchema.
            actor:  Authenticated user performing the creation.
            accept: Optional Accept header forwarded from the client — controls the
                    format of the created resource returned to the caller.

        Returns:
            The newly created Schedule resource dict (plain JSON or FHIR R4).
        """
        # exclude_none=True removes Optional fields the caller left blank so we don't
        # send null values to the fhir-server for fields that were not provided.
        # created_by is injected by FhirClient.post() from actor.sub automatically.
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(
        self, schedule_id: int, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        Fetch a single Schedule by its numeric primary key.

        The actor parameter is accepted for interface consistency and for future
        use in tenant-scoped read enforcement.

        Args:
            schedule_id: The integer primary key of the Schedule.
            actor:       Authenticated user (currently unused for reads).
            accept:      Optional Accept header forwarded from the client.

        Returns:
            The Schedule resource dict in the requested format, or raises 404.
        """
        return await self._client.get_by_id(schedule_id, accept=accept)

    async def list(
        self, filters: ListSchedulesSchema, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        Return a paginated, optionally filtered list of Schedule resources.

        All filter and pagination parameters are forwarded to the fhir-server as-is.
        None values are stripped by ScheduleClient.list() before building the query
        string, so unset filters are simply not applied.

        Args:
            filters: Validated query parameters (active, limit, offset).
            actor:   Authenticated user (accepted for interface consistency).
            accept:  Optional Accept header forwarded from the client. When
                     "application/fhir+json", the fhir-server wraps results in a
                     FHIR Bundle instead of the plain paginated envelope.

        Returns:
            Paginated plain JSON dict or FHIR Bundle depending on `accept`.
        """
        return await self._client.list(
            accept=accept,
            active=filters.active,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        schedule_id: int,
        dto: SchedulePatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update a Schedule resource.

        Validates that at least one field was provided in the request body before
        forwarding to the fhir-server. An empty PATCH is rejected to prevent no-op
        updates that would pollute the audit trail with a meaningless updated_by change.

        FhirClient.patch() injects updated_by=actor.sub automatically.

        Args:
            schedule_id: The integer primary key of the Schedule to update.
            dto:         Validated partial payload; all fields are Optional.
            actor:       Authenticated user for `updated_by` audit injection.
            accept:      Optional Accept header forwarded from the client.

        Returns:
            The updated Schedule resource dict in the requested format.

        Raises:
            HTTPException 422: If the request body contained no updateable fields.
        """
        payload = dto.model_dump(exclude_none=True, mode="json")

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )

        return await self._client.patch(schedule_id, payload, actor, accept=accept)

    async def delete(self, schedule_id: int, actor: AuthUser) -> None:
        """
        Delete a Schedule resource from the fhir-server.

        No `accept` parameter — DELETE returns 204 with no body so content
        negotiation does not apply.

        Args:
            schedule_id: The integer primary key of the Schedule to delete.
            actor:       Authenticated user (accepted for interface consistency).

        Returns:
            None. The operation raises HTTPException on failure (404, 403, etc.).
        """
        await self._client.delete(schedule_id)
