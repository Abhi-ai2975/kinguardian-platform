from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.diagnostic_report_service import DiagnosticReportService


@inject
def get_diagnostic_report_service(
    service: DiagnosticReportService = Depends(Provide[Container.diagnostic_report.diagnostic_report_service]),
) -> DiagnosticReportService:
    return service
