"""
FHIR client for Practitioner resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path.
No business logic lives here — all validation and rules belong in PractitionerService.

A Practitioner is a person who is directly or indirectly involved in the
provisioning of healthcare. This resource stores the practitioner's demographics
(name, gender, birthDate) and credentials (qualification, identifier).
Child records (names, identifiers, telecom, address, photo, qualification,
communication) are managed via separate sub-routes on the fhir-server.

All sub-resource schemas use extra="forbid" and contain no created_by /
updated_by fields, so every sub-resource POST and PATCH passes inject_audit=False
to prevent FhirClient from injecting those fields into the body.

Reference: https://hl7.org/fhir/R4/practitioner.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Confirmed in fhir-server routers/__init__.py: prefix="/practitioners"
_PATH = "/practitioners"


class PractitionerClient:
    """
    Domain-specific HTTP client for Practitioner resources.

    Delegates every request to the shared FhirClient singleton, which handles
    authentication headers, base-URL resolution, and error propagation.
    The `accept` parameter is threaded through all body-returning methods so
    the caller can request plain JSON or FHIR R4 format.
    """

    def __init__(self, fhir: FhirClient) -> None:
        """
        Initialise with a shared FhirClient injected by the DI container.

        Args:
            fhir: The singleton FhirClient — owns the httpx session and base URL config.
        """
        self._fhir = fhir

    async def create(self, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        POST /practitioners — create a new Practitioner resource.

        FhirClient.post() stamps `created_by: actor.sub` automatically.
        The payload should only contain top-level scalar fields (active, gender,
        birth_date, deceased_*) — child arrays are not accepted at creation time.

        Args:
            data:   Serialised PractitionerCreateSchema (exclude_none=True applied).
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Practitioner as a dict.
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def create_full(self, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        POST /practitioners/full — create a Practitioner and all sub-resources atomically.

        The fhir-server wraps every insert in a single DB transaction so the
        Practitioner and all provided sub-resource rows are created together or not
        at all. FhirClient.post() stamps `created_by: actor.sub` automatically.

        Args:
            data:   Serialised PractitionerFullCreateSchema (exclude_none=True applied upstream).
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Practitioner dict with all sub-resources populated.
        """
        return await self._fhir.post(f"{_PATH}/full", data, actor, accept=accept)

    async def patch_full(self, resource_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        PATCH /practitioners/{resource_id}/full — update scalar fields and/or rewrite sub-resources.

        The fhir-server interprets the payload as follows:
          - Key absent / null → sub-resource left completely untouched.
          - Key present as [] → all records of that sub-resource type are deleted.
          - Key present as [{...}] → all records replaced with the provided items.

        FhirClient.patch() stamps `updated_by: actor.sub` automatically.

        Args:
            resource_id: The practitioner's integer primary key.
            data:        Serialised PractitionerFullPatchSchema (exclude_none=True, mode="json" applied upstream).
            actor:       Authenticated caller — used by FhirClient to stamp updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Practitioner dict with all sub-resources populated.
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}/full", data, actor, accept=accept)

    async def get_by_id(self, resource_id: int, accept: str | None = None) -> dict:
        """
        GET /practitioners/{resource_id} — fetch a single Practitioner by integer ID.

        Args:
            resource_id: The practitioner's primary key on the fhir-server.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Practitioner resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{resource_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /practitioners — list Practitioners with optional filters.

        Strips None values from **params to avoid sending null query strings.

        Supported params: family_name, given_name, active, user_id, org_id,
        limit, offset.

        Args:
            accept:   Content-type preference forwarded to the fhir-server.
            **params: Arbitrary keyword filters; None values are dropped.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on `accept`.
        """
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(self, resource_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        PATCH /practitioners/{resource_id} — partially update a Practitioner.

        FhirClient.patch() stamps `updated_by: actor.sub` automatically.
        Only scalar fields are patchable (active, gender, birth_date, deceased_*).
        Child arrays are managed via separate sub-routes on the fhir-server.

        Args:
            resource_id: The practitioner's integer primary key.
            data:        Serialised PractitionerPatchSchema fields to update.
            actor:       Authenticated caller — used by FhirClient to stamp updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Practitioner resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}", data, actor, accept=accept)

    async def delete(self, resource_id: int) -> None:
        """
        DELETE /practitioners/{resource_id} — permanently remove a Practitioner.

        No `accept` parameter — 204 has no response body.

        Args:
            resource_id: The practitioner's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{resource_id}")

    # ── Sub-resource: Names ───────────────────────────────────────────────────

    async def add_name(self, practitioner_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /practitioners/{id}/names — add a HumanName to a Practitioner."""
        return await self._fhir.post(f"{_PATH}/{practitioner_id}/names", data, actor, accept=accept, inject_audit=False)

    async def list_names(self, practitioner_id: int, accept: str | None = None) -> dict:
        """GET /practitioners/{id}/names — list all names for a Practitioner."""
        return await self._fhir.get(f"{_PATH}/{practitioner_id}/names", accept=accept)

    async def patch_name(self, practitioner_id: int, name_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /practitioners/{id}/names/{name_id} — update a specific name."""
        return await self._fhir.patch(f"{_PATH}/{practitioner_id}/names/{name_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_name(self, practitioner_id: int, name_id: int) -> None:
        """DELETE /practitioners/{id}/names/{name_id} — remove a specific name."""
        await self._fhir.delete(f"{_PATH}/{practitioner_id}/names/{name_id}")

    # ── Sub-resource: Identifiers ─────────────────────────────────────────────

    async def add_identifier(self, practitioner_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /practitioners/{id}/identifiers — add an Identifier to a Practitioner."""
        return await self._fhir.post(f"{_PATH}/{practitioner_id}/identifiers", data, actor, accept=accept, inject_audit=False)

    async def list_identifiers(self, practitioner_id: int, accept: str | None = None) -> dict:
        """GET /practitioners/{id}/identifiers — list all identifiers for a Practitioner."""
        return await self._fhir.get(f"{_PATH}/{practitioner_id}/identifiers", accept=accept)

    async def patch_identifier(self, practitioner_id: int, identifier_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /practitioners/{id}/identifiers/{identifier_id} — update a specific identifier."""
        return await self._fhir.patch(f"{_PATH}/{practitioner_id}/identifiers/{identifier_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_identifier(self, practitioner_id: int, identifier_id: int) -> None:
        """DELETE /practitioners/{id}/identifiers/{identifier_id} — remove an identifier."""
        await self._fhir.delete(f"{_PATH}/{practitioner_id}/identifiers/{identifier_id}")

    # ── Sub-resource: Telecom ─────────────────────────────────────────────────

    async def add_telecom(self, practitioner_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /practitioners/{id}/telecom — add a ContactPoint to a Practitioner."""
        return await self._fhir.post(f"{_PATH}/{practitioner_id}/telecom", data, actor, accept=accept, inject_audit=False)

    async def list_telecom(self, practitioner_id: int, accept: str | None = None) -> dict:
        """GET /practitioners/{id}/telecom — list all contact points for a Practitioner."""
        return await self._fhir.get(f"{_PATH}/{practitioner_id}/telecom", accept=accept)

    async def patch_telecom(self, practitioner_id: int, telecom_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /practitioners/{id}/telecom/{telecom_id} — update a specific contact point."""
        return await self._fhir.patch(f"{_PATH}/{practitioner_id}/telecom/{telecom_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_telecom(self, practitioner_id: int, telecom_id: int) -> None:
        """DELETE /practitioners/{id}/telecom/{telecom_id} — remove a contact point."""
        await self._fhir.delete(f"{_PATH}/{practitioner_id}/telecom/{telecom_id}")

    # ── Sub-resource: Addresses ───────────────────────────────────────────────

    async def add_address(self, practitioner_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /practitioners/{id}/addresses — add an Address to a Practitioner."""
        return await self._fhir.post(f"{_PATH}/{practitioner_id}/addresses", data, actor, accept=accept, inject_audit=False)

    async def list_addresses(self, practitioner_id: int, accept: str | None = None) -> dict:
        """GET /practitioners/{id}/addresses — list all addresses for a Practitioner."""
        return await self._fhir.get(f"{_PATH}/{practitioner_id}/addresses", accept=accept)

    async def patch_address(self, practitioner_id: int, address_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /practitioners/{id}/addresses/{address_id} — update a specific address."""
        return await self._fhir.patch(f"{_PATH}/{practitioner_id}/addresses/{address_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_address(self, practitioner_id: int, address_id: int) -> None:
        """DELETE /practitioners/{id}/addresses/{address_id} — remove an address."""
        await self._fhir.delete(f"{_PATH}/{practitioner_id}/addresses/{address_id}")

    # ── Sub-resource: Photos ──────────────────────────────────────────────────

    async def add_photo(self, practitioner_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /practitioners/{id}/photos — add a photo Attachment to a Practitioner."""
        return await self._fhir.post(f"{_PATH}/{practitioner_id}/photos", data, actor, accept=accept, inject_audit=False)

    async def list_photos(self, practitioner_id: int, accept: str | None = None) -> dict:
        """GET /practitioners/{id}/photos — list all photos for a Practitioner."""
        return await self._fhir.get(f"{_PATH}/{practitioner_id}/photos", accept=accept)

    async def patch_photo(self, practitioner_id: int, photo_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /practitioners/{id}/photos/{photo_id} — update a photo."""
        return await self._fhir.patch(f"{_PATH}/{practitioner_id}/photos/{photo_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_photo(self, practitioner_id: int, photo_id: int) -> None:
        """DELETE /practitioners/{id}/photos/{photo_id} — remove a photo."""
        await self._fhir.delete(f"{_PATH}/{practitioner_id}/photos/{photo_id}")

    # ── Sub-resource: Qualifications ──────────────────────────────────────────

    async def add_qualification(self, practitioner_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /practitioners/{id}/qualifications — add a qualification to a Practitioner."""
        return await self._fhir.post(f"{_PATH}/{practitioner_id}/qualifications", data, actor, accept=accept, inject_audit=False)

    async def list_qualifications(self, practitioner_id: int, accept: str | None = None) -> dict:
        """GET /practitioners/{id}/qualifications — list all qualifications for a Practitioner."""
        return await self._fhir.get(f"{_PATH}/{practitioner_id}/qualifications", accept=accept)

    async def patch_qualification(self, practitioner_id: int, qualification_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /practitioners/{id}/qualifications/{qual_id} — update a qualification."""
        return await self._fhir.patch(f"{_PATH}/{practitioner_id}/qualifications/{qualification_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_qualification(self, practitioner_id: int, qualification_id: int) -> None:
        """DELETE /practitioners/{id}/qualifications/{qual_id} — remove a qualification."""
        await self._fhir.delete(f"{_PATH}/{practitioner_id}/qualifications/{qualification_id}")

    # ── Sub-resource: Communications ──────────────────────────────────────────

    async def add_communication(self, practitioner_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /practitioners/{id}/communications — add a language preference to a Practitioner."""
        return await self._fhir.post(f"{_PATH}/{practitioner_id}/communications", data, actor, accept=accept, inject_audit=False)

    async def list_communications(self, practitioner_id: int, accept: str | None = None) -> dict:
        """GET /practitioners/{id}/communications — list all language preferences for a Practitioner."""
        return await self._fhir.get(f"{_PATH}/{practitioner_id}/communications", accept=accept)

    async def patch_communication(self, practitioner_id: int, communication_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /practitioners/{id}/communications/{comm_id} — update a language preference."""
        return await self._fhir.patch(f"{_PATH}/{practitioner_id}/communications/{communication_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_communication(self, practitioner_id: int, communication_id: int) -> None:
        """DELETE /practitioners/{id}/communications/{comm_id} — remove a language preference."""
        await self._fhir.delete(f"{_PATH}/{practitioner_id}/communications/{communication_id}")
