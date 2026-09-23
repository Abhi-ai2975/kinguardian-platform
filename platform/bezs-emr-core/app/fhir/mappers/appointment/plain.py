from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.appointment.appointment import (
        AppointmentModel,
        AppointmentIdentifier,
        AppointmentClass,
        AppointmentServiceCategory,
        AppointmentServiceType,
        AppointmentSpecialty,
        AppointmentReason,
        AppointmentSupportingInformation,
        AppointmentReplaces,
        AppointmentVirtualService,
        AppointmentSlot,
        AppointmentAccount,
        AppointmentBasedOn,
        AppointmentNote,
        AppointmentPatientInstruction,
        AppointmentParticipant,
        AppointmentRequestedPeriod,
        AppointmentRecurrenceTemplate,
    )


def plain_appointment_identifier(i: "AppointmentIdentifier") -> dict:
    return {
        "id": i.id,
        "use": i.use,
        "type_system": i.type_system,
        "type_code": i.type_code,
        "type_display": i.type_display,
        "type_text": i.type_text,
        "system": i.system,
        "value": i.value,
        "period_start": i.period_start.isoformat() if i.period_start else None,
        "period_end": i.period_end.isoformat() if i.period_end else None,
        "assigner": i.assigner,
    }


def plain_appointment_class(cls: "AppointmentClass") -> dict:
    return {
        "id": cls.id,
        "coding_system": cls.coding_system,
        "coding_code": cls.coding_code,
        "coding_display": cls.coding_display,
        "text": cls.text,
    }


def plain_appointment_service_category(sc: "AppointmentServiceCategory") -> dict:
    return {
        "id": sc.id,
        "coding_system": sc.coding_system,
        "coding_code": sc.coding_code,
        "coding_display": sc.coding_display,
        "text": sc.text,
    }


def plain_appointment_service_type(st: "AppointmentServiceType") -> dict:
    return {
        "id": st.id,
        "coding_system": st.coding_system,
        "coding_code": st.coding_code,
        "coding_display": st.coding_display,
        "text": st.text,
        "reference_type": st.reference_type.value if st.reference_type else None,
        "reference_id": st.reference_id,
        "reference_display": st.reference_display,
    }


def plain_appointment_specialty(sp: "AppointmentSpecialty") -> dict:
    return {
        "id": sp.id,
        "coding_system": sp.coding_system,
        "coding_code": sp.coding_code,
        "coding_display": sp.coding_display,
        "text": sp.text,
    }


def plain_appointment_reason(r: "AppointmentReason") -> dict:
    return {
        "id": r.id,
        "coding_system": r.coding_system,
        "coding_code": r.coding_code,
        "coding_display": r.coding_display,
        "text": r.text,
        "reference_type": r.reference_type.value if r.reference_type else None,
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }


def plain_appointment_supporting_info(si: "AppointmentSupportingInformation") -> dict:
    return {
        "id": si.id,
        "reference_type": si.reference_type,
        "reference_id": si.reference_id,
        "reference_display": si.reference_display,
    }


def plain_appointment_replaces(r: "AppointmentReplaces") -> dict:
    return {
        "id": r.id,
        "reference_type": r.reference_type.value if r.reference_type else None,
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }


def plain_appointment_virtual_service(vs: "AppointmentVirtualService") -> dict:
    return {
        "id": vs.id,
        "channel_type_system": vs.channel_type_system,
        "channel_type_code": vs.channel_type_code,
        "channel_type_display": vs.channel_type_display,
        "address_url": vs.address_url,
        "additional_info": [u for u in vs.additional_info.split(",") if u] if vs.additional_info else None,
        "max_participants": vs.max_participants,
        "session_key": vs.session_key,
    }


def plain_appointment_slot(s: "AppointmentSlot") -> dict:
    return {
        "id": s.id,
        "reference_type": s.reference_type.value if s.reference_type else None,
        "reference_id": s.reference_id,
        "reference_display": s.reference_display,
    }


def plain_appointment_account(a: "AppointmentAccount") -> dict:
    return {
        "id": a.id,
        "reference_type": a.reference_type.value if a.reference_type else None,
        "reference_id": a.reference_id,
        "reference_display": a.reference_display,
    }


