from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.schedule.enums import ScheduleActorReferenceType
from app.models.schedule.schedule import (
    ScheduleModel,
    ScheduleIdentifier,
    ScheduleServiceCategory,
    ScheduleServiceType,
    ScheduleSpecialty,
    ScheduleActor,
)
from app.schemas.schedule import ScheduleCreateSchema, SchedulePatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(ScheduleModel.identifiers),
        selectinload(ScheduleModel.service_categories),
        selectinload(ScheduleModel.service_types),
        selectinload(ScheduleModel.specialties),
        selectinload(ScheduleModel.actors),
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


class ScheduleRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_schedule_id(self, schedule_id: int) -> Optional[ScheduleModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ScheduleModel).where(ScheduleModel.schedule_id == schedule_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, active):
        if user_id:
            stmt = stmt.where(ScheduleModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(ScheduleModel.org_id == org_id)
        if active is not None:
            stmt = stmt.where(ScheduleModel.active == active)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ScheduleModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ScheduleModel)),
                user_id, org_id, active,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ScheduleModel),
                user_id, org_id, active,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ScheduleModel.schedule_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ScheduleModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ScheduleModel)),
                user_id, org_id, active,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ScheduleModel),
                user_id, org_id, active,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ScheduleModel.schedule_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: ScheduleCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ScheduleModel:
        async with self.session_factory() as session:
            sched = ScheduleModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                active=payload.active,
                comment=payload.comment,
                planning_horizon_start=payload.planning_horizon_start,
                planning_horizon_end=payload.planning_horizon_end,
            )
            session.add(sched)

            for item in (payload.identifier or []):
                session.add(ScheduleIdentifier(
                    schedule=sched, org_id=org_id,
                    use=item.use, type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for item in (payload.service_category or []):
                session.add(ScheduleServiceCategory(
                    schedule=sched, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.service_type or []):
                session.add(ScheduleServiceType(
                    schedule=sched, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.specialty or []):
                session.add(ScheduleSpecialty(
                    schedule=sched, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.actor or []):
                ref_type, ref_id = _parse_ref(item.reference, ScheduleActorReferenceType, "actor")
                session.add(ScheduleActor(
                    schedule=sched, org_id=org_id,
                    reference_type=ref_type, reference_id=ref_id,
                    reference_display=item.reference_display,
                ))

            await session.commit()
            await session.refresh(sched)

            stmt = _with_relationships(
                select(ScheduleModel).where(ScheduleModel.id == sched.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Patch ─────────────────────────────────────────────────────────────────

    async def patch(
        self,
        schedule_id: int,
        payload: SchedulePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ScheduleModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ScheduleModel).where(ScheduleModel.schedule_id == schedule_id)
            )
            result = await session.execute(stmt)
            sched = result.scalars().first()
            if not sched:
                return None

            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(sched, field, value)
            sched.updated_by = updated_by

            await session.commit()
            await session.refresh(sched)

            stmt = _with_relationships(
                select(ScheduleModel).where(ScheduleModel.id == sched.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, schedule_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(ScheduleModel).where(ScheduleModel.schedule_id == schedule_id)
            result = await session.execute(stmt)
            sched = result.scalars().first()
            if sched:
                await session.delete(sched)
                await session.commit()
