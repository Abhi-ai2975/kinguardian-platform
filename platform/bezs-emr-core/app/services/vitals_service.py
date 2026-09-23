from datetime import date, datetime
from typing import List, Optional, Tuple

from app.models.vitals.vitals import VitalsModel
from app.repository.patient_repository import PatientRepository
from app.repository.vitals_repository import VitalsRepository
from app.schemas.vitals import VitalsCreateSchema, VitalsPatchSchema


class VitalsService:
    def __init__(self, repository: VitalsRepository, patient_repository: PatientRepository):
        self.repository = repository
        self.patient_repository = patient_repository

    async def _resolve_patient_id(self, user_id: Optional[str]) -> Optional[int]:
        if not user_id:
            return None
        patient = await self.patient_repository.get_by_user_id(user_id)
        return patient.patient_id if patient else None

    async def get_raw_by_vitals_id(self, vitals_id: int) -> Optional[VitalsModel]:
        return await self.repository.get_by_vitals_id(vitals_id)

    async def get_vitals(self, vitals_id: int) -> Optional[VitalsModel]:
        return await self.repository.get_by_vitals_id(vitals_id)

    async def get_me(
        self,
        user_id: str,
        org_id: Optional[str],
        date_filter: Optional[date] = None,
        recorded_at_from: Optional[datetime] = None,
        recorded_at_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[VitalsModel], int]:
        return await self.repository.get_me(
            user_id=user_id,
            org_id=org_id,
            date_filter=date_filter,
            recorded_at_from=recorded_at_from,
            recorded_at_to=recorded_at_to,
            limit=limit,
            offset=offset,
        )

    async def list_vitals(
        self,
        user_id: Optional[str] = None,
        patient_id: Optional[int] = None,
        org_id: Optional[str] = None,
        date_filter: Optional[date] = None,
        recorded_at_from: Optional[datetime] = None,
        recorded_at_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[VitalsModel], int]:
        return await self.repository.list(
            user_id=user_id,
            patient_id=patient_id,
            org_id=org_id,
            date_filter=date_filter,
            recorded_at_from=recorded_at_from,
            recorded_at_to=recorded_at_to,
            limit=limit,
            offset=offset,
        )

    async def create_vitals(
        self,
        payload: VitalsCreateSchema,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> VitalsModel:
        if payload.patient_id is None:
            resolved = await self._resolve_patient_id(user_id)
            if resolved is not None:
                payload = payload.model_copy(update={"patient_id": resolved})
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_vitals(
        self,
        vitals_id: int,
        payload: VitalsPatchSchema,
        user_id: Optional[str] = None,
        updated_by: Optional[str] = None,
    ) -> Optional[VitalsModel]:
        if payload.patient_id is None:
            resolved = await self._resolve_patient_id(user_id)
            if resolved is not None:
                payload = payload.model_copy(update={"patient_id": resolved})
        return await self.repository.patch(vitals_id, payload, updated_by)

    async def delete_vitals(self, vitals_id: int) -> bool:
        return await self.repository.delete(vitals_id)
