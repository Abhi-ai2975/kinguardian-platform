from datetime import datetime
from typing import Optional, List, Tuple

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.questionnaire_response.questionnaire_response import (
    QuestionnaireResponseModel,
    QuestionnaireResponseBasedOn,
    QuestionnaireResponsePartOf,
    QuestionnaireResponseItemModel,
    QuestionnaireResponseAnswerModel,
)  # QuestionnaireResponseAnswerModel used in selectinload chains
from app.models.questionnaire_response.enums import (
    QuestionnaireResponseAuthorReferenceType,
    QuestionnaireResponseSourceReferenceType,
    QRBasedOnReferenceType,
    QRPartOfReferenceType,
)
from fastapi import HTTPException
from app.models.encounter.encounter import EncounterModel
from app.models.enums import SubjectReferenceType
from app.schemas.questionnaire_response import (
    QuestionnaireResponseCreateSchema,
    QuestionnaireResponsePatchSchema,
    ItemInput,
    AnswerInput,
)


def _with_relationships(stmt):
    return stmt.options(
        selectinload(QuestionnaireResponseModel.encounter),
        selectinload(QuestionnaireResponseModel.based_ons),
        selectinload(QuestionnaireResponseModel.part_ofs),
        # top-level items → answers (+ answer_items under each answer)
        selectinload(QuestionnaireResponseModel.items)
        .selectinload(QuestionnaireResponseItemModel.answers)
        .selectinload(QuestionnaireResponseAnswerModel.answer_items)
        .selectinload(QuestionnaireResponseItemModel.answers),
        # top-level items → sub_items → answers (+ answer_items)
        selectinload(QuestionnaireResponseModel.items)
        .selectinload(QuestionnaireResponseItemModel.sub_items)
        .selectinload(QuestionnaireResponseItemModel.answers)
        .selectinload(QuestionnaireResponseAnswerModel.answer_items)
        .selectinload(QuestionnaireResponseItemModel.answers),
    )


def _parse_subject(subject_str: Optional[str]):
    if not subject_str:
        return None, None
    parts = subject_str.split("/")
    if len(parts) != 2:
        return None, None
    try:
        return SubjectReferenceType(parts[0]), int(parts[1])
    except (ValueError, KeyError):
        return None, None


def _parse_author(author_str: Optional[str]):
    if not author_str:
        return None, None
    parts = author_str.split("/")
    if len(parts) != 2:
        return None, None
    try:
        return QuestionnaireResponseAuthorReferenceType(parts[0]), int(parts[1])
    except (ValueError, KeyError):
        return None, None


def _parse_source(source_str: Optional[str]):
    if not source_str:
        return None, None
    parts = source_str.split("/")
    if len(parts) != 2:
        return None, None
    try:
        return QuestionnaireResponseSourceReferenceType(parts[0]), int(parts[1])
    except (ValueError, KeyError):
        return None, None


def _parse_closed_ref(ref: str, enum_cls, field: str) -> tuple:
    """Parse 'Type/id' → (enum_value, int_id), raising 422 on invalid input."""
    parts = ref.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=422, detail=f"Invalid reference format '{ref}' for {field}.")
    try:
        ref_id = int(parts[1])
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid reference id in '{ref}' for {field}.")
    try:
        ref_type = enum_cls(parts[0])
    except ValueError:
        allowed = [e.value for e in enum_cls]
        raise HTTPException(status_code=422, detail=f"Invalid reference type '{parts[0]}' for {field}. Allowed: {allowed}.")
    return ref_type, ref_id


def _parse_encounter_ref(encounter_str: Optional[str]) -> Optional[int]:
    if not encounter_str:
        return None
    parts = encounter_str.split("/")
    if len(parts) != 2 or parts[0] != "Encounter":
        return None
    try:
        return int(parts[1])
    except ValueError:
        return None


