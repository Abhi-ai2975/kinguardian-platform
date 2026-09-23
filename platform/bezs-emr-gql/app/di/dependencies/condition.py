"""
FastAPI dependency bridge for ConditionService.

Translates the dependency-injector provider into a FastAPI Depends()-compatible
callable so route handlers can declare:
    service: ConditionService = Depends(get_condition_service)
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.condition_service import ConditionService


@inject
def get_condition_service(
    service: ConditionService = Depends(Provide[Container.condition.condition_service]),
) -> ConditionService:
    """
    Resolve ConditionService from the DI container for use in route handlers.

    dependency-injector handles instantiation and wires the ConditionClient
    (and its underlying FhirClient) automatically.
    """
    return service
