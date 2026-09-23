from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.episode_of_care_service import EpisodeOfCareService


@inject
def get_episode_of_care_service(
    service: EpisodeOfCareService = Depends(Provide[Container.episode_of_care.episode_of_care_service]),
) -> EpisodeOfCareService:
    return service
