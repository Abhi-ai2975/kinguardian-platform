from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.care_plan.enums import (
    CarePlanActivityReferenceType,
    CarePlanAddressesReferenceType,
    CarePlanAuthorReferenceType,
    CarePlanBasedOnReferenceType,
    CarePlanCareTeamReferenceType,
    CarePlanContributorReferenceType,
    CarePlanDetailActivityStatus,
    CarePlanDetailGoalReferenceType,
    CarePlanDetailLocationReferenceType,
    CarePlanDetailPerformerReferenceType,
    CarePlanDetailProductReferenceType,
    CarePlanDetailReasonReferenceType,
    CarePlanGoalReferenceType,
    CarePlanIntent,
    CarePlanPartOfReferenceType,
    CarePlanReplacesReferenceType,
    CarePlanStatus,
    CarePlanSubjectReferenceType,
)
from app.models.enums import EncounterReferenceType
from app.models.care_plan.care_plan import (
    CarePlanActivity,
    CarePlanActivityDetailGoal,
    CarePlanActivityDetailPerformer,
    CarePlanActivityDetailReasonCode,
    CarePlanActivityDetailReasonRef,
    CarePlanActivityOutcomeCC,
    CarePlanActivityOutcomeRef,
    CarePlanActivityProgress,
    CarePlanAddresses,
    CarePlanBasedOn,
    CarePlanCareTeam,
    CarePlanCategory,
    CarePlanContributor,
    CarePlanGoal,
    CarePlanIdentifier,
    CarePlanModel,
    CarePlanNote,
    CarePlanPartOf,
    CarePlanReplaces,
    CarePlanSupportingInfo,
)
from app.schemas.care_plan.input import CarePlanCreateSchema, CarePlanPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(CarePlanModel.identifiers),
        selectinload(CarePlanModel.based_on),
        selectinload(CarePlanModel.replaces),
        selectinload(CarePlanModel.part_of),
        selectinload(CarePlanModel.categories),
        selectinload(CarePlanModel.contributors),
        selectinload(CarePlanModel.care_teams),
        selectinload(CarePlanModel.addresses),
        selectinload(CarePlanModel.supporting_info),
        selectinload(CarePlanModel.goals),
        selectinload(CarePlanModel.notes),
        selectinload(CarePlanModel.activities).selectinload(CarePlanActivity.outcome_codeable_concepts),
        selectinload(CarePlanModel.activities).selectinload(CarePlanActivity.outcome_references),
        selectinload(CarePlanModel.activities).selectinload(CarePlanActivity.progress),
        selectinload(CarePlanModel.activities).selectinload(CarePlanActivity.detail_reason_codes),
        selectinload(CarePlanModel.activities).selectinload(CarePlanActivity.detail_reason_references),
        selectinload(CarePlanModel.activities).selectinload(CarePlanActivity.detail_goals),
        selectinload(CarePlanModel.activities).selectinload(CarePlanActivity.detail_performers),
    )


def _parse_ref_closed(ref: str, enum_cls, field: str):
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


def _parse_ref_open(ref: str, field: str):
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
    return parts[0], ref_id


def _parse_ref_closed_opt(ref: Optional[str], enum_cls, field: str):
    if not ref:
        return None, None
    return _parse_ref_closed(ref, enum_cls, field)


def _parse_ref_open_opt(ref: Optional[str], field: str):
    if not ref:
        return None, None
    return _parse_ref_open(ref, field)


def _cast_status(v) -> Optional[str]:
    if v is None:
        return None
    try:
        return CarePlanStatus(v).value
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{v}'. Allowed: {[e.value for e in CarePlanStatus]}.",
        )


def _cast_intent(v) -> Optional[str]:
    if v is None:
        return None
    try:
        return CarePlanIntent(v).value
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid intent '{v}'. Allowed: {[e.value for e in CarePlanIntent]}.",
        )


def _cast_detail_status(v) -> Optional[str]:
    if v is None:
        return None
    try:
        return CarePlanDetailActivityStatus(v).value
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid detail_status '{v}'. Allowed: {[e.value for e in CarePlanDetailActivityStatus]}.",
        )


class CarePlanRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_care_plan_id(self, care_plan_id: int) -> Optional[CarePlanModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(CarePlanModel).where(CarePlanModel.care_plan_id == care_plan_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id):
        if user_id:
            stmt = stmt.where(CarePlanModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(CarePlanModel.org_id == org_id)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CarePlanModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(CarePlanModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(CarePlanModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(CarePlanModel.care_plan_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CarePlanModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(CarePlanModel)), user_id, org_id
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(CarePlanModel), user_id, org_id
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(CarePlanModel.care_plan_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    def _build_activity_grandchildren(self, session, activity, org_id, item):
        for oc in (item.outcome_codeable_concepts or []):
            session.add(CarePlanActivityOutcomeCC(
                activity=activity, org_id=org_id,
                coding_system=oc.coding_system, coding_code=oc.coding_code,
                coding_display=oc.coding_display, text=oc.text,
            ))
        for oref in (item.outcome_references or []):
            ref_type, ref_id = _parse_ref_open(oref.reference, "outcome_references.reference")
            session.add(CarePlanActivityOutcomeRef(
                activity=activity, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=oref.reference_display,
            ))
        for prog in (item.progress or []):
            auth_type, auth_id = _parse_ref_open_opt(prog.author_reference, "progress.author_reference")
            session.add(CarePlanActivityProgress(
                activity=activity, org_id=org_id,
                text=prog.text, time=prog.time, author_string=prog.author_string,
                author_reference_type=auth_type, author_reference_id=auth_id,
                author_reference_display=prog.author_reference_display,
            ))
        for rc in (item.detail_reason_codes or []):
            session.add(CarePlanActivityDetailReasonCode(
                activity=activity, org_id=org_id,
                coding_system=rc.coding_system, coding_code=rc.coding_code,
                coding_display=rc.coding_display, text=rc.text,
            ))
        for rref in (item.detail_reason_references or []):
            ref_type, ref_id = _parse_ref_closed(rref.reference, CarePlanDetailReasonReferenceType, "detail_reason_references.reference")
            session.add(CarePlanActivityDetailReasonRef(
                activity=activity, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=rref.reference_display,
            ))
        for g in (item.detail_goals or []):
            ref_type, ref_id = _parse_ref_closed(g.reference, CarePlanDetailGoalReferenceType, "detail_goals.reference")
            session.add(CarePlanActivityDetailGoal(
                activity=activity, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=g.reference_display,
            ))
        for p in (item.detail_performers or []):
            ref_type, ref_id = _parse_ref_closed(p.reference, CarePlanDetailPerformerReferenceType, "detail_performers.reference")
            session.add(CarePlanActivityDetailPerformer(
                activity=activity, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=p.reference_display,
            ))

    def _build_children(self, session, care_plan, org_id, payload):
        for item in (payload.identifiers or []):
            session.add(CarePlanIdentifier(
                care_plan=care_plan, org_id=org_id,
                use=item.use, type_system=item.type_system, type_code=item.type_code,
                type_display=item.type_display, type_text=item.type_text,
                system=item.system, value=item.value,
                period_start=item.period_start, period_end=item.period_end, assigner=item.assigner,
            ))
        for item in (payload.based_on or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, CarePlanBasedOnReferenceType, "based_on.reference")
            session.add(CarePlanBasedOn(
                care_plan=care_plan, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=item.reference_display,
            ))
        for item in (payload.replaces or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, CarePlanReplacesReferenceType, "replaces.reference")
            session.add(CarePlanReplaces(
                care_plan=care_plan, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=item.reference_display,
            ))
        for item in (payload.part_of or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, CarePlanPartOfReferenceType, "part_of.reference")
            session.add(CarePlanPartOf(
                care_plan=care_plan, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=item.reference_display,
            ))
        for item in (payload.categories or []):
            session.add(CarePlanCategory(
                care_plan=care_plan, org_id=org_id,
                coding_system=item.coding_system, coding_code=item.coding_code,
                coding_display=item.coding_display, text=item.text,
            ))
        for item in (payload.contributors or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, CarePlanContributorReferenceType, "contributors.reference")
            session.add(CarePlanContributor(
                care_plan=care_plan, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=item.reference_display,
            ))
        for item in (payload.care_teams or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, CarePlanCareTeamReferenceType, "care_teams.reference")
            session.add(CarePlanCareTeam(
                care_plan=care_plan, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=item.reference_display,
            ))
        for item in (payload.addresses or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, CarePlanAddressesReferenceType, "addresses.reference")
            session.add(CarePlanAddresses(
                care_plan=care_plan, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=item.reference_display,
            ))
        for item in (payload.supporting_info or []):
            ref_type, ref_id = _parse_ref_open(item.reference, "supporting_info.reference")
            session.add(CarePlanSupportingInfo(
                care_plan=care_plan, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=item.reference_display,
            ))
        for item in (payload.goals or []):
            ref_type, ref_id = _parse_ref_closed(item.reference, CarePlanGoalReferenceType, "goals.reference")
            session.add(CarePlanGoal(
                care_plan=care_plan, org_id=org_id,
                reference_type=ref_type, reference_id=ref_id, reference_display=item.reference_display,
            ))
        for item in (payload.notes or []):
            auth_type, auth_id = _parse_ref_open_opt(item.author_reference, "notes.author_reference")
            session.add(CarePlanNote(
                care_plan=care_plan, org_id=org_id,
                text=item.text, time=item.time, author_string=item.author_string,
                author_reference_type=auth_type, author_reference_id=auth_id,
                author_reference_display=item.author_reference_display,
            ))
        for item in (payload.activities or []):
            act_ref_type, act_ref_id = _parse_ref_closed_opt(item.reference, CarePlanActivityReferenceType, "activities.reference")
            loc_type, loc_id = _parse_ref_closed_opt(item.detail_location, CarePlanDetailLocationReferenceType, "detail_location")
            prod_ref_type, prod_ref_id = _parse_ref_closed_opt(item.detail_product_reference, CarePlanDetailProductReferenceType, "detail_product_reference")

            activity = CarePlanActivity(
                care_plan=care_plan, org_id=org_id,
                reference_type=act_ref_type, reference_id=act_ref_id, reference_display=item.reference_display,
                detail_kind=item.detail_kind,
                detail_instantiates_canonical=item.detail_instantiates_canonical,
                detail_instantiates_uri=item.detail_instantiates_uri,
                detail_code_system=item.detail_code_system,
                detail_code_code=item.detail_code_code,
                detail_code_display=item.detail_code_display,
                detail_code_text=item.detail_code_text,
                detail_status=_cast_detail_status(item.detail_status),
                detail_status_reason_system=item.detail_status_reason_system,
                detail_status_reason_code=item.detail_status_reason_code,
                detail_status_reason_display=item.detail_status_reason_display,
                detail_status_reason_text=item.detail_status_reason_text,
                detail_do_not_perform=item.detail_do_not_perform,
                detail_scheduled_timing_event=item.detail_scheduled_timing_event,
                detail_scheduled_timing_code_system=item.detail_scheduled_timing_code_system,
                detail_scheduled_timing_code_code=item.detail_scheduled_timing_code_code,
                detail_scheduled_timing_code_display=item.detail_scheduled_timing_code_display,
                detail_scheduled_timing_code_text=item.detail_scheduled_timing_code_text,
                detail_scheduled_timing_repeat_count=item.detail_scheduled_timing_repeat_count,
                detail_scheduled_timing_repeat_count_max=item.detail_scheduled_timing_repeat_count_max,
                detail_scheduled_timing_repeat_duration=item.detail_scheduled_timing_repeat_duration,
                detail_scheduled_timing_repeat_duration_max=item.detail_scheduled_timing_repeat_duration_max,
                detail_scheduled_timing_repeat_duration_unit=item.detail_scheduled_timing_repeat_duration_unit,
                detail_scheduled_timing_repeat_frequency=item.detail_scheduled_timing_repeat_frequency,
                detail_scheduled_timing_repeat_frequency_max=item.detail_scheduled_timing_repeat_frequency_max,
                detail_scheduled_timing_repeat_period=item.detail_scheduled_timing_repeat_period,
                detail_scheduled_timing_repeat_period_max=item.detail_scheduled_timing_repeat_period_max,
                detail_scheduled_timing_repeat_period_unit=item.detail_scheduled_timing_repeat_period_unit,
                detail_scheduled_timing_repeat_day_of_week=item.detail_scheduled_timing_repeat_day_of_week,
                detail_scheduled_timing_repeat_time_of_day=item.detail_scheduled_timing_repeat_time_of_day,
                detail_scheduled_timing_repeat_when=item.detail_scheduled_timing_repeat_when,
                detail_scheduled_timing_repeat_offset=item.detail_scheduled_timing_repeat_offset,
                detail_scheduled_timing_repeat_bounds_start=item.detail_scheduled_timing_repeat_bounds_start,
                detail_scheduled_timing_repeat_bounds_end=item.detail_scheduled_timing_repeat_bounds_end,
                detail_scheduled_period_start=item.detail_scheduled_period_start,
                detail_scheduled_period_end=item.detail_scheduled_period_end,
                detail_scheduled_string=item.detail_scheduled_string,
                detail_location_type=loc_type,
                detail_location_id=loc_id,
                detail_location_display=item.detail_location_display,
                detail_product_codeable_concept_system=item.detail_product_codeable_concept_system,
                detail_product_codeable_concept_code=item.detail_product_codeable_concept_code,
                detail_product_codeable_concept_display=item.detail_product_codeable_concept_display,
                detail_product_codeable_concept_text=item.detail_product_codeable_concept_text,
                detail_product_reference_type=prod_ref_type,
                detail_product_reference_id=prod_ref_id,
                detail_product_reference_display=item.detail_product_reference_display,
                detail_daily_amount_value=item.detail_daily_amount_value,
                detail_daily_amount_unit=item.detail_daily_amount_unit,
                detail_daily_amount_system=item.detail_daily_amount_system,
                detail_daily_amount_code=item.detail_daily_amount_code,
                detail_quantity_value=item.detail_quantity_value,
                detail_quantity_unit=item.detail_quantity_unit,
                detail_quantity_system=item.detail_quantity_system,
                detail_quantity_code=item.detail_quantity_code,
                detail_description=item.detail_description,
            )
            session.add(activity)
            self._build_activity_grandchildren(session, activity, org_id, item)

    async def create(
        self,
        payload: CarePlanCreateSchema,
        user_id: str,
        org_id: str,
        created_by: str,
    ) -> CarePlanModel:
        subject_type, subject_id = _parse_ref_closed_opt(payload.subject, CarePlanSubjectReferenceType, "subject")
        encounter_type, encounter_id = _parse_ref_closed_opt(payload.encounter, EncounterReferenceType, "encounter")
        author_type, author_id = _parse_ref_closed_opt(payload.author, CarePlanAuthorReferenceType, "author")

        async with self.session_factory() as session:
            care_plan = CarePlanModel(
                user_id=user_id,
                org_id=org_id,
                status=_cast_status(payload.status),
                intent=_cast_intent(payload.intent),
                title=payload.title,
                description=payload.description,
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                encounter_type=encounter_type,
                encounter_id=encounter_id,
                encounter_display=payload.encounter_display,
                period_start=payload.period_start,
                period_end=payload.period_end,
                created=payload.created,
                author_type=author_type,
                author_id=author_id,
                author_display=payload.author_display,
                instantiates_canonical=payload.instantiates_canonical,
                instantiates_uri=payload.instantiates_uri,
                created_by=created_by,
            )
            session.add(care_plan)
            await session.flush()
            self._build_children(session, care_plan, org_id, payload)
            await session.commit()
            await session.refresh(care_plan)

        return await self.get_by_care_plan_id(care_plan.care_plan_id)

    async def patch(
        self,
        care_plan_id: int,
        payload: CarePlanPatchSchema,
        updated_by: str,
    ) -> Optional[CarePlanModel]:
        data = payload.model_dump(exclude_unset=True)
        async with self.session_factory() as session:
            stmt = _with_relationships(select(CarePlanModel).where(CarePlanModel.care_plan_id == care_plan_id))
            result = await session.execute(stmt)
            care_plan = result.scalars().first()
            if not care_plan:
                return None

            # scalar fields
            scalar_map = {
                "status": lambda v: setattr(care_plan, "status", _cast_status(v)),
                "intent": lambda v: setattr(care_plan, "intent", _cast_intent(v)),
                "title": lambda v: setattr(care_plan, "title", v),
                "description": lambda v: setattr(care_plan, "description", v),
                "subject_display": lambda v: setattr(care_plan, "subject_display", v),
                "encounter_display": lambda v: setattr(care_plan, "encounter_display", v),
                "period_start": lambda v: setattr(care_plan, "period_start", v),
                "period_end": lambda v: setattr(care_plan, "period_end", v),
                "created": lambda v: setattr(care_plan, "created", v),
                "author_display": lambda v: setattr(care_plan, "author_display", v),
                "instantiates_canonical": lambda v: setattr(care_plan, "instantiates_canonical", v),
                "instantiates_uri": lambda v: setattr(care_plan, "instantiates_uri", v),
            }
            for key, fn in scalar_map.items():
                if key in data:
                    fn(data[key])

            if "subject" in data and data["subject"]:
                st, si = _parse_ref_closed(data["subject"], CarePlanSubjectReferenceType, "subject")
                care_plan.subject_type = st
                care_plan.subject_id = si
            if "encounter" in data and data["encounter"]:
                et, ei = _parse_ref_closed(data["encounter"], EncounterReferenceType, "encounter")
                care_plan.encounter_type = et
                care_plan.encounter_id = ei
            if "author" in data and data["author"]:
                at, ai = _parse_ref_closed(data["author"], CarePlanAuthorReferenceType, "author")
                care_plan.author_type = at
                care_plan.author_id = ai

            care_plan.updated_by = updated_by

            # replace child arrays when provided
            child_arrays = [
                "identifiers", "based_on", "replaces", "part_of", "categories",
                "contributors", "care_teams", "addresses", "supporting_info",
                "goals", "activities", "notes",
            ]
            needs_rebuild = any(k in data for k in child_arrays)
            if needs_rebuild:
                # delete existing children
                if "identifiers" in data:
                    for ch in list(care_plan.identifiers):
                        await session.delete(ch)
                if "based_on" in data:
                    for ch in list(care_plan.based_on):
                        await session.delete(ch)
                if "replaces" in data:
                    for ch in list(care_plan.replaces):
                        await session.delete(ch)
                if "part_of" in data:
                    for ch in list(care_plan.part_of):
                        await session.delete(ch)
                if "categories" in data:
                    for ch in list(care_plan.categories):
                        await session.delete(ch)
                if "contributors" in data:
                    for ch in list(care_plan.contributors):
                        await session.delete(ch)
                if "care_teams" in data:
                    for ch in list(care_plan.care_teams):
                        await session.delete(ch)
                if "addresses" in data:
                    for ch in list(care_plan.addresses):
                        await session.delete(ch)
                if "supporting_info" in data:
                    for ch in list(care_plan.supporting_info):
                        await session.delete(ch)
                if "goals" in data:
                    for ch in list(care_plan.goals):
                        await session.delete(ch)
                if "notes" in data:
                    for ch in list(care_plan.notes):
                        await session.delete(ch)
                if "activities" in data:
                    for ch in list(care_plan.activities):
                        await session.delete(ch)
                await session.flush()

                # rebuild
                from app.schemas.care_plan.input import CarePlanCreateSchema as _CS
                rebuild_payload = CarePlanPatchSchema.model_validate(data)
                self._build_children(session, care_plan, care_plan.org_id, rebuild_payload)

            await session.commit()

        return await self.get_by_care_plan_id(care_plan_id)

    async def delete(self, care_plan_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(CarePlanModel).where(CarePlanModel.care_plan_id == care_plan_id)
            result = await session.execute(stmt)
            care_plan = result.scalars().first()
            if not care_plan:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail=f"CarePlan {care_plan_id} not found.",
                )
            await session.delete(care_plan)
            await session.commit()
        return True
