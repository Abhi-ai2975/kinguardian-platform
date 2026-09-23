"""
FHIR client for PractitionerRole resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path.
No business logic lives here — all validation and rules belong in PractitionerRoleService.

A PractitionerRole describes the role that a Practitioner plays within an Organisation
at a given Location and/or for a set of HealthcareServices. It is the main record
used for appointment scheduling (via Schedule / Slot) and booking directory queries.

Reference: https://hl7.org/fhir/R4/practitionerrole.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Confirmed in fhir-server routers/__init__.py: prefix="/practitioner-roles"
_PATH = "/practitioner-roles"


class PractitionerRoleClient:
    """
    Domain-specific HTTP client for PractitionerRole resources.

    Delegates every request to the shared FhirClient singleton. The `accept`
    parameter is threaded through all body-returning methods to honour content
    negotiation end-to-end.
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
        POST /practitioner-roles — create a new PractitionerRole resource.

        FhirClient.post() stamps `created_by: actor.sub` automatically.
        The payload may include child arrays (identifier, code, specialty,
        location, healthcare_service, characteristic, communication, contact,
        availability, endpoint) because the fhir-server accepts them in the
        create body.

        Args:
            data:   Serialised PractitionerRoleCreateSchema (exclude_none=True applied).
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created PractitionerRole dict.
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, resource_id: int, accept: str | None = None) -> dict:
        """
        GET /practitioner-roles/{resource_id} — fetch a single PractitionerRole.

        Args:
            resource_id: The practitioner_role's primary key on the fhir-server.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The PractitionerRole resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{resource_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /practitioner-roles — list PractitionerRoles with optional filters.

        Strips None values from **params to avoid sending null query strings.

        Supported params: active, practitioner_id, user_id, org_id, limit, offset.

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
        PATCH /practitioner-roles/{resource_id} — partially update a PractitionerRole.

        FhirClient.patch() stamps `updated_by: actor.sub` automatically.
        Only scalar fields are patchable (active, period_start, period_end,
        availability_exceptions). Child arrays cannot be patched.

        Args:
            resource_id: The practitioner_role's integer primary key.
            data:        Serialised PractitionerRolePatchSchema fields to update.
            actor:       Authenticated caller — used by FhirClient to stamp updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated PractitionerRole resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}", data, actor, accept=accept)

    async def list_for_booking(self, accept: str | None = None, **params) -> dict:
        """
        GET /practitioner-roles/booking — list practitioners enriched for booking UIs.

        Proxies to the fhir-server's /practitioner-roles/booking endpoint which joins
        each PractitionerRole with its linked Practitioner record (name, gender, photo,
        qualifications). Filters: active, specialty_code, day_of_week, limit, offset.

        Strips None values from **params to avoid sending null query strings.

        Args:
            accept:   Content-type preference forwarded to the fhir-server.
            **params: Arbitrary keyword filters; None values are dropped.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on `accept`.
        """
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(f"{_PATH}/booking", params=clean, accept=accept)

    async def delete(self, resource_id: int) -> None:
        """
        DELETE /practitioner-roles/{resource_id} — permanently remove a PractitionerRole.

        No `accept` parameter — 204 has no response body.

        Args:
            resource_id: The practitioner_role's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{resource_id}")
