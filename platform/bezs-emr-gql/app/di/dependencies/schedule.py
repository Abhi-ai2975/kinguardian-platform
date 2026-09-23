"""
FastAPI dependency factory for the ScheduleService.

This module bridges the dependency-injector DI container with FastAPI's Depends()
system. Route handlers declare `service: ScheduleService = Depends(get_schedule_service)`
and FastAPI calls this function to resolve and inject the service instance.

Why a separate function instead of using Provide[] directly in the route signature?
  - The @inject decorator from dependency-injector only works on functions it can
    intercept at import time; it cannot decorate FastAPI route functions reliably
    when they are registered after the container is wired.
  - Wrapping in a plain function allows type-safe annotations and keeps route
    handlers free of DI-library-specific imports.
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.schedule_service import ScheduleService


@inject
def get_schedule_service(
    # Provide[Container.schedule.schedule_service] tells dependency-injector to
    # resolve the `schedule_service` provider from the `schedule` sub-container
    # and pass the result as the `service` argument when this function is called.
    service: ScheduleService = Depends(Provide[Container.schedule.schedule_service]),
) -> ScheduleService:
    """
    Resolve and return the ScheduleService instance from the DI container.

    Called automatically by FastAPI for every route that declares:
        service: ScheduleService = Depends(get_schedule_service)

    The @inject decorator intercepts the call and substitutes the Provide[] default
    with the actual provider-resolved instance before FastAPI sees the return value.

    Returns:
        A fully-constructed ScheduleService with its ScheduleClient dependency
        already injected by the container.
    """
    return service
