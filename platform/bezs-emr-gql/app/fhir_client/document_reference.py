"""
FHIR client for DocumentReference resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path for
DocumentReferences. No business logic lives here — all validation and rules belong
in DocumentReferenceService.

A DocumentReference is a pointer to a document (file, PDF, image) stored elsewhere
(e.g. FilNest). It holds the file URL in `content[].attachment.url` and links to
related clinical resources (ServiceRequest, DiagnosticReport, etc.) via
`context.related`.

Reference: https://hl7.org/fhir/R4/documentreference.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Confirmed in fhir-server routers prefix.
_PATH = "/document-references"


class DocumentReferenceClient:
    """
    Domain-specific HTTP client for DocumentReference resources.

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
        POST /document-references — create a new DocumentReference resource.

        The `content` array is required (1..*) — each item contains an `attachment`
        object with at minimum a `url` pointing to the stored file.

        Args:
            data:   Serialised DocumentReferenceCreateSchema (exclude_none=True, mode="json").
            actor:  Authenticated caller — FhirClient stamps created_by from actor.sub.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created DocumentReference as a dict (plain JSON or FHIR R4).
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, resource_id: int, accept: str | None = None) -> dict:
        """
        GET /document-references/{resource_id} — fetch a single DocumentReference by integer ID.

        Args:
            resource_id: The document reference's primary key on the fhir-server.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The DocumentReference resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{resource_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /document-references — list DocumentReferences with optional pagination.

        The fhir-server list endpoint currently supports only `limit` and `offset`.

        Args:
            accept:   Content-type preference forwarded to the fhir-server.
            **params: limit, offset; None values are dropped.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on `accept`.
        """
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._fhir.get(_PATH, params=clean, accept=accept)

    async def patch(self, resource_id: int, data: dict, actor: AuthUser, accept: str | None = None) -> dict:
        """
        PATCH /document-references/{resource_id} — partially update fields.

        Unlike DiagnosticReport, child arrays (content, authors, security_labels,
        identifiers, categories, context, relates_to) CAN be replaced via PATCH —
        they replace the existing list when supplied.

        Args:
            resource_id: The document reference's integer primary key.
            data:        Serialised DocumentReferencePatchSchema (exclude_none=True, mode="json").
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated DocumentReference resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}", data, actor, accept=accept)

    async def delete(self, resource_id: int) -> None:
        """
        DELETE /document-references/{resource_id} — permanently remove a DocumentReference.

        The fhir-server cascades the delete to all child records (content, authors,
        security_labels, identifiers, categories, context sub-records, relates_to).

        Args:
            resource_id: The document reference's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{resource_id}")
