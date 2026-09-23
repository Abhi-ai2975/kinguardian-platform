"""
Business logic layer for the MedicationRequest resource.

MedicationRequestService sits between the router and MedicationRequestClient.
It owns empty-patch rejection and datetime serialisation for query params.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.medication_request import MedicationRequestClient
from app.schemas.medication_request.input import (
    ListMedicationRequestsSchema,
    MedicationRequestCreateSchema,
    MedicationRequestPatchSchema,
)


class MedicationRequestService:
    """
    Service layer for MedicationRequest CRUD operations.

    Mediates between the FastAPI router and MedicationRequestClient.
    """

    def __init__(self, client: MedicationRequestClient) -> None:
        """
        Initialise with a MedicationRequestClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for MedicationRequest operations.
        """
        self._client = client

    async def create(
        self,
        dto: MedicationRequestCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new MedicationRequest resource on the fhir-server.

        `mode="json"` serialises datetime values (authored_on, dispense dates, etc.)
        to ISO 8601 strings. `exclude_none=True` drops unset optional fields.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — FhirClient stamps created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created MedicationRequest dict (plain JSON or FHIR R4).
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
        Fetch a single MedicationRequest by integer primary key.

        Args:
            resource_id: The medication request's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The MedicationRequest resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListMedicationRequestsSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List MedicationRequests with optional filters.

        `authored_from` and `authored_to` are serialised to ISO 8601 strings.

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
            authored_from=(
                filters.authored_from.isoformat() if filters.authored_from else None
            ),
            authored_to=(
                filters.authored_to.isoformat() if filters.authored_to else None
            ),
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: MedicationRequestPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update scalar fields on a MedicationRequest.

        Rejects with 422 if the patch body is empty. `mode="json"` serialises
        datetime fields.

        Args:
            resource_id: The medication request's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated MedicationRequest resource dict.

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
        Permanently delete a MedicationRequest and all its child records.

        Args:
            resource_id: The medication request's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(resource_id)
