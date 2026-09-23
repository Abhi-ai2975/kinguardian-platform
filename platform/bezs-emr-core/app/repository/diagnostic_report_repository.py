from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.encounter.encounter import EncounterModel
from app.models.enums import EncounterReferenceType
from app.models.diagnostic_report.diagnostic_report import (
    DiagnosticReportModel,
    DiagnosticReportIdentifier,
    DiagnosticReportBasedOn,
    DiagnosticReportCategory,
    DiagnosticReportPerformer,
    DiagnosticReportResultsInterpreter,
    DiagnosticReportSpecimen,
    DiagnosticReportResult,
    DiagnosticReportImagingStudy,
    DiagnosticReportMedia,
    DiagnosticReportConclusionCode,
    DiagnosticReportPresentedForm,
)
from app.models.diagnostic_report.enums import (
    DiagnosticReportBasedOnReferenceType,
    DiagnosticReportImagingStudyReferenceType,
    DiagnosticReportMediaLinkReferenceType,
    DiagnosticReportParticipantType,
    DiagnosticReportResultReferenceType,
    DiagnosticReportSpecimenReferenceType,
    DiagnosticReportStatus,
    DiagnosticReportSubjectType,
)
from app.schemas.diagnostic_report import DiagnosticReportCreateSchema, DiagnosticReportPatchSchema
from app.core.references import parse_reference


