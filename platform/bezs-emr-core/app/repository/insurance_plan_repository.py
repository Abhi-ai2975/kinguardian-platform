import json
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.models.insurance_plan.enums import InsurancePlanStatus
from app.models.insurance_plan.insurance_plan import (
    InsurancePlanAlias,
    InsurancePlanContact,
    InsurancePlanContactTelecom,
    InsurancePlanCoverage,
    InsurancePlanCoverageArea,
    InsurancePlanCoverageBenefit,
    InsurancePlanCoverageBenefitLimit,
    InsurancePlanCoverageNetwork,
    InsurancePlanEndpoint,
    InsurancePlanIdentifier,
    InsurancePlanModel,
    InsurancePlanNetwork,
    InsurancePlanPlan,
    InsurancePlanPlanCoverageArea,
    InsurancePlanPlanGeneralCost,
    InsurancePlanPlanIdentifier,
    InsurancePlanPlanNetwork,
    InsurancePlanPlanSCBenefit,
    InsurancePlanPlanSCBenefitCost,
    InsurancePlanPlanSpecificCost,
    InsurancePlanType,
)
from app.schemas.insurance_plan.input import (
    InsurancePlanCreateSchema,
    InsurancePlanPatchSchema,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _cast_status(v: Optional[str]) -> Optional[InsurancePlanStatus]:
    if v is None:
        return None
    try:
        return InsurancePlanStatus(v)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{v}'. Allowed: {[e.value for e in InsurancePlanStatus]}",
        )


def _parse_org_ref(ref: Optional[str], field: str) -> Optional[int]:
    if not ref:
        return None
    parts = ref.split("/", 1)
    if len(parts) != 2 or parts[0] != "Organization":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' must be 'Organization/<id>', got '{ref}'.",
        )
    try:
        return int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' id must be an integer, got '{parts[1]}'.",
        )


def _parse_loc_ref(ref: str, field: str) -> int:
    parts = ref.split("/", 1)
    if len(parts) != 2 or parts[0] != "Location":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' items must be 'Location/<id>', got '{ref}'.",
        )
    try:
        return int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' id must be an integer, got '{parts[1]}'.",
        )


def _parse_org_ref_item(ref: str, field: str) -> int:
    parts = ref.split("/", 1)
    if len(parts) != 2 or parts[0] != "Organization":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' items must be 'Organization/<id>', got '{ref}'.",
        )
    try:
        return int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' id must be an integer, got '{parts[1]}'.",
        )


def _parse_endpoint_ref(ref: str, field: str) -> int:
    parts = ref.split("/", 1)
    if len(parts) != 2 or parts[0] != "Endpoint":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' items must be 'Endpoint/<id>', got '{ref}'.",
        )
    try:
        return int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field}' id must be an integer, got '{parts[1]}'.",
        )


def _with_relationships(stmt):
    return stmt.options(
        selectinload(InsurancePlanModel.identifiers),
        selectinload(InsurancePlanModel.types),
        selectinload(InsurancePlanModel.aliases),
        selectinload(InsurancePlanModel.coverage_areas),
        selectinload(InsurancePlanModel.endpoints),
        selectinload(InsurancePlanModel.networks),
        selectinload(InsurancePlanModel.contacts).selectinload(InsurancePlanContact.telecoms),
        selectinload(InsurancePlanModel.coverages).selectinload(InsurancePlanCoverage.networks),
        selectinload(InsurancePlanModel.coverages).selectinload(InsurancePlanCoverage.benefits).selectinload(InsurancePlanCoverageBenefit.limits),
        selectinload(InsurancePlanModel.plans).selectinload(InsurancePlanPlan.plan_identifiers),
        selectinload(InsurancePlanModel.plans).selectinload(InsurancePlanPlan.plan_coverage_areas),
        selectinload(InsurancePlanModel.plans).selectinload(InsurancePlanPlan.plan_networks),
        selectinload(InsurancePlanModel.plans).selectinload(InsurancePlanPlan.general_costs),
        selectinload(InsurancePlanModel.plans).selectinload(InsurancePlanPlan.specific_costs).selectinload(InsurancePlanPlanSpecificCost.sc_benefits).selectinload(InsurancePlanPlanSCBenefit.costs),
    )


