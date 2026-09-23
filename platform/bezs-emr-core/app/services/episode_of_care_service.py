from typing import List, Optional, Tuple

from app.fhir.mappers.episode_of_care import to_fhir_episode_of_care, to_plain_episode_of_care
from app.models.episode_of_care.episode_of_care import EpisodeOfCareModel
from app.repository.episode_of_care_repository import EpisodeOfCareRepository
from app.schemas.episode_of_care.input import EpisodeOfCareCreateSchema, EpisodeOfCarePatchSchema


class EpisodeOfCareService:
    def __init__(self, repository: EpisodeOfCareRepository):
        self.repository = repository

    def _to_fhir(self, model: EpisodeOfCareModel) -> dict:
        return to_fhir_episode_of_care(model)

    def _to_plain(self, model: EpisodeOfCareModel) -> dict:
        return to_plain_episode_of_care(model)

    async def get_episode_of_care(self, episode_of_care_id: int) -> Optional[EpisodeOfCareModel]:
        return await self.repository.get(episode_of_care_id)

    async def list_episode_of_cares(
        self,
        user_id: Optional[str],
        org_id: Optional[str],
        episode_status=None,
        patient_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[int, List[EpisodeOfCareModel]]:
        return await self.repository.list(user_id, org_id, episode_status, patient_id, limit, offset)

    async def create_episode_of_care(
        self,
        data: EpisodeOfCareCreateSchema,
        created_by: str,
    ) -> EpisodeOfCareModel:
        return await self.repository.create(data, created_by)

    async def patch_episode_of_care(
        self,
        model: EpisodeOfCareModel,
        data: EpisodeOfCarePatchSchema,
        updated_by: str,
    ) -> EpisodeOfCareModel:
        return await self.repository.patch(model, data, updated_by)

    async def delete_episode_of_care(self, model: EpisodeOfCareModel) -> None:
        await self.repository.delete(model)
