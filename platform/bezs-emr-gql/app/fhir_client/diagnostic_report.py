"""
FHIR client for DiagnosticReport resources.

Thin wrapper around the shared FhirClient that knows the fhir-server path for
DiagnosticReports. No business logic lives here — all validation and rules belong
in DiagnosticReportService.

A DiagnosticReport records the findings and interpretation of diagnostic tests
performed on patients, including lab results, imaging, and pathology. It links to
a ServiceRequest via `based_on` and holds the actual document via `presented_form`.

Reference: https://hl7.org/fhir/R4/diagnosticreport.html
"""

from app.auth.models import AuthUser
from app.fhir_client.client import FhirClient

# Confirmed in fhir-server routers prefix.
_PATH = "/diagnostic-reports"


class DiagnosticReportClient:
    """
    Domain-specific HTTP client for DiagnosticReport resources.

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
        POST /diagnostic-reports — create a new DiagnosticReport resource.

        All child arrays (identifier, based_on, category, performer, results_interpreter,
        specimen, result, imaging_study, media, conclusion_code, presented_form) are
        included in the single payload — no separate sub-resource routes exist.

        Args:
            data:   Serialised DiagnosticReportCreateSchema (exclude_none=True, mode="json").
            actor:  Authenticated caller — FhirClient stamps created_by from actor.sub.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created DiagnosticReport as a dict (plain JSON or FHIR R4).
        """
        return await self._fhir.post(_PATH, data, actor, accept=accept)

    async def get_by_id(self, resource_id: int, accept: str | None = None) -> dict:
        """
        GET /diagnostic-reports/{resource_id} — fetch a single DiagnosticReport by integer ID.

        Args:
            resource_id: The diagnostic report's primary key on the fhir-server.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The DiagnosticReport resource dict with all child arrays populated.
        """
        return await self._fhir.get(f"{_PATH}/{resource_id}", accept=accept)

    async def list(self, accept: str | None = None, **params) -> dict:
        """
        GET /diagnostic-reports — list DiagnosticReports with optional filter parameters.

        Strips None values from **params before forwarding.

        Supported params: status, patient_id, issued_from, issued_to,
        user_id, org_id, limit, offset.

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
        PATCH /diagnostic-reports/{resource_id} — partially update scalar fields.

        Child arrays (based_on, category, performer, presented_form, etc.) are NOT
        patchable — delete and re-create to change those.

        Args:
            resource_id: The diagnostic report's integer primary key.
            data:        Serialised DiagnosticReportPatchSchema (exclude_none=True, mode="json").
            actor:       Authenticated caller — FhirClient stamps updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated DiagnosticReport resource dict.
        """
        return await self._fhir.patch(f"{_PATH}/{resource_id}", data, actor, accept=accept)

    async def delete(self, resource_id: int) -> None:
        """
        DELETE /diagnostic-reports/{resource_id} — permanently remove a DiagnosticReport.

        The fhir-server cascades the delete to all child records (identifier, based_on,
        category, performer, results_interpreter, specimen, result, imaging_study,
        media, conclusion_code, presented_form).

        Args:
            resource_id: The diagnostic report's integer primary key to delete.
        """
        await self._fhir.delete(f"{_PATH}/{resource_id}")
