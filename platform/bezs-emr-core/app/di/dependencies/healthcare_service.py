from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.healthcare_service_service import HealthcareServiceService


@inject
def get_healthcare_service_service(
    service: HealthcareServiceService = Depends(
        Provide[Container.healthcare_service.healthcare_service_service]
    ),
) -> HealthcareServiceService:
    return service
