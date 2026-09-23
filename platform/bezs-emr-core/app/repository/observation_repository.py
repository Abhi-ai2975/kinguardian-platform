from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.encounter.encounter import EncounterModel
from app.models.observation.observation import (
    ObservationModel,
    ObservationIdentifier,
    ObservationBasedOn,
    ObservationPartOf,
    ObservationCategory,
    ObservationFocus,
    ObservationPerformer,
    ObservationInterpretation,
    ObservationNote,
    ObservationReferenceRange,
    ObservationReferenceRangeAppliesTo,
    ObservationHasMember,
    ObservationDerivedFrom,
    ObservationComponent,
    ObservationComponentInterpretation,
    ObservationComponentReferenceRange,
    ObservationComponentReferenceRangeAppliesTo,
)
from app.models.observation.enums import (
    ObservationStatus,
    ObservationSubjectReferenceType,
    ObservationSpecimenReferenceType,
    ObservationDeviceReferenceType,
    ObservationBasedOnReferenceType,
    ObservationPartOfReferenceType,
    ObservationPerformerReferenceType,
    ObservationHasMemberReferenceType,
    ObservationDerivedFromReferenceType,
)
from app.schemas.observation import ObservationCreateSchema, ObservationPatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(ObservationModel.encounter),
        selectinload(ObservationModel.identifiers),
        selectinload(ObservationModel.based_on),
        selectinload(ObservationModel.part_of),
        selectinload(ObservationModel.categories),
        selectinload(ObservationModel.focus),
        selectinload(ObservationModel.performers),
        selectinload(ObservationModel.interpretations),
        selectinload(ObservationModel.notes),
        selectinload(ObservationModel.reference_ranges).selectinload(
            ObservationReferenceRange.applies_to
        ),
        selectinload(ObservationModel.has_members),
        selectinload(ObservationModel.derived_from),
        selectinload(ObservationModel.components).selectinload(
            ObservationComponent.interpretations
        ),
        selectinload(ObservationModel.components).selectinload(
            ObservationComponent.reference_ranges
        ).selectinload(
            ObservationComponentReferenceRange.applies_to
        ),
    )


def _cast_ref_type(value: str, enum_cls, field: str):
    try:
        return enum_cls(value)
    except ValueError:
        allowed = [e.value for e in enum_cls]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference type '{value}' for {field}. Allowed: {allowed}.",
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
    ref_type = _cast_ref_type(parts[0], enum_cls, field)
    return ref_type, ref_id


def _parse_open_ref(ref: str):
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


def _value_x_kwargs(payload) -> dict:
    """Extract all value[x] fields from any schema that carries them."""
    fields = [
        "value_quantity_value", "value_quantity_comparator", "value_quantity_unit",
        "value_quantity_system", "value_quantity_code",
        "value_codeable_concept_system", "value_codeable_concept_code",
        "value_codeable_concept_display", "value_codeable_concept_text",
        "value_string", "value_boolean", "value_integer", "value_time", "value_date_time",
        "value_period_start", "value_period_end",
        "value_range_low_value", "value_range_low_unit", "value_range_low_system", "value_range_low_code",
        "value_range_high_value", "value_range_high_unit", "value_range_high_system", "value_range_high_code",
        "value_ratio_numerator_value", "value_ratio_numerator_comparator", "value_ratio_numerator_unit",
        "value_ratio_numerator_system", "value_ratio_numerator_code",
        "value_ratio_denominator_value", "value_ratio_denominator_comparator", "value_ratio_denominator_unit",
        "value_ratio_denominator_system", "value_ratio_denominator_code",
        "value_sampled_data_origin_value", "value_sampled_data_origin_unit",
        "value_sampled_data_origin_system", "value_sampled_data_origin_code",
        "value_sampled_data_period", "value_sampled_data_factor",
        "value_sampled_data_lower_limit", "value_sampled_data_upper_limit",
        "value_sampled_data_dimensions", "value_sampled_data_data",
    ]
    return {f: getattr(payload, f, None) for f in fields}


class ObservationRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_observation_id(self, observation_id: int) -> Optional[ObservationModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ObservationModel).where(
                    ObservationModel.observation_id == observation_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(
        self, stmt, user_id, org_id, obs_status, patient_id, effective_from, effective_to,
        encounter_id=None,
    ):
        if user_id:
            stmt = stmt.where(ObservationModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(ObservationModel.org_id == org_id)
        if obs_status:
            stmt = stmt.where(ObservationModel.status == ObservationStatus(obs_status))
        if patient_id is not None:
            stmt = stmt.where(
                ObservationModel.subject_type == ObservationSubjectReferenceType.Patient,
                ObservationModel.subject_id == patient_id,
            )
        if encounter_id is not None:
            sub = select(EncounterModel.id).where(
                EncounterModel.encounter_id == encounter_id
            ).scalar_subquery()
            stmt = stmt.where(ObservationModel.encounter_id == sub)
        if effective_from is not None:
            stmt = stmt.where(ObservationModel.effective_date_time >= effective_from)
        if effective_to is not None:
            stmt = stmt.where(ObservationModel.effective_date_time <= effective_to)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        obs_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        effective_from: Optional[datetime] = None,
        effective_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ObservationModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ObservationModel)),
                user_id, org_id, obs_status, patient_id, effective_from, effective_to,
                encounter_id=encounter_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ObservationModel),
                user_id, org_id, obs_status, patient_id, effective_from, effective_to,
                encounter_id=encounter_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ObservationModel.effective_date_time.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        obs_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        effective_from: Optional[datetime] = None,
        effective_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ObservationModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ObservationModel)),
                user_id, org_id, obs_status, patient_id, effective_from, effective_to,
                encounter_id=encounter_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ObservationModel),
                user_id, org_id, obs_status, patient_id, effective_from, effective_to,
                encounter_id=encounter_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ObservationModel.effective_date_time.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: ObservationCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ObservationModel:
        async with self.session_factory() as session:
            # resolve subject
            subject_type, subject_id = None, None
            if payload.subject:
                subject_type, subject_id = _parse_ref(payload.subject, ObservationSubjectReferenceType, "subject")

            # resolve encounter
            encounter_internal_id = None
            if payload.encounter_id is not None:
                enc_row = (await session.execute(
                    select(EncounterModel).where(EncounterModel.encounter_id == payload.encounter_id)
                )).scalars().first()
                if not enc_row:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Encounter with encounter_id={payload.encounter_id} not found.",
                    )
                encounter_internal_id = enc_row.id

            # resolve specimen
            specimen_type, specimen_id = None, None
            if payload.specimen:
                specimen_type, specimen_id = _parse_ref(payload.specimen, ObservationSpecimenReferenceType, "specimen")

            # resolve device
            device_type, device_id = None, None
            if payload.device:
                device_type, device_id = _parse_ref(payload.device, ObservationDeviceReferenceType, "device")

            obs = ObservationModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=ObservationStatus(payload.status).value,
                code_system=payload.code_system,
                code_code=payload.code_code,
                code_display=payload.code_display,
                code_text=payload.code_text,
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                encounter_id=encounter_internal_id,
                encounter_display=payload.encounter_display,
                effective_date_time=payload.effective_date_time,
                effective_period_start=payload.effective_period_start,
                effective_period_end=payload.effective_period_end,
                effective_instant=payload.effective_instant,
                effective_timing_event=payload.effective_timing_event,
                effective_timing_code_system=payload.effective_timing_code_system,
                effective_timing_code_code=payload.effective_timing_code_code,
                effective_timing_code_display=payload.effective_timing_code_display,
                effective_timing_code_text=payload.effective_timing_code_text,
                effective_timing_repeat_bounds_duration_value=payload.effective_timing_repeat_bounds_duration_value,
                effective_timing_repeat_bounds_duration_comparator=payload.effective_timing_repeat_bounds_duration_comparator,
                effective_timing_repeat_bounds_duration_unit=payload.effective_timing_repeat_bounds_duration_unit,
                effective_timing_repeat_bounds_duration_system=payload.effective_timing_repeat_bounds_duration_system,
                effective_timing_repeat_bounds_duration_code=payload.effective_timing_repeat_bounds_duration_code,
                effective_timing_repeat_bounds_range_low_value=payload.effective_timing_repeat_bounds_range_low_value,
                effective_timing_repeat_bounds_range_low_unit=payload.effective_timing_repeat_bounds_range_low_unit,
                effective_timing_repeat_bounds_range_low_system=payload.effective_timing_repeat_bounds_range_low_system,
                effective_timing_repeat_bounds_range_low_code=payload.effective_timing_repeat_bounds_range_low_code,
                effective_timing_repeat_bounds_range_high_value=payload.effective_timing_repeat_bounds_range_high_value,
                effective_timing_repeat_bounds_range_high_unit=payload.effective_timing_repeat_bounds_range_high_unit,
                effective_timing_repeat_bounds_range_high_system=payload.effective_timing_repeat_bounds_range_high_system,
                effective_timing_repeat_bounds_range_high_code=payload.effective_timing_repeat_bounds_range_high_code,
                effective_timing_repeat_bounds_period_start=payload.effective_timing_repeat_bounds_period_start,
                effective_timing_repeat_bounds_period_end=payload.effective_timing_repeat_bounds_period_end,
                effective_timing_repeat_count=payload.effective_timing_repeat_count,
                effective_timing_repeat_count_max=payload.effective_timing_repeat_count_max,
                effective_timing_repeat_duration=payload.effective_timing_repeat_duration,
                effective_timing_repeat_duration_max=payload.effective_timing_repeat_duration_max,
                effective_timing_repeat_duration_unit=payload.effective_timing_repeat_duration_unit,
                effective_timing_repeat_frequency=payload.effective_timing_repeat_frequency,
                effective_timing_repeat_frequency_max=payload.effective_timing_repeat_frequency_max,
                effective_timing_repeat_period=payload.effective_timing_repeat_period,
                effective_timing_repeat_period_max=payload.effective_timing_repeat_period_max,
                effective_timing_repeat_period_unit=payload.effective_timing_repeat_period_unit,
                effective_timing_repeat_day_of_week=payload.effective_timing_repeat_day_of_week,
                effective_timing_repeat_time_of_day=payload.effective_timing_repeat_time_of_day,
                effective_timing_repeat_when=payload.effective_timing_repeat_when,
                effective_timing_repeat_offset=payload.effective_timing_repeat_offset,
                issued=payload.issued,
                data_absent_reason_system=payload.data_absent_reason_system,
                data_absent_reason_code=payload.data_absent_reason_code,
                data_absent_reason_display=payload.data_absent_reason_display,
                data_absent_reason_text=payload.data_absent_reason_text,
                body_site_system=payload.body_site_system,
                body_site_code=payload.body_site_code,
                body_site_display=payload.body_site_display,
                body_site_text=payload.body_site_text,
                method_system=payload.method_system,
                method_code=payload.method_code,
                method_display=payload.method_display,
                method_text=payload.method_text,
                specimen_type=specimen_type,
                specimen_id=specimen_id,
                specimen_display=payload.specimen_display,
                device_type=device_type,
                device_id=device_id,
                device_display=payload.device_display,
                **_value_x_kwargs(payload),
            )
            session.add(obs)

            # identifier
            for item in (payload.identifier or []):
                session.add(ObservationIdentifier(
                    observation=obs, org_id=org_id,
                    use=item.use, type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            # based_on
            for item in (payload.based_on or []):
                bo_type, bo_id = _parse_ref(item.reference, ObservationBasedOnReferenceType, "based_on")
                session.add(ObservationBasedOn(
                    observation=obs, org_id=org_id,
                    reference_type=bo_type, reference_id=bo_id,
                    reference_display=item.reference_display,
                ))

            # part_of
            for item in (payload.part_of or []):
                po_type, po_id = _parse_ref(item.reference, ObservationPartOfReferenceType, "part_of")
                session.add(ObservationPartOf(
                    observation=obs, org_id=org_id,
                    reference_type=po_type, reference_id=po_id,
                    reference_display=item.reference_display,
                ))

            # category
            for item in (payload.category or []):
                session.add(ObservationCategory(
                    observation=obs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            # focus (open reference)
            for item in (payload.focus or []):
                ref_type, ref_id = _parse_open_ref(item.reference)
                session.add(ObservationFocus(
                    observation=obs, org_id=org_id,
                    reference_type=ref_type, reference_id=ref_id,
                    reference_display=item.reference_display,
                ))

            # performer
            for item in (payload.performer or []):
                p_type, p_id = _parse_ref(item.reference, ObservationPerformerReferenceType, "performer")
                session.add(ObservationPerformer(
                    observation=obs, org_id=org_id,
                    reference_type=p_type, reference_id=p_id,
                    reference_display=item.reference_display,
                ))

            # interpretation
            for item in (payload.interpretation or []):
                session.add(ObservationInterpretation(
                    observation=obs, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            # note
            for item in (payload.note or []):
                note_ref_type, note_ref_id = None, None
                if item.author_reference:
                    note_ref_type, note_ref_id = _parse_open_ref(item.author_reference)
                session.add(ObservationNote(
                    observation=obs, org_id=org_id,
                    text=item.text, time=item.time,
                    author_string=item.author_string,
                    author_reference_type=note_ref_type,
                    author_reference_id=note_ref_id,
                ))

            # reference_range (nested with applies_to)
            for item in (payload.reference_range or []):
                rr_row = ObservationReferenceRange(
                    observation=obs, org_id=org_id,
                    low_value=item.low_value, low_unit=item.low_unit,
                    low_system=item.low_system, low_code=item.low_code,
                    high_value=item.high_value, high_unit=item.high_unit,
                    high_system=item.high_system, high_code=item.high_code,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    age_low_value=item.age_low_value, age_low_unit=item.age_low_unit,
                    age_low_system=item.age_low_system, age_low_code=item.age_low_code,
                    age_high_value=item.age_high_value, age_high_unit=item.age_high_unit,
                    age_high_system=item.age_high_system, age_high_code=item.age_high_code,
                    text=item.text,
                )
                session.add(rr_row)
                for at in (item.applies_to or []):
                    session.add(ObservationReferenceRangeAppliesTo(
                        reference_range=rr_row, org_id=org_id,
                        coding_system=at.coding_system, coding_code=at.coding_code,
                        coding_display=at.coding_display, text=at.text,
                    ))

            # has_member
            for item in (payload.has_member or []):
                hm_type, hm_id = _parse_ref(item.reference, ObservationHasMemberReferenceType, "has_member")
                session.add(ObservationHasMember(
                    observation=obs, org_id=org_id,
                    reference_type=hm_type, reference_id=hm_id,
                    reference_display=item.reference_display,
                ))

            # derived_from
            for item in (payload.derived_from or []):
                df_type, df_id = _parse_ref(item.reference, ObservationDerivedFromReferenceType, "derived_from")
                session.add(ObservationDerivedFrom(
                    observation=obs, org_id=org_id,
                    reference_type=df_type, reference_id=df_id,
                    reference_display=item.reference_display,
                ))

            # component (nested: interpretation + referenceRange → appliesTo)
            for item in (payload.component or []):
                comp_row = ObservationComponent(
                    observation=obs, org_id=org_id,
                    code_system=item.code_system, code_code=item.code_code,
                    code_display=item.code_display, code_text=item.code_text,
                    data_absent_reason_system=item.data_absent_reason_system,
                    data_absent_reason_code=item.data_absent_reason_code,
                    data_absent_reason_display=item.data_absent_reason_display,
                    data_absent_reason_text=item.data_absent_reason_text,
                    **_value_x_kwargs(item),
                )
                session.add(comp_row)

                for ci in (item.interpretation or []):
                    session.add(ObservationComponentInterpretation(
                        component=comp_row, org_id=org_id,
                        coding_system=ci.coding_system, coding_code=ci.coding_code,
                        coding_display=ci.coding_display, text=ci.text,
                    ))

                for rr_item in (item.reference_range or []):
                    comp_rr = ObservationComponentReferenceRange(
                        component=comp_row, org_id=org_id,
                        low_value=rr_item.low_value, low_unit=rr_item.low_unit,
                        low_system=rr_item.low_system, low_code=rr_item.low_code,
                        high_value=rr_item.high_value, high_unit=rr_item.high_unit,
                        high_system=rr_item.high_system, high_code=rr_item.high_code,
                        type_system=rr_item.type_system, type_code=rr_item.type_code,
                        type_display=rr_item.type_display, type_text=rr_item.type_text,
                        age_low_value=rr_item.age_low_value, age_low_unit=rr_item.age_low_unit,
                        age_low_system=rr_item.age_low_system, age_low_code=rr_item.age_low_code,
                        age_high_value=rr_item.age_high_value, age_high_unit=rr_item.age_high_unit,
                        age_high_system=rr_item.age_high_system, age_high_code=rr_item.age_high_code,
                        text=rr_item.text,
                    )
                    session.add(comp_rr)
                    for at in (rr_item.applies_to or []):
                        session.add(ObservationComponentReferenceRangeAppliesTo(
                            reference_range=comp_rr, org_id=org_id,
                            coding_system=at.coding_system, coding_code=at.coding_code,
                            coding_display=at.coding_display, text=at.text,
                        ))

            await session.commit()
            await session.refresh(obs)

            stmt = _with_relationships(
                select(ObservationModel).where(ObservationModel.id == obs.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Patch ─────────────────────────────────────────────────────────────────

    async def patch(
        self,
        observation_id: int,
        payload: ObservationPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ObservationModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ObservationModel).where(ObservationModel.observation_id == observation_id)
            )
            result = await session.execute(stmt)
            obs = result.scalars().first()
            if not obs:
                return None

            for field, value in payload.model_dump(exclude_unset=True).items():
                if field == "status" and value is not None:
                    setattr(obs, field, ObservationStatus(value).value)
                else:
                    setattr(obs, field, value)

            obs.updated_by = updated_by
            await session.commit()
            await session.refresh(obs)

            stmt2 = _with_relationships(
                select(ObservationModel).where(ObservationModel.id == obs.id)
            )
            result2 = await session.execute(stmt2)
            return result2.scalars().one()

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, observation_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(ObservationModel).where(ObservationModel.observation_id == observation_id)
            result = await session.execute(stmt)
            obs = result.scalars().first()
            if obs:
                await session.delete(obs)
                await session.commit()
