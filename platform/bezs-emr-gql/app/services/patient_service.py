"""
Business logic service for the Patient resource and all its sub-resources.

PatientService sits between the router and PatientClient. It owns:
  - Empty-patch rejection (422 if the caller sends an empty PATCH body) for
    both the top-level Patient and every sub-resource PATCH endpoint.
  - JWT-scoped /me resolution: get_me() extracts user_id and org_id from the
    authenticated actor so the caller can never access another user's record.

The service does NOT inject created_by or updated_by — FhirClient does that
automatically from actor.sub on every POST and PATCH.

The service does NOT inject user_id or org_id into create payloads — the caller
supplies these in the request body (required fields in PatientCreateSchema).
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.patient import PatientClient
from app.schemas.patient.input import (
    AddressCreateSchema,
    AddressPatchSchema,
    CommunicationCreateSchema,
    CommunicationPatchSchema,
    ContactCreateSchema,
    ContactPatchSchema,
    GeneralPractitionerCreateSchema,
    GeneralPractitionerPatchSchema,
    IdentifierCreateSchema,
    IdentifierPatchSchema,
    LinkCreateSchema,
    LinkPatchSchema,
    ListPatientsSchema,
    NameCreateSchema,
    NamePatchSchema,
    PatientCreateSchema,
    PatientFullCreateSchema,
    PatientFullPatchSchema,
    PatientPatchSchema,
    PhotoCreateSchema,
    PhotoPatchSchema,
    TelecomCreateSchema,
    TelecomPatchSchema,
)


class PatientService:
    """
    Application service for Patient CRUD and sub-resource operations.

    Instantiated per-request by the DI container (PatientContainer) via
    Factory provider, so it holds no shared state between requests.
    """

    def __init__(self, client: PatientClient) -> None:
        """
        Args:
            client: The PatientClient injected by the DI container.
                    Provides fhir-server access for all Patient operations.
        """
        self._client = client

    # ── Core CRUD ─────────────────────────────────────────────────────────────

    async def create(self, dto: PatientCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Create a new Patient resource on the fhir-server.

        Serialises the DTO with exclude_none=True so Optional fields that were not
        provided are not sent as explicit nulls. FhirClient.post() stamps
        created_by from actor.sub automatically.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Patient dict (plain JSON or FHIR R4).
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create(payload, actor, accept=accept)

    async def create_full(self, dto: PatientFullCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Create a Patient and all sub-resources atomically in a single fhir-server request.

        Serialises the full DTO — Pydantic recurses into nested sub-resource lists
        so names/identifiers/etc. are serialised correctly. exclude_none=True strips
        any omitted optional arrays and fields so the fhir-server doesn't see nulls.
        FhirClient.post() stamps created_by from actor.sub automatically.

        Args:
            dto:    Validated PatientFullCreateSchema from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Patient dict with all sub-resources populated.
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create_full(payload, actor, accept=accept)

    async def update_full(
        self,
        patient_id: int,
        dto: PatientFullPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update a Patient's scalar fields and/or rewrite any sub-resource arrays.

        Serialises with exclude_none=True so that:
          - Omitted / null fields → excluded from payload → fhir-server leaves them alone.
          - Empty lists [] → included in payload → fhir-server deletes all records of that type.
          - Non-empty lists → included in payload → fhir-server replaces all records.

        mode="json" is required to serialise date/datetime fields to ISO strings
        before httpx encodes the payload.

        Args:
            patient_id: The patient's integer primary key.
            dto:        Validated PatientFullPatchSchema from the router.
            actor:      Authenticated caller — used by FhirClient for updated_by.
            accept:     Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Patient dict with all sub-resources populated.

        Raises:
            HTTPException(422): If the body is empty (all fields omitted / null).
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field or sub-resource array must be provided.",
            )
        return await self._client.patch_full(patient_id, payload, actor, accept=accept)

    async def get_by_id(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Fetch a single Patient by integer primary key.

        The fhir-server populates all child arrays (name, identifier, telecom, etc.)
        in the response automatically via eager-loading.

        Args:
            patient_id: The patient's integer ID on the fhir-server.
            actor:      Authenticated caller (kept for RBAC interface consistency).
            accept:     Content-type preference forwarded to the fhir-server.

        Returns:
            The Patient resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(patient_id, accept=accept)

    async def get_me(self, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Fetch the Patient record belonging to the authenticated caller.

        Queries the fhir-server with user_id=actor.sub and org_id=actor.org_id
        extracted from the JWT. The caller cannot override these — they can only
        ever retrieve their own Patient record. Returns 404 if no record exists.

        The internal list call omits `accept` when inspecting the result because
        we always need plain JSON to check the data array; the final returned
        dict uses the caller's accept preference.

        Args:
            actor:  Authenticated user — actor.sub is the user_id, actor.org_id is the org.
            accept: Content-type preference forwarded to the fhir-server for the response.

        Returns:
            The caller's Patient resource dict.

        Raises:
            HTTPException(404): If no Patient record is linked to this user.
        """
        # Use plain JSON for the lookup so we can inspect data[] regardless of
        # what format the client ultimately wants.
        result = await self._client.list(user_id=actor.sub, org_id=actor.org_id, limit=1, offset=0)
        data = result.get("data", [])
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Patient record found for this user.",
            )
        # Re-fetch by ID with the correct accept header so the response format
        # matches what the caller requested (plain JSON or FHIR R4).
        return await self._client.get_by_id(data[0]["id"], accept=accept)

    async def list(self, filters: ListPatientsSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """
        List Patients with optional filters and pagination.

        Forwards all non-None filter values to the fhir-server. family_name and
        given_name perform partial, case-insensitive matches against the
        patient_name child table on the fhir-server.

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC interface consistency).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            family_name=filters.family_name,
            given_name=filters.given_name,
            gender=filters.gender,
            active=filters.active,
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(self, patient_id: int, dto: PatientPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Partially update a Patient resource.

        Rejects the request with 422 if all fields are None (empty body).
        FhirClient.patch() stamps updated_by from actor.sub automatically.

        Args:
            patient_id: The patient's integer primary key.
            dto:        Validated patch input; at least one field must be non-None.
            actor:      Authenticated caller — used by FhirClient for updated_by.
            accept:     Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Patient resource dict.

        Raises:
            HTTPException(422): If the patch body is empty.
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )
        return await self._client.patch(patient_id, payload, actor, accept=accept)

    async def delete(self, patient_id: int, actor: AuthUser) -> None:
        """
        Permanently delete a Patient and all its child records.

        The fhir-server cascades the delete to all child tables. Irreversible.

        Args:
            patient_id: The patient's integer primary key to delete.
            actor:      Authenticated caller (kept for RBAC interface consistency).
        """
        await self._client.delete(patient_id)

    # ── Helper: empty-patch guard ──────────────────────────────────────────────

    def _require_patch_payload(self, payload: dict, sub_resource: str) -> None:
        """
        Raise 422 if a sub-resource PATCH payload is empty.

        Centralises the empty-patch check so each sub-resource update method
        doesn't repeat the same error-raising logic.

        Args:
            payload:      Result of dto.model_dump(exclude_none=True, mode="json").
            sub_resource: Human-readable name used in the error message.

        Raises:
            HTTPException(422): If payload is empty.
        """
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"At least one field must be provided to update {sub_resource}.",
            )

    # ── Names ─────────────────────────────────────────────────────────────────

    async def add_name(self, patient_id: int, dto: NameCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a HumanName to a Patient. Returns the full updated Patient."""
        return await self._client.add_name(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_names(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all HumanName entries for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_names(patient_id, accept=accept)

    async def patch_name(self, patient_id: int, name_id: int, dto: NamePatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient HumanName. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "name")
        return await self._client.patch_name(patient_id, name_id, payload, actor, accept=accept)

    async def delete_name(self, patient_id: int, name_id: int, actor: AuthUser) -> None:
        """Remove a specific HumanName from a Patient."""
        await self._client.delete_name(patient_id, name_id)

    # ── Identifiers ───────────────────────────────────────────────────────────

    async def add_identifier(self, patient_id: int, dto: IdentifierCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add an Identifier to a Patient. Returns the full updated Patient."""
        return await self._client.add_identifier(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_identifiers(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all Identifiers for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_identifiers(patient_id, accept=accept)

    async def patch_identifier(self, patient_id: int, identifier_id: int, dto: IdentifierPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient Identifier. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "identifier")
        return await self._client.patch_identifier(patient_id, identifier_id, payload, actor, accept=accept)

    async def delete_identifier(self, patient_id: int, identifier_id: int, actor: AuthUser) -> None:
        """Remove a specific Identifier from a Patient."""
        await self._client.delete_identifier(patient_id, identifier_id)

    # ── Telecom ───────────────────────────────────────────────────────────────

    async def add_telecom(self, patient_id: int, dto: TelecomCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a ContactPoint (telecom) to a Patient. Returns the full updated Patient."""
        return await self._client.add_telecom(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_telecom(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all telecom entries for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_telecom(patient_id, accept=accept)

    async def patch_telecom(self, patient_id: int, telecom_id: int, dto: TelecomPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient ContactPoint. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "telecom")
        return await self._client.patch_telecom(patient_id, telecom_id, payload, actor, accept=accept)

    async def delete_telecom(self, patient_id: int, telecom_id: int, actor: AuthUser) -> None:
        """Remove a specific telecom entry from a Patient."""
        await self._client.delete_telecom(patient_id, telecom_id)

    # ── Addresses ─────────────────────────────────────────────────────────────

    async def add_address(self, patient_id: int, dto: AddressCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add an Address to a Patient. Returns the full updated Patient."""
        return await self._client.add_address(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_addresses(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all Addresses for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_addresses(patient_id, accept=accept)

    async def patch_address(self, patient_id: int, address_id: int, dto: AddressPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient Address. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "address")
        return await self._client.patch_address(patient_id, address_id, payload, actor, accept=accept)

    async def delete_address(self, patient_id: int, address_id: int, actor: AuthUser) -> None:
        """Remove a specific Address from a Patient."""
        await self._client.delete_address(patient_id, address_id)

    # ── Photos ────────────────────────────────────────────────────────────────

    async def add_photo(self, patient_id: int, dto: PhotoCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add an Attachment (photo) to a Patient. Returns the full updated Patient."""
        return await self._client.add_photo(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_photos(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all photos for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_photos(patient_id, accept=accept)

    async def patch_photo(self, patient_id: int, photo_id: int, dto: PhotoPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient photo Attachment. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "photo")
        return await self._client.patch_photo(patient_id, photo_id, payload, actor, accept=accept)

    async def delete_photo(self, patient_id: int, photo_id: int, actor: AuthUser) -> None:
        """Remove a specific photo from a Patient."""
        await self._client.delete_photo(patient_id, photo_id)

    # ── Contacts ──────────────────────────────────────────────────────────────

    async def add_contact(self, patient_id: int, dto: ContactCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a contact (next-of-kin/guardian) to a Patient. Returns the full updated Patient."""
        return await self._client.add_contact(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_contacts(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all contacts for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_contacts(patient_id, accept=accept)

    async def patch_contact(self, patient_id: int, contact_id: int, dto: ContactPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient contact. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "contact")
        return await self._client.patch_contact(patient_id, contact_id, payload, actor, accept=accept)

    async def delete_contact(self, patient_id: int, contact_id: int, actor: AuthUser) -> None:
        """Remove a specific contact (and its child relationship/telecom records) from a Patient."""
        await self._client.delete_contact(patient_id, contact_id)

    # ── Communications ────────────────────────────────────────────────────────

    async def add_communication(self, patient_id: int, dto: CommunicationCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a language/communication preference to a Patient. Returns the full updated Patient."""
        return await self._client.add_communication(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_communications(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all communication preferences for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_communications(patient_id, accept=accept)

    async def patch_communication(self, patient_id: int, comm_id: int, dto: CommunicationPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient communication entry. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "communication")
        return await self._client.patch_communication(patient_id, comm_id, payload, actor, accept=accept)

    async def delete_communication(self, patient_id: int, comm_id: int, actor: AuthUser) -> None:
        """Remove a specific communication entry from a Patient."""
        await self._client.delete_communication(patient_id, comm_id)

    # ── General Practitioners ─────────────────────────────────────────────────

    async def add_general_practitioner(self, patient_id: int, dto: GeneralPractitionerCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a generalPractitioner reference to a Patient. Returns the full updated Patient."""
        return await self._client.add_general_practitioner(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_general_practitioners(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all generalPractitioner references for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_general_practitioners(patient_id, accept=accept)

    async def patch_general_practitioner(self, patient_id: int, gp_id: int, dto: GeneralPractitionerPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient generalPractitioner reference. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "general practitioner")
        return await self._client.patch_general_practitioner(patient_id, gp_id, payload, actor, accept=accept)

    async def delete_general_practitioner(self, patient_id: int, gp_id: int, actor: AuthUser) -> None:
        """Remove a specific generalPractitioner reference from a Patient."""
        await self._client.delete_general_practitioner(patient_id, gp_id)

    # ── Links ─────────────────────────────────────────────────────────────────

    async def add_link(self, patient_id: int, dto: LinkCreateSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Add a link to a related Patient or RelatedPerson. Returns the full updated Patient."""
        return await self._client.add_link(patient_id, dto.model_dump(exclude_none=True, mode="json"), actor, accept=accept)

    async def list_links(self, patient_id: int, actor: AuthUser, accept: str | None = None) -> dict:
        """List all links for a Patient. Returns {data: [...], total: N}."""
        return await self._client.list_links(patient_id, accept=accept)

    async def patch_link(self, patient_id: int, link_id: int, dto: LinkPatchSchema, actor: AuthUser, accept: str | None = None) -> dict:
        """Partially update a Patient link. Returns the full updated Patient."""
        payload = dto.model_dump(exclude_none=True, mode="json")
        self._require_patch_payload(payload, "link")
        return await self._client.patch_link(patient_id, link_id, payload, actor, accept=accept)

    async def delete_link(self, patient_id: int, link_id: int, actor: AuthUser) -> None:
        """Remove a specific link from a Patient."""
        await self._client.delete_link(patient_id, link_id)
