"""
FHIR client for Slot resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path for Slots.
No business logic lives here — all validation and rules belong in SlotService.

A Slot is a bookable time window that belongs to a Schedule. Slots are consumed when
Appointments are created against them.

Reference: https://hl7.org/fhir/R4/slot.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# The fhir-server registers this resource at /slots (confirmed in fhir-server routers/__init__.py).
_PATH = "/slots"


class SlotClient:
    """
    Domain-specific HTTP client for Slot resources.

    Delegates every request to the shared FhirClient singleton, which handles
    authentication headers, base-URL resolution, and error propagation.

    The `accept` parameter threads through every method that returns a response body
    so the router can request either `application/json` or `application/fhir+json`
    from the fhir-server, matching whatever the calling client sent.
    """

    def __init__(self, fhir: FhirClient) -> None:
        """
        Initialise with a shared FhirClient instance injected by the DI container.

        Args:
            fhir: The singleton FhirClient — owns the httpx session and base URL config.
        """
        self._fhir = fhir

    async def create(self, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        POST /slots — create a new Slot resource on the fhir-server.

        FhirClient.post() automatically stamps `created_by: actor.sub` into the payload
        before forwarding, so the service layer must NOT include `created_by`.

        Args:
            data:   Serialised SlotCreateSchema (exclude_none=True already applied).
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Slot as a dict (plain or FHIR, depending on `accept`).
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, resource_id: int, accept: str | None = None) -> dict:
        """
        GET /slots/{resource_id} — fetch a single Slot by its integer ID.

        Args:
            resource_id: The slot's primary key on the fhir-server.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Slot resource dict (plain or FHIR depending on `accept`).
        """
        return await self._fhir.get(f"{_PATH}/{resource_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /slots — list Slots with optional filter parameters.

        Strips None values from **params before forwarding to avoid sending
        `?status=None` or similar junk query strings to the fhir-server.

        Supported params: status, schedule_id, practitioner_role_id, user_id, org_id,
        limit, offset.

        Args:
            accept: Content-type preference forwarded to the fhir-server.
            **params: Arbitrary keyword filters; None values are dropped.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on `accept`.
        """
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(self, resource_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        PATCH /slots/{resource_id} — partially update a Slot.

        FhirClient.patch() automatically stamps `updated_by: actor.sub` before forwarding.
        Arrays (identifier, serviceCategory, serviceType, specialty) and the `schedule`
        reference are not patchable — delete and re-create to change those.

        Args:
            resource_id: The slot's integer primary key.
            data:        Serialised SlotPatchSchema with only the fields to update.
            actor:       Authenticated caller — used by FhirClient to stamp updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Slot resource dict (plain or FHIR depending on `accept`).
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}", data, actor, accept=accept)

    async def delete(self, resource_id: int) -> None:
        """
        DELETE /slots/{resource_id} — permanently remove a Slot.

        The fhir-server cascades the delete to all child records (identifier,
        serviceCategory, serviceType, specialty). No `accept` parameter — 204 carries
        no response body.

        Args:
            resource_id: The slot's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{resource_id}")
