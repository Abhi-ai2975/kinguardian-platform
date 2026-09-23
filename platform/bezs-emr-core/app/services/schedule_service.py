from typing import List, Optional, Tuple

from app.fhir.mappers.schedule import to_fhir_schedule, to_plain_schedule
from app.models.schedule.schedule import ScheduleModel
from app.repository.schedule_repository import ScheduleRepository
from app.schemas.schedule import ScheduleCreateSchema, SchedulePatchSchema


class ScheduleService:
    def __init__(self, repository: ScheduleRepository):
        self.repository = repository

    def _to_fhir(self, sched: ScheduleModel) -> dict:
        return to_fhir_schedule(sched)

    def _to_plain(self, sched: ScheduleModel) -> dict:
        return to_plain_schedule(sched)

    async def get_raw_by_schedule_id(self, schedule_id: int) -> Optional[ScheduleModel]:
        return await self.repository.get_by_schedule_id(schedule_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ScheduleModel], int]:
        return await self.repository.get_me(
            user_id, org_id, active=active, limit=limit, offset=offset
        )

    async def list_schedules(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ScheduleModel], int]:
        return await self.repository.list(
            user_id=user_id, org_id=org_id, active=active, limit=limit, offset=offset
        )

    async def create_schedule(
        self,
        payload: ScheduleCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ScheduleModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_schedule(
        self,
        schedule_id: int,
        payload: SchedulePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ScheduleModel]:
        return await self.repository.patch(schedule_id, payload, updated_by)

    async def delete_schedule(self, schedule_id: int) -> None:
        await self.repository.delete(schedule_id)
