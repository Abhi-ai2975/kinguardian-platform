from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.encounter.encounter import EncounterModel
from app.models.procedure.enums import (
    ProcedureStatus,
    ProcedureSubjectType,
    ProcedureRecorderType,
    ProcedureAsserterType,
    ProcedureLocationReferenceType,
    ProcedurePerformerActorType,
    ProcedurePerformerOnBehalfOfType,
    ProcedureBasedOnReferenceType,
    ProcedurePartOfReferenceType,
    ProcedureReasonReferenceType,
    ProcedureReportReferenceType,
    ProcedureComplicationDetailReferenceType,
    ProcedureNoteAuthorReferenceType,
    ProcedureFocalDeviceManipulatedReferenceType,
    ProcedureUsedReferenceType,
)
from app.models.procedure.procedure import (
    ProcedureModel,
    ProcedureIdentifier,
    ProcedureBasedOn,
    ProcedurePartOf,
    ProcedurePerformer,
    ProcedureReasonCode,
    ProcedureReasonReference,
    ProcedureBodySite,
    ProcedureReport,
    ProcedureComplication,
    ProcedureComplicationDetail,
    ProcedureFollowUp,
    ProcedureNote,
    ProcedureFocalDevice,
    ProcedureUsedReference,
    ProcedureUsedCode,
)
from app.schemas.procedure import ProcedureCreateSchema, ProcedurePatchSchema


