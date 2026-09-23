from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.vitals_service import VitalsService


@inject
def get_vitals_service(
    service: VitalsService = Depends(
        Provide[Container.vitals.vitals_service]
    ),
) -> VitalsService:
    return service
