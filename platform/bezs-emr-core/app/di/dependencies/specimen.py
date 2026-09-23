from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.specimen_service import SpecimenService


@inject
def get_specimen_service(
    service: SpecimenService = Depends(Provide[Container.specimen.specimen_service]),
) -> SpecimenService:
    return service
