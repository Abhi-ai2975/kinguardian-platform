from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.diagnostic_report import get_diagnostic_report_service
from app.models.diagnostic_report.diagnostic_report import DiagnosticReportModel
from app.services.diagnostic_report_service import DiagnosticReportService


async def resolve_diagnostic_report(
    diagnostic_report_id: int = Path(..., ge=1, description="Public diagnostic report identifier."),
    diagnostic_report_service: DiagnosticReportService = Depends(get_diagnostic_report_service),
) -> DiagnosticReportModel:
    """Load diagnostic report by public id or raise 404."""
    dr = await diagnostic_report_service.get_raw_by_diagnostic_report_id(diagnostic_report_id)
    if not dr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="DiagnosticReport not found"
        )
    return dr
