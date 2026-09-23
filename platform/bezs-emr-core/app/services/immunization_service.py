from typing import List, Optional, Tuple

from app.fhir.mappers.immunization import to_fhir_immunization, to_plain_immunization
from app.models.immunization.immunization import ImmunizationModel
from app.repository.immunization_repository import ImmunizationRepository
from app.schemas.immunization.input import ImmunizationCreateSchema, ImmunizationPatchSchema


class ImmunizationService:
    def __init__(self, repository: ImmunizationRepository):
        self.repository = repository

    def _to_fhir(self, model: ImmunizationModel) -> dict:
        return to_fhir_immunization(model)

    def _to_plain(self, model: ImmunizationModel) -> dict:
        return to_plain_immunization(model)

    async def get_immunization(self, immunization_id: int) -> Optional[ImmunizationModel]:
        return await self.repository.get_by_immunization_id(immunization_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[int, List[ImmunizationModel]]:
        return await self.repository.get_me(user_id, org_id, limit, offset)

    async def list_immunizations(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[int, List[ImmunizationModel]]:
        return await self.repository.list(user_id, org_id, limit, offset)

    async def create_immunization(
        self,
        data: ImmunizationCreateSchema,
        created_by: Optional[str],
    ) -> ImmunizationModel:
        return await self.repository.create(data, created_by)

    async def patch_immunization(
        self,
        model: ImmunizationModel,
        data: ImmunizationPatchSchema,
        updated_by: Optional[str],
    ) -> ImmunizationModel:
        return await self.repository.patch(model, data, updated_by)

    async def delete_immunization(self, model: ImmunizationModel) -> None:
        await self.repository.delete(model)
