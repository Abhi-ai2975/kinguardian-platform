from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.encounter.encounter import EncounterModel
from app.models.enums import EncounterReferenceType
from app.models.service_request.service_request import (
    ServiceRequestModel,
    ServiceRequestIdentifier,
    ServiceRequestCategory,
    ServiceRequestOrderDetail,
    ServiceRequestPerformer,
    ServiceRequestLocationCode,
    ServiceRequestLocationReference,
    ServiceRequestReasonCode,
    ServiceRequestReasonReference,
    ServiceRequestInsurance,
    ServiceRequestSupportingInfo,
    ServiceRequestSpecimen,
    ServiceRequestBodySite,
    ServiceRequestNote,
    ServiceRequestRelevantHistory,
    ServiceRequestBasedOn,
    ServiceRequestReplaces,
)
from app.models.service_request.enums import (
    ServiceRequestBasedOnReferenceType,
    ServiceRequestInsuranceReferenceType,
    ServiceRequestLocationReferenceType,
    ServiceRequestNoteAuthorReferenceType,
    ServiceRequestPerformerReferenceType,
    ServiceRequestReasonReferenceType,
    ServiceRequestRelevantHistoryReferenceType,
    ServiceRequestReplacesReferenceType,
    ServiceRequestSpecimenReferenceType,
    ServiceRequestStatus,
    ServiceRequestSubjectType,
    ServiceRequestRequesterType,
)
from app.schemas.service_request import ServiceRequestCreateSchema, ServiceRequestPatchSchema
from app.core.references import parse_reference


