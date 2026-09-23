"""
FHIR client for Encounter resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path for
Encounters. No business logic lives here — all validation and rules belong in
EncounterService.

An Encounter is a clinical interaction between a patient and one or more
healthcare providers. It captures what happened (type, reason, diagnosis),
who was involved (participants), where (location), when (actualPeriod), and
what happened after (admission, discharge).

Reference: https://hl7.org/fhir/R5/encounter.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Confirmed in fhir-server routers/__init__.py: prefix="/encounters"
_PATH = "/encounters"


class EncounterClient:
    """
    Domain-specific HTTP client for Encounter resources.

    Delegates every request to the shared FhirClient singleton, which handles
    authentication headers, base-URL resolution, and error propagation.

    The `accept` parameter threads through every body-returning method so the
    caller can request plain JSON or FHIR R4/R5 format from the fhir-server.
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
        POST /encounters — create a new Encounter resource.

        FhirClient.post() stamps `created_by: actor.sub` automatically.
        All child arrays (participant, diagnosis, location, etc.) are included
        in the single payload — no separate sub-resource routes exist.

        Args:
            data:   Serialised EncounterCreateSchema (by_alias=True, exclude_none=True applied).
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Encounter as a dict (plain JSON or FHIR).
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, resource_id: int, accept: str | None = None) -> dict:
        """
        GET /encounters/{resource_id} — fetch a single Encounter by integer ID.

        Args:
            resource_id: The encounter's primary key on the fhir-server.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Encounter resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{resource_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /encounters — list Encounters with optional filter parameters.

        Strips None values from **params before forwarding to avoid sending
        `?status=None` or similar junk query strings to the fhir-server.

        Supported params: status, patient_id, appointment_id,
        actual_period_start_from, actual_period_start_to, user_id, org_id,
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
        PATCH /encounters/{resource_id} — partially update scalar fields.

        FhirClient.patch() stamps `updated_by: actor.sub` automatically.
        Only scalar fields are patchable (status, actual_period_end, priority_*,
        subject_status_*, planned_end_date). Structural arrays and the subject
        reference cannot be changed via PATCH.

        Args:
            resource_id: The encounter's integer primary key.
            data:        Serialised EncounterPatchSchema (exclude_none=True, mode="json" applied).
            actor:       Authenticated caller — used by FhirClient to stamp updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Encounter resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}", data, actor, accept=accept)

    async def delete(self, resource_id: int) -> None:
        """
        DELETE /encounters/{resource_id} — permanently remove an Encounter.

        The fhir-server cascades the delete to all child records (participant,
        diagnosis, location, reason, etc.). No `accept` parameter — 204 carries
        no response body.

        Args:
            resource_id: The encounter's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{resource_id}")
