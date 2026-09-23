from dependency_injector.wiring import inject, Provide
from fastapi import Depends
from app.services.practitioner_service import PractitionerService
from app.di.container import Container


@inject
def get_practitioner_service(
    service: PractitionerService = Depends(
        Provide[Container.practitioner.practitioner_service]
    ),
) -> PractitionerService:
    return service
