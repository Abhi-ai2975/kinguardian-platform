from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.task_service import TaskService


@inject
def get_task_service(
    service: TaskService = Depends(Provide[Container.task.task_service]),
) -> TaskService:
    return service