def _with_relationships(stmt):
    return stmt.options(
        selectinload(DiagnosticReportModel.encounter),
        selectinload(DiagnosticReportModel.identifiers),
        selectinload(DiagnosticReportModel.based_on),
        selectinload(DiagnosticReportModel.categories),
        selectinload(DiagnosticReportModel.performers),
        selectinload(DiagnosticReportModel.results_interpreters),
        selectinload(DiagnosticReportModel.specimens),
        selectinload(DiagnosticReportModel.results),
        selectinload(DiagnosticReportModel.imaging_studies),
        selectinload(DiagnosticReportModel.media),
        selectinload(DiagnosticReportModel.conclusion_codes),
        selectinload(DiagnosticReportModel.presented_forms),
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
    return _cast_ref_type(parts[0], enum_cls, field), ref_id


class DiagnosticReportRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_diagnostic_report_id(self, diagnostic_report_id: int) -> Optional[DiagnosticReportModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(DiagnosticReportModel).where(
                    DiagnosticReportModel.diagnostic_report_id == diagnostic_report_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(
        self, stmt, user_id, org_id, dr_status, patient_id, issued_from, issued_to
    ):
        if user_id:
            stmt = stmt.where(DiagnosticReportModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(DiagnosticReportModel.org_id == org_id)
        if dr_status:
            stmt = stmt.where(DiagnosticReportModel.status == DiagnosticReportStatus(dr_status))
        if patient_id is not None:
            stmt = stmt.where(
                DiagnosticReportModel.subject_type == DiagnosticReportSubjectType.Patient,
                DiagnosticReportModel.subject_id == patient_id,
            )
        if issued_from is not None:
            stmt = stmt.where(DiagnosticReportModel.issued >= issued_from)
        if issued_to is not None:
            stmt = stmt.where(DiagnosticReportModel.issued <= issued_to)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        dr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        issued_from: Optional[datetime] = None,
        issued_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DiagnosticReportModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(DiagnosticReportModel)),
                user_id, org_id, dr_status, patient_id, issued_from, issued_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(DiagnosticReportModel),
                user_id, org_id, dr_status, patient_id, issued_from, issued_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(DiagnosticReportModel.issued.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        dr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        issued_from: Optional[datetime] = None,
        issued_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DiagnosticReportModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(DiagnosticReportModel)),
                user_id, org_id, dr_status, patient_id, issued_from, issued_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(DiagnosticReportModel),
                user_id, org_id, dr_status, patient_id, issued_from, issued_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(DiagnosticReportModel.issued.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: DiagnosticReportCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> DiagnosticReportModel:
        subject_type, subject_id = (
            parse_reference(payload.subject, DiagnosticReportSubjectType)
            if payload.subject else (None, None)
        )

        async with self.session_factory() as session:
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

            dr = DiagnosticReportModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=payload.status,
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
                effective_datetime=payload.effective_datetime,
                effective_period_start=payload.effective_period_start,
                effective_period_end=payload.effective_period_end,
                issued=payload.issued,
                conclusion=payload.conclusion,
            )

            # identifier[]
            if payload.identifier:
                for i in payload.identifier:
                    dr.identifiers.append(DiagnosticReportIdentifier(
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

            # basedOn[]
            if payload.based_on:
                for bo in payload.based_on:
                    bo_type, bo_id = _parse_ref(bo.reference, DiagnosticReportBasedOnReferenceType, "basedOn")
                    dr.based_on.append(DiagnosticReportBasedOn(
                        org_id=org_id,
                        reference_type=bo_type,
                        reference_id=bo_id,
                        reference_display=bo.reference_display,
                    ))

            # category[]
            if payload.category:
                for cat in payload.category:
                    dr.categories.append(DiagnosticReportCategory(
                        org_id=org_id,
                        coding_system=cat.coding_system,
                        coding_code=cat.coding_code,
                        coding_display=cat.coding_display,
                        text=cat.text,
                    ))

            # performer[]
            if payload.performer:
                for p in payload.performer:
                    p_type, p_id = _parse_ref(p.reference, DiagnosticReportParticipantType, "performer")
                    dr.performers.append(DiagnosticReportPerformer(
                        org_id=org_id,
                        reference_type=p_type,
                        reference_id=p_id,
                        reference_display=p.reference_display,
                    ))

            # resultsInterpreter[]
            if payload.results_interpreter:
                for ri in payload.results_interpreter:
                    ri_type, ri_id = _parse_ref(ri.reference, DiagnosticReportParticipantType, "resultsInterpreter")
                    dr.results_interpreters.append(DiagnosticReportResultsInterpreter(
                        org_id=org_id,
                        reference_type=ri_type,
                        reference_id=ri_id,
                        reference_display=ri.reference_display,
                    ))

            # specimen[]
            if payload.specimen:
                for sp in payload.specimen:
                    sp_type, sp_id = _parse_ref(sp.reference, DiagnosticReportSpecimenReferenceType, "specimen")
                    dr.specimens.append(DiagnosticReportSpecimen(
                        org_id=org_id,
                        reference_type=sp_type,
                        reference_id=sp_id,
                        reference_display=sp.reference_display,
                    ))

            # result[]
            if payload.result:
                for r in payload.result:
                    r_type, r_id = _parse_ref(r.reference, DiagnosticReportResultReferenceType, "result")
                    dr.results.append(DiagnosticReportResult(
                        org_id=org_id,
                        reference_type=r_type,
                        reference_id=r_id,
                        reference_display=r.reference_display,
                    ))

            # imagingStudy[]
            if payload.imaging_study:
                for img in payload.imaging_study:
                    img_type, img_id = _parse_ref(img.reference, DiagnosticReportImagingStudyReferenceType, "imagingStudy")
                    dr.imaging_studies.append(DiagnosticReportImagingStudy(
                        org_id=org_id,
                        reference_type=img_type,
                        reference_id=img_id,
                        reference_display=img.reference_display,
                    ))

            # media[]
            if payload.media:
                for m in payload.media:
                    link_type, link_id = _parse_ref(m.link_reference, DiagnosticReportMediaLinkReferenceType, "media.link")
                    dr.media.append(DiagnosticReportMedia(
                        org_id=org_id,
                        comment=m.comment,
                        link_reference_type=link_type,
                        link_reference_id=link_id,
                        link_reference_display=m.link_reference_display,
                    ))

            # conclusionCode[]
            if payload.conclusion_code:
                for cc in payload.conclusion_code:
                    dr.conclusion_codes.append(DiagnosticReportConclusionCode(
                        org_id=org_id,
                        coding_system=cc.coding_system,
                        coding_code=cc.coding_code,
                        coding_display=cc.coding_display,
                        text=cc.text,
                    ))

            # presentedForm[]
            if payload.presented_form:
                for pf in payload.presented_form:
                    dr.presented_forms.append(DiagnosticReportPresentedForm(
                        org_id=org_id,
                        content_type=pf.content_type,
                        language=pf.language,
                        data=pf.data,
                        url=pf.url,
                        size=pf.size,
                        hash=pf.hash,
                        title=pf.title,
                        creation=pf.creation,
                    ))

            try:
                session.add(dr)
                await session.commit()
                await session.refresh(dr)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_diagnostic_report_id(dr.diagnostic_report_id)

    async def patch(
        self,
        diagnostic_report_id: int,
        payload: DiagnosticReportPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[DiagnosticReportModel]:
        async with self.session_factory() as session:
            result = await session.execute(
                select(DiagnosticReportModel).where(
                    DiagnosticReportModel.diagnostic_report_id == diagnostic_report_id
                )
            )
            dr = result.scalars().first()
            if not dr:
                return None

            update_data = payload.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(dr, field, value)
            if updated_by is not None:
                dr.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(dr)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_diagnostic_report_id(diagnostic_report_id)

    async def delete(self, diagnostic_report_id: int) -> bool:
        async with self.session_factory() as session:
            result = await session.execute(
                select(DiagnosticReportModel).where(
                    DiagnosticReportModel.diagnostic_report_id == diagnostic_report_id
                )
            )
            dr = result.scalars().first()
            if not dr:
                return False

            try:
                await session.delete(dr)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise
