from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.insurance_plan_service import InsurancePlanService


@inject
def get_insurance_plan_service(
    service: InsurancePlanService = Depends(Provide[Container.insurance_plan.insurance_plan_service]),
) -> InsurancePlanService:
    return service
