from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.schedule import get_schedule_service
from app.models.schedule.schedule import ScheduleModel
from app.services.schedule_service import ScheduleService


async def resolve_schedule(
    schedule_id: int = Path(..., ge=1, description="Public schedule identifier."),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> ScheduleModel:
    """Load schedule by public id or raise 404."""
    sched = await schedule_service.get_raw_by_schedule_id(schedule_id)
    if not sched:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found"
        )
    return sched
