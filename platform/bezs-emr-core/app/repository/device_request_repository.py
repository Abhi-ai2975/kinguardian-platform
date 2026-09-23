from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.encounter.encounter import EncounterModel
from app.models.enums import EncounterReferenceType
from app.models.device_request.device_request import (
    DeviceRequestModel,
    DeviceRequestIdentifier,
    DeviceRequestBasedOn,
    DeviceRequestPriorRequest,
    DeviceRequestParameter,
    DeviceRequestReasonCode,
    DeviceRequestReasonReference,
    DeviceRequestInsurance,
    DeviceRequestSupportingInfo,
    DeviceRequestNote,
    DeviceRequestRelevantHistory,
)
from app.models.device_request.enums import (
    DeviceRequestCodeReferenceType,
    DeviceRequestInsuranceReferenceType,
    DeviceRequestNoteAuthorReferenceType,
    DeviceRequestPerformerReferenceType,
    DeviceRequestReasonReferenceType,
    DeviceRequestRelevantHistoryReferenceType,
    DeviceRequestRequesterType,
    DeviceRequestStatus,
    DeviceRequestSubjectType,
)
from app.schemas.device_request import DeviceRequestCreateSchema, DeviceRequestPatchSchema
from app.core.references import parse_reference


def _with_relationships(stmt):
    return stmt.options(
        selectinload(DeviceRequestModel.encounter),
        selectinload(DeviceRequestModel.identifiers),
        selectinload(DeviceRequestModel.based_on),
        selectinload(DeviceRequestModel.prior_requests),
        selectinload(DeviceRequestModel.parameters),
        selectinload(DeviceRequestModel.reason_codes),
        selectinload(DeviceRequestModel.reason_references),
        selectinload(DeviceRequestModel.insurance),
        selectinload(DeviceRequestModel.supporting_info),
        selectinload(DeviceRequestModel.notes),
        selectinload(DeviceRequestModel.relevant_history),
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


class DeviceRequestRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_device_request_id(self, device_request_id: int) -> Optional[DeviceRequestModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(DeviceRequestModel).where(
                    DeviceRequestModel.device_request_id == device_request_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(
        self, stmt, user_id, org_id, dr_status, patient_id, authored_from, authored_to
    ):
        if user_id:
            stmt = stmt.where(DeviceRequestModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(DeviceRequestModel.org_id == org_id)
        if dr_status:
            stmt = stmt.where(DeviceRequestModel.status == DeviceRequestStatus(dr_status))
        if patient_id is not None:
            stmt = stmt.where(
                DeviceRequestModel.subject_type == DeviceRequestSubjectType.Patient,
                DeviceRequestModel.subject_id == patient_id,
            )
        if authored_from is not None:
            stmt = stmt.where(DeviceRequestModel.authored_on >= authored_from)
        if authored_to is not None:
            stmt = stmt.where(DeviceRequestModel.authored_on <= authored_to)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        dr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DeviceRequestModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(DeviceRequestModel)),
                user_id, org_id, dr_status, patient_id, authored_from, authored_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(DeviceRequestModel),
                user_id, org_id, dr_status, patient_id, authored_from, authored_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(DeviceRequestModel.authored_on.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        dr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DeviceRequestModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(DeviceRequestModel)),
                user_id, org_id, dr_status, patient_id, authored_from, authored_to,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(DeviceRequestModel),
                user_id, org_id, dr_status, patient_id, authored_from, authored_to,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(DeviceRequestModel.authored_on.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: DeviceRequestCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> DeviceRequestModel:
        subject_type, subject_id = (
            parse_reference(payload.subject, DeviceRequestSubjectType)
            if payload.subject else (None, None)
        )

        code_reference_type, code_reference_id = (None, None)
        if payload.code_reference:
            code_reference_type, code_reference_id = _parse_ref(
                payload.code_reference, DeviceRequestCodeReferenceType, "codeReference"
            )

        requester_type, requester_id = (None, None)
        if payload.requester:
            requester_type, requester_id = _parse_ref(
                payload.requester, DeviceRequestRequesterType, "requester"
            )

        performer_reference_type, performer_reference_id = (None, None)
        if payload.performer_reference:
            performer_reference_type, performer_reference_id = _parse_ref(
                payload.performer_reference, DeviceRequestPerformerReferenceType, "performer"
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

            dr = DeviceRequestModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=payload.status,
                intent=payload.intent,
                priority=payload.priority,
                code_reference_type=code_reference_type,
                code_reference_id=code_reference_id,
                code_reference_display=payload.code_reference_display,
                code_concept_system=payload.code_concept_system,
                code_concept_code=payload.code_concept_code,
                code_concept_display=payload.code_concept_display,
                code_concept_text=payload.code_concept_text,
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                encounter_type=EncounterReferenceType.Encounter if internal_encounter_id else None,
                encounter_id=internal_encounter_id,
                encounter_display=payload.encounter_display,
                occurrence_datetime=payload.occurrence_datetime,
                occurrence_period_start=payload.occurrence_period_start,
                occurrence_period_end=payload.occurrence_period_end,
                occurrence_timing_code_system=payload.occurrence_timing_code_system,
                occurrence_timing_code_code=payload.occurrence_timing_code_code,
                occurrence_timing_code_display=payload.occurrence_timing_code_display,
                occurrence_timing_bounds_start=payload.occurrence_timing_bounds_start,
                occurrence_timing_bounds_end=payload.occurrence_timing_bounds_end,
                occurrence_timing_count=payload.occurrence_timing_count,
                occurrence_timing_count_max=payload.occurrence_timing_count_max,
                occurrence_timing_duration=payload.occurrence_timing_duration,
                occurrence_timing_duration_max=payload.occurrence_timing_duration_max,
                occurrence_timing_duration_unit=payload.occurrence_timing_duration_unit,
                occurrence_timing_frequency=payload.occurrence_timing_frequency,
                occurrence_timing_frequency_max=payload.occurrence_timing_frequency_max,
                occurrence_timing_period=payload.occurrence_timing_period,
                occurrence_timing_period_max=payload.occurrence_timing_period_max,
                occurrence_timing_period_unit=payload.occurrence_timing_period_unit,
                occurrence_timing_day_of_week=payload.occurrence_timing_day_of_week,
                occurrence_timing_time_of_day=payload.occurrence_timing_time_of_day,
                occurrence_timing_when=payload.occurrence_timing_when,
                occurrence_timing_offset=payload.occurrence_timing_offset,
                authored_on=payload.authored_on,
                requester_type=requester_type,
                requester_id=requester_id,
                requester_display=payload.requester_display,
                performer_type_system=payload.performer_type_system,
                performer_type_code=payload.performer_type_code,
                performer_type_display=payload.performer_type_display,
                performer_type_text=payload.performer_type_text,
                performer_reference_type=performer_reference_type,
                performer_reference_id=performer_reference_id,
                performer_reference_display=payload.performer_reference_display,
                group_identifier_use=payload.group_identifier_use,
                group_identifier_type_system=payload.group_identifier_type_system,
                group_identifier_type_code=payload.group_identifier_type_code,
                group_identifier_type_display=payload.group_identifier_type_display,
                group_identifier_type_text=payload.group_identifier_type_text,
                group_identifier_system=payload.group_identifier_system,
                group_identifier_value=payload.group_identifier_value,
                group_identifier_period_start=payload.group_identifier_period_start,
                group_identifier_period_end=payload.group_identifier_period_end,
                group_identifier_assigner=payload.group_identifier_assigner,
                instantiates_canonical=payload.instantiates_canonical,
                instantiates_uri=payload.instantiates_uri,
            )

            # identifier[]
            if payload.identifier:
                for i in payload.identifier:
                    dr.identifiers.append(DeviceRequestIdentifier(
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

            # basedOn[] — open reference
            if payload.based_on:
                for bo in payload.based_on:
                    bo_type, bo_id = _parse_open_ref(bo.reference)
                    dr.based_on.append(DeviceRequestBasedOn(
                        org_id=org_id,
                        reference_type=bo_type,
                        reference_id=bo_id,
                        reference_display=bo.reference_display,
                    ))

            # priorRequest[] — open reference
            if payload.prior_request:
                for pr in payload.prior_request:
                    pr_type, pr_id = _parse_open_ref(pr.reference)
                    dr.prior_requests.append(DeviceRequestPriorRequest(
                        org_id=org_id,
                        reference_type=pr_type,
                        reference_id=pr_id,
                        reference_display=pr.reference_display,
                    ))

            # parameter[]
            if payload.parameter:
                for p in payload.parameter:
                    dr.parameters.append(DeviceRequestParameter(
                        org_id=org_id,
                        code_system=p.code_system,
                        code_code=p.code_code,
                        code_display=p.code_display,
                        code_text=p.code_text,
                        value_concept_system=p.value_concept_system,
                        value_concept_code=p.value_concept_code,
                        value_concept_display=p.value_concept_display,
                        value_concept_text=p.value_concept_text,
                        value_quantity_value=p.value_quantity_value,
                        value_quantity_unit=p.value_quantity_unit,
                        value_quantity_system=p.value_quantity_system,
                        value_quantity_code=p.value_quantity_code,
                        value_range_low_value=p.value_range_low_value,
                        value_range_low_unit=p.value_range_low_unit,
                        value_range_high_value=p.value_range_high_value,
                        value_range_high_unit=p.value_range_high_unit,
                        value_boolean=p.value_boolean,
                    ))

            # reasonCode[]
            if payload.reason_code:
                for rc in payload.reason_code:
                    dr.reason_codes.append(DeviceRequestReasonCode(
                        org_id=org_id,
                        coding_system=rc.coding_system,
                        coding_code=rc.coding_code,
                        coding_display=rc.coding_display,
                        text=rc.text,
                    ))

            # reasonReference[]
            if payload.reason_reference:
                for rr in payload.reason_reference:
                    rr_type, rr_id = _parse_ref(rr.reference, DeviceRequestReasonReferenceType, "reasonReference")
                    dr.reason_references.append(DeviceRequestReasonReference(
                        org_id=org_id,
                        reference_type=rr_type,
                        reference_id=rr_id,
                        reference_display=rr.reference_display,
                    ))

            # insurance[]
            if payload.insurance:
                for ins in payload.insurance:
                    ins_type, ins_id = _parse_ref(ins.reference, DeviceRequestInsuranceReferenceType, "insurance")
                    dr.insurance.append(DeviceRequestInsurance(
                        org_id=org_id,
                        reference_type=ins_type,
                        reference_id=ins_id,
                        reference_display=ins.reference_display,
                    ))

            # supportingInfo[] — open reference
            if payload.supporting_info:
                for si in payload.supporting_info:
                    si_type, si_id = _parse_open_ref(si.reference)
                    dr.supporting_info.append(DeviceRequestSupportingInfo(
                        org_id=org_id,
                        reference_type=si_type,
                        reference_id=si_id,
                        reference_display=si.reference_display,
                    ))

            # note[]
            if payload.note:
                for n in payload.note:
                    author_ref_type, author_ref_id = (None, None)
                    if n.author_reference:
                        author_ref_type, author_ref_id = _parse_ref(
                            n.author_reference,
                            DeviceRequestNoteAuthorReferenceType,
                            "note.authorReference",
                        )
                    dr.notes.append(DeviceRequestNote(
                        org_id=org_id,
                        text=n.text,
                        time=n.time,
                        author_string=n.author_string,
                        author_reference_type=author_ref_type,
                        author_reference_id=author_ref_id,
                        author_reference_display=n.author_reference_display,
                    ))

            # relevantHistory[]
            if payload.relevant_history:
                for rh in payload.relevant_history:
                    rh_type, rh_id = _parse_ref(rh.reference, DeviceRequestRelevantHistoryReferenceType, "relevantHistory")
                    dr.relevant_history.append(DeviceRequestRelevantHistory(
                        org_id=org_id,
                        reference_type=rh_type,
                        reference_id=rh_id,
                        reference_display=rh.reference_display,
                    ))

            try:
                session.add(dr)
                await session.commit()
                await session.refresh(dr)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_device_request_id(dr.device_request_id)

    async def patch(
        self,
        device_request_id: int,
        payload: DeviceRequestPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[DeviceRequestModel]:
        async with self.session_factory() as session:
            result = await session.execute(
                select(DeviceRequestModel).where(
                    DeviceRequestModel.device_request_id == device_request_id
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

        return await self.get_by_device_request_id(device_request_id)

    async def delete(self, device_request_id: int) -> bool:
        async with self.session_factory() as session:
            result = await session.execute(
                select(DeviceRequestModel).where(
                    DeviceRequestModel.device_request_id == device_request_id
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
