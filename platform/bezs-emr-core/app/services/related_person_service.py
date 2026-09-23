from typing import List, Optional, Tuple

from app.fhir.mappers.related_person import to_fhir_related_person, to_plain_related_person
from app.models.related_person.related_person import RelatedPersonModel
from app.repository.related_person_repository import RelatedPersonRepository
from app.schemas.related_person.input import RelatedPersonCreateSchema, RelatedPersonPatchSchema


class RelatedPersonService:
    def __init__(self, repository: RelatedPersonRepository):
        self.repository = repository

    def _to_fhir(self, model: RelatedPersonModel) -> dict:
        return to_fhir_related_person(model)

    def _to_plain(self, model: RelatedPersonModel) -> dict:
        return to_plain_related_person(model)

    async def get_related_person(self, related_person_id: int) -> Optional[RelatedPersonModel]:
        return await self.repository.get_by_related_person_id(related_person_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[RelatedPersonModel], int]:
        return await self.repository.get_me(user_id, org_id, limit, offset)

    async def list_related_persons(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[RelatedPersonModel], int]:
        return await self.repository.list(user_id, org_id, limit, offset)

    async def create_related_person(
        self,
        data: RelatedPersonCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> RelatedPersonModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_related_person(
        self,
        related_person_id: int,
        data: RelatedPersonPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[RelatedPersonModel]:
        return await self.repository.patch(related_person_id, data, updated_by)

    async def delete_related_person(self, related_person_id: int) -> bool:
        return await self.repository.delete(related_person_id)
