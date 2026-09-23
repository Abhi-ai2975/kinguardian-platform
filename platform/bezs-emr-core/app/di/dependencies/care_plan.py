from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.care_plan_service import CarePlanService


@inject
def get_care_plan_service(
    service: CarePlanService = Depends(Provide[Container.care_plan.care_plan_service]),
) -> CarePlanService:
    return service
