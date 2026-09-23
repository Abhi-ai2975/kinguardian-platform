from datetime import datetime
from typing import List, Optional, Tuple

from app.fhir.mappers.procedure import to_fhir_procedure, to_plain_procedure
from app.models.procedure.procedure import ProcedureModel
from app.repository.procedure_repository import ProcedureRepository
from app.schemas.procedure import ProcedureCreateSchema, ProcedurePatchSchema


class ProcedureService:
    def __init__(self, repository: ProcedureRepository):
        self.repository = repository

    def _to_fhir(self, proc: ProcedureModel) -> dict:
        return to_fhir_procedure(proc)

    def _to_plain(self, proc: ProcedureModel) -> dict:
        return to_plain_procedure(proc)

    async def get_raw_by_procedure_id(self, procedure_id: int) -> Optional[ProcedureModel]:
        return await self.repository.get_by_procedure_id(procedure_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        proc_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        performed_from: Optional[datetime] = None,
        performed_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProcedureModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            proc_status=proc_status,
            patient_id=patient_id,
            performed_from=performed_from,
            performed_to=performed_to,
            limit=limit,
            offset=offset,
        )

    async def list_procedures(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        proc_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        performed_from: Optional[datetime] = None,
        performed_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProcedureModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            proc_status=proc_status,
            patient_id=patient_id,
            performed_from=performed_from,
            performed_to=performed_to,
            limit=limit,
            offset=offset,
        )

    async def create_procedure(
        self,
        payload: ProcedureCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ProcedureModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_procedure(
        self,
        procedure_id: int,
        payload: ProcedurePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ProcedureModel]:
        return await self.repository.patch(procedure_id, payload, updated_by)

    async def delete_procedure(self, procedure_id: int) -> None:
        await self.repository.delete(procedure_id)
