"""
Business logic layer for the Practitioner resource.

PractitionerService sits between the router and PractitionerClient. It owns:
  - Empty-patch rejection (422 if the caller sends an empty PATCH body)
  - Any future business rules (e.g. duplicate NPI detection)

The service does NOT inject created_by or updated_by — FhirClient does that.
The service does NOT inject user_id or org_id — the caller supplies them in the
request body (optional, matching the fhir-server schema).
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.practitioner import PractitionerClient
from app.schemas.practitioner.input import (
    ListPractitionersSchema,
    PractitionerAddressCreateSchema,
    PractitionerAddressPatchSchema,
    PractitionerCommunicationCreateSchema,
    PractitionerCommunicationPatchSchema,
    PractitionerCreateSchema,
    PractitionerFullCreateSchema,
    PractitionerFullPatchSchema,
    PractitionerIdentifierCreateSchema,
    PractitionerIdentifierPatchSchema,
    PractitionerNameCreateSchema,
    PractitionerNamePatchSchema,
    PractitionerPatchSchema,
    PractitionerPhotoCreateSchema,
    PractitionerPhotoPatchSchema,
    PractitionerQualificationCreateSchema,
    PractitionerQualificationPatchSchema,
    PractitionerTelecomCreateSchema,
    PractitionerTelecomPatchSchema,
)


class PractitionerService:
    """
    Service layer for Practitioner CRUD operations.

    Mediates between the FastAPI router and PractitionerClient. All methods
    accept an optional `accept` string threaded through to the fhir-server for
    content negotiation.
    """

    def __init__(self, client: PractitionerClient) -> None:
        """
        Initialise with a PractitionerClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for Practitioner operations.
        """
        self._client = client

    async def create(
        self,
        dto: PractitionerCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new Practitioner resource on the fhir-server.

        Serialises the DTO with exclude_none=True so Optional fields that
        were not provided are not sent as explicit nulls. FhirClient.post()
        stamps created_by from actor.sub automatically.

        Child sub-resources (name, identifier, telecom, address, photo,
        qualification, communication) are managed via separate fhir-server
        sub-routes and are NOT included in this call.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Practitioner dict (plain JSON or FHIR).
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create(payload, actor, accept=accept)

    async def create_full(
        self,
        dto: PractitionerFullCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a Practitioner and all sub-resources atomically in a single fhir-server request.

        Serialises the full DTO — Pydantic recurses into nested sub-resource lists
        so names/identifiers/qualifications/etc. are serialised correctly.
        exclude_none=True strips omitted optional arrays so the fhir-server doesn't see nulls.
        FhirClient.post() stamps created_by from actor.sub automatically.

        Args:
            dto:    Validated PractitionerFullCreateSchema from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Practitioner dict with all sub-resources populated.
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create_full(payload, actor, accept=accept)

    async def update_full(
        self,
        resource_id: int,
        dto: PractitionerFullPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update a Practitioner's scalar fields and/or rewrite any sub-resource arrays.

        Serialises with exclude_none=True so that:
          - Omitted / null fields → excluded from payload → fhir-server leaves them alone.
          - Empty lists [] → included in payload → fhir-server deletes all records of that type.
          - Non-empty lists → included in payload → fhir-server replaces all records.

        mode="json" is required to serialise date/datetime fields to ISO strings
        before httpx encodes the payload.

        Args:
            resource_id: The practitioner's integer primary key.
            dto:         Validated PractitionerFullPatchSchema from the router.
            actor:       Authenticated caller — used by FhirClient for updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Practitioner dict with all sub-resources populated.

        Raises:
            HTTPException(422): If the body is empty (all fields omitted / null).
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field or sub-resource array must be provided.",
            )
        return await self._client.patch_full(resource_id, payload, actor, accept=accept)

    async def get_by_id(
        self,
        resource_id: int,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Fetch a single Practitioner by integer primary key.

        The fhir-server populates all child arrays (name, identifier, telecom, etc.)
        in the response automatically.

        Args:
            resource_id: The practitioner's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Practitioner resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListPractitionersSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List Practitioners with optional filters.

        Forwards all non-None filter values. family_name and given_name search
        the practitioner_name child table on the fhir-server (partial, case-insensitive).

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC consistency).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            family_name=filters.family_name,
            given_name=filters.given_name,
            active=filters.active,
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: PractitionerPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update a Practitioner resource.

        Rejects the request with 422 if all fields are None (empty body).
        FhirClient.patch() stamps updated_by from actor.sub automatically.

        Only scalar fields are patchable here (active, gender, birth_date,
        deceased_*). Child arrays are managed via separate fhir-server sub-routes.

        Args:
            resource_id: The practitioner's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — used by FhirClient for updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Practitioner resource dict.

        Raises:
            HTTPException(422): If the patch body is empty.
        """
        # mode="json" serialises date/datetime fields to ISO strings so httpx
        # can encode the payload — without it, Python date objects are not JSON serializable.
        payload = dto.model_dump(exclude_none=True, mode="json")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )
        return await self._client.patch(resource_id, payload, actor, accept=accept)

    async def delete(self, resource_id: int, actor: AuthUser) -> None:
        """
        Permanently delete a Practitioner and all its child records.

        The fhir-server cascades the delete to all child tables (name, identifier,
        telecom, address, photo, qualification, communication). This operation
        is irreversible.

        Args:
            resource_id: The practitioner's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(resource_id)

    async def get_me(self, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Return the Practitioner record belonging to the authenticated user (Variant A — 1-to-1).

        Lists with user_id=actor.sub, limit=1 (always plain JSON for the pre-check),
        then re-fetches the found record by ID honouring `accept` for content negotiation.
        Raises 404 if no Practitioner is linked to this user.

        Args:
            actor:  Authenticated caller — JWT subject used as the user_id filter.
            accept: Content-type preference for the final re-fetch.

        Returns:
            The caller's Practitioner resource dict (plain JSON or FHIR R4).

        Raises:
            HTTPException(404): If no Practitioner is found for actor.sub.
        """
        # Internal pre-check: always plain JSON (omit accept) so we can inspect data[].
        result = await self._client.list(user_id=actor.sub, limit=1, offset=0)
        data = result.get("data", [])
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Practitioner record found for this user.",
            )
        # Re-fetch by ID so the correct Accept format is honoured in the response.
        return await self._client.get_by_id(data[0]["id"], accept=accept)

    def _require_patch_payload(self, payload: dict, sub_resource: str) -> None:
        """
        Reject empty PATCH bodies for sub-resources with a 422 error.

        Called at the top of every sub-resource patch method before delegating to
        the client. Prevents the fhir-server from receiving no-op update requests.

        Args:
            payload:      model_dump(exclude_none=True) result from the patch schema.
            sub_resource: Human-readable name used in the error message (e.g. "name").

        Raises:
            HTTPException(422): If payload is empty.
        """
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"At least one field must be provided to update a practitioner {sub_resource}.",
            )

    # ── Sub-resource: Names ───────────────────────────────────────────────────

    async def add_name(self, practitioner_id: int, dto: PractitionerNameCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a HumanName sub-resource to a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.add_name(practitioner_id, payload, actor, accept=accept)

    async def list_names(self, practitioner_id: int, accept: str | None = None) -> dict:
        """List all HumanName sub-resources for a Practitioner. Returns {data, total}."""
        return await self._client.list_names(practitioner_id, accept=accept)

    async def patch_name(self, practitioner_id: int, name_id: int, dto: PractitionerNamePatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Update a specific HumanName on a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "name")
        return await self._client.patch_name(practitioner_id, name_id, payload, actor, accept=accept)

    async def delete_name(self, practitioner_id: int, name_id: int, actor: AuthUser) -> None:
        """Remove a specific HumanName from a Practitioner."""
        await self._client.delete_name(practitioner_id, name_id)

    # ── Sub-resource: Identifiers ─────────────────────────────────────────────

    async def add_identifier(self, practitioner_id: int, dto: PractitionerIdentifierCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add an Identifier sub-resource to a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.add_identifier(practitioner_id, payload, actor, accept=accept)

    async def list_identifiers(self, practitioner_id: int, accept: str | None = None) -> dict:
        """List all Identifier sub-resources for a Practitioner. Returns {data, total}."""
        return await self._client.list_identifiers(practitioner_id, accept=accept)

    async def patch_identifier(self, practitioner_id: int, identifier_id: int, dto: PractitionerIdentifierPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Update a specific Identifier on a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "identifier")
        return await self._client.patch_identifier(practitioner_id, identifier_id, payload, actor, accept=accept)

    async def delete_identifier(self, practitioner_id: int, identifier_id: int, actor: AuthUser) -> None:
        """Remove a specific Identifier from a Practitioner."""
        await self._client.delete_identifier(practitioner_id, identifier_id)

    # ── Sub-resource: Telecom ─────────────────────────────────────────────────

    async def add_telecom(self, practitioner_id: int, dto: PractitionerTelecomCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a ContactPoint sub-resource to a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.add_telecom(practitioner_id, payload, actor, accept=accept)

    async def list_telecom(self, practitioner_id: int, accept: str | None = None) -> dict:
        """List all ContactPoint sub-resources for a Practitioner. Returns {data, total}."""
        return await self._client.list_telecom(practitioner_id, accept=accept)

    async def patch_telecom(self, practitioner_id: int, telecom_id: int, dto: PractitionerTelecomPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Update a specific ContactPoint on a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "telecom")
        return await self._client.patch_telecom(practitioner_id, telecom_id, payload, actor, accept=accept)

    async def delete_telecom(self, practitioner_id: int, telecom_id: int, actor: AuthUser) -> None:
        """Remove a specific ContactPoint from a Practitioner."""
        await self._client.delete_telecom(practitioner_id, telecom_id)

    # ── Sub-resource: Addresses ───────────────────────────────────────────────

    async def add_address(self, practitioner_id: int, dto: PractitionerAddressCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add an Address sub-resource to a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.add_address(practitioner_id, payload, actor, accept=accept)

    async def list_addresses(self, practitioner_id: int, accept: str | None = None) -> dict:
        """List all Address sub-resources for a Practitioner. Returns {data, total}."""
        return await self._client.list_addresses(practitioner_id, accept=accept)

    async def patch_address(self, practitioner_id: int, address_id: int, dto: PractitionerAddressPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Update a specific Address on a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "address")
        return await self._client.patch_address(practitioner_id, address_id, payload, actor, accept=accept)

    async def delete_address(self, practitioner_id: int, address_id: int, actor: AuthUser) -> None:
        """Remove a specific Address from a Practitioner."""
        await self._client.delete_address(practitioner_id, address_id)

    # ── Sub-resource: Photos ──────────────────────────────────────────────────

    async def add_photo(self, practitioner_id: int, dto: PractitionerPhotoCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a photo Attachment sub-resource to a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.add_photo(practitioner_id, payload, actor, accept=accept)

    async def list_photos(self, practitioner_id: int, accept: str | None = None) -> dict:
        """List all photo Attachment sub-resources for a Practitioner. Returns {data, total}."""
        return await self._client.list_photos(practitioner_id, accept=accept)

    async def patch_photo(self, practitioner_id: int, photo_id: int, dto: PractitionerPhotoPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Update a specific photo on a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "photo")
        return await self._client.patch_photo(practitioner_id, photo_id, payload, actor, accept=accept)

    async def delete_photo(self, practitioner_id: int, photo_id: int, actor: AuthUser) -> None:
        """Remove a specific photo from a Practitioner."""
        await self._client.delete_photo(practitioner_id, photo_id)

    # ── Sub-resource: Qualifications ──────────────────────────────────────────

    async def add_qualification(self, practitioner_id: int, dto: PractitionerQualificationCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a qualification sub-resource to a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.add_qualification(practitioner_id, payload, actor, accept=accept)

    async def list_qualifications(self, practitioner_id: int, accept: str | None = None) -> dict:
        """List all qualification sub-resources for a Practitioner. Returns {data, total}."""
        return await self._client.list_qualifications(practitioner_id, accept=accept)

    async def patch_qualification(self, practitioner_id: int, qualification_id: int, dto: PractitionerQualificationPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Update a specific qualification on a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "qualification")
        return await self._client.patch_qualification(practitioner_id, qualification_id, payload, actor, accept=accept)

    async def delete_qualification(self, practitioner_id: int, qualification_id: int, actor: AuthUser) -> None:
        """Remove a specific qualification from a Practitioner."""
        await self._client.delete_qualification(practitioner_id, qualification_id)

    # ── Sub-resource: Communications ──────────────────────────────────────────

    async def add_communication(self, practitioner_id: int, dto: PractitionerCommunicationCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a language/communication preference to a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.add_communication(practitioner_id, payload, actor, accept=accept)

    async def list_communications(self, practitioner_id: int, accept: str | None = None) -> dict:
        """List all language preferences for a Practitioner. Returns {data, total}."""
        return await self._client.list_communications(practitioner_id, accept=accept)

    async def patch_communication(self, practitioner_id: int, communication_id: int, dto: PractitionerCommunicationPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Update a specific language preference on a Practitioner. Returns full Practitioner."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "communication")
        return await self._client.patch_communication(practitioner_id, communication_id, payload, actor, accept=accept)

    async def delete_communication(self, practitioner_id: int, communication_id: int, actor: AuthUser) -> None:
        """Remove a specific language preference from a Practitioner."""
        await self._client.delete_communication(practitioner_id, communication_id)
