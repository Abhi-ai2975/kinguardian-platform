from datetime import datetime
from typing import List, Optional, Tuple

from app.fhir.mappers.diagnostic_report import to_fhir_diagnostic_report, to_plain_diagnostic_report
from app.models.diagnostic_report.diagnostic_report import DiagnosticReportModel
from app.repository.diagnostic_report_repository import DiagnosticReportRepository
from app.schemas.diagnostic_report import DiagnosticReportCreateSchema, DiagnosticReportPatchSchema


class DiagnosticReportService:
    def __init__(self, repository: DiagnosticReportRepository):
        self.repository = repository

    def _to_fhir(self, dr: DiagnosticReportModel) -> dict:
        return to_fhir_diagnostic_report(dr)

    def _to_plain(self, dr: DiagnosticReportModel) -> dict:
        return to_plain_diagnostic_report(dr)

    async def get_raw_by_diagnostic_report_id(self, diagnostic_report_id: int) -> Optional[DiagnosticReportModel]:
        """Raw ORM model — used by the auth ownership dependency."""
        return await self.repository.get_by_diagnostic_report_id(diagnostic_report_id)

    async def get_diagnostic_report(self, diagnostic_report_id: int) -> Optional[DiagnosticReportModel]:
        return await self.repository.get_by_diagnostic_report_id(diagnostic_report_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        dr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        issued_from: Optional[datetime] = None,
        issued_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DiagnosticReportModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            dr_status=dr_status,
            patient_id=patient_id,
            issued_from=issued_from,
            issued_to=issued_to,
            limit=limit,
            offset=offset,
        )

    async def list_diagnostic_reports(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        dr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        issued_from: Optional[datetime] = None,
        issued_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DiagnosticReportModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            dr_status=dr_status,
            patient_id=patient_id,
            issued_from=issued_from,
            issued_to=issued_to,
            limit=limit,
            offset=offset,
        )

    async def create_diagnostic_report(
        self,
        payload: DiagnosticReportCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> DiagnosticReportModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_diagnostic_report(
        self,
        diagnostic_report_id: int,
        payload: DiagnosticReportPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[DiagnosticReportModel]:
        return await self.repository.patch(diagnostic_report_id, payload, updated_by)

    async def delete_diagnostic_report(self, diagnostic_report_id: int) -> bool:
        return await self.repository.delete(diagnostic_report_id)
