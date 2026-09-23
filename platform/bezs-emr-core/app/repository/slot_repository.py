from datetime import datetime, date as PyDate
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func, cast, Date as SADate
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.schedule.schedule import ScheduleActor, ScheduleModel
from app.models.schedule.enums import ScheduleActorReferenceType
from app.models.slot.enums import SlotScheduleReferenceType, SlotStatus
from app.models.slot.slot import (
    SlotIdentifier,
    SlotModel,
    SlotServiceCategory,
    SlotServiceType,
    SlotSpecialty,
)
from app.schemas.slot import SlotCreateSchema, SlotPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(SlotModel.schedule),
        selectinload(SlotModel.identifiers),
        selectinload(SlotModel.service_categories),
        selectinload(SlotModel.service_types),
        selectinload(SlotModel.specialties),
    )


def _parse_ref(ref: str, enum_cls, field: str):
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format: '{ref}'. Expected 'ResourceType/id'.",
        )
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference id in: '{ref}'. Id must be an integer.",
        )
    try:
        ref_type = enum_cls(parts[0])
    except ValueError:
        allowed = [e.value for e in enum_cls]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{parts[0]}' for {field}. Allowed: {allowed}.",
        )
    return ref_type, ref_id


def _parse_dt(s: str, end_of_day: bool = False) -> datetime:
    if "T" in s or " " in s:
        return datetime.fromisoformat(s)
    d = PyDate.fromisoformat(s)
    if end_of_day:
        return datetime(d.year, d.month, d.day, 23, 59, 59)
    return datetime(d.year, d.month, d.day, 0, 0, 0)


class SlotRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_slot_id(self, slot_id: int) -> Optional[SlotModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(select(SlotModel).where(SlotModel.slot_id == slot_id))
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(
        self, stmt, user_id, org_id, slot_status, schedule_id,
        practitioner_role_id=None, date=None, start_from=None, start_to=None,
    ):
        if user_id:
            stmt = stmt.where(SlotModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(SlotModel.org_id == org_id)
        if slot_status is not None:
            stmt = stmt.where(SlotModel.status == SlotStatus(slot_status))
        if schedule_id is not None:
            sub = (
                select(ScheduleModel.id)
                .where(ScheduleModel.schedule_id == schedule_id)
                .scalar_subquery()
            )
            stmt = stmt.where(SlotModel.schedule_fk_id == sub)
        if practitioner_role_id is not None:
            sub = (
                select(ScheduleActor.schedule_id)
                .where(
                    ScheduleActor.reference_type == ScheduleActorReferenceType.PractitionerRole,
                    ScheduleActor.reference_id == practitioner_role_id,
                )
                .scalar_subquery()
            )
            stmt = stmt.where(SlotModel.schedule_fk_id == sub)
        if date is not None:
            d = PyDate.fromisoformat(date)
            stmt = stmt.where(cast(SlotModel.start, SADate) == d)
        if start_from is not None:
            stmt = stmt.where(SlotModel.start >= _parse_dt(start_from, end_of_day=False))
        if start_to is not None:
            stmt = stmt.where(SlotModel.start <= _parse_dt(start_to, end_of_day=True))
        return stmt

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
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(SlotModel)),
                user_id, org_id, slot_status, schedule_id, practitioner_role_id,
                date=date, start_from=start_from, start_to=start_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(SlotModel),
                user_id, org_id, slot_status, schedule_id, practitioner_role_id,
                date=date, start_from=start_from, start_to=start_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(SlotModel.start.asc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
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
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(SlotModel)),
                user_id, org_id, slot_status, schedule_id, practitioner_role_id,
                date=date, start_from=start_from, start_to=start_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(SlotModel),
                user_id, org_id, slot_status, schedule_id, practitioner_role_id,
                date=date, start_from=start_from, start_to=start_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(SlotModel.start.asc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: SlotCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> SlotModel:
        async with self.session_factory() as session:
            sched_type, sched_public_id = _parse_ref(
                payload.schedule, SlotScheduleReferenceType, "schedule"
            )
            sched_row = (await session.execute(
                select(ScheduleModel).where(ScheduleModel.schedule_id == sched_public_id)
            )).scalars().first()
            if not sched_row:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Schedule '{payload.schedule}' not found.",
                )

            slot = SlotModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                schedule_type=sched_type,
                schedule_fk_id=sched_row.id,
                schedule_display=payload.schedule_display,
                status=SlotStatus(payload.status).value,
                start=payload.start,
                end=payload.end,
                overbooked=payload.overbooked,
                comment=payload.comment,
                appointment_type_system=payload.appointment_type_system,
                appointment_type_code=payload.appointment_type_code,
                appointment_type_display=payload.appointment_type_display,
                appointment_type_text=payload.appointment_type_text,
            )
            session.add(slot)

            for item in (payload.identifier or []):
                session.add(SlotIdentifier(
                    slot=slot, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for item in (payload.service_category or []):
                session.add(SlotServiceCategory(
                    slot=slot, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.service_type or []):
                session.add(SlotServiceType(
                    slot=slot, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.specialty or []):
                session.add(SlotSpecialty(
                    slot=slot, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            await session.commit()
            await session.refresh(slot)

            stmt = _with_relationships(select(SlotModel).where(SlotModel.id == slot.id))
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Patch ─────────────────────────────────────────────────────────────────

    async def patch(
        self,
        slot_id: int,
        payload: SlotPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[SlotModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(select(SlotModel).where(SlotModel.slot_id == slot_id))
            result = await session.execute(stmt)
            slot = result.scalars().first()
            if not slot:
                return None

            updates = payload.model_dump(exclude_unset=True)
            if "status" in updates:
                updates["status"] = SlotStatus(updates["status"]).value

            for field, value in updates.items():
                setattr(slot, field, value)
            slot.updated_by = updated_by

            await session.commit()
            await session.refresh(slot)

            stmt = _with_relationships(select(SlotModel).where(SlotModel.id == slot.id))
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, slot_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(SlotModel).where(SlotModel.slot_id == slot_id)
            result = await session.execute(stmt)
            slot = result.scalars().first()
            if slot:
                await session.delete(slot)
                await session.commit()
