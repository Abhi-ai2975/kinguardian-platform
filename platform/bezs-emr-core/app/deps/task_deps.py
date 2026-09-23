from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.task import get_task_service
from app.models.task.task import TaskModel
from app.services.task_service import TaskService


async def resolve_task(
    task_id: int = Path(..., ge=1, description="Public Task identifier."),
    task_service: TaskService = Depends(get_task_service),
) -> TaskModel:
    """Load Task by public id or raise 404."""
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task
