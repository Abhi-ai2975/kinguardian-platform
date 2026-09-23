from typing import List, Optional, Tuple

from app.fhir.mappers.task import to_fhir_task, to_plain_task
from app.models.task.task import TaskModel
from app.repository.task_repository import TaskRepository
from app.schemas.task.input import TaskCreateSchema, TaskPatchSchema


class TaskService:
    def __init__(self, repository: TaskRepository):
        self.repository = repository

    def _to_fhir(self, model: TaskModel) -> dict:
        return to_fhir_task(model)

    def _to_plain(self, model: TaskModel) -> dict:
        return to_plain_task(model)

    async def get_task(self, task_id: int) -> Optional[TaskModel]:
        return await self.repository.get_by_task_id(task_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[TaskModel], int]:
        return await self.repository.get_me(user_id, org_id, limit=limit, offset=offset)

    async def list_tasks(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[TaskModel], int]:
        return await self.repository.list(user_id=user_id, org_id=org_id, limit=limit, offset=offset)

    async def create_task(
        self,
        data: TaskCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> TaskModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_task(
        self,
        task_id: int,
        data: TaskPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[TaskModel]:
        return await self.repository.patch(task_id, data, updated_by)

    async def delete_task(self, task_id: int) -> None:
        await self.repository.delete(task_id)
