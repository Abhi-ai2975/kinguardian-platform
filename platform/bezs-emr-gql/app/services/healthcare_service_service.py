"""
Business logic service for FHIR HealthcareService resources.

This service is the authoritative home for all business rules applied to
HealthcareService operations before they are forwarded to the fhir-server. It sits
between the API route handlers and HealthcareServiceClient, ensuring that:
  - PATCH requests with an empty payload are rejected early (422) instead of sending
    a no-op update to the fhir-server.
  - The caller's JWT subject (actor.sub) is stamped as created_by / updated_by on
    every write (the actual injection happens in FhirClient.post() / FhirClient.patch()).

The service never accesses the database directly; all persistence is delegated to
the fhir-server via HealthcareServiceClient.

Content negotiation:
    Each method accepts an optional `accept` parameter that is forwarded through
    HealthcareServiceClient to FhirClient as the HTTP Accept header. The fhir-server
    uses this to decide whether to return plain JSON or FHIR R4 format.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.healthcare_service import HealthcareServiceClient
from app.schemas.healthcare_service.input import (
    HealthcareServiceCreateSchema,
    HealthcareServicePatchSchema,
    ListHealthcareServicesSchema,
)


class HealthcareServiceService:
    """
    Application service for HealthcareService CRUD use cases.

    Instantiated per-request by the DI container (HealthcareServiceContainer) via
    Factory provider, so it holds no shared state between requests.
    """

    def __init__(self, client: HealthcareServiceClient):
        """
        Args:
            client: The HealthcareServiceClient injected by the DI container.
                    Provides fhir-server access for all persistence operations.
        """
        self._client = client

    async def create(
        self,
        dto: HealthcareServiceCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new HealthcareService resource on the fhir-server.

        Forwards the caller's payload (including user_id and org_id if provided)
        to the fhir-server. FhirClient.post() automatically injects created_by=actor.sub.

        Args:
            dto:    Validated creation payload from HealthcareServiceCreateSchema.
            actor:  Authenticated user performing the creation.
            accept: Optional Accept header forwarded from the client — controls the
                    format of the created resource returned to the caller.

        Returns:
            The newly created HealthcareService resource dict (plain JSON or FHIR R4).
        """
        # exclude_none=True removes Optional fields the caller left blank so we don't
        # send null values to the fhir-server for fields that were not provided.
        # created_by is injected by FhirClient.post() from actor.sub automatically.
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(
        self, service_id: int, actor: AuthUser, accept: str | None = None
    ) -> dict:
        """
        Fetch a single HealthcareService by its numeric primary key.

        The actor parameter is accepted for interface consistency (all service methods
        receive the actor) and for future use in tenant-scoped read enforcement.

        Args:
            service_id: The integer primary key of the HealthcareService.
            actor:      Authenticated user (currently unused for reads).
            accept:     Optional Accept header forwarded from the client.

        Returns:
            The HealthcareService resource dict in the requested format, or raises 404.
        """
        return await self._client.get_by_id(service_id, accept=accept)

    async def list(
        self,
        filters: ListHealthcareServicesSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Return a paginated, optionally filtered list of HealthcareService resources.

        All filter and pagination parameters are forwarded to the fhir-server as-is.
        None values are stripped by HealthcareServiceClient.list() before building the
        query string, so unset filters are simply not applied.

        Args:
            filters: Validated query parameters (name, active, limit, offset).
            actor:   Authenticated user (accepted for interface consistency).
            accept:  Optional Accept header forwarded from the client. When
                     "application/fhir+json", the fhir-server wraps results in a
                     FHIR Bundle instead of the plain paginated envelope.

        Returns:
            Paginated plain JSON dict or FHIR Bundle depending on `accept`.
        """
        return await self._client.list(
            accept=accept,
            name=filters.name,
            active=filters.active,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        service_id: int,
        dto: HealthcareServicePatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update a HealthcareService resource.

        Validates that at least one field was provided in the request body before
        forwarding to the fhir-server. An empty PATCH (all fields None/omitted) is
        a client mistake — sending it would trigger a no-op update with an `updated_by`
        timestamp change, polluting the audit trail unnecessarily.

        FhirClient.patch() injects updated_by=actor.sub automatically.

        Args:
            service_id: The integer primary key of the HealthcareService to update.
            dto:        Validated partial payload; all fields are Optional.
            actor:      Authenticated user for `updated_by` audit injection.
            accept:     Optional Accept header forwarded from the client.

        Returns:
            The updated HealthcareService resource dict in the requested format.

        Raises:
            HTTPException 422: If the request body contained no updateable fields.
        """
        # exclude_none=True strips unset Optional fields — what remains is the
        # explicit set of fields the caller wants to change.
        payload = dto.model_dump(exclude_none=True, mode="json")

        # Reject no-op updates explicitly to prevent meaningless audit trail entries.
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )

        return await self._client.patch(service_id, payload, actor, accept=accept)

    async def delete(self, service_id: int, actor: AuthUser) -> None:
        """
        Delete a HealthcareService resource from the fhir-server.

        No `accept` parameter — DELETE returns 204 with no body so content
        negotiation does not apply.

        Args:
            service_id: The integer primary key of the HealthcareService to delete.
            actor:      Authenticated user (accepted for interface consistency).

        Returns:
            None. The operation raises HTTPException on failure (404, 403, etc.).
        """
        await self._client.delete(service_id)
