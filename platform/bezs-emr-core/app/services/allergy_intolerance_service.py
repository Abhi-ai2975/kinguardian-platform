from typing import List, Optional, Tuple

from app.fhir.mappers.allergy_intolerance import (
    to_fhir_allergy_intolerance,
    to_plain_allergy_intolerance,
)
from app.models.allergy_intolerance.allergy_intolerance import AllergyIntoleranceModel
from app.repository.allergy_intolerance_repository import AllergyIntoleranceRepository
from app.schemas.allergy_intolerance.input import (
    AllergyIntoleranceCreateSchema,
    AllergyIntolerancePatchSchema,
)


class AllergyIntoleranceService:
    def __init__(self, repository: AllergyIntoleranceRepository):
        self.repository = repository

    def _to_fhir(self, model: AllergyIntoleranceModel) -> dict:
        return to_fhir_allergy_intolerance(model)

    def _to_plain(self, model: AllergyIntoleranceModel) -> dict:
        return to_plain_allergy_intolerance(model)

    async def get_raw_by_allergy_intolerance_id(self, allergy_intolerance_id: int) -> Optional[AllergyIntoleranceModel]:
        return await self.repository.get_by_allergy_intolerance_id(allergy_intolerance_id)

    async def get_allergy_intolerance(self, allergy_intolerance_id: int) -> Optional[AllergyIntoleranceModel]:
        return await self.repository.get_by_allergy_intolerance_id(allergy_intolerance_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        clinical_status: Optional[str] = None,
        allergy_type: Optional[str] = None,
        criticality: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AllergyIntoleranceModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            clinical_status=clinical_status,
            allergy_type=allergy_type,
            criticality=criticality,
            limit=limit,
            offset=offset,
        )

    async def list_allergy_intolerances(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        clinical_status: Optional[str] = None,
        allergy_type: Optional[str] = None,
        criticality: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AllergyIntoleranceModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            clinical_status=clinical_status,
            allergy_type=allergy_type,
            criticality=criticality,
            limit=limit,
            offset=offset,
        )

    async def create_allergy_intolerance(
        self,
        data: AllergyIntoleranceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> AllergyIntoleranceModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_allergy_intolerance(
        self,
        allergy_intolerance_id: int,
        data: AllergyIntolerancePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[AllergyIntoleranceModel]:
        return await self.repository.patch(allergy_intolerance_id, data, updated_by)

    async def delete_allergy_intolerance(self, allergy_intolerance_id: int) -> None:
        await self.repository.delete(allergy_intolerance_id)
