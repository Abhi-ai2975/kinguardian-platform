from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.vitals.vitals import VitalsModel
from app.schemas.vitals import VitalsCreateSchema, VitalsPatchSchema


class VitalsRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_vitals_id(self, vitals_id: int) -> Optional[VitalsModel]:
        async with self.session_factory() as session:
            stmt = select(VitalsModel).where(VitalsModel.vitals_id == vitals_id)
            result = await session.execute(stmt)
            return result.scalars().first()

    async def get_me(
        self,
        user_id: str,
        org_id: Optional[str],
        date_filter: Optional[date] = None,
        recorded_at_from: Optional[datetime] = None,
        recorded_at_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[VitalsModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                select(VitalsModel), user_id, None, org_id,
                date_filter, recorded_at_from, recorded_at_to,
            )
            count_stmt = self._apply_list_filters(
                select(func.count()).select_from(VitalsModel), user_id, None, org_id,
                date_filter, recorded_at_from, recorded_at_to,
            )
            total = (await session.execute(count_stmt)).scalar_one()
            stmt = base.order_by(VitalsModel.recorded_at.desc()).offset(offset).limit(limit)
            rows = list((await session.execute(stmt)).scalars().all())
        return rows, total

    def _apply_list_filters(self, stmt, user_id, patient_id, org_id, date_filter, recorded_at_from, recorded_at_to):
        if user_id:
            stmt = stmt.where(VitalsModel.user_id == user_id)
        if patient_id is not None:
            stmt = stmt.where(VitalsModel.patient_id == patient_id)
        if org_id:
            stmt = stmt.where(VitalsModel.org_id == org_id)
        if date_filter is not None:
            stmt = stmt.where(VitalsModel.date == date_filter)
        if recorded_at_from is not None:
            stmt = stmt.where(VitalsModel.recorded_at >= recorded_at_from)
        if recorded_at_to is not None:
            stmt = stmt.where(VitalsModel.recorded_at <= recorded_at_to)
        return stmt

    async def list(
        self,
        user_id: Optional[str] = None,
        patient_id: Optional[int] = None,
        org_id: Optional[str] = None,
        date_filter: Optional[date] = None,
        recorded_at_from: Optional[datetime] = None,
        recorded_at_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[VitalsModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                select(VitalsModel), user_id, patient_id, org_id,
                date_filter, recorded_at_from, recorded_at_to,
            )
            count_stmt = self._apply_list_filters(
                select(func.count()).select_from(VitalsModel), user_id, patient_id, org_id,
                date_filter, recorded_at_from, recorded_at_to,
            )
            total = (await session.execute(count_stmt)).scalar_one()
            stmt = base.order_by(VitalsModel.recorded_at.desc()).offset(offset).limit(limit)
            rows = list((await session.execute(stmt)).scalars().all())
        return rows, total

    async def create(
        self,
        payload: VitalsCreateSchema,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> VitalsModel:
        data = payload.model_dump(exclude_unset=False, exclude={"user_id", "org_id"})
        vitals = VitalsModel(
            user_id=user_id,
            org_id=org_id,
            created_by=created_by,
            **data,
        )
        async with self.session_factory() as session:
            try:
                session.add(vitals)
                await session.commit()
                await session.refresh(vitals)
            except Exception:
                await session.rollback()
                raise
        return await self.get_by_vitals_id(vitals.vitals_id)

    async def patch(
        self, vitals_id: int, payload: VitalsPatchSchema, updated_by: Optional[str] = None
    ) -> Optional[VitalsModel]:
        async with self.session_factory() as session:
            stmt = select(VitalsModel).where(VitalsModel.vitals_id == vitals_id)
            result = await session.execute(stmt)
            vitals = result.scalars().first()

            if not vitals:
                return None

            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(vitals, field, value)
            if updated_by is not None:
                vitals.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(vitals)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_vitals_id(vitals_id)

    async def delete(self, vitals_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(VitalsModel).where(VitalsModel.vitals_id == vitals_id)
            result = await session.execute(stmt)
            vitals = result.scalars().first()

            if not vitals:
                return False

            try:
                await session.delete(vitals)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise
