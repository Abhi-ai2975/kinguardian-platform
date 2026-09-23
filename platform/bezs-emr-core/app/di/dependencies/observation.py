from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.observation_service import ObservationService


@inject
def get_observation_service(
    service: ObservationService = Depends(Provide[Container.observation.observation_service]),
) -> ObservationService:
    return service