# ---------------------------------------------------------------------------
# Child builders
# ---------------------------------------------------------------------------


def _build_contact(session, contact: InsurancePlanContact, org_id: str, item):
    for tc in (item.telecoms or []):
        session.add(InsurancePlanContactTelecom(
            contact=contact,
            org_id=org_id,
            system=tc.system,
            value=tc.value,
            use=tc.use,
            rank=tc.rank,
        ))


def _build_coverage(session, coverage: InsurancePlanCoverage, org_id: str, item):
    for net_ref in (item.networks or []):
        ref_id = _parse_org_ref_item(net_ref, "coverages.networks")
        session.add(InsurancePlanCoverageNetwork(
            coverage=coverage,
            org_id=org_id,
            reference_id=ref_id,
        ))
    for ben in (item.benefits or []):
        benefit = InsurancePlanCoverageBenefit(
            coverage=coverage,
            org_id=org_id,
            type_system=ben.type_system,
            type_code=ben.type_code,
            type_display=ben.type_display,
            type_text=ben.type_text,
            requirement=ben.requirement,
        )
        session.add(benefit)
        for lim in (ben.limits or []):
            session.add(InsurancePlanCoverageBenefitLimit(
                benefit=benefit,
                org_id=org_id,
                value_value=lim.value_value,
                value_comparator=lim.value_comparator,
                value_unit=lim.value_unit,
                value_system=lim.value_system,
                value_code=lim.value_code,
                code_system=lim.code_system,
                code_code=lim.code_code,
                code_display=lim.code_display,
                code_text=lim.code_text,
            ))


def _build_plan(session, plan: InsurancePlanPlan, org_id: str, item):
    for pi in (item.plan_identifiers or []):
        session.add(InsurancePlanPlanIdentifier(
            plan=plan,
            org_id=org_id,
            use=pi.use,
            type_system=pi.type_system,
            type_code=pi.type_code,
            type_display=pi.type_display,
            type_text=pi.type_text,
            system=pi.system,
            value=pi.value,
            period_start=pi.period_start,
            period_end=pi.period_end,
            assigner=pi.assigner,
        ))
    for ca_ref in (item.plan_coverage_areas or []):
        loc_id = _parse_loc_ref(ca_ref, "plans.plan_coverage_areas")
        session.add(InsurancePlanPlanCoverageArea(
            plan=plan,
            org_id=org_id,
            reference_id=loc_id,
        ))
    for net_ref in (item.plan_networks or []):
        ref_id = _parse_org_ref_item(net_ref, "plans.plan_networks")
        session.add(InsurancePlanPlanNetwork(
            plan=plan,
            org_id=org_id,
            reference_id=ref_id,
        ))
    for gc in (item.general_costs or []):
        session.add(InsurancePlanPlanGeneralCost(
            plan=plan,
            org_id=org_id,
            type_system=gc.type_system,
            type_code=gc.type_code,
            type_display=gc.type_display,
            type_text=gc.type_text,
            group_size=gc.group_size,
            cost_value=gc.cost_value,
            cost_currency=gc.cost_currency,
            comment=gc.comment,
        ))
    for sc in (item.specific_costs or []):
        specific_cost = InsurancePlanPlanSpecificCost(
            plan=plan,
            org_id=org_id,
            category_system=sc.category_system,
            category_code=sc.category_code,
            category_display=sc.category_display,
            category_text=sc.category_text,
        )
        session.add(specific_cost)
        for ben in (sc.benefits or []):
            sc_benefit = InsurancePlanPlanSCBenefit(
                specific_cost=specific_cost,
                org_id=org_id,
                type_system=ben.type_system,
                type_code=ben.type_code,
                type_display=ben.type_display,
                type_text=ben.type_text,
            )
            session.add(sc_benefit)
            for cost in (ben.costs or []):
                qualifiers_json = None
                if cost.qualifiers:
                    qualifiers_json = json.dumps([
                        {k: v for k, v in {"coding": [{"system": q.system, "code": q.code, "display": q.display}] if any([q.system, q.code, q.display]) else None, "text": q.text}.items() if v}
                        for q in cost.qualifiers
                    ])
                session.add(InsurancePlanPlanSCBenefitCost(
                    sc_benefit=sc_benefit,
                    org_id=org_id,
                    type_system=cost.type_system,
                    type_code=cost.type_code,
                    type_display=cost.type_display,
                    type_text=cost.type_text,
                    applicability_system=cost.applicability_system,
                    applicability_code=cost.applicability_code,
                    applicability_display=cost.applicability_display,
                    applicability_text=cost.applicability_text,
                    qualifiers_json=qualifiers_json,
                    value_value=cost.value_value,
                    value_comparator=cost.value_comparator,
                    value_unit=cost.value_unit,
                    value_system=cost.value_system,
                    value_code=cost.value_code,
                ))


