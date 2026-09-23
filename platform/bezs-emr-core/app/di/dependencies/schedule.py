from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.schedule_service import ScheduleService


@inject
def get_schedule_service(
    service: ScheduleService = Depends(Provide[Container.schedule.schedule_service]),
) -> ScheduleService:
    return service
