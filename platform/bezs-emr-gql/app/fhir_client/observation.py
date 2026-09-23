"""
FHIR client for Observation resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path for
Observations. No business logic lives here — all validation and rules belong
in ObservationService.

An Observation records a measurement or clinical assertion about a patient or
other subject. It captures the observed value (via value[x] polymorphism),
effective time, performer, and interpretation, and can contain nested component
sub-observations for panels.

Reference: https://hl7.org/fhir/R4/observation.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Confirmed in fhir-server routers prefix
_PATH = "/observations"


class ObservationClient:
    """
    Domain-specific HTTP client for Observation resources.

    Delegates every request to the shared FhirClient singleton, which handles
    authentication headers, base-URL resolution, and error propagation.
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
        POST /observations — create a new Observation resource.

        All child arrays (identifier, basedOn, category, component, etc.) are
        included in the single payload — no separate sub-resource routes exist.

        Args:
            data:   Serialised ObservationCreateSchema (exclude_none=True, mode="json").
            actor:  Authenticated caller — FhirClient stamps created_by from actor.sub.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Observation as a dict (plain JSON or FHIR R4).
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, resource_id: int, accept: str | None = None) -> dict:
        """
        GET /observations/{resource_id} — fetch a single Observation by integer ID.

        Args:
            resource_id: The observation's primary key on the fhir-server.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Observation resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{resource_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /observations — list Observations with optional filter parameters.

        Strips None values from **params before forwarding.

        Supported params: status, patient_id, encounter_id,
        effective_from, effective_to, user_id, org_id, limit, offset.

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
        PATCH /observations/{resource_id} — partially update scalar fields.

        Child arrays are NOT patchable — delete and re-create to change those.

        Args:
            resource_id: The observation's integer primary key.
            data:        Serialised ObservationPatchSchema (exclude_none=True, mode="json").
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Observation resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}", data, actor, accept=accept)

    async def delete(self, resource_id: int) -> None:
        """
        DELETE /observations/{resource_id} — permanently remove an Observation.

        The fhir-server cascades the delete to all child records (components,
        referenceRanges, etc.).

        Args:
            resource_id: The observation's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{resource_id}")
