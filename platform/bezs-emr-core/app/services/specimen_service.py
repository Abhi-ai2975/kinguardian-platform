from typing import List, Optional, Tuple

from app.fhir.mappers.specimen import to_fhir_specimen, to_plain_specimen
from app.models.specimen.specimen import SpecimenModel
from app.repository.specimen_repository import SpecimenRepository
from app.schemas.specimen.input import SpecimenCreateSchema, SpecimenPatchSchema


class SpecimenService:
    def __init__(self, repository: SpecimenRepository):
        self.repository = repository

    def _to_fhir(self, model: SpecimenModel) -> dict:
        return to_fhir_specimen(model)

    def _to_plain(self, model: SpecimenModel) -> dict:
        return to_plain_specimen(model)

    async def get_specimen(self, specimen_id: int) -> Optional[SpecimenModel]:
        return await self.repository.get_by_specimen_id(specimen_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[SpecimenModel], int]:
        return await self.repository.get_me(user_id, org_id, limit, offset)

    async def list_specimens(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[SpecimenModel], int]:
        return await self.repository.list(user_id, org_id, limit, offset)

    async def create_specimen(
        self,
        data: SpecimenCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> SpecimenModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_specimen(
        self,
        specimen_id: int,
        data: SpecimenPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[SpecimenModel]:
        return await self.repository.patch(specimen_id, data, updated_by)

    async def delete_specimen(self, specimen_id: int) -> bool:
        return await self.repository.delete(specimen_id)