def _with_relationships(stmt):
    return stmt.options(
        selectinload(ProcedureModel.encounter),
        selectinload(ProcedureModel.identifiers),
        selectinload(ProcedureModel.based_on),
        selectinload(ProcedureModel.part_of),
        selectinload(ProcedureModel.performers),
        selectinload(ProcedureModel.reason_codes),
        selectinload(ProcedureModel.reason_references),
        selectinload(ProcedureModel.body_sites),
        selectinload(ProcedureModel.reports),
        selectinload(ProcedureModel.complications),
        selectinload(ProcedureModel.complication_details),
        selectinload(ProcedureModel.follow_ups),
        selectinload(ProcedureModel.notes),
        selectinload(ProcedureModel.focal_devices),
        selectinload(ProcedureModel.used_references),
        selectinload(ProcedureModel.used_codes),
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


class ProcedureRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_procedure_id(self, procedure_id: int) -> Optional[ProcedureModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ProcedureModel).where(ProcedureModel.procedure_id == procedure_id)
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(
        self, stmt, user_id, org_id, proc_status, patient_id, performed_from, performed_to
    ):
        if user_id:
            stmt = stmt.where(ProcedureModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(ProcedureModel.org_id == org_id)
        if proc_status:
            stmt = stmt.where(ProcedureModel.status == ProcedureStatus(proc_status))
        if patient_id is not None:
            stmt = stmt.where(
                ProcedureModel.subject_type == ProcedureSubjectType.Patient,
                ProcedureModel.subject_id == patient_id,
            )
        if performed_from is not None:
            stmt = stmt.where(ProcedureModel.performed_datetime >= performed_from)
        if performed_to is not None:
            stmt = stmt.where(ProcedureModel.performed_datetime <= performed_to)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        proc_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        performed_from: Optional[datetime] = None,
        performed_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProcedureModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ProcedureModel)),
                user_id, org_id, proc_status, patient_id, performed_from, performed_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ProcedureModel),
                user_id, org_id, proc_status, patient_id, performed_from, performed_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ProcedureModel.performed_datetime.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        proc_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        performed_from: Optional[datetime] = None,
        performed_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProcedureModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ProcedureModel)),
                user_id, org_id, proc_status, patient_id, performed_from, performed_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ProcedureModel),
                user_id, org_id, proc_status, patient_id, performed_from, performed_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ProcedureModel.performed_datetime.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: ProcedureCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ProcedureModel:
        async with self.session_factory() as session:
            # resolve subject
            subject_type, subject_id = None, None
            if payload.subject:
                subject_type, subject_id = _parse_ref(payload.subject, ProcedureSubjectType, "subject")

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

            # resolve recorder
            recorder_type, recorder_id = None, None
            if payload.recorder:
                recorder_type, recorder_id = _parse_ref(payload.recorder, ProcedureRecorderType, "recorder")

            # resolve asserter
            asserter_type, asserter_id = None, None
            if payload.asserter:
                asserter_type, asserter_id = _parse_ref(payload.asserter, ProcedureAsserterType, "asserter")

            # resolve location
            location_type, location_ref_id = None, None
            if payload.location:
                location_type, location_ref_id = _parse_ref(
                    payload.location, ProcedureLocationReferenceType, "location"
                )

            proc = ProcedureModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=ProcedureStatus(payload.status).value,
                status_reason_system=payload.status_reason_system,
                status_reason_code=payload.status_reason_code,
                status_reason_display=payload.status_reason_display,
                status_reason_text=payload.status_reason_text,
                category_system=payload.category_system,
                category_code=payload.category_code,
                category_display=payload.category_display,
                category_text=payload.category_text,
                code_system=payload.code_system,
                code_code=payload.code_code,
                code_display=payload.code_display,
                code_text=payload.code_text,
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                encounter_id=encounter_internal_id,
                encounter_display=payload.encounter_display,
                performed_datetime=payload.performed_datetime,
                performed_period_start=payload.performed_period_start,
                performed_period_end=payload.performed_period_end,
                performed_string=payload.performed_string,
                performed_age_value=payload.performed_age_value,
                performed_age_unit=payload.performed_age_unit,
                performed_age_system=payload.performed_age_system,
                performed_age_code=payload.performed_age_code,
                performed_range_low_value=payload.performed_range_low_value,
                performed_range_low_unit=payload.performed_range_low_unit,
                performed_range_high_value=payload.performed_range_high_value,
                performed_range_high_unit=payload.performed_range_high_unit,
                recorder_type=recorder_type,
                recorder_id=recorder_id,
                recorder_display=payload.recorder_display,
                asserter_type=asserter_type,
                asserter_id=asserter_id,
                asserter_display=payload.asserter_display,
                location_type=location_type,
                location_reference_id=location_ref_id,
                location_display=payload.location_display,
                outcome_system=payload.outcome_system,
                outcome_code=payload.outcome_code,
                outcome_display=payload.outcome_display,
                outcome_text=payload.outcome_text,
                instantiates_canonical=",".join(payload.instantiates_canonical) if payload.instantiates_canonical else None,
                instantiates_uri=",".join(payload.instantiates_uri) if payload.instantiates_uri else None,
            )
            session.add(proc)

            for item in (payload.identifier or []):
                session.add(ProcedureIdentifier(
                    procedure=proc, org_id=org_id,
                    use=item.use, type_system=item.type_system, type_code=item.type_code,
                    type_display=item.type_display, type_text=item.type_text,
                    system=item.system, value=item.value,
                    period_start=item.period_start, period_end=item.period_end,
                    assigner=item.assigner,
                ))

            for item in (payload.based_on or []):
                bo_type, bo_id = _parse_ref(item.reference, ProcedureBasedOnReferenceType, "based_on")
                session.add(ProcedureBasedOn(
                    procedure=proc, org_id=org_id,
                    reference_type=bo_type, reference_id=bo_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.part_of or []):
                po_type, po_id = _parse_ref(item.reference, ProcedurePartOfReferenceType, "part_of")
                session.add(ProcedurePartOf(
                    procedure=proc, org_id=org_id,
                    reference_type=po_type, reference_id=po_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.performer or []):
                actor_type, actor_id = _parse_ref(item.actor, ProcedurePerformerActorType, "performer.actor")
                obo_type, obo_id = None, None
                if item.on_behalf_of:
                    obo_type, obo_id = _parse_ref(
                        item.on_behalf_of, ProcedurePerformerOnBehalfOfType, "performer.onBehalfOf"
                    )
                session.add(ProcedurePerformer(
                    procedure=proc, org_id=org_id,
                    function_system=item.function_system, function_code=item.function_code,
                    function_display=item.function_display, function_text=item.function_text,
                    actor_type=actor_type, actor_id=actor_id, actor_display=item.actor_display,
                    on_behalf_of_type=obo_type, on_behalf_of_id=obo_id,
                    on_behalf_of_display=item.on_behalf_of_display,
                ))

            for item in (payload.reason_code or []):
                session.add(ProcedureReasonCode(
                    procedure=proc, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.reason_reference or []):
                rr_type, rr_id = _parse_ref(item.reference, ProcedureReasonReferenceType, "reason_reference")
                session.add(ProcedureReasonReference(
                    procedure=proc, org_id=org_id,
                    reference_type=rr_type, reference_id=rr_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.body_site or []):
                session.add(ProcedureBodySite(
                    procedure=proc, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.report or []):
                rp_type, rp_id = _parse_ref(item.reference, ProcedureReportReferenceType, "report")
                session.add(ProcedureReport(
                    procedure=proc, org_id=org_id,
                    reference_type=rp_type, reference_id=rp_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.complication or []):
                session.add(ProcedureComplication(
                    procedure=proc, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.complication_detail or []):
                cd_type, cd_id = _parse_ref(
                    item.reference, ProcedureComplicationDetailReferenceType, "complication_detail"
                )
                session.add(ProcedureComplicationDetail(
                    procedure=proc, org_id=org_id,
                    reference_type=cd_type, reference_id=cd_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.follow_up or []):
                session.add(ProcedureFollowUp(
                    procedure=proc, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            for item in (payload.note or []):
                note_ref_type, note_ref_id = None, None
                if item.author_reference:
                    note_ref_type, note_ref_id = _parse_ref(
                        item.author_reference, ProcedureNoteAuthorReferenceType, "note.authorReference"
                    )
                session.add(ProcedureNote(
                    procedure=proc, org_id=org_id,
                    text=item.text, time=item.time,
                    author_string=item.author_string,
                    author_reference_type=note_ref_type, author_reference_id=note_ref_id,
                    author_reference_display=item.author_reference_display,
                ))

            for item in (payload.focal_device or []):
                manip_type, manip_id = _parse_ref(
                    item.manipulated_reference,
                    ProcedureFocalDeviceManipulatedReferenceType,
                    "focal_device.manipulated",
                )
                session.add(ProcedureFocalDevice(
                    procedure=proc, org_id=org_id,
                    action_system=item.action_system, action_code=item.action_code,
                    action_display=item.action_display, action_text=item.action_text,
                    manipulated_reference_type=manip_type, manipulated_reference_id=manip_id,
                    manipulated_reference_display=item.manipulated_reference_display,
                ))

            for item in (payload.used_reference or []):
                ur_type, ur_id = _parse_ref(item.reference, ProcedureUsedReferenceType, "used_reference")
                session.add(ProcedureUsedReference(
                    procedure=proc, org_id=org_id,
                    reference_type=ur_type, reference_id=ur_id,
                    reference_display=item.reference_display,
                ))

            for item in (payload.used_code or []):
                session.add(ProcedureUsedCode(
                    procedure=proc, org_id=org_id,
                    coding_system=item.coding_system, coding_code=item.coding_code,
                    coding_display=item.coding_display, text=item.text,
                ))

            await session.commit()
            await session.refresh(proc)

            stmt = _with_relationships(
                select(ProcedureModel).where(ProcedureModel.id == proc.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Patch ─────────────────────────────────────────────────────────────────

    async def patch(
        self,
        procedure_id: int,
        payload: ProcedurePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ProcedureModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ProcedureModel).where(ProcedureModel.procedure_id == procedure_id)
            )
            result = await session.execute(stmt)
            proc = result.scalars().first()
            if not proc:
                return None

            updates = payload.model_dump(exclude_unset=True)
            # join list fields to comma-separated strings
            for list_field in ("instantiates_canonical", "instantiates_uri"):
                if list_field in updates and updates[list_field] is not None:
                    updates[list_field] = ",".join(updates[list_field])
            if "status" in updates and updates["status"] is not None:
                updates["status"] = ProcedureStatus(updates["status"]).value

            for field, value in updates.items():
                setattr(proc, field, value)
            proc.updated_by = updated_by

            await session.commit()
            await session.refresh(proc)

            stmt = _with_relationships(
                select(ProcedureModel).where(ProcedureModel.id == proc.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, procedure_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(ProcedureModel).where(ProcedureModel.procedure_id == procedure_id)
            result = await session.execute(stmt)
            proc = result.scalars().first()
            if proc:
                await session.delete(proc)
                await session.commit()