def _build_answer(answer: AnswerInput, response_id: int) -> QuestionnaireResponseAnswerModel:
    db = QuestionnaireResponseAnswerModel(value_type=None)

    if answer.value_boolean is not None:
        db.value_type = "boolean"
        db.value_boolean = answer.value_boolean
    elif answer.value_decimal is not None:
        db.value_type = "decimal"
        db.value_decimal = answer.value_decimal
    elif answer.value_integer is not None:
        db.value_type = "integer"
        db.value_integer = answer.value_integer
    elif answer.value_date is not None:
        db.value_type = "date"
        db.value_string = answer.value_date
    elif answer.value_datetime is not None:
        db.value_type = "dateTime"
        db.value_datetime = answer.value_datetime
    elif answer.value_time is not None:
        db.value_type = "time"
        db.value_string = answer.value_time
    elif answer.value_string is not None:
        db.value_type = "string"
        db.value_string = answer.value_string
    elif answer.value_uri is not None:
        db.value_type = "uri"
        db.value_string = answer.value_uri
    elif answer.value_coding is not None:
        db.value_type = "coding"
        db.value_coding_system = answer.value_coding.system
        db.value_coding_code = answer.value_coding.code
        db.value_coding_display = answer.value_coding.display
    elif answer.value_quantity is not None:
        db.value_type = "quantity"
        db.value_quantity_value = answer.value_quantity.value
        db.value_quantity_unit = answer.value_quantity.unit
        db.value_quantity_system = answer.value_quantity.system
        db.value_quantity_code = answer.value_quantity.code
    elif answer.value_reference is not None:
        db.value_type = "reference"
        db.value_reference = answer.value_reference
        db.value_reference_display = answer.value_reference_display
    elif answer.value_attachment is not None:
        db.value_type = "attachment"
        att = answer.value_attachment
        db.value_attachment_content_type = att.content_type
        db.value_attachment_language = att.language
        db.value_attachment_data = att.data
        db.value_attachment_url = att.url
        db.value_attachment_size = att.size
        db.value_attachment_hash = att.hash
        db.value_attachment_title = att.title
        db.value_attachment_creation = att.creation

    # item.answer.item — nested items under this answer (R4 §item.answer.item)
    if answer.item:
        for sub in answer.item:
            db.answer_items.append(_build_item(sub, response_id))

    return db


def _build_item(item: ItemInput, response_id: int) -> QuestionnaireResponseItemModel:
    db_item = QuestionnaireResponseItemModel(
        response_id=response_id,
        link_id=item.link_id,
        text=item.text,
        definition=item.definition,
    )
    if item.answer:
        for a in item.answer:
            db_item.answers.append(_build_answer(a, response_id))
    if item.item:
        for sub in item.item:
            db_item.sub_items.append(_build_item(sub, response_id))
    return db_item


class QuestionnaireResponseRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_qr_id(
        self, questionnaire_response_id: int
    ) -> Optional[QuestionnaireResponseModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(QuestionnaireResponseModel).where(
                    QuestionnaireResponseModel.questionnaire_response_id
                    == questionnaire_response_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        questionnaire: Optional[str] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[QuestionnaireResponseModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(QuestionnaireResponseModel)),
                user_id, org_id, status, patient_id, questionnaire, authored_from, authored_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(QuestionnaireResponseModel),
                user_id, org_id, status, patient_id, questionnaire, authored_from, authored_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(QuestionnaireResponseModel.authored.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    def _apply_list_filters(
        self, stmt, user_id, org_id, status, patient_id, questionnaire, authored_from, authored_to
    ):
        if user_id:
            stmt = stmt.where(QuestionnaireResponseModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(QuestionnaireResponseModel.org_id == org_id)
        if status:
            stmt = stmt.where(QuestionnaireResponseModel.status == status)
        if patient_id is not None:
            stmt = stmt.where(
                QuestionnaireResponseModel.subject_type == SubjectReferenceType.Patient,
                QuestionnaireResponseModel.subject_id == patient_id,
            )
        if questionnaire:
            stmt = stmt.where(QuestionnaireResponseModel.questionnaire == questionnaire)
        if authored_from is not None:
            stmt = stmt.where(QuestionnaireResponseModel.authored >= authored_from)
        if authored_to is not None:
            stmt = stmt.where(QuestionnaireResponseModel.authored <= authored_to)
        return stmt

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        questionnaire: Optional[str] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[QuestionnaireResponseModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(QuestionnaireResponseModel)),
                user_id, org_id, status, patient_id, questionnaire, authored_from, authored_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(QuestionnaireResponseModel),
                user_id, org_id, status, patient_id, questionnaire, authored_from, authored_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(QuestionnaireResponseModel.authored.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: QuestionnaireResponseCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> QuestionnaireResponseModel:
        subject_type, subject_id = _parse_subject(payload.subject)
        author_type, author_id = _parse_author(payload.author)
        source_type, source_id = _parse_source(payload.source)
        public_encounter_id = _parse_encounter_ref(payload.encounter)

        async with self.session_factory() as session:
            # Resolve public encounter_id → internal encounter PK
            internal_encounter_id: Optional[int] = None
            if public_encounter_id is not None:
                enc_result = await session.execute(
                    select(EncounterModel.id).where(
                        EncounterModel.encounter_id == public_encounter_id
                    )
                )
                internal_encounter_id = enc_result.scalar_one_or_none()

            qr = QuestionnaireResponseModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                questionnaire=payload.questionnaire,
                status=payload.status,
                # identifier
                identifier_use=payload.identifier_use,
                identifier_type_system=payload.identifier_type_system,
                identifier_type_code=payload.identifier_type_code,
                identifier_type_display=payload.identifier_type_display,
                identifier_type_text=payload.identifier_type_text,
                identifier_system=payload.identifier_system,
                identifier_value=payload.identifier_value,
                identifier_period_start=payload.identifier_period_start,
                identifier_period_end=payload.identifier_period_end,
                identifier_assigner=payload.identifier_assigner,
                # subject / encounter / author / source
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                encounter_id=internal_encounter_id,
                authored=payload.authored,
                author_type=author_type,
                author_id=author_id,
                author_display=payload.author_display,
                source_type=source_type,
                source_id=source_id,
                source_display=payload.source_display,
            )

            # basedOn
            if payload.based_on:
                for b in payload.based_on:
                    ref_type, ref_id = _parse_closed_ref(b.reference, QRBasedOnReferenceType, "basedOn.reference")
                    qr.based_ons.append(QuestionnaireResponseBasedOn(
                        org_id=org_id,
                        reference_type=ref_type,
                        reference_id=ref_id,
                        reference_display=b.reference_display,
                    ))

            # partOf
            if payload.part_of:
                for p in payload.part_of:
                    ref_type, ref_id = _parse_closed_ref(p.reference, QRPartOfReferenceType, "partOf.reference")
                    qr.part_ofs.append(QuestionnaireResponsePartOf(
                        org_id=org_id,
                        reference_type=ref_type,
                        reference_id=ref_id,
                        reference_display=p.reference_display,
                    ))

            try:
                session.add(qr)
                await session.flush()  # inserts qr row → qr.id is now set

                if payload.item:
                    for item in payload.item:
                        session.add(_build_item(item, qr.id))

                await session.commit()
                await session.refresh(qr)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_qr_id(qr.questionnaire_response_id)

    async def patch(
        self,
        questionnaire_response_id: int,
        payload: QuestionnaireResponsePatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[QuestionnaireResponseModel]:
        async with self.session_factory() as session:
            stmt = select(QuestionnaireResponseModel).where(
                QuestionnaireResponseModel.questionnaire_response_id
                == questionnaire_response_id
            )
            result = await session.execute(stmt)
            qr = result.scalars().first()

            if not qr:
                return None

            update_data = payload.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(qr, field, value)
            if updated_by is not None:
                qr.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(qr)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_qr_id(questionnaire_response_id)

    async def delete(self, questionnaire_response_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(QuestionnaireResponseModel).where(
                QuestionnaireResponseModel.questionnaire_response_id
                == questionnaire_response_id
            )
            result = await session.execute(stmt)
            qr = result.scalars().first()

            if not qr:
                return False

            try:
                await session.delete(qr)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise
