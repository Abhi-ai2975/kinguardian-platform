"""
Business logic layer for the DiagnosticReport resource.

DiagnosticReportService sits between the router and DiagnosticReportClient. It owns
empty-patch rejection and datetime serialisation for query params. No persistence or
FHIR mapping happens here — those responsibilities belong to the fhir-server.
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.diagnostic_report import DiagnosticReportClient
from app.schemas.diagnostic_report.input import (
    DiagnosticReportCreateSchema,
    DiagnosticReportPatchSchema,
    ListDiagnosticReportsSchema,
)


class DiagnosticReportService:
    """
    Service layer for DiagnosticReport CRUD operations.

    Mediates between the FastAPI router and DiagnosticReportClient.
    """

    def __init__(self, client: DiagnosticReportClient) -> None:
        """
        Initialise with a DiagnosticReportClient injected by the DI container.

        Args:
            client: The domain-specific HTTP client for DiagnosticReport operations.
        """
        self._client = client

    async def create(
        self,
        dto: DiagnosticReportCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new DiagnosticReport resource on the fhir-server.

        `mode="json"` serialises all datetime fields (effective_datetime,
        effective_period_start/end, issued, presented_form[].creation, etc.)
        to ISO 8601 strings. `exclude_none=True` drops unset fields.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — FhirClient stamps created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created DiagnosticReport dict (plain JSON or FHIR R4).
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
        Fetch a single DiagnosticReport by integer primary key.

        Args:
            resource_id: The diagnostic report's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The DiagnosticReport resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListDiagnosticReportsSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List DiagnosticReports with optional filters.

        `issued_from` and `issued_to` are serialised to ISO 8601 strings
        for the fhir-server query string.

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC consistency).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            # fhir-server aliases `dr_status` query param as `status`
            status=filters.status,
            patient_id=filters.patient_id,
            issued_from=(
                filters.issued_from.isoformat() if filters.issued_from else None
            ),
            issued_to=(
                filters.issued_to.isoformat() if filters.issued_to else None
            ),
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: DiagnosticReportPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update scalar fields on a DiagnosticReport.

        Rejects with 422 if the patch body is empty. `mode="json"` serialises
        datetime fields (effective_datetime, effective_period_start/end, issued).

        Args:
            resource_id: The diagnostic report's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated DiagnosticReport resource dict.

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
        Permanently delete a DiagnosticReport and all its child records.

        The fhir-server cascades to identifier, based_on, category, performer,
        results_interpreter, specimen, result, imaging_study, media,
        conclusion_code, and presented_form records.

        Args:
            resource_id: The diagnostic report's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(resource_id)
