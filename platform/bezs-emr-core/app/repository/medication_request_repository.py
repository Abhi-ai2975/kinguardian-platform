from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status as http_status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.encounter.encounter import EncounterModel
from app.models.medication_request.medication_request import (
    MedicationRequestModel,
    MedicationRequestIdentifier,
    MedicationRequestCategory,
    MedicationRequestSupportingInfo,
    MedicationRequestReasonCode,
    MedicationRequestReasonReference,
    MedicationRequestBasedOn,
    MedicationRequestInsurance,
    MedicationRequestNote,
    MedicationRequestDosageInstruction,
    MedicationRequestDosageAdditionalInstruction,
    MedicationRequestDosageDoseAndRate,
    MedicationRequestDetectedIssue,
    MedicationRequestEventHistory,
)
from app.models.medication_request.enums import (
    MedicationRequestStatus,
    MedicationRequestIntent,
    MedicationRequestPriority,
    MedicationSubjectType,
    MedicationRequesterType,
    MedicationPerformerType,
    MedicationRecorderType,
    MedicationReportedReferenceType,
    MedicationRequestMedicationReferenceType,
    MedicationRequestPriorPrescriptionType,
    MedicationRequestReasonReferenceType,
    MedicationRequestBasedOnReferenceType,
    MedicationRequestInsuranceReferenceType,
    MedicationRequestNoteAuthorReferenceType,
    MedicationRequestDetectedIssueReferenceType,
    MedicationRequestEventHistoryReferenceType,
    MedicationRequestDispensePerformerType,
)
from app.schemas.medication_request import MedicationRequestCreateSchema, MedicationRequestPatchSchema
from app.core.references import parse_reference


