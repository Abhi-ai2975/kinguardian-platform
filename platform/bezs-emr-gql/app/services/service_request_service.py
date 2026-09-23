"""
Business logic layer for the ServiceRequest resource.

ServiceRequestService sits between the router and ServiceRequestClient. It owns:
  - Empty-patch rejection (422 if the caller sends an empty PATCH body).
  - datetime → ISO string serialisation for datetime query params.

The service does NOT inject `created_by` or `updated_by` — FhirClient does that
automatically from actor.sub on POST / PATCH.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.service_request import ServiceRequestClient
from app.schemas.service_request.input import (
    ListServiceRequestsSchema,
    ServiceRequestCreateSchema,
    ServiceRequestPatchSchema,
)


class ServiceRequestService:
    """
    Service layer for ServiceRequest CRUD operations.

    Mediates between the FastAPI router and ServiceRequestClient. All methods
    accept an optional `accept` string threaded through to the fhir-server for
    content negotiation.
    """

    def __init__(self, client: ServiceRequestClient) -> None:
        """
        Initialise with a ServiceRequestClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for ServiceRequest operations.
        """
        self._client = client

    async def create(
        self,
        dto: ServiceRequestCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new ServiceRequest resource on the fhir-server.

        `mode="json"` serialises datetime values (authored_on, occurrence_datetime,
        etc.) to ISO 8601 strings so httpx can encode them as JSON correctly.
        `exclude_none=True` drops Optional fields that were not provided.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created ServiceRequest dict (plain JSON or FHIR R4).
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
        Fetch a single ServiceRequest by integer primary key.

        Args:
            resource_id: The service request's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The ServiceRequest resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListServiceRequestsSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List ServiceRequests with optional filters.

        datetime fields (authored_from, authored_to) are serialised to ISO 8601
        strings for the fhir-server query string — httpx does not handle datetime
        objects natively.

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
        dto: ServiceRequestPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update scalar fields on a ServiceRequest.

        Rejects the request with 422 if the caller sends an empty body (all None).
        `mode="json"` ensures datetime values are serialised to ISO strings.

        Args:
            resource_id: The service request's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated ServiceRequest resource dict.

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
        Permanently delete a ServiceRequest and all its child records.

        The fhir-server cascades the delete to all child tables.

        Args:
            resource_id: The service request's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(resource_id)
