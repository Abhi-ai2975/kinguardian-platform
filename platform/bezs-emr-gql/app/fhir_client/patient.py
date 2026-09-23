"""
FHIR client for Patient resources.

Thin wrapper around the shared FhirClient that knows the fhir-server paths for
the Patient resource and all its sub-resources. No business logic lives here —
all validation and rules belong in PatientService.

A Patient is a person receiving care or other health-related services.
Sub-resources (names, identifiers, telecom, addresses, photos, contacts,
communications, general_practitioners, links) are managed via dedicated
sub-routes on the fhir-server.

All sub-resource schemas use extra="forbid" and contain no created_by /
updated_by fields, so every sub-resource POST and PATCH passes inject_audit=False
to prevent FhirClient from injecting those fields into the body.

Reference: https://hl7.org/fhir/R4/patient.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Base path for all Patient endpoints on the fhir-server.
_PATH = "/patients"


class PatientClient:
    """
    Domain-specific HTTP client for Patient resources.

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

    # ── Core CRUD ─────────────────────────────────────────────────────────────

    async def create(self, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        POST /patients — create a new Patient resource.

        FhirClient.post() stamps `created_by: actor.sub` automatically.

        Args:
            data:   Serialised PatientCreateSchema (exclude_none=True applied upstream).
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Patient dict (plain JSON or FHIR R4).
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def create_full(self, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        POST /patients/full — create a Patient and all sub-resources atomically.

        The fhir-server wraps every insert in a single DB transaction so the
        Patient and all provided sub-resource rows are created together or not
        at all. FhirClient.post() stamps `created_by: actor.sub` automatically.

        Args:
            data:   Serialised PatientFullCreateSchema (exclude_none=True applied upstream).
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Patient dict with all sub-resources populated.
        """
        return await self._fhir.post(f"{_PATH}/full", data, actor, accept=accept)

    async def patch_full(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        PATCH /patients/{patient_id}/full — update scalar fields and/or rewrite sub-resources.

        The fhir-server interprets the payload as follows:
          - Key absent / null → sub-resource left completely untouched.
          - Key present as [] → all records of that sub-resource type are deleted.
          - Key present as [{...}] → all records replaced with the provided items.

        FhirClient.patch() stamps `updated_by: actor.sub` automatically.

        Args:
            patient_id: The patient's integer primary key.
            data:       Serialised PatientFullPatchSchema (exclude_none=True, mode="json" applied upstream).
            actor:      Authenticated caller — used by FhirClient to stamp updated_by.
            accept:     Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Patient dict with all sub-resources populated.
        """
        return await self._fhir.patch(f"{_PATH}/{patient_id}/full", data, actor, accept=accept)

    async def get_by_id(self, patient_id: int, accept: str | None = None) -> dict:
        """
        GET /patients/{patient_id} — fetch a single Patient by integer ID.

        The fhir-server populates all child arrays in the response automatically.

        Args:
            patient_id: The patient's integer primary key on the fhir-server.
            accept:     Content-type preference forwarded to the fhir-server.

        Returns:
            The Patient resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{patient_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /patients — list Patients with optional filters.

        Strips None values from **params to avoid sending null query strings
        (e.g. `?name=None` would be rejected by the fhir-server).

        Supported params: family_name, given_name, gender, active, user_id,
        org_id, limit, offset.

        Args:
            accept:   Content-type preference forwarded to the fhir-server.
            **params: Arbitrary keyword filters; None values are dropped.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on `accept`.
        """
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        PATCH /patients/{patient_id} — partially update a Patient.

        FhirClient.patch() stamps `updated_by: actor.sub` automatically.

        Args:
            patient_id: The patient's integer primary key.
            data:       Serialised PatientPatchSchema fields to update.
            actor:      Authenticated caller — used by FhirClient to stamp updated_by.
            accept:     Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Patient resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{patient_id}", data, actor, accept=accept)

    async def delete(self, patient_id: int) -> None:
        """
        DELETE /patients/{patient_id} — permanently remove a Patient and all child records.

        No `accept` parameter — 204 has no response body.

        Args:
            patient_id: The patient's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{patient_id}")

    # ── Names ─────────────────────────────────────────────────────────────────

    async def add_name(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/names — add a HumanName to a Patient."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/names", data, actor, accept=accept, inject_audit=False)

    async def list_names(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/names — list all names for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/names", accept=accept)

    async def patch_name(self, patient_id: int, name_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/names/{name_id} — update a specific name."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/names/{name_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_name(self, patient_id: int, name_id: int) -> None:
        """DELETE /patients/{patient_id}/names/{name_id} — remove a specific name."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/names/{name_id}")

    # ── Identifiers ───────────────────────────────────────────────────────────

    async def add_identifier(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/identifiers — add an Identifier to a Patient."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/identifiers", data, actor, accept=accept, inject_audit=False)

    async def list_identifiers(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/identifiers — list all identifiers for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/identifiers", accept=accept)

    async def patch_identifier(self, patient_id: int, identifier_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/identifiers/{identifier_id} — update a specific identifier."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/identifiers/{identifier_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_identifier(self, patient_id: int, identifier_id: int) -> None:
        """DELETE /patients/{patient_id}/identifiers/{identifier_id} — remove a specific identifier."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/identifiers/{identifier_id}")

    # ── Telecom ───────────────────────────────────────────────────────────────

    async def add_telecom(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/telecom — add a ContactPoint to a Patient."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/telecom", data, actor, accept=accept, inject_audit=False)

    async def list_telecom(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/telecom — list all telecom entries for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/telecom", accept=accept)

    async def patch_telecom(self, patient_id: int, telecom_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/telecom/{telecom_id} — update a specific telecom entry."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/telecom/{telecom_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_telecom(self, patient_id: int, telecom_id: int) -> None:
        """DELETE /patients/{patient_id}/telecom/{telecom_id} — remove a specific telecom entry."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/telecom/{telecom_id}")

    # ── Addresses ─────────────────────────────────────────────────────────────

    async def add_address(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/addresses — add an Address to a Patient."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/addresses", data, actor, accept=accept, inject_audit=False)

    async def list_addresses(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/addresses — list all addresses for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/addresses", accept=accept)

    async def patch_address(self, patient_id: int, address_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/addresses/{address_id} — update a specific address."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/addresses/{address_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_address(self, patient_id: int, address_id: int) -> None:
        """DELETE /patients/{patient_id}/addresses/{address_id} — remove a specific address."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/addresses/{address_id}")

    # ── Photos ────────────────────────────────────────────────────────────────

    async def add_photo(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/photos — add an Attachment (photo) to a Patient."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/photos", data, actor, accept=accept, inject_audit=False)

    async def list_photos(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/photos — list all photos for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/photos", accept=accept)

    async def patch_photo(self, patient_id: int, photo_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/photos/{photo_id} — update a specific photo."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/photos/{photo_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_photo(self, patient_id: int, photo_id: int) -> None:
        """DELETE /patients/{patient_id}/photos/{photo_id} — remove a specific photo."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/photos/{photo_id}")

    # ── Contacts ──────────────────────────────────────────────────────────────

    async def add_contact(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/contacts — add a contact (next-of-kin/guardian) to a Patient."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/contacts", data, actor, accept=accept, inject_audit=False)

    async def list_contacts(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/contacts — list all contacts for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/contacts", accept=accept)

    async def patch_contact(self, patient_id: int, contact_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/contacts/{contact_id} — update a specific contact."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/contacts/{contact_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_contact(self, patient_id: int, contact_id: int) -> None:
        """DELETE /patients/{patient_id}/contacts/{contact_id} — remove a specific contact and its child records."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/contacts/{contact_id}")

    # ── Communications ────────────────────────────────────────────────────────

    async def add_communication(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/communications — add a language/communication preference to a Patient."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/communications", data, actor, accept=accept, inject_audit=False)

    async def list_communications(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/communications — list all communication entries for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/communications", accept=accept)

    async def patch_communication(self, patient_id: int, comm_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/communications/{comm_id} — update a specific communication entry."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/communications/{comm_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_communication(self, patient_id: int, comm_id: int) -> None:
        """DELETE /patients/{patient_id}/communications/{comm_id} — remove a specific communication entry."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/communications/{comm_id}")

    # ── General Practitioners ─────────────────────────────────────────────────

    async def add_general_practitioner(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/general-practitioners — add a GP reference to a Patient."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/general-practitioners", data, actor, accept=accept, inject_audit=False)

    async def list_general_practitioners(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/general-practitioners — list all GP references for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/general-practitioners", accept=accept)

    async def patch_general_practitioner(self, patient_id: int, gp_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/general-practitioners/{gp_id} — update a specific GP reference."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/general-practitioners/{gp_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_general_practitioner(self, patient_id: int, gp_id: int) -> None:
        """DELETE /patients/{patient_id}/general-practitioners/{gp_id} — remove a specific GP reference."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/general-practitioners/{gp_id}")

    # ── Links ─────────────────────────────────────────────────────────────────

    async def add_link(self, patient_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """POST /patients/{patient_id}/links — add a link to a related Patient or RelatedPerson."""
        return await self._fhir.post(f"{_PATH}/{patient_id}/links", data, actor, accept=accept, inject_audit=False)

    async def list_links(self, patient_id: int, accept: str | None = None) -> dict:
        """GET /patients/{patient_id}/links — list all links for a Patient."""
        return await self._fhir.get(f"{_PATH}/{patient_id}/links", accept=accept)

    async def patch_link(self, patient_id: int, link_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """PATCH /patients/{patient_id}/links/{link_id} — update a specific link."""
        return await self._fhir.patch(f"{_PATH}/{patient_id}/links/{link_id}", data, actor, accept=accept, inject_audit=False)

    async def delete_link(self, patient_id: int, link_id: int) -> None:
        """DELETE /patients/{patient_id}/links/{link_id} — remove a specific link."""
        await self._fhir.delete(f"{_PATH}/{patient_id}/links/{link_id}")
