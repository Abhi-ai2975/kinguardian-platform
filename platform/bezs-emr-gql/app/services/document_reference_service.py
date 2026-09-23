"""
Business logic layer for the DocumentReference resource.

DocumentReferenceService sits between the router and DocumentReferenceClient. It owns
empty-patch rejection and pagination forwarding. No persistence or FHIR mapping
happens here — those responsibilities belong to the fhir-server.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.document_reference import DocumentReferenceClient
from app.schemas.document_reference.input import (
    DocumentReferenceCreateSchema,
    DocumentReferencePatchSchema,
    ListDocumentReferencesSchema,
)


class DocumentReferenceService:
    """
    Service layer for DocumentReference CRUD operations.

    Mediates between the FastAPI router and DocumentReferenceClient.
    """

    def __init__(self, client: DocumentReferenceClient) -> None:
        """
        Initialise with a DocumentReferenceClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for DocumentReference operations.
        """
        self._client = client

    async def create(
        self,
        dto: DocumentReferenceCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new DocumentReference resource on the fhir-server.

        `mode="json"` serialises all datetime fields (date, master_identifier
        period fields, context period fields, attachment creation datetimes)
        to ISO 8601 strings. `exclude_none=True` drops unset fields.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — FhirClient stamps created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created DocumentReference dict (plain JSON or FHIR R4).
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(
        self,
        resource_id: int,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Fetch a single DocumentReference by integer primary key.

        Args:
            resource_id: The document reference's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The DocumentReference resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListDocumentReferencesSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List DocumentReferences with pagination.

        The fhir-server list endpoint supports only `limit` and `offset` at present.

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC consistency).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: DocumentReferencePatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update fields on a DocumentReference.

        Rejects with 422 if the patch body is empty. Unlike DiagnosticReport,
        child arrays (content, authors, security_labels, etc.) can be replaced
        via PATCH on the fhir-server.

        Args:
            resource_id: The document reference's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated DocumentReference resource dict.

        Raises:
            HTTPException(422): If the patch body is empty.
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )
        return await self._client.patch(resource_id, payload, actor, accept=accept)

    async def delete(self, resource_id: int, actor: AuthUser) -> None:
        """
        Permanently delete a DocumentReference and all its child records.

        The fhir-server cascades to content, authors, security_labels, identifiers,
        categories, context sub-records, and relates_to records.

        Args:
            resource_id: The document reference's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(resource_id)
