"""
FHIR client for Appointment resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path for
Appointment. No business logic lives here.

Unlike Patient or Practitioner, the fhir-server has NO separate sub-resource
routes for Appointment. All child arrays (participant, slot, reason, etc.) are
created in the POST body and are immutable after creation. Only scalar fields
can be updated via PATCH.

Reference: https://hl7.org/fhir/R4/appointment.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Confirmed in fhir-server routers/__init__.py: prefix="/appointments"
_PATH = "/appointments"


class AppointmentClient:
    """
    Domain-specific HTTP client for Appointment resources.

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
        POST /appointments — create a new Appointment resource.

        FhirClient.post() stamps `created_by: actor.sub` automatically.
        The payload must include at least one participant. All child arrays
        (slot, reason, virtual_service, etc.) are embedded in this single call.

        Args:
            data:   Serialised AppointmentCreateSchema (by_alias=True, exclude_none=True applied).
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Appointment as a dict (plain JSON or FHIR R4).
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, appointment_id: int, accept: str | None = None) -> dict:
        """
        GET /appointments/{appointment_id} — fetch a single Appointment by integer ID.

        The fhir-server returns all child arrays nested in the response.

        Args:
            appointment_id: The appointment's integer primary key.
            accept:         Content-type preference forwarded to the fhir-server.

        Returns:
            The full Appointment resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{appointment_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /appointments — list Appointments with optional filters.

        Strips None values from **params to avoid sending null query strings.

        Supported params: status, patient_id, start_from, start_to,
        user_id, org_id, limit, offset.

        Args:
            accept:   Content-type preference forwarded to the fhir-server.
            **params: Arbitrary keyword filters; None values are dropped.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on `accept`.
        """
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(self, appointment_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        PATCH /appointments/{appointment_id} — partially update scalar fields.

        Only scalar fields are patchable (status, start, end, minutes_duration,
        description, cancellation_date, priority_*, recurrence_id, occurrence_changed).
        Child arrays are immutable after creation on the fhir-server.
        FhirClient.patch() stamps `updated_by: actor.sub` automatically.

        Args:
            appointment_id: The appointment's integer primary key.
            data:           Serialised AppointmentPatchSchema fields to update.
            actor:          Authenticated caller — used by FhirClient to stamp updated_by.
            accept:         Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Appointment resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{appointment_id}", data, actor, accept=accept)

    async def delete(self, appointment_id: int) -> None:
        """
        DELETE /appointments/{appointment_id} — permanently remove an Appointment.

        The fhir-server cascades the delete to all child records. No `accept`
        parameter — 204 has no response body.

        Args:
            appointment_id: The appointment's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{appointment_id}")
