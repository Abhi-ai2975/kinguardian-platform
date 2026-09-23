from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.condition_service import ConditionService


@inject
def get_condition_service(
    service: ConditionService = Depends(Provide[Container.condition.condition_service]),
) -> ConditionService:
    return service
