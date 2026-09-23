from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.enums import OrganizationReferenceType
from app.models.medication.enums import (
    MedicationIngredientItemReferenceType,
    MedicationStatus,
)
from app.models.medication.medication import (
    MedicationIdentifier,
    MedicationIngredient,
    MedicationModel,
)
from app.schemas.medication.input import MedicationCreateSchema, MedicationPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(MedicationModel.identifiers),
        selectinload(MedicationModel.ingredients),
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


def _parse_ref_optional(ref: Optional[str], enum_cls, field: str):
    if not ref:
        return None, None
    return _parse_ref(ref, enum_cls, field)


class MedicationRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_medication_id(self, medication_id: int) -> Optional[MedicationModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(MedicationModel).where(MedicationModel.medication_id == medication_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, medication_status):
        if user_id:
            stmt = stmt.where(MedicationModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(MedicationModel.org_id == org_id)
        if medication_status:
            try:
                stmt = stmt.where(MedicationModel.status == MedicationStatus(medication_status))
            except ValueError:
                pass
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        medication_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MedicationModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(MedicationModel)),
                user_id, org_id, medication_status,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(MedicationModel),
                user_id, org_id, medication_status,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(MedicationModel.medication_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        medication_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MedicationModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(MedicationModel)),
                user_id, org_id, medication_status,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(MedicationModel),
                user_id, org_id, medication_status,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(MedicationModel.medication_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def create(
        self,
        payload: MedicationCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> MedicationModel:
        async with self.session_factory() as session:
            status_enum = None
            if payload.status:
                try:
                    status_enum = MedicationStatus(payload.status)
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid status '{payload.status}'. Allowed: {[s.value for s in MedicationStatus]}.",
                    )

            mfr_type, mfr_id = _parse_ref_optional(
                payload.manufacturer, OrganizationReferenceType, "manufacturer"
            )

            medication = MedicationModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                code_system=payload.code_system,
                code_code=payload.code_code,
                code_display=payload.code_display,
                code_text=payload.code_text,
                status=status_enum,
                manufacturer_type=mfr_type,
                manufacturer_id=mfr_id,
                manufacturer_display=payload.manufacturer_display,
                form_system=payload.form_system,
                form_code=payload.form_code,
                form_display=payload.form_display,
                form_text=payload.form_text,
                amount_numerator_value=payload.amount_numerator_value,
                amount_numerator_unit=payload.amount_numerator_unit,
                amount_numerator_system=payload.amount_numerator_system,
                amount_numerator_code=payload.amount_numerator_code,
                amount_denominator_value=payload.amount_denominator_value,
                amount_denominator_unit=payload.amount_denominator_unit,
                amount_denominator_system=payload.amount_denominator_system,
                amount_denominator_code=payload.amount_denominator_code,
                batch_lot_number=payload.batch_lot_number,
                batch_expiration_date=payload.batch_expiration_date,
            )
            session.add(medication)

            for item in (payload.identifiers or []):
                session.add(MedicationIdentifier(
                    medication=medication, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for ing in (payload.ingredients or []):
                ing_ref_type, ing_ref_id = _parse_ref_optional(
                    ing.item_reference, MedicationIngredientItemReferenceType, "ingredient.item"
                )
                session.add(MedicationIngredient(
                    medication=medication, org_id=org_id,
                    item_codeable_concept_system=ing.item_codeable_concept_system,
                    item_codeable_concept_code=ing.item_codeable_concept_code,
                    item_codeable_concept_display=ing.item_codeable_concept_display,
                    item_codeable_concept_text=ing.item_codeable_concept_text,
                    item_reference_type=ing_ref_type,
                    item_reference_id=ing_ref_id,
                    item_reference_display=ing.item_reference_display,
                    is_active=ing.is_active,
                    strength_numerator_value=ing.strength_numerator_value,
                    strength_numerator_unit=ing.strength_numerator_unit,
                    strength_numerator_system=ing.strength_numerator_system,
                    strength_numerator_code=ing.strength_numerator_code,
                    strength_denominator_value=ing.strength_denominator_value,
                    strength_denominator_unit=ing.strength_denominator_unit,
                    strength_denominator_system=ing.strength_denominator_system,
                    strength_denominator_code=ing.strength_denominator_code,
                ))

            try:
                await session.commit()
                await session.refresh(medication)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_medication_id(medication.medication_id)

    async def patch(
        self,
        medication_id: int,
        payload: MedicationPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[MedicationModel]:
        async with self.session_factory() as session:
            stmt = select(MedicationModel).where(MedicationModel.medication_id == medication_id)
            result = await session.execute(stmt)
            medication = result.scalars().first()
            if not medication:
                return None

            updates = payload.model_dump(exclude_unset=True)
            for field, value in updates.items():
                if field == "status" and value is not None:
                    try:
                        setattr(medication, field, MedicationStatus(value).value)
                    except ValueError:
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Invalid status '{value}'.",
                        )
                elif field == "manufacturer" and value is not None:
                    mfr_type, mfr_id = _parse_ref(value, OrganizationReferenceType, "manufacturer")
                    medication.manufacturer_type = mfr_type
                    medication.manufacturer_id = mfr_id
                elif field not in ("manufacturer",):
                    setattr(medication, field, value)

            medication.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(medication)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_medication_id(medication_id)

    async def delete(self, medication_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(MedicationModel).where(MedicationModel.medication_id == medication_id)
            result = await session.execute(stmt)
            medication = result.scalars().first()
            if not medication:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Medication not found",
                )
            try:
                await session.delete(medication)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