def _with_relationships(stmt):
    return stmt.options(
        selectinload(MedicationRequestModel.encounter),
        selectinload(MedicationRequestModel.identifiers),
        selectinload(MedicationRequestModel.categories),
        selectinload(MedicationRequestModel.supporting_info),
        selectinload(MedicationRequestModel.reason_codes),
        selectinload(MedicationRequestModel.reason_references),
        selectinload(MedicationRequestModel.based_on),
        selectinload(MedicationRequestModel.insurance),
        selectinload(MedicationRequestModel.notes),
        selectinload(MedicationRequestModel.dosage_instructions).selectinload(
            MedicationRequestDosageInstruction.additional_instructions
        ),
        selectinload(MedicationRequestModel.dosage_instructions).selectinload(
            MedicationRequestDosageInstruction.dose_and_rates
        ),
        selectinload(MedicationRequestModel.detected_issues),
        selectinload(MedicationRequestModel.event_history),
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


class MedicationRequestRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_medication_request_id(self, medication_request_id: int) -> Optional[MedicationRequestModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(MedicationRequestModel).where(
                    MedicationRequestModel.medication_request_id == medication_request_id
                )
            )
            result = await session.execute(stmt)
            return result.scalars().first()

    def _apply_list_filters(
        self, stmt, user_id, org_id, mr_status, patient_id, authored_from, authored_to,
        encounter_id=None,
    ):
        if user_id:
            stmt = stmt.where(MedicationRequestModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(MedicationRequestModel.org_id == org_id)
        if mr_status:
            stmt = stmt.where(MedicationRequestModel.status == MedicationRequestStatus(mr_status))
        if patient_id is not None:
            stmt = stmt.where(
                MedicationRequestModel.subject_type == MedicationSubjectType.Patient,
                MedicationRequestModel.subject_id == patient_id,
            )
        if encounter_id is not None:
            sub = select(EncounterModel.id).where(
                EncounterModel.encounter_id == encounter_id
            ).scalar_subquery()
            stmt = stmt.where(MedicationRequestModel.encounter_id == sub)
        if authored_from is not None:
            stmt = stmt.where(MedicationRequestModel.authored_on >= authored_from)
        if authored_to is not None:
            stmt = stmt.where(MedicationRequestModel.authored_on <= authored_to)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        mr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MedicationRequestModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(MedicationRequestModel)),
                user_id, org_id, mr_status, patient_id, authored_from, authored_to,
                encounter_id=encounter_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(MedicationRequestModel),
                user_id, org_id, mr_status, patient_id, authored_from, authored_to,
                encounter_id=encounter_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(MedicationRequestModel.authored_on.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        mr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MedicationRequestModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(MedicationRequestModel)),
                user_id, org_id, mr_status, patient_id, authored_from, authored_to,
                encounter_id=encounter_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(MedicationRequestModel),
                user_id, org_id, mr_status, patient_id, authored_from, authored_to,
                encounter_id=encounter_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(MedicationRequestModel.authored_on.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: MedicationRequestCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> MedicationRequestModel:
        async with self.session_factory() as session:
            # resolve subject
            subject_type, subject_id = None, None
            if payload.subject:
                subject_type, subject_id = _parse_ref(payload.subject, MedicationSubjectType, "subject")

            # resolve medication[x]
            med_ref_type, med_ref_id = None, None
            if payload.medication_reference:
                med_ref_type, med_ref_id = _parse_ref(
                    payload.medication_reference, MedicationRequestMedicationReferenceType, "medication_reference"
                )

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

            # resolve reported[x] reference
            reported_ref_type, reported_ref_id = None, None
            if payload.reported_reference:
                reported_ref_type, reported_ref_id = _parse_ref(
                    payload.reported_reference, MedicationReportedReferenceType, "reported_reference"
                )

            # resolve requester
            requester_type, requester_id = None, None
            if payload.requester:
                requester_type, requester_id = _parse_ref(payload.requester, MedicationRequesterType, "requester")

            # resolve performer (0..1)
            performer_type, performer_id = None, None
            if payload.performer:
                performer_type, performer_id = _parse_ref(payload.performer, MedicationPerformerType, "performer")

            # resolve recorder
            recorder_type, recorder_id = None, None
            if payload.recorder:
                recorder_type, recorder_id = _parse_ref(payload.recorder, MedicationRecorderType, "recorder")

            # resolve priorPrescription
            prior_presc_type, prior_presc_id = None, None
            if payload.prior_prescription:
                prior_presc_type, prior_presc_id = _parse_ref(
                    payload.prior_prescription, MedicationRequestPriorPrescriptionType, "prior_prescription"
                )

            # resolve dispense performer
            disp_perf_type, disp_perf_id = None, None
            if payload.dispense_performer:
                disp_perf_type, disp_perf_id = _parse_ref(
                    payload.dispense_performer, MedicationRequestDispensePerformerType, "dispense_performer"
                )

            mr = MedicationRequestModel(
                user_id=user_id,
                org_id=org_id,
                created_by=created_by,
                status=MedicationRequestStatus(payload.status).value,
                intent=MedicationRequestIntent(payload.intent).value,
                priority=MedicationRequestPriority(payload.priority).value if payload.priority else None,
                do_not_perform=payload.do_not_perform,
                status_reason_system=payload.status_reason_system,
                status_reason_code=payload.status_reason_code,
                status_reason_display=payload.status_reason_display,
                status_reason_text=payload.status_reason_text,
                medication_code_system=payload.medication_code_system,
                medication_code_code=payload.medication_code_code,
                medication_code_display=payload.medication_code_display,
                medication_code_text=payload.medication_code_text,
                medication_reference_type=med_ref_type,
                medication_reference_id=med_ref_id,
                medication_reference_display=payload.medication_reference_display,
                subject_type=subject_type,
                subject_id=subject_id,
                subject_display=payload.subject_display,
                encounter_id=encounter_internal_id,
                encounter_display=payload.encounter_display,
                authored_on=payload.authored_on,
                reported_boolean=payload.reported_boolean,
                reported_reference_type=reported_ref_type,
                reported_reference_id=reported_ref_id,
                reported_reference_display=payload.reported_reference_display,
                requester_type=requester_type,
                requester_id=requester_id,
                requester_display=payload.requester_display,
                performer_type=performer_type,
                performer_id=performer_id,
                performer_display=payload.performer_display,
                performer_type_system=payload.performer_type_system,
                performer_type_code=payload.performer_type_code,
                performer_type_display=payload.performer_type_display,
                performer_type_text=payload.performer_type_text,
                recorder_type=recorder_type,
                recorder_id=recorder_id,
                recorder_display=payload.recorder_display,
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
                course_of_therapy_type_system=payload.course_of_therapy_type_system,
                course_of_therapy_type_code=payload.course_of_therapy_type_code,
                course_of_therapy_type_display=payload.course_of_therapy_type_display,
                course_of_therapy_type_text=payload.course_of_therapy_type_text,
                prior_prescription_type=prior_presc_type,
                prior_prescription_id=prior_presc_id,
                prior_prescription_display=payload.prior_prescription_display,
                instantiates_canonical=payload.instantiates_canonical,
                instantiates_uri=payload.instantiates_uri,
                dispense_initial_fill_quantity_value=payload.dispense_initial_fill_quantity_value,
                dispense_initial_fill_quantity_unit=payload.dispense_initial_fill_quantity_unit,
                dispense_initial_fill_quantity_system=payload.dispense_initial_fill_quantity_system,
                dispense_initial_fill_quantity_code=payload.dispense_initial_fill_quantity_code,
                dispense_initial_fill_duration_value=payload.dispense_initial_fill_duration_value,
                dispense_initial_fill_duration_unit=payload.dispense_initial_fill_duration_unit,
                dispense_interval_value=payload.dispense_interval_value,
                dispense_interval_unit=payload.dispense_interval_unit,
                dispense_validity_period_start=payload.dispense_validity_period_start,
                dispense_validity_period_end=payload.dispense_validity_period_end,
                dispense_number_of_repeats_allowed=payload.dispense_number_of_repeats_allowed,
                dispense_quantity_value=payload.dispense_quantity_value,
                dispense_quantity_unit=payload.dispense_quantity_unit,
                dispense_quantity_system=payload.dispense_quantity_system,
                dispense_quantity_code=payload.dispense_quantity_code,
                dispense_expected_supply_duration_value=payload.dispense_expected_supply_duration_value,
                dispense_expected_supply_duration_unit=payload.dispense_expected_supply_duration_unit,
                dispense_performer_type=disp_perf_type,
                dispense_performer_id=disp_perf_id,
                dispense_performer_display=payload.dispense_performer_display,
                substitution_allowed_boolean=payload.substitution_allowed_boolean,
                substitution_allowed_system=payload.substitution_allowed_system,
                substitution_allowed_code=payload.substitution_allowed_code,
                substitution_allowed_display=payload.substitution_allowed_display,
                substitution_allowed_text=payload.substitution_allowed_text,
                substitution_reason_system=payload.substitution_reason_system,
                substitution_reason_code=payload.substitution_reason_code,
                substitution_reason_display=payload.substitution_reason_display,
                substitution_reason_text=payload.substitution_reason_text,
            )
            session.add(mr)

            # identifier
            for item in (payload.identifier or []):
                session.add(MedicationRequestIdentifier(
                    medication_request=mr,
                    org_id=org_id,
                    use=item.use,
                    type_system=item.type_system,
                    type_code=item.type_code,
                    type_display=item.type_display,
                    type_text=item.type_text,
                    system=item.system,
                    value=item.value,
                    period_start=item.period_start,
                    period_end=item.period_end,
                    assigner=item.assigner,
                ))

            # category
            for item in (payload.category or []):
                session.add(MedicationRequestCategory(
                    medication_request=mr,
                    org_id=org_id,
                    coding_system=item.coding_system,
                    coding_code=item.coding_code,
                    coding_display=item.coding_display,
                    text=item.text,
                ))

            # supporting_info (open reference)
            for item in (payload.supporting_info or []):
                ref_type, ref_id = _parse_open_ref(item.reference)
                session.add(MedicationRequestSupportingInfo(
                    medication_request=mr,
                    org_id=org_id,
                    reference_type=ref_type,
                    reference_id=ref_id,
                    reference_display=item.reference_display,
                ))

            # reason_code
            for item in (payload.reason_code or []):
                session.add(MedicationRequestReasonCode(
                    medication_request=mr,
                    org_id=org_id,
                    coding_system=item.coding_system,
                    coding_code=item.coding_code,
                    coding_display=item.coding_display,
                    text=item.text,
                ))

            # reason_reference
            for item in (payload.reason_reference or []):
                rr_type, rr_id = _parse_ref(item.reference, MedicationRequestReasonReferenceType, "reason_reference")
                session.add(MedicationRequestReasonReference(
                    medication_request=mr,
                    org_id=org_id,
                    reference_type=rr_type,
                    reference_id=rr_id,
                    reference_display=item.reference_display,
                ))

            # based_on
            for item in (payload.based_on or []):
                bo_type, bo_id = _parse_ref(item.reference, MedicationRequestBasedOnReferenceType, "based_on")
                session.add(MedicationRequestBasedOn(
                    medication_request=mr,
                    org_id=org_id,
                    reference_type=bo_type,
                    reference_id=bo_id,
                    reference_display=item.reference_display,
                ))

            # insurance
            for item in (payload.insurance or []):
                ins_type, ins_id = _parse_ref(item.reference, MedicationRequestInsuranceReferenceType, "insurance")
                session.add(MedicationRequestInsurance(
                    medication_request=mr,
                    org_id=org_id,
                    reference_type=ins_type,
                    reference_id=ins_id,
                    reference_display=item.reference_display,
                ))

            # note
            for item in (payload.note or []):
                note_author_ref_type, note_author_ref_id = None, None
                if item.author_reference:
                    note_author_ref_type, note_author_ref_id = _parse_ref(
                        item.author_reference, MedicationRequestNoteAuthorReferenceType, "note.author_reference"
                    )
                session.add(MedicationRequestNote(
                    medication_request=mr,
                    org_id=org_id,
                    text=item.text,
                    time=item.time,
                    author_string=item.author_string,
                    author_reference_type=note_author_ref_type,
                    author_reference_id=note_author_ref_id,
                ))

            # dosage_instruction (nested)
            for instr in (payload.dosage_instruction or []):
                di_row = MedicationRequestDosageInstruction(
                    medication_request=mr,
                    org_id=org_id,
                    sequence=instr.sequence,
                    text=instr.text,
                    patient_instruction=instr.patient_instruction,
                    as_needed_boolean=instr.as_needed_boolean,
                    as_needed_system=instr.as_needed_system,
                    as_needed_code=instr.as_needed_code,
                    as_needed_display=instr.as_needed_display,
                    as_needed_text=instr.as_needed_text,
                    site_system=instr.site_system,
                    site_code=instr.site_code,
                    site_display=instr.site_display,
                    site_text=instr.site_text,
                    route_system=instr.route_system,
                    route_code=instr.route_code,
                    route_display=instr.route_display,
                    route_text=instr.route_text,
                    method_system=instr.method_system,
                    method_code=instr.method_code,
                    method_display=instr.method_display,
                    method_text=instr.method_text,
                    timing_code_system=instr.timing_code_system,
                    timing_code_code=instr.timing_code_code,
                    timing_code_display=instr.timing_code_display,
                    timing_repeat_bounds_start=instr.timing_repeat_bounds_start,
                    timing_repeat_bounds_end=instr.timing_repeat_bounds_end,
                    timing_repeat_count=instr.timing_repeat_count,
                    timing_repeat_count_max=instr.timing_repeat_count_max,
                    timing_repeat_duration=instr.timing_repeat_duration,
                    timing_repeat_duration_max=instr.timing_repeat_duration_max,
                    timing_repeat_duration_unit=instr.timing_repeat_duration_unit,
                    timing_repeat_frequency=instr.timing_repeat_frequency,
                    timing_repeat_frequency_max=instr.timing_repeat_frequency_max,
                    timing_repeat_period=instr.timing_repeat_period,
                    timing_repeat_period_max=instr.timing_repeat_period_max,
                    timing_repeat_period_unit=instr.timing_repeat_period_unit,
                    timing_repeat_day_of_week=instr.timing_repeat_day_of_week,
                    timing_repeat_time_of_day=instr.timing_repeat_time_of_day,
                    timing_repeat_when=instr.timing_repeat_when,
                    timing_repeat_offset=instr.timing_repeat_offset,
                    max_dose_per_period_numerator_value=instr.max_dose_per_period_numerator_value,
                    max_dose_per_period_numerator_unit=instr.max_dose_per_period_numerator_unit,
                    max_dose_per_period_denominator_value=instr.max_dose_per_period_denominator_value,
                    max_dose_per_period_denominator_unit=instr.max_dose_per_period_denominator_unit,
                    max_dose_per_administration_value=instr.max_dose_per_administration_value,
                    max_dose_per_administration_unit=instr.max_dose_per_administration_unit,
                    max_dose_per_lifetime_value=instr.max_dose_per_lifetime_value,
                    max_dose_per_lifetime_unit=instr.max_dose_per_lifetime_unit,
                )
                session.add(di_row)

                for ai in (instr.additional_instruction or []):
                    session.add(MedicationRequestDosageAdditionalInstruction(
                        dosage_instruction=di_row,
                        org_id=org_id,
                        coding_system=ai.coding_system,
                        coding_code=ai.coding_code,
                        coding_display=ai.coding_display,
                        text=ai.text,
                    ))

                for dar in (instr.dose_and_rate or []):
                    session.add(MedicationRequestDosageDoseAndRate(
                        dosage_instruction=di_row,
                        org_id=org_id,
                        type_system=dar.type_system,
                        type_code=dar.type_code,
                        type_display=dar.type_display,
                        dose_quantity_value=dar.dose_quantity_value,
                        dose_quantity_unit=dar.dose_quantity_unit,
                        dose_quantity_system=dar.dose_quantity_system,
                        dose_quantity_code=dar.dose_quantity_code,
                        dose_range_low_value=dar.dose_range_low_value,
                        dose_range_low_unit=dar.dose_range_low_unit,
                        dose_range_high_value=dar.dose_range_high_value,
                        dose_range_high_unit=dar.dose_range_high_unit,
                        rate_ratio_numerator_value=dar.rate_ratio_numerator_value,
                        rate_ratio_numerator_unit=dar.rate_ratio_numerator_unit,
                        rate_ratio_denominator_value=dar.rate_ratio_denominator_value,
                        rate_ratio_denominator_unit=dar.rate_ratio_denominator_unit,
                        rate_range_low_value=dar.rate_range_low_value,
                        rate_range_low_unit=dar.rate_range_low_unit,
                        rate_range_high_value=dar.rate_range_high_value,
                        rate_range_high_unit=dar.rate_range_high_unit,
                        rate_quantity_value=dar.rate_quantity_value,
                        rate_quantity_unit=dar.rate_quantity_unit,
                        rate_quantity_system=dar.rate_quantity_system,
                        rate_quantity_code=dar.rate_quantity_code,
                    ))

            # detected_issue
            for item in (payload.detected_issue or []):
                di_type, di_id = _parse_ref(item.reference, MedicationRequestDetectedIssueReferenceType, "detected_issue")
                session.add(MedicationRequestDetectedIssue(
                    medication_request=mr,
                    org_id=org_id,
                    reference_type=di_type,
                    reference_id=di_id,
                    reference_display=item.reference_display,
                ))

            # event_history
            for item in (payload.event_history or []):
                eh_type, eh_id = _parse_ref(item.reference, MedicationRequestEventHistoryReferenceType, "event_history")
                session.add(MedicationRequestEventHistory(
                    medication_request=mr,
                    org_id=org_id,
                    reference_type=eh_type,
                    reference_id=eh_id,
                    reference_display=item.reference_display,
                ))

            await session.commit()
            await session.refresh(mr)

            stmt = _with_relationships(
                select(MedicationRequestModel).where(MedicationRequestModel.id == mr.id)
            )
            result = await session.execute(stmt)
            return result.scalars().one()

    # ── Patch ─────────────────────────────────────────────────────────────────

    async def patch(
        self,
        medication_request_id: int,
        payload: MedicationRequestPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[MedicationRequestModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(MedicationRequestModel).where(
                    MedicationRequestModel.medication_request_id == medication_request_id
                )
            )
            result = await session.execute(stmt)
            mr = result.scalars().first()
            if not mr:
                return None

            for field, value in payload.model_dump(exclude_unset=True).items():
                if field == "status" and value is not None:
                    setattr(mr, field, MedicationRequestStatus(value).value)
                elif field == "intent" and value is not None:
                    setattr(mr, field, MedicationRequestIntent(value).value)
                elif field == "priority" and value is not None:
                    setattr(mr, field, MedicationRequestPriority(value).value)
                else:
                    setattr(mr, field, value)

            mr.updated_by = updated_by
            await session.commit()
            await session.refresh(mr)

            stmt2 = _with_relationships(
                select(MedicationRequestModel).where(MedicationRequestModel.id == mr.id)
            )
            result2 = await session.execute(stmt2)
            return result2.scalars().one()

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, medication_request_id: int) -> None:
        async with self.session_factory() as session:
            stmt = select(MedicationRequestModel).where(
                MedicationRequestModel.medication_request_id == medication_request_id
            )
            result = await session.execute(stmt)
            mr = result.scalars().first()
            if mr:
                await session.delete(mr)
                await session.commit()
