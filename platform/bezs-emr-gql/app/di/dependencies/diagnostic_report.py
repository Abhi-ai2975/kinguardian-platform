"""
FastAPI dependency bridge for DiagnosticReportService.

Translates the dependency-injector provider into a FastAPI Depends()-compatible
callable so route handlers can declare:
    service: DiagnosticReportService = Depends(get_diagnostic_report_service)
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.diagnostic_report_service import DiagnosticReportService


@inject
def get_diagnostic_report_service(
    service: DiagnosticReportService = Depends(
        Provide[Container.diagnostic_report.diagnostic_report_service]
    ),
) -> DiagnosticReportService:
    """
    Resolve DiagnosticReportService from the DI container for use in route handlers.

    dependency-injector handles instantiation and wires the DiagnosticReportClient
    (and its underlying FhirClient) automatically.
    """
    return service