def _with_relationships(stmt):
    return stmt.options(
        selectinload(ServiceRequestModel.encounter),
        selectinload(ServiceRequestModel.identifiers),
        selectinload(ServiceRequestModel.categories),
        selectinload(ServiceRequestModel.order_details),
        selectinload(ServiceRequestModel.performers),
        selectinload(ServiceRequestModel.location_codes),
        selectinload(ServiceRequestModel.location_references),
        selectinload(ServiceRequestModel.reason_codes),
        selectinload(ServiceRequestModel.reason_references),
        selectinload(ServiceRequestModel.insurance),
        selectinload(ServiceRequestModel.supporting_info),
        selectinload(ServiceRequestModel.specimens),
        selectinload(ServiceRequestModel.body_sites),
        selectinload(ServiceRequestModel.notes),
        selectinload(ServiceRequestModel.relevant_history),
        selectinload(ServiceRequestModel.based_on),
        selectinload(ServiceRequestModel.replaces),
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
    """Parse 'ResourceType/id' and validate type against enum_cls."""
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
    """Parse 'ResourceType/id' for open (any-type) references."""
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


class ServiceRequestRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_service_request_id(self, service_request_id: int) -> Optional[ServiceRequestModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(ServiceRequestModel).where(
                    ServiceRequestModel.service_request_id == service_request_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(
        self, stmt, user_id, org_id, sr_status, patient_id, authored_from, authored_to,
        encounter_id=None,
    ):
        if user_id:
            stmt = stmt.where(ServiceRequestModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(ServiceRequestModel.org_id == org_id)
        if sr_status:
            stmt = stmt.where(ServiceRequestModel.status == ServiceRequestStatus(sr_status))
        if patient_id is not None:
            stmt = stmt.where(
                ServiceRequestModel.subject_type == ServiceRequestSubjectType.Patient,
                ServiceRequestModel.subject_id == patient_id,
            )
        if encounter_id is not None:
            sub = select(EncounterModel.id).where(
                EncounterModel.encounter_id == encounter_id
            ).scalar_subquery()
            stmt = stmt.where(ServiceRequestModel.encounter_id == sub)
        if authored_from is not None:
            stmt = stmt.where(ServiceRequestModel.authored_on >= authored_from)
        if authored_to is not None:
            stmt = stmt.where(ServiceRequestModel.authored_on <= authored_to)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        sr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ServiceRequestModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ServiceRequestModel)),
                user_id, org_id, sr_status, patient_id, authored_from, authored_to,
                encounter_id=encounter_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ServiceRequestModel),
                user_id, org_id, sr_status, patient_id, authored_from, authored_to,
                encounter_id=encounter_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ServiceRequestModel.authored_on.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        sr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ServiceRequestModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(ServiceRequestModel)),
                user_id, org_id, sr_status, patient_id, authored_from, authored_to,
                encounter_id=encounter_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(ServiceRequestModel),
                user_id, org_id, sr_status, patient_id, authored_from, authored_to,
                encounter_id=encounter_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(ServiceRequestModel.authored_on.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: ServiceRequestCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> ServiceRequestModel:
        subject_type, subject_id = (
            parse_reference(payload.subject, ServiceRequestSubjectType)
            if payload.subject else (None, None)
        )

        requester_type, requester_id = (None, None)
        if payload.requester:
            r_type, requester_id = _parse_ref(payload.requester, ServiceRequestRequesterType, "requester")
            requester_type = r_type

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

            sr = ServiceRequestModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=payload.status,
                intent=payload.intent,
                priority=payload.priority,
                do_not_perform=payload.do_not_perform,
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
                occurrence_datetime=payload.occurrence_datetime,
                occurrence_period_start=payload.occurrence_period_start,
                occurrence_period_end=payload.occurrence_period_end,
                occurrence_timing_frequency=payload.occurrence_timing_frequency,
                occurrence_timing_period=payload.occurrence_timing_period,
                occurrence_timing_period_unit=payload.occurrence_timing_period_unit,
                occurrence_timing_bounds_start=payload.occurrence_timing_bounds_start,
                occurrence_timing_bounds_end=payload.occurrence_timing_bounds_end,
                as_needed_boolean=payload.as_needed_boolean,
                as_needed_system=payload.as_needed_system,
                as_needed_code=payload.as_needed_code,
                as_needed_display=payload.as_needed_display,
                as_needed_text=payload.as_needed_text,
                authored_on=payload.authored_on,
                requester_type=requester_type,
                requester_id=requester_id,
                requester_display=payload.requester_display,
                performer_type_system=payload.performer_type_system,
                performer_type_code=payload.performer_type_code,
                performer_type_display=payload.performer_type_display,
                performer_type_text=payload.performer_type_text,
                quantity_value=payload.quantity_value,
                quantity_unit=payload.quantity_unit,
                quantity_system=payload.quantity_system,
                quantity_code=payload.quantity_code,
                quantity_ratio_numerator_value=payload.quantity_ratio_numerator_value,
                quantity_ratio_numerator_unit=payload.quantity_ratio_numerator_unit,
                quantity_ratio_denominator_value=payload.quantity_ratio_denominator_value,
                quantity_ratio_denominator_unit=payload.quantity_ratio_denominator_unit,
                quantity_range_low_value=payload.quantity_range_low_value,
                quantity_range_low_unit=payload.quantity_range_low_unit,
                quantity_range_high_value=payload.quantity_range_high_value,
                quantity_range_high_unit=payload.quantity_range_high_unit,
                requisition_use=payload.requisition_use,
                requisition_type_system=payload.requisition_type_system,
                requisition_type_code=payload.requisition_type_code,
                requisition_type_display=payload.requisition_type_display,
                requisition_type_text=payload.requisition_type_text,
                requisition_system=payload.requisition_system,
                requisition_value=payload.requisition_value,
                requisition_period_start=payload.requisition_period_start,
                requisition_period_end=payload.requisition_period_end,
                requisition_assigner=payload.requisition_assigner,
                instantiates_canonical=payload.instantiates_canonical,
                instantiates_uri=payload.instantiates_uri,
                patient_instruction=payload.patient_instruction,
            )

            # identifier[]
            if payload.identifier:
                for i in payload.identifier:
                    sr.identifiers.append(ServiceRequestIdentifier(
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
                    sr.categories.append(ServiceRequestCategory(
                        org_id=org_id,
                        coding_system=cat.coding_system,
                        coding_code=cat.coding_code,
                        coding_display=cat.coding_display,
                        text=cat.text,
                    ))

            # orderDetail[]
            if payload.order_detail:
                for od in payload.order_detail:
                    sr.order_details.append(ServiceRequestOrderDetail(
                        org_id=org_id,
                        coding_system=od.coding_system,
                        coding_code=od.coding_code,
                        coding_display=od.coding_display,
                        text=od.text,
                    ))

            # performer[]
            if payload.performer:
                for p in payload.performer:
                    p_type, p_id = _parse_ref(p.reference, ServiceRequestPerformerReferenceType, "performer")
                    sr.performers.append(ServiceRequestPerformer(
                        org_id=org_id,
                        reference_type=p_type,
                        reference_id=p_id,
                        reference_display=p.reference_display,
                    ))

            # locationCode[]
            if payload.location_code:
                for lc in payload.location_code:
                    sr.location_codes.append(ServiceRequestLocationCode(
                        org_id=org_id,
                        coding_system=lc.coding_system,
                        coding_code=lc.coding_code,
                        coding_display=lc.coding_display,
                        text=lc.text,
                    ))

            # locationReference[]
            if payload.location_reference:
                for lr in payload.location_reference:
                    lr_type, lr_id = _parse_ref(lr.reference, ServiceRequestLocationReferenceType, "locationReference")
                    sr.location_references.append(ServiceRequestLocationReference(
                        org_id=org_id,
                        reference_type=lr_type,
                        reference_id=lr_id,
                        reference_display=lr.reference_display,
                    ))

            # reasonCode[]
            if payload.reason_code:
                for rc in payload.reason_code:
                    sr.reason_codes.append(ServiceRequestReasonCode(
                        org_id=org_id,
                        coding_system=rc.coding_system,
                        coding_code=rc.coding_code,
                        coding_display=rc.coding_display,
                        text=rc.text,
                    ))

            # reasonReference[]
            if payload.reason_reference:
                for rr in payload.reason_reference:
                    rr_type, rr_id = _parse_ref(rr.reference, ServiceRequestReasonReferenceType, "reasonReference")
                    sr.reason_references.append(ServiceRequestReasonReference(
                        org_id=org_id,
                        reference_type=rr_type,
                        reference_id=rr_id,
                        reference_display=rr.reference_display,
                    ))

            # insurance[]
            if payload.insurance:
                for ins in payload.insurance:
                    ins_type, ins_id = _parse_ref(ins.reference, ServiceRequestInsuranceReferenceType, "insurance")
                    sr.insurance.append(ServiceRequestInsurance(
                        org_id=org_id,
                        reference_type=ins_type,
                        reference_id=ins_id,
                        reference_display=ins.reference_display,
                    ))

            # supportingInfo[] — open reference
            if payload.supporting_info:
                for si in payload.supporting_info:
                    si_type, si_id = _parse_open_ref(si.reference)
                    sr.supporting_info.append(ServiceRequestSupportingInfo(
                        org_id=org_id,
                        reference_type=si_type,
                        reference_id=si_id,
                        reference_display=si.reference_display,
                    ))

            # specimen[]
            if payload.specimen:
                for sp in payload.specimen:
                    sp_type, sp_id = _parse_ref(sp.reference, ServiceRequestSpecimenReferenceType, "specimen")
                    sr.specimens.append(ServiceRequestSpecimen(
                        org_id=org_id,
                        reference_type=sp_type,
                        reference_id=sp_id,
                        reference_display=sp.reference_display,
                    ))

            # bodySite[]
            if payload.body_site:
                for bs in payload.body_site:
                    sr.body_sites.append(ServiceRequestBodySite(
                        org_id=org_id,
                        coding_system=bs.coding_system,
                        coding_code=bs.coding_code,
                        coding_display=bs.coding_display,
                        text=bs.text,
                    ))

            # note[]
            if payload.note:
                for n in payload.note:
                    author_ref_type, author_ref_id = (None, None)
                    if n.author_reference:
                        ar_type, author_ref_id = _parse_ref(
                            n.author_reference,
                            ServiceRequestNoteAuthorReferenceType,
                            "note.authorReference",
                        )
                        author_ref_type = ar_type
                    sr.notes.append(ServiceRequestNote(
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
                    rh_type, rh_id = _parse_ref(rh.reference, ServiceRequestRelevantHistoryReferenceType, "relevantHistory")
                    sr.relevant_history.append(ServiceRequestRelevantHistory(
                        org_id=org_id,
                        reference_type=rh_type,
                        reference_id=rh_id,
                        reference_display=rh.reference_display,
                    ))

            # basedOn[]
            if payload.based_on:
                for bo in payload.based_on:
                    bo_type, bo_id = _parse_ref(bo.reference, ServiceRequestBasedOnReferenceType, "basedOn")
                    sr.based_on.append(ServiceRequestBasedOn(
                        org_id=org_id,
                        reference_type=bo_type,
                        reference_id=bo_id,
                        reference_display=bo.reference_display,
                    ))

            # replaces[]
            if payload.replaces:
                for r in payload.replaces:
                    r_type, r_id = _parse_ref(r.reference, ServiceRequestReplacesReferenceType, "replaces")
                    sr.replaces.append(ServiceRequestReplaces(
                        org_id=org_id,
                        reference_type=r_type,
                        reference_id=r_id,
                        reference_display=r.reference_display,
                    ))

            try:
                session.add(sr)
                await session.commit()
                await session.refresh(sr)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_service_request_id(sr.service_request_id)

    async def patch(
        self,
        service_request_id: int,
        payload: ServiceRequestPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[ServiceRequestModel]:
        async with self.session_factory() as session:
            result = await session.execute(
                select(ServiceRequestModel).where(
                    ServiceRequestModel.service_request_id == service_request_id
                )
            )
            sr = result.scalars().first()
            if not sr:
                return None

            update_data = payload.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(sr, field, value)
            if updated_by is not None:
                sr.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(sr)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_service_request_id(service_request_id)

    async def delete(self, service_request_id: int) -> bool:
        async with self.session_factory() as session:
            result = await session.execute(
                select(ServiceRequestModel).where(
                    ServiceRequestModel.service_request_id == service_request_id
                )
            )
            sr = result.scalars().first()
            if not sr:
                return False

            try:
                await session.delete(sr)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise
