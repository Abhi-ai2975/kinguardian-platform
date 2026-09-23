"""
Dependency-injection sub-container for the DiagnosticReport domain.

Wires DiagnosticReportClient and DiagnosticReportService as Factory providers so each
request receives a fresh, stateless instance.
"""

from dependency_injector import containers, providers

from app.fhir_client.diagnostic_report import DiagnosticReportClient
from app.services.diagnostic_report_service import DiagnosticReportService


class DiagnosticReportContainer(containers.DeclarativeContainer):
    """
    DI sub-container for DiagnosticReport resources.

    `core` is a DependenciesContainer placeholder replaced by the root Container
    at wiring time, giving access to `core.fhir_client`.
    """

    # Placeholder resolved by the root Container when this sub-container is mounted.
    core = providers.DependenciesContainer()

    # Domain-specific HTTP client for DiagnosticReport endpoints on the fhir-server.
    diagnostic_report_client = providers.Factory(
        DiagnosticReportClient,
        fhir=core.fhir_client,
    )

    # Business logic service — sits between the router and DiagnosticReportClient.
    diagnostic_report_service = providers.Factory(
        DiagnosticReportService,
        client=diagnostic_report_client,
    )
