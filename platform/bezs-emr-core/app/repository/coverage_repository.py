from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.coverage.enums import (
    CoverageBeneficiaryReferenceType,
    CoverageContractReferenceType,
    CoveragePayorReferenceType,
    CoveragePolicyHolderReferenceType,
    CoverageStatus,
    CoverageSubscriberReferenceType,
)
from app.models.coverage.coverage import (
    CoverageClass,
    CoverageContract,
    CoverageCostToBeneficiary,
    CoverageCostToBeneficiaryException,
    CoverageIdentifier,
    CoverageModel,
    CoveragePayor,
)
from app.schemas.coverage.input import CoverageCreateSchema, CoveragePatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(CoverageModel.identifiers),
        selectinload(CoverageModel.payors),
        selectinload(CoverageModel.classes),
        selectinload(CoverageModel.cost_to_beneficiaries).selectinload(
            CoverageCostToBeneficiary.exceptions
        ),
        selectinload(CoverageModel.contracts),
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


class CoverageRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_coverage_id(self, coverage_id: int) -> Optional[CoverageModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(CoverageModel).where(CoverageModel.coverage_id == coverage_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, coverage_status):
        if user_id:
            stmt = stmt.where(CoverageModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(CoverageModel.org_id == org_id)
        if coverage_status:
            try:
                stmt = stmt.where(CoverageModel.status == CoverageStatus(coverage_status))
            except ValueError:
                pass
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        coverage_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CoverageModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(CoverageModel)),
                user_id, org_id, coverage_status,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(CoverageModel),
                user_id, org_id, coverage_status,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(CoverageModel.coverage_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        coverage_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CoverageModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(CoverageModel)),
                user_id, org_id, coverage_status,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(CoverageModel),
                user_id, org_id, coverage_status,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(CoverageModel.coverage_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def create(
        self,
        payload: CoverageCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> CoverageModel:
        async with self.session_factory() as session:
            status_enum = CoverageStatus(payload.status)

            ph_type, ph_id = _parse_ref_optional(
                payload.policy_holder, CoveragePolicyHolderReferenceType, "policyHolder"
            )
            sub_type, sub_id = _parse_ref_optional(
                payload.subscriber, CoverageSubscriberReferenceType, "subscriber"
            )
            ben_type, ben_id = _parse_ref(
                payload.beneficiary, CoverageBeneficiaryReferenceType, "beneficiary"
            )

            coverage = CoverageModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=status_enum,
                type_system=payload.type_system,
                type_code=payload.type_code,
                type_display=payload.type_display,
                type_text=payload.type_text,
                policy_holder_type=ph_type,
                policy_holder_id=ph_id,
                policy_holder_display=payload.policy_holder_display,
                subscriber_type=sub_type,
                subscriber_id=sub_id,
                subscriber_display=payload.subscriber_display,
                subscriber_id_value=payload.subscriber_id_value,
                beneficiary_type=ben_type,
                beneficiary_id=ben_id,
                beneficiary_display=payload.beneficiary_display,
                dependent=payload.dependent,
                relationship_system=payload.relationship_system,
                relationship_code=payload.relationship_code,
                relationship_display=payload.relationship_display,
                relationship_text=payload.relationship_text,
                period_start=payload.period_start,
                period_end=payload.period_end,
                order=payload.order,
                network=payload.network,
                subrogation=payload.subrogation,
            )
            session.add(coverage)

            for item in (payload.identifiers or []):
                session.add(CoverageIdentifier(
                    coverage=coverage, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for p in (payload.payor or []):
                p_type, p_id = _parse_ref(p.reference, CoveragePayorReferenceType, "payor")
                session.add(CoveragePayor(
                    coverage=coverage, org_id=org_id,
                    reference_type=p_type,
                    reference_id=p_id,
                    reference_display=p.reference_display,
                ))

            for c in (payload.classes or []):
                session.add(CoverageClass(
                    coverage=coverage, org_id=org_id,
                    type_system=c.type_system, type_code=c.type_code,
                    type_display=c.type_display, type_text=c.type_text,
                    value=c.value,
                    name=c.name,
                ))

            for ctb in (payload.cost_to_beneficiary or []):
                cost_row = CoverageCostToBeneficiary(
                    coverage=coverage, org_id=org_id,
                    type_system=ctb.type_system, type_code=ctb.type_code,
                    type_display=ctb.type_display, type_text=ctb.type_text,
                    value_quantity_value=ctb.value_quantity_value,
                    value_quantity_unit=ctb.value_quantity_unit,
                    value_quantity_system=ctb.value_quantity_system,
                    value_quantity_code=ctb.value_quantity_code,
                    value_money_value=ctb.value_money_value,
                    value_money_currency=ctb.value_money_currency,
                )
                session.add(cost_row)
                for exc in (ctb.exceptions or []):
                    session.add(CoverageCostToBeneficiaryException(
                        cost_to_beneficiary=cost_row, org_id=org_id,
                        type_system=exc.type_system, type_code=exc.type_code,
                        type_display=exc.type_display, type_text=exc.type_text,
                        period_start=exc.period_start, period_end=exc.period_end,
                    ))

            for con in (payload.contract or []):
                c_type, c_id = _parse_ref(con.reference, CoverageContractReferenceType, "contract")
                session.add(CoverageContract(
                    coverage=coverage, org_id=org_id,
                    reference_type=c_type,
                    reference_id=c_id,
                    reference_display=con.reference_display,
                ))

            try:
                await session.commit()
                await session.refresh(coverage)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_coverage_id(coverage.coverage_id)

    async def patch(
        self,
        coverage_id: int,
        payload: CoveragePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[CoverageModel]:
        async with self.session_factory() as session:
            stmt = select(CoverageModel).where(CoverageModel.coverage_id == coverage_id)
            result = await session.execute(stmt)
            coverage = result.scalars().first()
            if not coverage:
                return None

            updates = payload.model_dump(exclude_unset=True)
            for field, value in updates.items():
                if field == "status" and value is not None:
                    try:
                        setattr(coverage, field, CoverageStatus(value).value)
                    except ValueError:
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Invalid status '{value}'.",
                        )
                elif field == "policy_holder" and value is not None:
                    ph_type, ph_id = _parse_ref(value, CoveragePolicyHolderReferenceType, "policyHolder")
                    coverage.policy_holder_type = ph_type
                    coverage.policy_holder_id = ph_id
                elif field == "subscriber" and value is not None:
                    sub_type, sub_id = _parse_ref(value, CoverageSubscriberReferenceType, "subscriber")
                    coverage.subscriber_type = sub_type
                    coverage.subscriber_id = sub_id
                elif field not in ("policy_holder", "subscriber"):
                    setattr(coverage, field, value)

            coverage.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(coverage)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_coverage_id(coverage_id)

    async def delete(self, coverage_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(CoverageModel).where(CoverageModel.coverage_id == coverage_id)
            result = await session.execute(stmt)
            coverage = result.scalars().first()
            if not coverage:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Coverage not found",
                )
            try:
                await session.delete(coverage)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
