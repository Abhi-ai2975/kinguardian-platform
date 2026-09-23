"""
FHIR client for ServiceRequest resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path for
ServiceRequests. No business logic lives here — all validation and rules belong
in ServiceRequestService.

A ServiceRequest represents an order or referral for a clinical service,
diagnostic test, or procedure. It captures the requester, the subject, the
requested service, and optional timing, location, and performer preferences.

Reference: https://hl7.org/fhir/R4/servicerequest.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Confirmed in fhir-server routers prefix
_PATH = "/service-requests"


class ServiceRequestClient:
    """
    Domain-specific HTTP client for ServiceRequest resources.

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
        POST /service-requests — create a new ServiceRequest resource.

        All child arrays (identifier, category, performer, etc.) are included in
        the single payload — no separate sub-resource routes exist on the fhir-server.

        Args:
            data:   Serialised ServiceRequestCreateSchema (exclude_none=True, mode="json").
            actor:  Authenticated caller — FhirClient stamps created_by from actor.sub.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created ServiceRequest as a dict (plain JSON or FHIR R4).
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, resource_id: int, accept: str | None = None) -> dict:
        """
        GET /service-requests/{resource_id} — fetch a single ServiceRequest by integer ID.

        Args:
            resource_id: The service request's primary key on the fhir-server.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The ServiceRequest resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{resource_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /service-requests — list ServiceRequests with optional filter parameters.

        Strips None values from **params before forwarding to avoid sending
        empty query-string keys to the fhir-server.

        Supported params: status, patient_id, encounter_id,
        authored_from, authored_to, user_id, org_id, limit, offset.

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
        PATCH /service-requests/{resource_id} — partially update scalar fields.

        FhirClient.patch() stamps `updated_by: actor.sub` automatically.
        Child arrays are NOT patchable — delete and re-create to change those.

        Args:
            resource_id: The service request's integer primary key.
            data:        Serialised ServiceRequestPatchSchema (exclude_none=True, mode="json").
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated ServiceRequest resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}", data, actor, accept=accept)

    async def delete(self, resource_id: int) -> None:
        """
        DELETE /service-requests/{resource_id} — permanently remove a ServiceRequest.

        The fhir-server cascades the delete to all child records. No `accept`
        parameter — 204 carries no response body.

        Args:
            resource_id: The service request's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{resource_id}")
