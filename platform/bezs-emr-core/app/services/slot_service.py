from typing import List, Optional, Tuple

from app.fhir.mappers.slot import to_fhir_slot, to_plain_slot
from app.models.slot.slot import SlotModel
from app.repository.slot_repository import SlotRepository
from app.schemas.slot import SlotCreateSchema, SlotPatchSchema


class SlotService:
    def __init__(self, repository: SlotRepository):
        self.repository = repository

    def _to_fhir(self, slot: SlotModel) -> dict:
        return to_fhir_slot(slot)

    def _to_plain(self, slot: SlotModel) -> dict:
        return to_plain_slot(slot)

    async def get_raw_by_slot_id(self, slot_id: int) -> Optional[SlotModel]:
        return await self.repository.get_by_slot_id(slot_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        slot_status: Optional[str] = None,
        schedule_id: Optional[int] = None,
        practitioner_role_id: Optional[int] = None,
        date: Optional[str] = None,
        start_from: Optional[str] = None,
        start_to: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[SlotModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            slot_status=slot_status, schedule_id=schedule_id,
            practitioner_role_id=practitioner_role_id,
            date=date, start_from=start_from, start_to=start_to,
            limit=limit, offset=offset,
        )

    async def list_slots(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        slot_status: Optional[str] = None,
        schedule_id: Optional[int] = None,
        practitioner_role_id: Optional[int] = None,
        date: Optional[str] = None,
        start_from: Optional[str] = None,
        start_to: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[SlotModel], int]:
        return await self.repository.list(
            user_id=user_id, org_id=org_id,
            slot_status=slot_status, schedule_id=schedule_id,
            practitioner_role_id=practitioner_role_id,
            date=date, start_from=start_from, start_to=start_to,
            limit=limit, offset=offset,
        )

    async def create_slot(
        self,
        payload: SlotCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> SlotModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_slot(
        self,
        slot_id: int,
        payload: SlotPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[SlotModel]:
        return await self.repository.patch(slot_id, payload, updated_by)

    async def delete_slot(self, slot_id: int) -> None:
        await self.repository.delete(slot_id)
