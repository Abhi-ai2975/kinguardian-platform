from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: F401
from sqlalchemy.orm import selectinload

from app.models.encounter.encounter import (
    EncounterModel,
    EncounterIdentifier,
    EncounterStatusHistory,
    EncounterClassHistory,
    EncounterClass,
    EncounterBusinessStatus,
    EncounterServiceType,
    EncounterType,
    EncounterEpisodeOfCare,
    EncounterBasedOn,
    EncounterCareTeam,
    EncounterParticipant,
    EncounterParticipantType,
    EncounterAppointmentRef,
    EncounterVirtualService,
    EncounterReason,
    EncounterReasonUse,
    EncounterReasonValue,
    EncounterDiagnosis,
    EncounterDiagnosisCondition,
    EncounterDiagnosisUse,
    EncounterAccount,
    EncounterDietPreference,
    EncounterSpecialArrangement,
    EncounterSpecialCourtesy,
    EncounterLocation,
)
from app.models.encounter.enums import (
    EncounterBasedOnReferenceType,
    EncounterDiagnosisConditionType,
    EncounterParticipantReferenceType,
    EncounterServiceTypeReferenceType,
    EncounterReasonValueReferenceType,
    EncounterEpisodeOfCareReferenceType,
    EncounterCareTeamReferenceType,
    EncounterAppointmentReferenceType,
    EncounterAccountReferenceType,
    EncounterLocationReferenceType,
)
from app.models.enums import SubjectReferenceType, OrganizationReferenceType
from app.schemas.encounter import EncounterCreateSchema, EncounterPatchSchema


def _with_relationships(stmt):
    """Attach eager-load options for all R5 encounter sub-resources."""
    return stmt.options(
        selectinload(EncounterModel.identifiers),
        selectinload(EncounterModel.status_history),
        selectinload(EncounterModel.class_history),
        selectinload(EncounterModel.classes),
        selectinload(EncounterModel.business_statuses),
        selectinload(EncounterModel.service_types),
        selectinload(EncounterModel.types),
        selectinload(EncounterModel.episode_of_cares),
        selectinload(EncounterModel.based_ons),
        selectinload(EncounterModel.care_teams),
        selectinload(EncounterModel.participants).selectinload(EncounterParticipant.types),
        selectinload(EncounterModel.appointment_refs),
        selectinload(EncounterModel.virtual_services),
        selectinload(EncounterModel.reasons).selectinload(EncounterReason.uses),
        selectinload(EncounterModel.reasons).selectinload(EncounterReason.values),
        selectinload(EncounterModel.diagnoses).selectinload(EncounterDiagnosis.conditions),
        selectinload(EncounterModel.diagnoses).selectinload(EncounterDiagnosis.uses),
        selectinload(EncounterModel.accounts),
        selectinload(EncounterModel.diet_preferences),
        selectinload(EncounterModel.special_arrangements),
        selectinload(EncounterModel.special_courtesies),
        selectinload(EncounterModel.locations),
    )


def _parse_ref(ref_str: Optional[str]) -> tuple:
    """Split 'ResourceType/123' → ('ResourceType', 123). Returns (None, None) on failure."""
    if not ref_str:
        return None, None
    parts = ref_str.split("/")
    if len(parts) != 2 or not parts[1].isdigit():
        return None, None
    return parts[0], int(parts[1])


def _cast_ref_type(type_str: Optional[str], enum_cls, field: str):
    """Cast a string resource type to an enum; raises HTTP 422 if not valid."""
    if not type_str:
        return None
    try:
        return enum_cls(type_str)
    except ValueError:
        allowed = [e.value for e in enum_cls]
        raise HTTPException(
            status_code=422,
            detail=f"Invalid reference type '{type_str}' for {field}. Allowed: {allowed}",
        )


def _parse_subject(subject_str: Optional[str]):
    type_str, ref_id = _parse_ref(subject_str)
    if not type_str:
        return None, None
    try:
        return SubjectReferenceType(type_str), ref_id
    except ValueError:
        return None, None


class EncounterRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    # ── Read ──────────────────────────────────────────────────────────────

    async def get_by_encounter_id(self, encounter_id: int) -> Optional[EncounterModel]:
        async with self.session_factory() as session:
            stmt = _with_relationships(
                select(EncounterModel).where(EncounterModel.encounter_id == encounter_id)
            )
            return (await session.execute(stmt)).scalars().first()

    def _apply_list_filters(
        self, stmt, user_id, org_id, status, patient_id,
        actual_period_start_from, actual_period_start_to,
        appointment_id=None,
    ):
        if user_id:
            stmt = stmt.where(EncounterModel.user_id == user_id)
        if org_id:
            stmt = stmt.where(EncounterModel.org_id == org_id)
        if status:
            stmt = stmt.where(EncounterModel.status == status)
        if patient_id is not None:
            stmt = stmt.where(
                EncounterModel.subject_type == SubjectReferenceType.Patient,
                EncounterModel.subject_id == patient_id,
            )
        if appointment_id is not None:
            sub = (
                select(EncounterAppointmentRef.id)
                .where(
                    EncounterAppointmentRef.encounter_id == EncounterModel.id,
                    EncounterAppointmentRef.reference_type == EncounterAppointmentReferenceType.Appointment,
                    EncounterAppointmentRef.reference_id == appointment_id,
                )
                .correlate(EncounterModel)
            )
            stmt = stmt.where(sub.exists())
        if actual_period_start_from is not None:
            stmt = stmt.where(EncounterModel.actual_period_start >= actual_period_start_from)
        if actual_period_start_to is not None:
            stmt = stmt.where(EncounterModel.actual_period_start <= actual_period_start_to)
        return stmt

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
        actual_period_start_from: Optional[datetime] = None,
        actual_period_start_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[EncounterModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(EncounterModel)),
                user_id, org_id, status, patient_id,
                actual_period_start_from, actual_period_start_to,
                appointment_id=appointment_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(EncounterModel),
                user_id, org_id, status, patient_id,
                actual_period_start_from, actual_period_start_to,
                appointment_id=appointment_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(EncounterModel.actual_period_start.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    async def list(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
        actual_period_start_from: Optional[datetime] = None,
        actual_period_start_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[EncounterModel], int]:
        async with self.session_factory() as session:
            base = self._apply_list_filters(
                _with_relationships(select(EncounterModel)),
                user_id, org_id, status, patient_id,
                actual_period_start_from, actual_period_start_to,
                appointment_id=appointment_id,
            )
            count_base = self._apply_list_filters(
                select(func.count()).select_from(EncounterModel),
                user_id, org_id, status, patient_id,
                actual_period_start_from, actual_period_start_to,
                appointment_id=appointment_id,
            )
            total = (await session.execute(count_base)).scalar_one()
            rows = list((await session.execute(
                base.order_by(EncounterModel.actual_period_start.desc()).offset(offset).limit(limit)
            )).scalars().all())
        return rows, total

    # ── Write ─────────────────────────────────────────────────────────────

    async def create(
        self,
        payload: EncounterCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        subject_display: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> EncounterModel:
        subject_type, subject_id = _parse_subject(payload.subject)

        encounter = EncounterModel(
            user_id=user_id,
            org_id=org_id,
            status=payload.status,
            priority_system=payload.priority_system,
            priority_code=payload.priority_code,
            priority_display=payload.priority_display,
            priority_text=payload.priority_text,
            subject_type=subject_type,
            subject_id=subject_id,
            subject_display=subject_display,
            subject_status_system=payload.subject_status_system,
            subject_status_code=payload.subject_status_code,
            subject_status_display=payload.subject_status_display,
            subject_status_text=payload.subject_status_text,
            actual_period_start=payload.actual_period_start,
            actual_period_end=payload.actual_period_end,
            planned_start_date=payload.planned_start_date,
            planned_end_date=payload.planned_end_date,
            length_value=payload.length_value,
            length_comparator=payload.length_comparator,
            length_unit=payload.length_unit,
            length_system=payload.length_system,
            length_code=payload.length_code,
            service_provider_type=(
                _cast_ref_type(
                    _parse_open_ref(payload.service_provider)[0],
                    OrganizationReferenceType,
                    "serviceProvider",
                ) if payload.service_provider else None
            ),
            service_provider_id=(
                _parse_open_ref(payload.service_provider)[1]
                if payload.service_provider else None
            ),
            service_provider_display=payload.service_provider_display,
            part_of_id=payload.part_of_id,
            created_by=created_by,
        )

        # identifier
        if payload.identifier:
            for inp in payload.identifier:
                encounter.identifiers.append(EncounterIdentifier(
                    org_id=org_id,
                    use=inp.use,
                    type_system=inp.type_system, type_code=inp.type_code,
                    type_display=inp.type_display, type_text=inp.type_text,
                    system=inp.system, value=inp.value,
                    period_start=inp.period_start, period_end=inp.period_end,
                    assigner=inp.assigner,
                ))

        # statusHistory
        if payload.status_history:
            for sh in payload.status_history:
                encounter.status_history.append(EncounterStatusHistory(
                    org_id=org_id, status=sh.status,
                    period_start=sh.period_start, period_end=sh.period_end,
                ))

        # classHistory (backward-compat)
        if payload.class_history:
            for ch in payload.class_history:
                encounter.class_history.append(EncounterClassHistory(
                    org_id=org_id,
                    class_system=ch.class_system, class_version=ch.class_version,
                    class_code=ch.class_code, class_display=ch.class_display,
                    period_start=ch.period_start, period_end=ch.period_end,
                ))

        # class[] (R5 0..* CodeableConcept)
        class_payload = getattr(payload, "class_", None)
        if class_payload:
            for c in class_payload:
                encounter.classes.append(EncounterClass(
                    org_id=org_id,
                    coding_system=c.coding_system, coding_code=c.coding_code,
                    coding_display=c.coding_display, text=c.text,
                ))

        # businessStatus[]
        if payload.business_status:
            for bs in payload.business_status:
                encounter.business_statuses.append(EncounterBusinessStatus(
                    org_id=org_id,
                    code_system=bs.code_system, code_code=bs.code_code,
                    code_display=bs.code_display, code_text=bs.code_text,
                    type_system=bs.type_system, type_code=bs.type_code,
                    type_display=bs.type_display, effective_date=bs.effective_date,
                ))

        # serviceType[] (CodeableReference(HealthcareService))
        if payload.service_type:
            for st in payload.service_type:
                st_ref_type = None
                st_ref_id = None
                if st.reference:
                    st_type_str, st_ref_id = _parse_ref(st.reference)
                    st_ref_type = _cast_ref_type(st_type_str, EncounterServiceTypeReferenceType, "serviceType.reference")
                encounter.service_types.append(EncounterServiceType(
                    org_id=org_id,
                    coding_system=st.coding_system, coding_code=st.coding_code,
                    coding_display=st.coding_display, text=st.text,
                    reference_type=st_ref_type, reference_id=st_ref_id,
                    reference_display=st.reference_display,
                ))

        # type[]
        if payload.type:
            for t in payload.type:
                encounter.types.append(EncounterType(
                    org_id=org_id,
                    coding_system=t.coding_system, coding_code=t.coding_code,
                    coding_display=t.coding_display, text=t.text,
                ))

        # episodeOfCare[]
        if payload.episode_of_care:
            for e in payload.episode_of_care:
                eoc_type_str, eoc_id = _parse_ref(e.reference)
                eoc_type = _cast_ref_type(eoc_type_str, EncounterEpisodeOfCareReferenceType, "episodeOfCare.reference")
                encounter.episode_of_cares.append(EncounterEpisodeOfCare(
                    org_id=org_id,
                    reference_type=eoc_type, reference_id=eoc_id,
                    reference_display=e.reference_display,
                ))

        # basedOn[]
        if payload.based_on:
            for b in payload.based_on:
                bo_type_str, bo_id = _parse_ref(b.reference)
                bo_type = _cast_ref_type(bo_type_str, EncounterBasedOnReferenceType, "basedOn.reference")
                encounter.based_ons.append(EncounterBasedOn(
                    org_id=org_id, reference_type=bo_type,
                    reference_id=bo_id, reference_display=b.reference_display,
                ))

        # careTeam[] (R5 new)
        if payload.care_team:
            for ct in payload.care_team:
                ct_type_str, ct_id = _parse_ref(ct.reference)
                ct_type = _cast_ref_type(ct_type_str, EncounterCareTeamReferenceType, "careTeam.reference")
                encounter.care_teams.append(EncounterCareTeam(
                    org_id=org_id,
                    reference_type=ct_type, reference_id=ct_id,
                    reference_display=ct.reference_display,
                ))

        # participant[]
        if payload.participant:
            for p in payload.participant:
                ref_type = None
                ref_id = None
                if p.reference:
                    ref_type_str, ref_id = _parse_ref(p.reference)
                    ref_type = _cast_ref_type(ref_type_str, EncounterParticipantReferenceType, "participant.actor")
                participant = EncounterParticipant(
                    org_id=org_id,
                    reference_type=ref_type, reference_id=ref_id,
                    reference_display=p.reference_display,
                    period_start=p.period_start, period_end=p.period_end,
                )
                if p.type:
                    for pt in p.type:
                        participant.types.append(EncounterParticipantType(
                            org_id=org_id,
                            coding_system=pt.coding_system, coding_code=pt.coding_code,
                            coding_display=pt.coding_display, text=pt.text,
                        ))
                encounter.participants.append(participant)

        # appointment[]
        if payload.appointment:
            for a in payload.appointment:
                appt_type_str, appt_id = _parse_ref(a.reference)
                appt_type = _cast_ref_type(appt_type_str, EncounterAppointmentReferenceType, "appointment.reference")
                encounter.appointment_refs.append(EncounterAppointmentRef(
                    org_id=org_id,
                    reference_type=appt_type, reference_id=appt_id,
                    reference_display=a.reference_display,
                ))

        # virtualService[] (R5 new)
        if payload.virtual_service:
            for vs in payload.virtual_service:
                encounter.virtual_services.append(EncounterVirtualService(
                    org_id=org_id,
                    channel_type_system=vs.channel_type_system,
                    channel_type_code=vs.channel_type_code,
                    channel_type_display=vs.channel_type_display,
                    address_url=vs.address_url,
                    additional_info=vs.additional_info,
                    max_participants=vs.max_participants,
                    session_key=vs.session_key,
                ))

        # reason[] (R5 BackboneElement with grandchildren)
        if payload.reason:
            for r_inp in payload.reason:
                reason = EncounterReason(org_id=org_id)
                if r_inp.use:
                    for ru in r_inp.use:
                        reason.uses.append(EncounterReasonUse(
                            org_id=org_id,
                            coding_system=ru.coding_system, coding_code=ru.coding_code,
                            coding_display=ru.coding_display, text=ru.text,
                        ))
                if r_inp.value:
                    for rv in r_inp.value:
                        rv_type = None
                        rv_id = None
                        if rv.reference:
                            rv_type_str, rv_id = _parse_ref(rv.reference)
                            rv_type = _cast_ref_type(rv_type_str, EncounterReasonValueReferenceType, "reason.value.reference")
                        reason.values.append(EncounterReasonValue(
                            org_id=org_id,
                            coding_system=rv.coding_system, coding_code=rv.coding_code,
                            coding_display=rv.coding_display, text=rv.text,
                            reference_type=rv_type, reference_id=rv_id,
                            reference_display=rv.reference_display,
                        ))
                encounter.reasons.append(reason)

        # diagnosis[] (BackboneElement with grandchildren)
        if payload.diagnosis:
            for d_inp in payload.diagnosis:
                diagnosis = EncounterDiagnosis(org_id=org_id)
                if d_inp.condition:
                    for dc in d_inp.condition:
                        dc_type = None
                        dc_id = None
                        if dc.reference:
                            dc_type_str, dc_id = _parse_ref(dc.reference)
                            dc_type = _cast_ref_type(dc_type_str, EncounterDiagnosisConditionType, "diagnosis.condition.reference")
                        diagnosis.conditions.append(EncounterDiagnosisCondition(
                            org_id=org_id,
                            coding_system=dc.coding_system, coding_code=dc.coding_code,
                            coding_display=dc.coding_display, text=dc.text,
                            reference_type=dc_type, reference_id=dc_id,
                            reference_display=dc.reference_display,
                        ))
                if d_inp.use:
                    for du in d_inp.use:
                        diagnosis.uses.append(EncounterDiagnosisUse(
                            org_id=org_id,
                            coding_system=du.coding_system, coding_code=du.coding_code,
                            coding_display=du.coding_display, text=du.text,
                        ))
                encounter.diagnoses.append(diagnosis)

        # account[]
        if payload.account:
            for a in payload.account:
                acct_type_str, acct_id = _parse_ref(a.reference)
                acct_type = _cast_ref_type(acct_type_str, EncounterAccountReferenceType, "account.reference")
                encounter.accounts.append(EncounterAccount(
                    org_id=org_id,
                    reference_type=acct_type, reference_id=acct_id,
                    reference_display=a.reference_display,
                ))

        # admission (flat columns on main table)
        if payload.admission:
            adm = payload.admission
            origin_type_str, origin_id = _parse_ref(adm.origin)
            dest_type_str, dest_id = _parse_ref(adm.destination)
            encounter.admission_pre_admission_identifier_system = adm.pre_admission_identifier_system
            encounter.admission_pre_admission_identifier_value = adm.pre_admission_identifier_value
            encounter.admission_origin_type = origin_type_str
            encounter.admission_origin_id = origin_id
            encounter.admission_origin_display = adm.origin_display
            encounter.admission_admit_source_system = adm.admit_source_system
            encounter.admission_admit_source_code = adm.admit_source_code
            encounter.admission_admit_source_display = adm.admit_source_display
            encounter.admission_admit_source_text = adm.admit_source_text
            encounter.admission_re_admission_system = adm.re_admission_system
            encounter.admission_re_admission_code = adm.re_admission_code
            encounter.admission_re_admission_display = adm.re_admission_display
            encounter.admission_re_admission_text = adm.re_admission_text
            encounter.admission_destination_type = dest_type_str
            encounter.admission_destination_id = dest_id
            encounter.admission_destination_display = adm.destination_display
            encounter.admission_discharge_disposition_system = adm.discharge_disposition_system
            encounter.admission_discharge_disposition_code = adm.discharge_disposition_code
            encounter.admission_discharge_disposition_display = adm.discharge_disposition_display
            encounter.admission_discharge_disposition_text = adm.discharge_disposition_text

        # dietPreference[] / specialArrangement[] / specialCourtesy[] (top-level in R5)
        if payload.diet_preference:
            for dp in payload.diet_preference:
                encounter.diet_preferences.append(EncounterDietPreference(
                    org_id=org_id,
                    coding_system=dp.coding_system, coding_code=dp.coding_code,
                    coding_display=dp.coding_display, text=dp.text,
                ))
        if payload.special_arrangement:
            for sa in payload.special_arrangement:
                encounter.special_arrangements.append(EncounterSpecialArrangement(
                    org_id=org_id,
                    coding_system=sa.coding_system, coding_code=sa.coding_code,
                    coding_display=sa.coding_display, text=sa.text,
                ))
        if payload.special_courtesy:
            for sc in payload.special_courtesy:
                encounter.special_courtesies.append(EncounterSpecialCourtesy(
                    org_id=org_id,
                    coding_system=sc.coding_system, coding_code=sc.coding_code,
                    coding_display=sc.coding_display, text=sc.text,
                ))

        # location[]
        if payload.location:
            for loc in payload.location:
                loc_type_str, loc_id = _parse_ref(loc.reference)
                loc_type = _cast_ref_type(loc_type_str, EncounterLocationReferenceType, "location.reference")
                encounter.locations.append(EncounterLocation(
                    org_id=org_id,
                    reference_type=loc_type, reference_id=loc_id,
                    reference_display=loc.reference_display,
                    status=loc.status,
                    form_system=loc.form_system, form_code=loc.form_code,
                    form_display=loc.form_display, form_text=loc.form_text,
                    period_start=loc.period_start, period_end=loc.period_end,
                ))

        async with self.session_factory() as session:
            try:
                session.add(encounter)
                await session.commit()
                await session.refresh(encounter)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_encounter_id(encounter.encounter_id)

    async def patch(
        self,
        encounter_id: int,
        payload: EncounterPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[EncounterModel]:
        async with self.session_factory() as session:
            stmt = select(EncounterModel).where(EncounterModel.encounter_id == encounter_id)
            encounter = (await session.execute(stmt)).scalars().first()
            if not encounter:
                return None

            update_data = payload.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(encounter, field, value)
            if updated_by is not None:
                encounter.updated_by = updated_by

            try:
                await session.commit()
                await session.refresh(encounter)
            except Exception:
                await session.rollback()
                raise

        return await self.get_by_encounter_id(encounter_id)

    async def delete(self, encounter_id: int) -> bool:
        async with self.session_factory() as session:
            stmt = select(EncounterModel).where(EncounterModel.encounter_id == encounter_id)
            encounter = (await session.execute(stmt)).scalars().first()
            if not encounter:
                return False
            try:
                await session.delete(encounter)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise
