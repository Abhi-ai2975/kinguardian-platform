from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.allergy_intolerance.enums import (
    AllergyIntoleranceCategoryCode,
    AllergyIntoleranceCriticality,
    AllergyIntoleranceParticipantReferenceType,
    AllergyIntolerancePatientReferenceType,
    AllergyIntoleranceReactionSeverity,
    AllergyIntoleranceType,
)
from app.models.allergy_intolerance.allergy_intolerance import (
    AllergyIntoleranceCategory,
    AllergyIntoleranceIdentifier,
    AllergyIntoleranceModel,
    AllergyIntoleranceNote,
    AllergyIntoleranceReaction,
    AllergyIntoleranceReactionManifestation,
    AllergyIntoleranceReactionNote,
)
from app.models.enums import EncounterReferenceType
from app.schemas.allergy_intolerance.input import (
    AllergyIntoleranceCreateSchema,
    AllergyIntolerancePatchSchema,
)


def _with_relationships(stmt):
    return stmt.options(
        selectinload(AllergyIntoleranceModel.identifiers),
        selectinload(AllergyIntoleranceModel.categories),
        selectinload(AllergyIntoleranceModel.notes),
        selectinload(AllergyIntoleranceModel.reactions).selectinload(
            AllergyIntoleranceReaction.manifestations
        ),
        selectinload(AllergyIntoleranceModel.reactions).selectinload(
            AllergyIntoleranceReaction.reaction_notes
        ),
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


def _cast_category(val: str) -> AllergyIntoleranceCategoryCode:
    try:
        return AllergyIntoleranceCategoryCode(val)
    except ValueError:
        allowed = [e.value for e in AllergyIntoleranceCategoryCode]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category '{val}'. Allowed: {allowed}.",
        )


def _cast_severity(val: Optional[str]) -> Optional[AllergyIntoleranceReactionSeverity]:
    if not val:
        return None
    try:
        return AllergyIntoleranceReactionSeverity(val)
    except ValueError:
        allowed = [e.value for e in AllergyIntoleranceReactionSeverity]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid severity '{val}'. Allowed: {allowed}.",
        )


class AllergyIntoleranceRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def get_by_allergy_intolerance_id(self, allergy_intolerance_id: int) -> Optional[AllergyIntoleranceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(AllergyIntoleranceModel).where(
                    AllergyIntoleranceModel.allergy_intolerance_id == allergy_intolerance_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(self, stmt, user_id, org_id, clinical_status, allergy_type, criticality):
        if user_id:
            stmt = stmt.where(AllergyIntoleranceModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(AllergyIntoleranceModel.org_id == org_id)
        if clinical_status:
            stmt = stmt.where(AllergyIntoleranceModel.clinical_status_code == clinical_status)
        if allergy_type:
            try:
                stmt = stmt.where(AllergyIntoleranceModel.type == AllergyIntoleranceType(allergy_type))
            except ValueError:
                pass
        if criticality:
            try:
                stmt = stmt.where(AllergyIntoleranceModel.criticality == AllergyIntoleranceCriticality(criticality))
            except ValueError:
                pass
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        clinical_status: Optional[str] = None,
        allergy_type: Optional[str] = None,
        criticality: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AllergyIntoleranceModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(AllergyIntoleranceModel)),
                user_id, org_id, clinical_status, allergy_type, criticality,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(AllergyIntoleranceModel),
                user_id, org_id, clinical_status, allergy_type, criticality,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(AllergyIntoleranceModel.allergy_intolerance_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        clinical_status: Optional[str] = None,
        allergy_type: Optional[str] = None,
        criticality: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AllergyIntoleranceModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(AllergyIntoleranceModel)),
                user_id, org_id, clinical_status, allergy_type, criticality,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(AllergyIntoleranceModel),
                user_id, org_id, clinical_status, allergy_type, criticality,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(AllergyIntoleranceModel.allergy_intolerance_id.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    def _build_reactions(self, session, ai_model, org_id, reaction_inputs):
        for rx in reaction_inputs:
            reaction = AllergyIntoleranceReaction(
                allergy_intolerance=ai_model,
                org_id=org_id,
                substance_system=rx.substance_system,
                substance_code=rx.substance_code,
                substance_display=rx.substance_display,
                substance_text=rx.substance_text,
                description=rx.description,
                onset=rx.onset,
                severity=_cast_severity(rx.severity),
                exposure_route_system=rx.exposure_route_system,
                exposure_route_code=rx.exposure_route_code,
                exposure_route_display=rx.exposure_route_display,
                exposure_route_text=rx.exposure_route_text,
            )
            session.add(reaction)
            for m in rx.manifestations:
                session.add(AllergyIntoleranceReactionManifestation(
                    reaction=reaction, org_id=org_id,
                    coding_system=m.coding_system,
                    coding_code=m.coding_code,
                    coding_display=m.coding_display,
                    text=m.text,
                ))
            for n in (rx.notes or []):
                session.add(AllergyIntoleranceReactionNote(
                    reaction=reaction, org_id=org_id,
                    text=n.text, time=n.time,
                    author_string=n.author_string,
                    author_reference_type=n.author_reference_type,
                    author_reference_id=n.author_reference_id,
                    author_reference_display=n.author_reference_display,
                ))

    async def create(
        self,
        payload: AllergyIntoleranceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> AllergyIntoleranceModel:
        async with self.session_factory() as session:
            patient_type, patient_id = _parse_ref(
                payload.patient, AllergyIntolerancePatientReferenceType, "patient"
            )
            encounter_type, encounter_id = _parse_ref_optional(
                payload.encounter, EncounterReferenceType, "encounter"
            )
            recorder_type, recorder_id = _parse_ref_optional(
                payload.recorder, AllergyIntoleranceParticipantReferenceType, "recorder"
            )
            asserter_type, asserter_id = _parse_ref_optional(
                payload.asserter, AllergyIntoleranceParticipantReferenceType, "asserter"
            )

            ai_type = None
            if payload.type:
                try:
                    ai_type = AllergyIntoleranceType(payload.type)
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid type '{payload.type}'. Allowed: {[e.value for e in AllergyIntoleranceType]}.",
                    )

            criticality = None
            if payload.criticality:
                try:
                    criticality = AllergyIntoleranceCriticality(payload.criticality)
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid criticality '{payload.criticality}'. Allowed: {[e.value for e in AllergyIntoleranceCriticality]}.",
                    )

            ai = AllergyIntoleranceModel(
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
                type=ai_type,
                criticality=criticality,
                code_system=payload.code_system,
                code_code=payload.code_code,
                code_display=payload.code_display,
                code_text=payload.code_text,
                patient_type=patient_type,
                patient_id=patient_id,
                patient_display=payload.patient_display,
                encounter_type=encounter_type,
                encounter_id=encounter_id,
                encounter_display=payload.encounter_display,
                onset_date_time=payload.onset_date_time,
                onset_age_value=payload.onset_age_value,
                onset_age_comparator=payload.onset_age_comparator,
                onset_age_unit=payload.onset_age_unit,
                onset_age_system=payload.onset_age_system,
                onset_age_code=payload.onset_age_code,
                onset_period_start=payload.onset_period_start,
                onset_period_end=payload.onset_period_end,
                onset_range_low_value=payload.onset_range_low_value,
                onset_range_low_unit=payload.onset_range_low_unit,
                onset_range_low_system=payload.onset_range_low_system,
                onset_range_low_code=payload.onset_range_low_code,
                onset_range_high_value=payload.onset_range_high_value,
                onset_range_high_unit=payload.onset_range_high_unit,
                onset_range_high_system=payload.onset_range_high_system,
                onset_range_high_code=payload.onset_range_high_code,
                onset_string=payload.onset_string,
                recorded_date=payload.recorded_date,
                recorder_type=recorder_type,
                recorder_id=recorder_id,
                recorder_display=payload.recorder_display,
                asserter_type=asserter_type,
                asserter_id=asserter_id,
                asserter_display=payload.asserter_display,
                last_occurrence=payload.last_occurrence,
            )
            session.add(ai)

            for item in (payload.identifiers or []):
                session.add(AllergyIntoleranceIdentifier(
                    allergy_intolerance=ai, org_id=org_id,
                    use=item.use,
                    type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for cat_val in (payload.categories or []):
                session.add(AllergyIntoleranceCategory(
                    allergy_intolerance=ai, org_id=org_id,
                    category=_cast_category(cat_val),
                ))

            for n in (payload.notes or []):
                session.add(AllergyIntoleranceNote(
                    allergy_intolerance=ai, org_id=org_id,
                    text=n.text, time=n.time,
                    author_string=n.author_string,
                    author_reference_type=n.author_reference_type,
                    author_reference_id=n.author_reference_id,
                    author_reference_display=n.author_reference_display,
                ))

            self._build_reactions(session, ai, org_id, payload.reactions or [])

            try:
                await session.commit()
                await session.refresh(ai)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_allergy_intolerance_id(ai.allergy_intolerance_id)

    async def patch(
        self,
        allergy_intolerance_id: int,
        payload: AllergyIntolerancePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[AllergyIntoleranceModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(AllergyIntoleranceModel).where(
                    AllergyIntoleranceModel.allergy_intolerance_id == allergy_intolerance_id
                )
            )
            result = await session.execute(stmt)
            ai = result.scalars().first()
            if not ai:
                return None

            updates = payload.model_dump(exclude_unset=True)
            for field, value in updates.items():
                if field == "type" and value is not None:
                    try:
                        setattr(ai, field, AllergyIntoleranceType(value))
                    except ValueError:
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Invalid type '{value}'.",
                        )
                elif field == "criticality" and value is not None:
                    try:
                        setattr(ai, field, AllergyIntoleranceCriticality(value))
                    except ValueError:
                        raise HTTPException(
                            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Invalid criticality '{value}'.",
                        )
                elif field == "encounter" and value is not None:
                    enc_type, enc_id = _parse_ref(value, EncounterReferenceType, "encounter")
                    ai.encounter_type = enc_type
                    ai.encounter_id = enc_id
                elif field == "recorder" and value is not None:
                    rec_type, rec_id = _parse_ref(value, AllergyIntoleranceParticipantReferenceType, "recorder")
                    ai.recorder_type = rec_type
                    ai.recorder_id = rec_id
                elif field == "asserter" and value is not None:
                    ast_type, ast_id = _parse_ref(value, AllergyIntoleranceParticipantReferenceType, "asserter")
                    ai.asserter_type = ast_type
                    ai.asserter_id = ast_id
                elif field == "categories" and value is not None:
                    for existing_cat in list(ai.categories):
                        await session.delete(existing_cat)
                    for cat_val in value:
                        session.add(AllergyIntoleranceCategory(
                            allergy_intolerance=ai, org_id=ai.org_id,
                            category=_cast_category(cat_val),
                        ))
                elif field == "identifiers" and value is not None:
                    for existing in list(ai.identifiers):
                        await session.delete(existing)
                    for item in value:
                        session.add(AllergyIntoleranceIdentifier(
                            allergy_intolerance=ai, org_id=ai.org_id,
                            use=item.get("use"),
                            type_system=item.get("type_system"),
                            type_code=item.get("type_code"),
                            type_display=item.get("type_display"),
                            type_text=item.get("type_text"),
                            system=item.get("system"),
                            value=item.get("value"),
                            period_start=item.get("period_start"),
                            period_end=item.get("period_end"),
                            assigner=item.get("assigner"),
                        ))
                elif field == "notes" and value is not None:
                    for existing in list(ai.notes):
                        await session.delete(existing)
                    for n in value:
                        session.add(AllergyIntoleranceNote(
                            allergy_intolerance=ai, org_id=ai.org_id,
                            text=n.get("text"),
                            time=n.get("time"),
                            author_string=n.get("author_string"),
                            author_reference_type=n.get("author_reference_type"),
                            author_reference_id=n.get("author_reference_id"),
                            author_reference_display=n.get("author_reference_display"),
                        ))
                elif field == "reactions" and value is not None:
                    for existing in list(ai.reactions):
                        await session.delete(existing)
                    await session.flush()
                    reaction_inputs = [
                        type("_R", (), {
                            "substance_system": r.get("substance_system"),
                            "substance_code": r.get("substance_code"),
                            "substance_display": r.get("substance_display"),
                            "substance_text": r.get("substance_text"),
                            "description": r.get("description"),
                            "onset": r.get("onset"),
                            "severity": r.get("severity"),
                            "exposure_route_system": r.get("exposure_route_system"),
                            "exposure_route_code": r.get("exposure_route_code"),
                            "exposure_route_display": r.get("exposure_route_display"),
                            "exposure_route_text": r.get("exposure_route_text"),
                            "manifestations": [
                                type("_M", (), {
                                    "coding_system": m.get("coding_system"),
                                    "coding_code": m.get("coding_code"),
                                    "coding_display": m.get("coding_display"),
                                    "text": m.get("text"),
                                })()
                                for m in r.get("manifestations", [])
                            ],
                            "notes": [
                                type("_N", (), {
                                    "text": n.get("text"),
                                    "time": n.get("time"),
                                    "author_string": n.get("author_string"),
                                    "author_reference_type": n.get("author_reference_type"),
                                    "author_reference_id": n.get("author_reference_id"),
                                    "author_reference_display": n.get("author_reference_display"),
                                })()
                                for n in r.get("notes", [])
                            ],
                        })()
                        for r in value
                    ]
                    self._build_reactions(session, ai, ai.org_id, reaction_inputs)
                elif field not in ("encounter", "recorder", "asserter", "categories", "identifiers", "notes", "reactions"):
                    setattr(ai, field, value)

            ai.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(ai)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_allergy_intolerance_id(allergy_intolerance_id)

    async def delete(self, allergy_intolerance_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(AllergyIntoleranceModel).where(
                AllergyIntoleranceModel.allergy_intolerance_id == allergy_intolerance_id
            )
            result = await session.execute(stmt)
            ai = result.scalars().first()
            if not ai:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="AllergyIntolerance not found",
                )
            try:
                await session.delete(ai)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
