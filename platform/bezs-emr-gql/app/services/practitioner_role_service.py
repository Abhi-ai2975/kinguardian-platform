"""
Business logic layer for the PractitionerRole resource.

PractitionerRoleService sits between the router and PractitionerRoleClient. It owns:
  - Empty-patch rejection (422 if the caller sends an empty PATCH body)
  - Any future business rules (e.g. validating that the referenced Practitioner exists)

The service does NOT inject created_by or updated_by — FhirClient does that.
The service does NOT inject user_id or org_id — the caller supplies them in the
request body (optional, matching the fhir-server schema).
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.practitioner_role import PractitionerRoleClient
from app.schemas.practitioner_role.input import (
    ListPractitionerRolesSchema,
    PractitionerRoleCreateSchema,
    PractitionerRolePatchSchema,
)


class PractitionerRoleService:
    """
    Service layer for PractitionerRole CRUD operations.

    Mediates between the FastAPI router and PractitionerRoleClient. All methods
    accept an optional `accept` string threaded through to the fhir-server for
    content negotiation.
    """

    def __init__(self, client: PractitionerRoleClient) -> None:
        """
        Initialise with a PractitionerRoleClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for PractitionerRole operations.
        """
        self._client = client

    async def create(
        self,
        dto: PractitionerRoleCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new PractitionerRole resource on the fhir-server.

        Serialises the DTO with exclude_none=True so Optional fields that
        were not provided are not sent as explicit nulls. FhirClient.post()
        stamps created_by from actor.sub automatically.

        Unlike Practitioner, PractitionerRole accepts child arrays in the
        create body (identifier, code, specialty, location, healthcare_service,
        characteristic, communication, contact, availability, endpoint).

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created PractitionerRole dict (plain JSON or FHIR).
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
        Fetch a single PractitionerRole by integer primary key.

        The fhir-server populates all child arrays in the response automatically.

        Args:
            resource_id: The practitioner_role's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The PractitionerRole resource dict with all child arrays.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListPractitionerRolesSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List PractitionerRoles with optional filters.

        Forwards all non-None filter values. practitioner_id narrows results
        to roles for a specific Practitioner.

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC consistency).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            active=filters.active,
            practitioner_id=filters.practitioner_id,
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: PractitionerRolePatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update a PractitionerRole resource.

        Rejects the request with 422 if all fields are None (empty body).
        FhirClient.patch() stamps updated_by from actor.sub automatically.

        Only scalar fields are patchable (active, period_start, period_end,
        availability_exceptions). Child arrays cannot be patched.

        Args:
            resource_id: The practitioner_role's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — used by FhirClient for updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated PractitionerRole resource dict.

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

    async def list_for_booking(
        self,
        active: bool = True,
        specialty_code: str | None = None,
        day_of_week: str | None = None,
        org_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
        accept: str | None = None,
    ) -> dict:
        """
        List PractitionerRoles enriched with Practitioner details for booking UIs.

        Proxies directly to the fhir-server's /practitioner-roles/booking endpoint
        which joins each role with its linked Practitioner (name, gender, photo,
        qualifications, specialty, availability schedule, location, and healthcare
        services) in a single query — no second request needed by the caller.

        Args:
            active:         Filter by active status (default: True).
            specialty_code: Filter by SNOMED specialty code e.g. '394814009' (General Practice).
            day_of_week:    Filter by availability day e.g. 'mon', 'tue', 'wed'.
            org_id:         Filter by organization ID for tenant scoping.
            limit:          Maximum number of records to return (1–200, default 50).
            offset:         Number of records to skip before returning (default 0).
            accept:         Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on `accept`.
        """
        return await self._client.list_for_booking(
            accept=accept,
            active=active,
            specialty_code=specialty_code,
            day_of_week=day_of_week,
            org_id=org_id,
            limit=limit,
            offset=offset,
        )

    async def delete(self, resource_id: int, actor: AuthUser) -> None:
        """
        Permanently delete a PractitionerRole and all its child records.

        The fhir-server cascades the delete to all child tables (identifier,
        code, specialty, location, healthcare_service, characteristic,
        communication, contact, availability, endpoint). This operation
        is irreversible.

        Args:
            resource_id: The practitioner_role's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(resource_id)