def plain_appointment_based_on(b: "AppointmentBasedOn") -> dict:
    return {
        "id": b.id,
        "reference_type": b.reference_type.value if b.reference_type else None,
        "reference_id": b.reference_id,
        "reference_display": b.reference_display,
    }


def plain_appointment_note(n: "AppointmentNote") -> dict:
    return {
        "id": n.id,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
        "time": n.time.isoformat() if n.time else None,
        "text": n.text,
    }


def plain_appointment_patient_instruction(pi: "AppointmentPatientInstruction") -> dict:
    return {
        "id": pi.id,
        "coding_system": pi.coding_system,
        "coding_code": pi.coding_code,
        "coding_display": pi.coding_display,
        "text": pi.text,
        "reference_type": pi.reference_type.value if pi.reference_type else None,
        "reference_id": pi.reference_id,
        "reference_display": pi.reference_display,
    }


def plain_appointment_participant(p: "AppointmentParticipant") -> dict:
    entry: dict = {
        "id": p.id,
        "reference_type": p.reference_type.value if p.reference_type else None,
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
        "required": p.required,
        "status": p.status,
        "period_start": p.period_start.isoformat() if p.period_start else None,
        "period_end": p.period_end.isoformat() if p.period_end else None,
    }
    if p.types:
        entry["types"] = [
            {"coding_system": t.coding_system, "coding_code": t.coding_code,
             "coding_display": t.coding_display, "text": t.text}
            for t in p.types
        ]
    return entry


def plain_appointment_requested_period(rp: "AppointmentRequestedPeriod") -> dict:
    return {
        "id": rp.id,
        "period_start": rp.period_start.isoformat() if rp.period_start else None,
        "period_end": rp.period_end.isoformat() if rp.period_end else None,
    }


def plain_appointment_recurrence_template(rt: "AppointmentRecurrenceTemplate") -> dict:
    rt_plain: dict = {
        "recurrence_type_code": rt.recurrence_type_code,
        "recurrence_type_display": rt.recurrence_type_display,
        "recurrence_type_system": rt.recurrence_type_system,
        "timezone_code": rt.timezone_code,
        "timezone_display": rt.timezone_display,
        "last_occurrence_date": rt.last_occurrence_date.isoformat() if rt.last_occurrence_date else None,
        "occurrence_count": rt.occurrence_count,
        "occurrence_dates": [d for d in rt.occurrence_dates.split(",") if d] if rt.occurrence_dates else None,
        "excluding_dates": [d for d in rt.excluding_dates.split(",") if d] if rt.excluding_dates else None,
        "excluding_recurrence_ids": (
            [int(i) for i in rt.excluding_recurrence_ids.split(",") if i]
            if rt.excluding_recurrence_ids else None
        ),
    }

    weekly = {k: v for k, v in {
        "monday": rt.weekly_monday, "tuesday": rt.weekly_tuesday,
        "wednesday": rt.weekly_wednesday, "thursday": rt.weekly_thursday,
        "friday": rt.weekly_friday, "saturday": rt.weekly_saturday,
        "sunday": rt.weekly_sunday, "week_interval": rt.weekly_week_interval,
    }.items() if v is not None}
    rt_plain["weekly_template"] = weekly if weekly else None

    monthly = {k: v for k, v in {
        "day_of_month": rt.monthly_day_of_month,
        "nth_week_code": rt.monthly_nth_week_code,
        "nth_week_display": rt.monthly_nth_week_display,
        "day_of_week_code": rt.monthly_day_of_week_code,
        "day_of_week_display": rt.monthly_day_of_week_display,
        "month_interval": rt.monthly_month_interval,
    }.items() if v is not None}
    rt_plain["monthly_template"] = monthly if monthly else None

    rt_plain["yearly_template"] = (
        {"year_interval": rt.yearly_year_interval} if rt.yearly_year_interval is not None else None
    )

    return {k: v for k, v in rt_plain.items() if v is not None}


