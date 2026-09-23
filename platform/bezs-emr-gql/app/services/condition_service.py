"""
Business logic layer for the Condition resource.

ConditionService sits between the router and ConditionClient. It owns
empty-patch rejection and datetime serialisation for query params.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.condition import ConditionClient
from app.schemas.condition.input import (
    ConditionCreateSchema,
    ConditionPatchSchema,
    ListConditionsSchema,
)


class ConditionService:
    """
    Service layer for Condition CRUD operations.

    Mediates between the FastAPI router and ConditionClient.
    """

    def __init__(self, client: ConditionClient) -> None:
        """
        Initialise with a ConditionClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for Condition operations.
        """
        self._client = client

    async def create(
        self,
        dto: ConditionCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new Condition resource on the fhir-server.

        `mode="json"` serialises all datetime fields (onset_datetime,
        abatement_datetime, recorded_date, identifier period fields, etc.)
        to ISO 8601 strings. `exclude_none=True` drops unset fields.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — FhirClient stamps created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Condition dict (plain JSON or FHIR R4).
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
        Fetch a single Condition by integer primary key.

        Args:
            resource_id: The condition's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Condition resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListConditionsSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List Conditions with optional filters.

        `recorded_from` and `recorded_to` are serialised to ISO 8601 strings
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
            clinical_status=filters.clinical_status,
            patient_id=filters.patient_id,
            encounter_id=filters.encounter_id,
            recorded_from=(
                filters.recorded_from.isoformat() if filters.recorded_from else None
            ),
            recorded_to=(
                filters.recorded_to.isoformat() if filters.recorded_to else None
            ),
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: ConditionPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update scalar fields on a Condition.

        Rejects with 422 if the patch body is empty. `mode="json"` serialises
        datetime fields (recorded_date, onset_datetime, abatement_datetime, etc.).

        Args:
            resource_id: The condition's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Condition resource dict.

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
        Permanently delete a Condition and all its child records.

        The fhir-server cascades to identifier, category, bodySite, stage,
        evidence, and note records.

        Args:
            resource_id: The condition's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(resource_id)
