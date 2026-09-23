"""
Business logic layer for the Observation resource.

ObservationService sits between the router and ObservationClient. It owns
empty-patch rejection and datetime serialisation for query params.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.observation import ObservationClient
from app.schemas.observation.input import (
    ListObservationsSchema,
    ObservationCreateSchema,
    ObservationPatchSchema,
)


class ObservationService:
    """
    Service layer for Observation CRUD operations.

    Mediates between the FastAPI router and ObservationClient.
    """

    def __init__(self, client: ObservationClient) -> None:
        """
        Initialise with an ObservationClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for Observation operations.
        """
        self._client = client

    async def create(
        self,
        dto: ObservationCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new Observation resource on the fhir-server.

        `mode="json"` serialises datetime fields (effective_date_time, issued, etc.)
        and all datetime values inside the value[x] and effective[x] polymorphic
        groups. `exclude_none=True` drops unset fields.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — FhirClient stamps created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Observation dict (plain JSON or FHIR R4).
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(
        self,
        resource_id: int,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Fetch a single Observation by integer primary key.

        Args:
            resource_id: The observation's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Observation resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListObservationsSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List Observations with optional filters.

        `effective_from` and `effective_to` are serialised to ISO 8601 strings
        for the fhir-server query string.

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC consistency).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            status=filters.status,
            patient_id=filters.patient_id,
            encounter_id=filters.encounter_id,
            effective_from=(
                filters.effective_from.isoformat() if filters.effective_from else None
            ),
            effective_to=(
                filters.effective_to.isoformat() if filters.effective_to else None
            ),
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: ObservationPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update scalar fields on an Observation.

        Rejects with 422 if the patch body is empty. `mode="json"` serialises
        datetime fields (effective_date_time, issued, value_date_time, etc.).

        Args:
            resource_id: The observation's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Observation resource dict.

        Raises:
            HTTPException(422): If the patch body is empty.
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )
        return await self._client.patch(resource_id, payload, actor, accept=accept)

    async def delete(self, resource_id: int, actor: AuthUser) -> None:
        """
        Permanently delete an Observation and all its child records.

        The fhir-server cascades to components, referenceRanges, etc.

        Args:
            resource_id: The observation's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(resource_id)
