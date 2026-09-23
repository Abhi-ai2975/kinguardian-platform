from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.allergy_intolerance_service import AllergyIntoleranceService


@inject
def get_allergy_intolerance_service(
    service: AllergyIntoleranceService = Depends(
        Provide[Container.allergy_intolerance.allergy_intolerance_service]
    ),
) -> AllergyIntoleranceService:
    return service
