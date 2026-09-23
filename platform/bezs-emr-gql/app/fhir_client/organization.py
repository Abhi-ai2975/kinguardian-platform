"""
FHIR Server client scoped to Organisation resources.

This module provides a thin, domain-specific wrapper around FhirClient that knows
the FHIR Server path for Organisation resources. All business logic (duplicate
detection, validation) lives in OrganizationsService; this class is responsible
only for translating method calls into the correct HTTP verbs and paths.

Keeping path knowledge here (not in the service layer) means that if the FHIR
Server renames the endpoint, only this file needs to change.

Content negotiation:
    All methods accept an optional `accept` parameter that is forwarded directly to
    FhirClient, which passes it as the HTTP Accept header to the FHIR Server.
    When `accept="application/fhir+json"`, the FHIR Server returns FHIR R4 format.
    Internal calls (e.g. the duplicate-check list in OrganizationsService.register)
    omit this parameter to always receive plain JSON, which is easier to inspect
    programmatically without knowing the FHIR Bundle structure.
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# FHIR Server endpoint path for Organisation resources.
# Defined as a module constant so it appears in one place — any change to the
# downstream API URL is a one-line edit here rather than a grep-and-replace.
_PATH = "/organizations"


class OrganizationClient:
    """
    Domain client for FHIR Organisation CRUD operations.

    Wraps FhirClient with Organisation-specific paths and parameter handling.
    Instantiated by the DI container (OrganizationContainer) and injected into
    OrganizationsService — never constructed directly in route handlers.
    """

    def __init__(self, fhir: FhirClient):
        """
        Args:
            fhir: The shared FhirClient singleton injected by the DI container.
                  All HTTP calls are delegated to this instance so connection
                  pooling is shared across all domain clients.
        """
        self._fhir = fhir

    async def create(self, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Create a new Organisation resource on the FHIR Server.

        Args:
            data:   Resource payload (already validated and serialised by the schema layer).
            actor:  Authenticated user; forwarded to FhirClient for actor injection.
            accept: Optional Accept header forwarded from the client — controls whether
                    the FHIR Server returns FHIR R4 or plain JSON format.

        Returns:
            The created Organisation resource dict from the FHIR Server, in the
            format determined by `accept`.
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, organization_id: int, accept: str | None = None) -> dict:
        """
        Fetch a single Organisation by its FHIR Server-assigned numeric ID.

        Args:
            organization_id: The integer primary key of the Organisation.
            accept:          Optional Accept header — controls response format.

        Returns:
            The Organisation resource dict in the requested format, or raises
            HTTPException 404 if not found.
        """
        return await self._fhir.get(f"{_PATH}/{organization_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        List Organisations with optional filter and pagination parameters.

        Accepts arbitrary keyword arguments so the service layer can pass named
        filter fields (name, active, limit, offset) without this method needing
        to know which filters are supported — the FHIR Server handles unknown params.

        None values are stripped before sending to the FHIR Server because query
        string serialisation of None produces `?name=None` which the server rejects
        instead of treating as "no filter". Only explicitly provided values are sent.

        Args:
            accept:   Optional Accept header forwarded from the client. Pass None for
                      internal calls (e.g. duplicate-check pre-queries) that always need
                      plain JSON regardless of what the client requested.
            **params: Optional filter/pagination kwargs (e.g. name="Acme", limit=10).

        Returns:
            Paginated plain JSON dict or FHIR Bundle depending on `accept`.
        """
        # Drop keys whose value is None — the caller passes all possible filter fields
        # but only some have values; None means "not filtered on this field".
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(self, organization_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        Partially update an Organisation resource on the FHIR Server.

        Args:
            organization_id: The integer primary key of the Organisation to update.
            data:            Partial payload containing only the fields to change.
            actor:           Authenticated user; forwarded for `updated_by` injection.
            accept:          Optional Accept header — controls response format.

        Returns:
            The updated Organisation resource dict in the requested format.
        """
        return await self._fhir.patch(f"{_PATH}/{organization_id}", data, actor, accept=accept)

    async def delete(self, organization_id: int) -> None:
        """
        Delete an Organisation resource from the FHIR Server.

        No `accept` parameter — DELETE returns 204 with no body so content
        negotiation does not apply.

        Args:
            organization_id: The integer primary key of the Organisation to delete.

        Returns:
            None. The FHIR Server returns 204 on success; errors raise HTTPException.
        """
        await self._fhir.delete(f"{_PATH}/{organization_id}")
