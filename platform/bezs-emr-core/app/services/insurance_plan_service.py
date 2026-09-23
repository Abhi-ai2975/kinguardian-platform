from typing import List, Optional, Tuple

from app.fhir.mappers.insurance_plan import to_fhir_insurance_plan, to_plain_insurance_plan
from app.models.insurance_plan.insurance_plan import InsurancePlanModel
from app.repository.insurance_plan_repository import InsurancePlanRepository
from app.schemas.insurance_plan.input import InsurancePlanCreateSchema, InsurancePlanPatchSchema


class InsurancePlanService:
    def __init__(self, repository: InsurancePlanRepository):
        self.repository = repository

    def _to_fhir(self, model: InsurancePlanModel) -> dict:
        return to_fhir_insurance_plan(model)

    def _to_plain(self, model: InsurancePlanModel) -> dict:
        return to_plain_insurance_plan(model)

    async def get_insurance_plan(self, insurance_plan_id: int) -> Optional[InsurancePlanModel]:
        return await self.repository.get_by_insurance_plan_id(insurance_plan_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[InsurancePlanModel], int]:
        return await self.repository.get_me(user_id, org_id, limit, offset)

    async def list_insurance_plans(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[InsurancePlanModel], int]:
        return await self.repository.list(user_id, org_id, limit, offset)

    async def create_insurance_plan(
        self,
        data: InsurancePlanCreateSchema,
        user_id: str,
        org_id: str,
        created_by: Optional[str],
    ) -> InsurancePlanModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_insurance_plan(
        self,
        insurance_plan_id: int,
        data: InsurancePlanPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[InsurancePlanModel]:
        return await self.repository.patch(insurance_plan_id, data, updated_by)

    async def delete_insurance_plan(self, insurance_plan_id: int) -> bool:
        return await self.repository.delete(insurance_plan_id)
