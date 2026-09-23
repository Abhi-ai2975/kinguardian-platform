"""
Business logic layer for the Encounter resource.

EncounterService sits between the router and EncounterClient. It owns:
  - Empty-patch rejection (422 if the caller sends an empty PATCH body).
  - datetime → ISO string serialisation for query params forwarded to the fhir-server.

The service does NOT inject `created_by` or `updated_by` — FhirClient does that
automatically from actor.sub on POST / PATCH.

The service does NOT inject `user_id` or `org_id` — the caller supplies them in
the request body (optional, matching the fhir-server schema).

All child arrays (participant, diagnosis, location, reason, etc.) are forwarded
as-is from the create body — no separate sub-resource routes exist.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.encounter import EncounterClient
from app.schemas.encounter.input import (
    EncounterCreateSchema,
    EncounterPatchSchema,
    ListEncountersSchema,
)


class EncounterService:
    """
    Service layer for Encounter CRUD operations.

    Mediates between the FastAPI router and EncounterClient. All methods accept
    an optional `accept` string threaded through to the fhir-server for
    content negotiation.
    """

    def __init__(self, client: EncounterClient) -> None:
        """
        Initialise with an EncounterClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for Encounter operations.
        """
        self._client = client

    async def create(
        self,
        dto: EncounterCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new Encounter resource on the fhir-server.

        Uses `by_alias=True` so the `class_` field is serialised as `"class"` in
        the JSON body (matching the fhir-server schema). `exclude_none=True` drops
        Optional fields that were not provided. `mode="json"` serialises datetime
        values to ISO strings so httpx can encode them correctly.

        All child arrays (participant, diagnosis, location, etc.) are embedded in
        this single call — the fhir-server has no separate sub-resource routes.

        FhirClient.post() stamps `created_by` from actor.sub automatically.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Encounter dict (plain JSON or FHIR R5).
        """
        # by_alias=True: serialises `class_` → `"class"` for the fhir-server
        payload = dto.model_dump(by_alias=True, exclude_none=True, mode="json")
        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(
        self,
        resource_id: int,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Fetch a single Encounter by integer primary key.

        The fhir-server populates all child arrays in the response automatically.

        Args:
            resource_id: The encounter's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency — not used here).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Encounter resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListEncountersSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List Encounters with optional filters.

        Forwards all non-None filter values. datetime fields (actual_period_start_from,
        actual_period_start_to) are serialised to ISO 8601 strings for the
        fhir-server query string — httpx does not handle datetime objects natively.

        Available filters: status, patient_id, appointment_id,
        actual_period_start_from, actual_period_start_to, user_id, org_id.

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC consistency — not used here).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            status=filters.status,
            patient_id=filters.patient_id,
            appointment_id=filters.appointment_id,
            actual_period_start_from=(
                filters.actual_period_start_from.isoformat()
                if filters.actual_period_start_from
                else None
            ),
            actual_period_start_to=(
                filters.actual_period_start_to.isoformat()
                if filters.actual_period_start_to
                else None
            ),
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: EncounterPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update scalar fields on an Encounter.

        Rejects the request with 422 if the caller sends an empty body (all None)
        so the fhir-server receives a meaningful PATCH. `mode="json"` ensures
        datetime values are serialised to ISO strings.

        Patchable fields: status, actual_period_end, priority_* (4 fields),
        subject_status_* (4 fields), planned_end_date.

        Structural arrays (participant, diagnosis, location, etc.) and the subject
        reference are NOT patchable — delete and re-create the Encounter to change those.

        FhirClient.patch() stamps `updated_by` from actor.sub automatically.

        Args:
            resource_id: The encounter's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — used by FhirClient for updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Encounter resource dict.

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
        Permanently delete an Encounter and all its child records.

        The fhir-server cascades the delete to all child tables (participant,
        diagnosis, location, reason, identifier, etc.). This operation is irreversible.

        Args:
            resource_id: The encounter's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency — not used here).
        """
        await self._client.delete(resource_id)
