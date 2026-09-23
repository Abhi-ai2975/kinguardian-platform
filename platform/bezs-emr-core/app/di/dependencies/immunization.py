from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.immunization_service import ImmunizationService


@inject
def get_immunization_service(
    service: ImmunizationService = Depends(Provide[Container.immunization.immunization_service]),
) -> ImmunizationService:
    return service