def _build_children(session, ip: InsurancePlanModel, org_id: str, payload):
    for ident in (payload.identifiers or []):
        session.add(InsurancePlanIdentifier(
            insurance_plan=ip,
            org_id=org_id,
            use=ident.use,
            type_system=ident.type_system,
            type_code=ident.type_code,
            type_display=ident.type_display,
            type_text=ident.type_text,
            system=ident.system,
            value=ident.value,
            period_start=ident.period_start,
            period_end=ident.period_end,
            assigner=ident.assigner,
        ))
    for t in (payload.types or []):
        session.add(InsurancePlanType(
            insurance_plan=ip,
            org_id=org_id,
            coding_system=t.coding_system,
            coding_code=t.coding_code,
            coding_display=t.coding_display,
            text=t.text,
        ))
    for alias_str in (payload.aliases or []):
        session.add(InsurancePlanAlias(insurance_plan=ip, org_id=org_id, alias=alias_str))
    for ca_ref in (payload.coverage_areas or []):
        loc_id = _parse_loc_ref(ca_ref, "coverage_areas")
        session.add(InsurancePlanCoverageArea(insurance_plan=ip, org_id=org_id, reference_id=loc_id))
    for ep_ref in (payload.endpoints or []):
        ep_id = _parse_endpoint_ref(ep_ref, "endpoints")
        session.add(InsurancePlanEndpoint(insurance_plan=ip, org_id=org_id, reference_id=ep_id))
    for net_ref in (payload.networks or []):
        ref_id = _parse_org_ref_item(net_ref, "networks")
        session.add(InsurancePlanNetwork(insurance_plan=ip, org_id=org_id, reference_id=ref_id))
    for cont in (payload.contacts or []):
        contact = InsurancePlanContact(
            insurance_plan=ip,
            org_id=org_id,
            purpose_system=cont.purpose_system,
            purpose_code=cont.purpose_code,
            purpose_display=cont.purpose_display,
            purpose_text=cont.purpose_text,
            name_use=cont.name_use,
            name_text=cont.name_text,
            name_family=cont.name_family,
            name_given=cont.name_given,
            name_prefix=cont.name_prefix,
            name_suffix=cont.name_suffix,
            address_use=cont.address_use,
            address_type=cont.address_type,
            address_text=cont.address_text,
            address_line=cont.address_line,
            address_city=cont.address_city,
            address_district=cont.address_district,
            address_state=cont.address_state,
            address_postal_code=cont.address_postal_code,
            address_country=cont.address_country,
        )
        session.add(contact)
        _build_contact(session, contact, org_id, cont)
    for cov_item in (payload.coverages or []):
        coverage = InsurancePlanCoverage(
            insurance_plan=ip,
            org_id=org_id,
            type_system=cov_item.type_system,
            type_code=cov_item.type_code,
            type_display=cov_item.type_display,
            type_text=cov_item.type_text,
        )
        session.add(coverage)
        _build_coverage(session, coverage, org_id, cov_item)
    for plan_item in (payload.plans or []):
        plan = InsurancePlanPlan(
            insurance_plan=ip,
            org_id=org_id,
            type_system=plan_item.type_system,
            type_code=plan_item.type_code,
            type_display=plan_item.type_display,
            type_text=plan_item.type_text,
        )
        session.add(plan)
        _build_plan(session, plan, org_id, plan_item)