def to_plain_appointment(appointment: "AppointmentModel") -> dict:
    result: dict = {
        "id": appointment.appointment_id,
        "user_id": appointment.user_id,
        "org_id": appointment.org_id,
        "status": appointment.status.value if hasattr(appointment.status, "value") else appointment.status,
        "cancelation_reason_system": appointment.cancelation_reason_system,
        "cancelation_reason_code": appointment.cancelation_reason_code,
        "cancelation_reason_display": appointment.cancelation_reason_display,
        "cancelation_reason_text": appointment.cancelation_reason_text,
        "cancellation_date": appointment.cancellation_date.isoformat() if appointment.cancellation_date else None,
        "appointment_type_system": appointment.appointment_type_system,
        "appointment_type_code": appointment.appointment_type_code,
        "appointment_type_display": appointment.appointment_type_display,
        "appointment_type_text": appointment.appointment_type_text,
        "priority_system": appointment.priority_system,
        "priority_code": appointment.priority_code,
        "priority_display": appointment.priority_display,
        "priority_text": appointment.priority_text,
        "subject_type": appointment.subject_type.value if appointment.subject_type else None,
        "subject_id": appointment.subject_id,
        "subject_display": appointment.subject_display,
        "encounter_id": (
            appointment.encounter.encounter_id
            if appointment.encounter and appointment.encounter.encounter_id
            else None
        ),
        "previous_appointment_id": appointment.previous_appointment_id,
        "previous_appointment_display": appointment.previous_appointment_display,
        "originating_appointment_id": appointment.originating_appointment_id,
        "originating_appointment_display": appointment.originating_appointment_display,
        "start": appointment.start.isoformat() if appointment.start else None,
        "end": appointment.end.isoformat() if appointment.end else None,
        "minutes_duration": appointment.minutes_duration,
        "created": appointment.created.isoformat() if appointment.created else None,
        "description": appointment.description,
        "recurrence_id": appointment.recurrence_id,
        "occurrence_changed": appointment.occurrence_changed,
        "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
        "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None,
        "created_by": appointment.created_by,
        "updated_by": appointment.updated_by,
    }

    if appointment.identifiers:
        result["identifier"] = [plain_appointment_identifier(i) for i in appointment.identifiers]
    if appointment.classes:
        result["class_"] = [plain_appointment_class(cls) for cls in appointment.classes]
    if appointment.service_categories:
        result["service_category"] = [plain_appointment_service_category(sc) for sc in appointment.service_categories]
    if appointment.service_types:
        result["service_type"] = [plain_appointment_service_type(st) for st in appointment.service_types]
    if appointment.specialties:
        result["specialty"] = [plain_appointment_specialty(sp) for sp in appointment.specialties]
    if appointment.reasons:
        result["reason"] = [plain_appointment_reason(r) for r in appointment.reasons]
    if appointment.supporting_informations:
        result["supporting_information"] = [plain_appointment_supporting_info(si) for si in appointment.supporting_informations]
    if appointment.slots:
        result["slot"] = [plain_appointment_slot(s) for s in appointment.slots]
    if appointment.based_ons:
        result["based_on"] = [plain_appointment_based_on(b) for b in appointment.based_ons]
    if appointment.replaces_list:
        result["replaces"] = [plain_appointment_replaces(r) for r in appointment.replaces_list]
    if appointment.virtual_services:
        result["virtual_service"] = [plain_appointment_virtual_service(vs) for vs in appointment.virtual_services]
    if appointment.accounts:
        result["account"] = [plain_appointment_account(a) for a in appointment.accounts]
    if appointment.notes:
        result["note"] = [plain_appointment_note(n) for n in appointment.notes]
    if appointment.patient_instructions:
        result["patient_instruction"] = [plain_appointment_patient_instruction(pi) for pi in appointment.patient_instructions]
    if appointment.participants:
        result["participant"] = [plain_appointment_participant(p) for p in appointment.participants]
    if appointment.requested_periods:
        result["requested_period"] = [plain_appointment_requested_period(rp) for rp in appointment.requested_periods]

    if appointment.recurrence_template:
        result["recurrence_template"] = plain_appointment_recurrence_template(appointment.recurrence_template)

    return {k: v for k, v in result.items() if v is not None}
