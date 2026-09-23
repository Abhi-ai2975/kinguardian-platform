from datetime import datetime
from typing import List, Optional, Tuple

from app.fhir.mappers.condition import to_fhir_condition, to_plain_condition
from app.models.condition.condition import ConditionModel
from app.repository.condition_repository import ConditionRepository
from app.schemas.condition import ConditionCreateSchema, ConditionPatchSchema


class ConditionService:
    def __init__(self, repository: ConditionRepository):
        self.repository = repository

    def _to_fhir(self, condition: ConditionModel) -> dict:
        return to_fhir_condition(condition)

    def _to_plain(self, condition: ConditionModel) -> dict:
        return to_plain_condition(condition)

    async def get_raw_by_condition_id(self, condition_id: int) -> Optional[ConditionModel]:
        """Raw ORM model — used by the auth ownership dependency."""
        return await self.repository.get_by_condition_id(condition_id)

    async def get_condition(self, condition_id: int) -> Optional[ConditionModel]:
        return await self.repository.get_by_condition_id(condition_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        clinical_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        recorded_from: Optional[datetime] = None,
        recorded_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ConditionModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            clinical_status=clinical_status,
            patient_id=patient_id,
            recorded_from=recorded_from,
            recorded_to=recorded_to,
            limit=limit,
            offset=offset,
        )

    async def list_conditions(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        clinical_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        recorded_from: Optional[datetime] = None,
        recorded_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ConditionModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            clinical_status=clinical_status,
            patient_id=patient_id,
            encounter_id=encounter_id,
            recorded_from=recorded_from,
            recorded_to=recorded_to,
            limit=limit,
            offset=offset,
        )

    async def create_condition(
        self,
        payload: ConditionCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> ConditionModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_condition(
        self,
        condition_id: int,
        payload: ConditionPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[ConditionModel]:
        return await self.repository.patch(condition_id, payload, updated_by)

    async def delete_condition(self, condition_id: int) -> bool:
        return await self.repository.delete(condition_id)