# ---------------------------------------------------------------------------
# Repository
# ---------------------------------------------------------------------------


class InsurancePlanRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_insurance_plan_id(self, insurance_plan_id: int) -> Optional[InsurancePlanModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(InsurancePlanModel).where(InsurancePlanModel.insurance_plan_id == insurance_plan_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[InsurancePlanModel], int]:
        async with self.session_factory() as session:
            base = _with_relationships(select(InsurancePlanModel))
            count_base = select(func.count()).select_from(InsurancePlanModel)
            if user_id:
                base = base.where(InsurancePlanModel.user_id == user_id)
                count_base = count_base.where(InsurancePlanModel.user_id == user_id)
            if org_id:
                base = base.where(InsurancePlanModel.org_id == org_id)
                count_base = count_base.where(InsurancePlanModel.org_id == org_id)
            total = (await session.execute(count_base)).scalar_one()
            rows = list(
                (await session.execute(
                    base.order_by(InsurancePlanModel.insurance_plan_id.desc()).offset(offset).limit(limit)
                )).scalars().all()
            )
        return rows, total

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[InsurancePlanModel], int]:
        return await self.list(user_id=user_id, org_id=org_id, limit=limit, offset=offset)

    async def create(
        self,
        payload: InsurancePlanCreateSchema,
        user_id: str,
        org_id: str,
        created_by: Optional[str],
    ) -> InsurancePlanModel:
        owned_by_id = _parse_org_ref(payload.owned_by, "owned_by")
        administered_by_id = _parse_org_ref(payload.administered_by, "administered_by")

        async with self.session_factory() as session:
            ip = InsurancePlanModel(
                user_id=user_id,
                org_id=org_id,
                status=_cast_status(payload.status),
                name=payload.name,
                period_start=payload.period_start,
                period_end=payload.period_end,
                owned_by_id=owned_by_id,
                owned_by_display=payload.owned_by_display,
                administered_by_id=administered_by_id,
                administered_by_display=payload.administered_by_display,
                created_by=created_by,
            )
            session.add(ip)
            await session.flush()
            _build_children(session, ip, org_id, payload)
            await session.commit()
            await session.refresh(ip)

        return await self.get_by_insurance_plan_id(ip.insurance_plan_id)

    async def patch(
        self,
        insurance_plan_id: int,
        payload: InsurancePlanPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[InsurancePlanModel]:
        data = payload.model_dump(exclude_unset=True)

        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(InsurancePlanModel).where(InsurancePlanModel.insurance_plan_id == insurance_plan_id)
            )
            result = await session.execute(stmt)
            ip = result.scalars().first()
            if not ip:
                return None

            if "status" in data:
                ip.status = _cast_status(data["status"])
            if "name" in data:
                ip.name = data["name"]
            if "period_start" in data:
                ip.period_start = data["period_start"]
            if "period_end" in data:
                ip.period_end = data["period_end"]
            if "owned_by" in data:
                ip.owned_by_id = _parse_org_ref(data["owned_by"], "owned_by")
            if "owned_by_display" in data:
                ip.owned_by_display = data["owned_by_display"]
            if "administered_by" in data:
                ip.administered_by_id = _parse_org_ref(data["administered_by"], "administered_by")
            if "administered_by_display" in data:
                ip.administered_by_display = data["administered_by_display"]

            ip.updated_by = updated_by

            child_fields = ["identifiers", "types", "aliases", "coverage_areas", "endpoints", "networks", "contacts", "coverages", "plans"]
            for field in child_fields:
                if field in data:
                    collection = getattr(ip, field)
                    for child in list(collection):
                        await session.delete(child)
            await session.flush()

            if any(f in data for f in child_fields):
                _build_children(session, ip, ip.org_id, payload)

            await session.commit()

        return await self.get_by_insurance_plan_id(insurance_plan_id)

    async def delete(self, insurance_plan_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(InsurancePlanModel).where(InsurancePlanModel.insurance_plan_id == insurance_plan_id)
            result = await session.execute(stmt)
            ip = result.scalars().first()
            if not ip:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"InsurancePlan {insurance_plan_id} not found.",
                )
            await session.delete(ip)
            await session.commit()
        return True
