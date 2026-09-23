from datetime import datetime
from typing import List, Optional, Tuple

from app.fhir.mappers.observation import to_fhir_observation, to_plain_observation
from app.models.observation.observation import ObservationModel
from app.repository.observation_repository import ObservationRepository
from app.schemas.observation import ObservationCreateSchema, ObservationPatchSchema


class ObservationService:
    def __init__(self, repository: ObservationRepository):
        self.repository = repository

    def _to_fhir(self, obs: ObservationModel) -> dict:
        return to_fhir_observation(obs)

    def _to_plain(self, obs: ObservationModel) -> dict:
        return to_plain_observation(obs)

    async def get_raw_by_observation_id(self, observation_id: int) -> Optional[ObservationModel]:
        return await self.repository.get_by_observation_id(observation_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        obs_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        effective_from: Optional[datetime] = None,
        effective_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ObservationModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            obs_status=obs_status,
            patient_id=patient_id,
            effective_from=effective_from,
            effective_to=effective_to,
            limit=limit,
            offset=offset,
        )

    async def list_observations(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        obs_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        effective_from: Optional[datetime] = None,
        effective_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ObservationModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            obs_status=obs_status,
            patient_id=patient_id,
            encounter_id=encounter_id,
            effective_from=effective_from,
            effective_to=effective_to,
            limit=limit,
            offset=offset,
        )

    async def create_observation(
        self,
        payload: ObservationCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ObservationModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_observation(
        self,
        observation_id: int,
        payload: ObservationPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ObservationModel]:
        return await self.repository.patch(observation_id, payload, updated_by)

    async def delete_observation(self, observation_id: int) -> None:
        await self.repository.delete(observation_id)
