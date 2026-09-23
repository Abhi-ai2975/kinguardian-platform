from typing import List, Optional, Tuple

from app.fhir.mappers.care_plan import to_fhir_care_plan, to_plain_care_plan
from app.models.care_plan.care_plan import CarePlanModel
from app.repository.care_plan_repository import CarePlanRepository
from app.schemas.care_plan.input import CarePlanCreateSchema, CarePlanPatchSchema


class CarePlanService:
    def __init__(self, repository: CarePlanRepository):
        self.repository = repository

    def _to_fhir(self, model: CarePlanModel) -> dict:
        return to_fhir_care_plan(model)

    def _to_plain(self, model: CarePlanModel) -> dict:
        return to_plain_care_plan(model)

    async def get_care_plan(self, care_plan_id: int) -> Optional[CarePlanModel]:
        return await self.repository.get_by_care_plan_id(care_plan_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CarePlanModel], int]:
        return await self.repository.get_me(user_id, org_id, limit, offset)

    async def list_care_plans(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CarePlanModel], int]:
        return await self.repository.list(user_id, org_id, limit, offset)

    async def create_care_plan(
        self,
        data: CarePlanCreateSchema,
        user_id: str,
        org_id: str,
        created_by: str,
    ) -> CarePlanModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_care_plan(
        self,
        care_plan_id: int,
        data: CarePlanPatchSchema,
        updated_by: str,
    ) -> Optional[CarePlanModel]:
        return await self.repository.patch(care_plan_id, data, updated_by)

    async def delete_care_plan(self, care_plan_id: int) -> bool:
        return await self.repository.delete(care_plan_id)
