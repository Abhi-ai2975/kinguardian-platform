from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.condition.condition import (
    ConditionModel,
    ConditionIdentifier,
    ConditionCategory,
    ConditionBodySite,
    ConditionStage,
    ConditionStageAssessment,
    ConditionEvidence,
    ConditionEvidenceCode,
    ConditionEvidenceDetail,
    ConditionNote,
)
from app.models.condition.enums import (
    ConditionAsserterType,
    ConditionNoteAuthorReferenceType,
    ConditionRecorderType,
    ConditionStageAssessmentType,
    ConditionSubjectType,
)
from app.models.encounter.encounter import EncounterModel
from app.models.enums import EncounterReferenceType
from app.schemas.condition import ConditionCreateSchema, ConditionPatchSchema
from app.core.references import parse_reference


def _with_relationships(stmt):
    return stmt.options(
        selectinload(ConditionModel.encounter),
        selectinload(ConditionModel.identifiers),
        selectinload(ConditionModel.categories),
        selectinload(ConditionModel.body_sites),
        selectinload(ConditionModel.stages).selectinload(ConditionStage.assessments),
        selectinload(ConditionModel.evidence)
            .selectinload(ConditionEvidence.codes),
        selectinload(ConditionModel.evidence)
            .selectinload(ConditionEvidence.details),
        selectinload(ConditionModel.notes),
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


def _parse_open_ref(ref: str) -> Tuple[str, int]:
    """Parse 'ResourceType/id' for open (any type) references."""
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference format: '{ref}'. Expected 'ResourceType/id'.",
        )
    try:
        return parts[0], int(parts[1])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid reference id in: '{ref}'. Id must be an integer.",
        )


class ConditionRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_condition_id(self, condition_id: int) -> Optional[ConditionModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ConditionModel).where(ConditionModel.condition_id == condition_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        clinical_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        recorded_from: Optional[datetime] = None,
        recorded_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ConditionModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ConditionModel)),
                user_id, org_id, clinical_status, patient_id, recorded_from, recorded_to,
                encounter_id=encounter_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ConditionModel),
                user_id, org_id, clinical_status, patient_id, recorded_from, recorded_to,
                encounter_id=encounter_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ConditionModel.recorded_date.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    def _apply_list_filters(
        self, stmt, user_id, org_id, clinical_status, patient_id, recorded_from, recorded_to,
        encounter_id=None,
    ):
        if user_id:
            stmt = stmt.where(ConditionModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(ConditionModel.org_id == org_id)
        if clinical_status:
            stmt = stmt.where(ConditionModel.clinical_status_code == clinical_status)
        if patient_id is not None:
            stmt = stmt.where(
                ConditionModel.subject_type == ConditionSubjectType.Patient,
                ConditionModel.subject_id == patient_id,
            )
        if encounter_id is not None:
            sub = select(EncounterModel.id).where(
                EncounterModel.encounter_id == encounter_id
            ).scalar_subquery()
            stmt = stmt.where(ConditionModel.encounter_id == sub)
        if recorded_from is not None:
            stmt = stmt.where(ConditionModel.recorded_date >= recorded_from)
        if recorded_to is not None:
            stmt = stmt.where(ConditionModel.recorded_date <= recorded_to)
        return stmt

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        clinical_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        recorded_from: Optional[datetime] = None,
        recorded_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ConditionModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ConditionModel)),
                user_id, org_id, clinical_status, patient_id, recorded_from, recorded_to,
                encounter_id=encounter_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ConditionModel),
                user_id, org_id, clinical_status, patient_id, recorded_from, recorded_to,
                encounter_id=encounter_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ConditionModel.recorded_date.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: ConditionCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> ConditionModel:
        subject_type, subject_id = (
            parse_reference(payload.subject, ConditionSubjectType)
            if payload.subject else (None, None)
        )

        recorder_type, recorder_id = (None, None)
        if payload.recorder:
            rec_str, recorder_id = _parse_open_ref(payload.recorder)
            recorder_type = _cast_ref_type(rec_str, ConditionRecorderType, "recorder")

        asserter_type, asserter_id = (None, None)
        if payload.asserter:
            asr_str, asserter_id = _parse_open_ref(payload.asserter)
            asserter_type = _cast_ref_type(asr_str, ConditionAsserterType, "asserter")

        async with self.session_factory() as session:
            # Resolve public encounter_id → internal PK
            internal_encounter_id: Optional[int] = None
            if payload.encounter_id is not None:
                enc_result = await session.execute(
                    select(EncounterModel.id).where(
                        EncounterModel.encounter_id == payload.encounter_id
                    )
                )
                internal_encounter_id = enc_result.scalar_one_or_none()
                if internal_encounter_id is None:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Encounter/{payload.encounter_id} not found.",
                    )

            condition = ConditionModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                clinical_status_system=payload.clinical_status_system,
                clinical_status_code=payload.clinical_status_code,
                clinical_status_display=payload.clinical_status_display,
                clinical_status_text=payload.clinical_status_text,
                verification_status_system=payload.verification_status_system,
                verification_status_code=payload.verification_status_code,
                verification_status_display=payload.verification_status_display,
                verification_status_text=payload.verification_status_text,
                severity_system=payload.severity_system,
                severity_code=payload.severity_code,
                severity_display=payload.severity_display,
                severity_text=payload.severity_text,
                code_system=payload.code_system,
                code_code=payload.code_code,
                code_display=payload.code_display,
                code_text=payload.code_text,
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                encounter_type=EncounterReferenceType.Encounter if internal_encounter_id else None,
                encounter_id=internal_encounter_id,
                encounter_display=payload.encounter_display,
                onset_datetime=payload.onset_datetime,
                onset_age_value=payload.onset_age_value,
                onset_age_comparator=payload.onset_age_comparator,
                onset_age_unit=payload.onset_age_unit,
                onset_age_system=payload.onset_age_system,
                onset_age_code=payload.onset_age_code,
                onset_period_start=payload.onset_period_start,
                onset_period_end=payload.onset_period_end,
                onset_range_low_value=payload.onset_range_low_value,
                onset_range_low_unit=payload.onset_range_low_unit,
                onset_range_high_value=payload.onset_range_high_value,
                onset_range_high_unit=payload.onset_range_high_unit,
                onset_string=payload.onset_string,
                abatement_datetime=payload.abatement_datetime,
                abatement_age_value=payload.abatement_age_value,
                abatement_age_comparator=payload.abatement_age_comparator,
                abatement_age_unit=payload.abatement_age_unit,
                abatement_age_system=payload.abatement_age_system,
                abatement_age_code=payload.abatement_age_code,
                abatement_period_start=payload.abatement_period_start,
                abatement_period_end=payload.abatement_period_end,
                abatement_range_low_value=payload.abatement_range_low_value,
                abatement_range_low_unit=payload.abatement_range_low_unit,
                abatement_range_high_value=payload.abatement_range_high_value,
                abatement_range_high_unit=payload.abatement_range_high_unit,
                abatement_string=payload.abatement_string,
                recorded_date=payload.recorded_date,
                recorder_type=recorder_type,
                recorder_id=recorder_id,
                recorder_display=payload.recorder_display,
                asserter_type=asserter_type,
                asserter_id=asserter_id,
                asserter_display=payload.asserter_display,
            )

            # identifier[]
            if payload.identifier:
                for i in payload.identifier:
                    condition.identifiers.append(ConditionIdentifier(
                        org_id=org_id,
                        use=i.use,
                        type_system=i.type_system,
                        type_code=i.type_code,
                        type_display=i.type_display,
                        type_text=i.type_text,
                        system=i.system,
                        value=i.value,
                        period_start=i.period_start,
                        period_end=i.period_end,
                        assigner=i.assigner,
                    ))

            # category[]
            if payload.category:
                for cat in payload.category:
                    condition.categories.append(ConditionCategory(
                        org_id=org_id,
                        coding_system=cat.coding_system,
                        coding_code=cat.coding_code,
                        coding_display=cat.coding_display,
                        text=cat.text,
                    ))

            # bodySite[]
            if payload.body_site:
                for bs in payload.body_site:
                    condition.body_sites.append(ConditionBodySite(
                        org_id=org_id,
                        coding_system=bs.coding_system,
                        coding_code=bs.coding_code,
                        coding_display=bs.coding_display,
                        text=bs.text,
                    ))

            # stage[]
            if payload.stage:
                for s in payload.stage:
                    stage = ConditionStage(
                        org_id=org_id,
                        summary_system=s.summary_system,
                        summary_code=s.summary_code,
                        summary_display=s.summary_display,
                        summary_text=s.summary_text,
                        type_system=s.type_system,
                        type_code=s.type_code,
                        type_display=s.type_display,
                        type_text=s.type_text,
                    )
                    if s.assessment:
                        for a in s.assessment:
                            ref_type_enum, ref_id = (None, None)
                            if a.reference:
                                ref_str, ref_id = _parse_open_ref(a.reference)
                                ref_type_enum = _cast_ref_type(
                                    ref_str,
                                    ConditionStageAssessmentType,
                                    "stage.assessment",
                                )
                            stage.assessments.append(ConditionStageAssessment(
                                org_id=org_id,
                                reference_type=ref_type_enum,
                                reference_id=ref_id,
                                reference_display=a.reference_display,
                            ))
                    condition.stages.append(stage)

            # evidence[]
            if payload.evidence:
                for e in payload.evidence:
                    evidence = ConditionEvidence(org_id=org_id)
                    if e.code:
                        for ec in e.code:
                            evidence.codes.append(ConditionEvidenceCode(
                                org_id=org_id,
                                coding_system=ec.coding_system,
                                coding_code=ec.coding_code,
                                coding_display=ec.coding_display,
                                text=ec.text,
                            ))
                    if e.detail:
                        for d in e.detail:
                            ref_type, ref_id = _parse_open_ref(d.reference)
                            evidence.details.append(ConditionEvidenceDetail(
                                org_id=org_id,
                                reference_type=ref_type,
                                reference_id=ref_id,
                                reference_display=d.reference_display,
                            ))
                    condition.evidence.append(evidence)

            # note[]
            if payload.note:
                for n in payload.note:
                    author_ref_type_enum, author_ref_id = (None, None)
                    if n.author_reference:
                        author_str, author_ref_id = _parse_open_ref(n.author_reference)
                        author_ref_type_enum = _cast_ref_type(
                            author_str,
                            ConditionNoteAuthorReferenceType,
                            "note.authorReference",
                        )
                    condition.notes.append(ConditionNote(
                        org_id=org_id,
                        text=n.text,
                        time=n.time,
                        author_string=n.author_string,
                        author_reference_type=author_ref_type_enum,
                        author_reference_id=author_ref_id,
                        author_reference_display=n.author_reference_display,
                    ))

            try:
                session.add(condition)
                await session.commit()
                await session.refresh(condition)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_condition_id(condition.condition_id)

    async def patch(
        self,
        condition_id: int,
        payload: ConditionPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[ConditionModel]:
        async with self.session_factory() as session:
            result = await session.execute(
                select(ConditionModel).where(ConditionModel.condition_id == condition_id)
            )
            condition = result.scalars().first()
            if not condition:
                return None

            update_data = payload.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(condition, field, value)
            if updated_by is not None:
                condition.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(condition)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_condition_id(condition_id)

    async def delete(self, condition_id: int) -> bool:
        async with self.session_factory() as session:
            result = await session.execute(
                select(ConditionModel).where(ConditionModel.condition_id == condition_id)
            )
            condition = result.scalars().first()
            if not condition:
                return False

            try:
                await session.delete(condition)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise
