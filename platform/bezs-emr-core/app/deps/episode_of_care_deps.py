from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.episode_of_care import get_episode_of_care_service
from app.models.episode_of_care.episode_of_care import EpisodeOfCareModel
from app.services.episode_of_care_service import EpisodeOfCareService


async def resolve_episode_of_care(
    episode_of_care_id: int = Path(..., ge=1, description="Public EpisodeOfCare identifier."),
    service: EpisodeOfCareService = Depends(get_episode_of_care_service),
) -> EpisodeOfCareModel:
    eoc = await service.get_episode_of_care(episode_of_care_id)
    if eoc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EpisodeOfCare not found")
    return eoc
