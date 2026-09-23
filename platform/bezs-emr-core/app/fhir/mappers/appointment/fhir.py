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


def _cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def fhir_appointment_identifier(i: "AppointmentIdentifier") -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    type_cc = _cc(i.type_system, i.type_code, i.type_display, i.type_text)
    if type_cc:
        entry["type"] = type_cc
    if i.system:
        entry["system"] = i.system
    if i.value:
        entry["value"] = i.value
    if i.period_start or i.period_end:
        entry["period"] = {k: v for k, v in {
            "start": i.period_start.isoformat() if i.period_start else None,
            "end": i.period_end.isoformat() if i.period_end else None,
        }.items() if v}
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_appointment_class(cls: "AppointmentClass") -> dict | None:
    return _cc(cls.coding_system, cls.coding_code, cls.coding_display, cls.text)


def fhir_appointment_service_category(sc: "AppointmentServiceCategory") -> dict | None:
    return _cc(sc.coding_system, sc.coding_code, sc.coding_display, sc.text)


def fhir_appointment_service_type(st: "AppointmentServiceType") -> dict:
    entry: dict = {}
    concept = _cc(st.coding_system, st.coding_code, st.coding_display, st.text)
    if concept:
        entry["concept"] = concept
    if st.reference_type and st.reference_id:
        ref: dict = {"reference": f"{st.reference_type.value}/{st.reference_id}"}
        if st.reference_display:
            ref["display"] = st.reference_display
        entry["reference"] = ref
    return entry


def fhir_appointment_specialty(sp: "AppointmentSpecialty") -> dict | None:
    return _cc(sp.coding_system, sp.coding_code, sp.coding_display, sp.text)


def fhir_appointment_reason(r: "AppointmentReason") -> dict:
    entry: dict = {}
    concept = _cc(r.coding_system, r.coding_code, r.coding_display, r.text)
    if concept:
        entry["concept"] = concept
    if r.reference_type and r.reference_id:
        ref: dict = {"reference": f"{r.reference_type.value}/{r.reference_id}"}
        if r.reference_display:
            ref["display"] = r.reference_display
        entry["reference"] = ref
    return entry


def fhir_appointment_supporting_info(si: "AppointmentSupportingInformation") -> dict:
    entry: dict = {}
    if si.reference_type and si.reference_id:
        entry["reference"] = f"{si.reference_type}/{si.reference_id}"
    if si.reference_display:
        entry["display"] = si.reference_display
    return entry


def fhir_appointment_replaces(r: "AppointmentReplaces") -> dict:
    return {k: v for k, v in {
        "reference": f"{r.reference_type.value}/{r.reference_id}" if r.reference_type and r.reference_id else None,
        "display": r.reference_display,
    }.items() if v}


def fhir_appointment_virtual_service(vs: "AppointmentVirtualService") -> dict:
    entry: dict = {}
    if vs.channel_type_code or vs.channel_type_system or vs.channel_type_display:
        coding = {k: v for k, v in {
            "system": vs.channel_type_system,
            "code": vs.channel_type_code,
            "display": vs.channel_type_display,
        }.items() if v}
        if coding:
            entry["channelType"] = coding
    if vs.address_url:
        entry["addressUrl"] = vs.address_url
    if vs.additional_info:
        entry["additionalInfo"] = [u for u in vs.additional_info.split(",") if u]
    if vs.max_participants is not None:
        entry["maxParticipants"] = vs.max_participants
    if vs.session_key:
        entry["sessionKey"] = vs.session_key
    return entry


def fhir_appointment_slot(s: "AppointmentSlot") -> dict:
    return {k: v for k, v in {
        "reference": f"{s.reference_type.value}/{s.reference_id}" if s.reference_type and s.reference_id else None,
        "display": s.reference_display,
    }.items() if v}


def fhir_appointment_account(a: "AppointmentAccount") -> dict:
    return {k: v for k, v in {
        "reference": f"{a.reference_type.value}/{a.reference_id}" if a.reference_type and a.reference_id else None,
        "display": a.reference_display,
    }.items() if v}


def fhir_appointment_based_on(b: "AppointmentBasedOn") -> dict:
    return {k: v for k, v in {
        "reference": f"{b.reference_type.value}/{b.reference_id}" if b.reference_type and b.reference_id else None,
        "display": b.reference_display,
    }.items() if v}


def fhir_appointment_note(n: "AppointmentNote") -> dict:
    entry: dict = {"text": n.text}
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id:
        ref: dict = {"reference": f"{n.author_reference_type}/{n.author_reference_id}"}
        if n.author_reference_display:
            ref["display"] = n.author_reference_display
        entry["authorReference"] = ref
    if n.time:
        entry["time"] = n.time.isoformat()
    return entry


def fhir_appointment_patient_instruction(pi: "AppointmentPatientInstruction") -> dict:
    entry: dict = {}
    concept = _cc(pi.coding_system, pi.coding_code, pi.coding_display, pi.text)
    if concept:
        entry["concept"] = concept
    if pi.reference_type and pi.reference_id:
        ref: dict = {"reference": f"{pi.reference_type.value}/{pi.reference_id}"}
        if pi.reference_display:
            ref["display"] = pi.reference_display
        entry["reference"] = ref
    return entry


def fhir_appointment_participant(p: "AppointmentParticipant") -> dict:
    entry: dict = {"status": p.status}
    if p.types:
        type_list = [cc for t in p.types if (cc := _cc(t.coding_system, t.coding_code, t.coding_display, t.text))]
        if type_list:
            entry["type"] = type_list
    if p.reference_type and p.reference_id:
        actor: dict = {"reference": f"{p.reference_type.value}/{p.reference_id}"}
        if p.reference_display:
            actor["display"] = p.reference_display
        entry["actor"] = actor
    if p.required is not None:
        entry["required"] = p.required
    if p.period_start or p.period_end:
        entry["period"] = {k: v for k, v in {
            "start": p.period_start.isoformat() if p.period_start else None,
            "end": p.period_end.isoformat() if p.period_end else None,
        }.items() if v}
    return entry


def fhir_appointment_requested_period(rp: "AppointmentRequestedPeriod") -> dict:
    return {k: v for k, v in {
        "start": rp.period_start.isoformat() if rp.period_start else None,
        "end": rp.period_end.isoformat() if rp.period_end else None,
    }.items() if v}


def fhir_appointment_recurrence_template(rt: "AppointmentRecurrenceTemplate") -> dict:
    rt_data: dict = {
        "recurrenceType": {
            "coding": [{k: v for k, v in {
                "system": rt.recurrence_type_system,
                "code": rt.recurrence_type_code,
                "display": rt.recurrence_type_display,
            }.items() if v}]
        }
    }

    if rt.timezone_code:
        rt_data["timezone"] = {"coding": [{k: v for k, v in {
            "code": rt.timezone_code,
            "display": rt.timezone_display,
        }.items() if v}]}

    if rt.last_occurrence_date:
        rt_data["lastOccurrenceDate"] = rt.last_occurrence_date.isoformat()
    if rt.occurrence_count is not None:
        rt_data["occurrenceCount"] = rt.occurrence_count
    if rt.occurrence_dates:
        rt_data["occurrenceDates"] = [d for d in rt.occurrence_dates.split(",") if d]
    if rt.excluding_dates:
        rt_data["excludingDate"] = [d for d in rt.excluding_dates.split(",") if d]
    if rt.excluding_recurrence_ids:
        rt_data["excludingRecurrenceId"] = [int(i) for i in rt.excluding_recurrence_ids.split(",") if i]

    weekly = {k: v for k, v in {
        "monday": rt.weekly_monday, "tuesday": rt.weekly_tuesday,
        "wednesday": rt.weekly_wednesday, "thursday": rt.weekly_thursday,
        "friday": rt.weekly_friday, "saturday": rt.weekly_saturday,
        "sunday": rt.weekly_sunday,
    }.items() if v is not None}
    if rt.weekly_week_interval is not None:
        weekly["weekInterval"] = rt.weekly_week_interval
    if weekly:
        rt_data["weeklyTemplate"] = weekly

    if rt.monthly_month_interval is not None:
        monthly: dict = {"monthInterval": rt.monthly_month_interval}
        if rt.monthly_day_of_month is not None:
            monthly["dayOfMonth"] = rt.monthly_day_of_month
        if rt.monthly_nth_week_code:
            monthly["nthWeekOfMonth"] = {k: v for k, v in {
                "code": rt.monthly_nth_week_code, "display": rt.monthly_nth_week_display,
            }.items() if v}
        if rt.monthly_day_of_week_code:
            monthly["dayOfWeek"] = {k: v for k, v in {
                "code": rt.monthly_day_of_week_code, "display": rt.monthly_day_of_week_display,
            }.items() if v}
        rt_data["monthlyTemplate"] = monthly

    if rt.yearly_year_interval is not None:
        rt_data["yearlyTemplate"] = {"yearInterval": rt.yearly_year_interval}

    return rt_data


def to_fhir_appointment(appointment: "AppointmentModel") -> dict:
    result: dict = {
        "resourceType": "Appointment",
        "id": str(appointment.appointment_id),
        "status": appointment.status.value if hasattr(appointment.status, "value") else appointment.status,
    }

    if appointment.identifiers:
        result["identifier"] = [fhir_appointment_identifier(i) for i in appointment.identifiers]

    cancelation_cc = _cc(
        appointment.cancelation_reason_system,
        appointment.cancelation_reason_code,
        appointment.cancelation_reason_display,
        appointment.cancelation_reason_text,
    )
    if cancelation_cc:
        result["cancellationReason"] = cancelation_cc

    if appointment.cancellation_date:
        result["cancellationDate"] = appointment.cancellation_date.isoformat()

    if appointment.classes:
        class_list = [cc for cls in appointment.classes if (cc := fhir_appointment_class(cls))]
        if class_list:
            result["class"] = class_list

    if appointment.service_categories:
        sc_list = [cc for sc in appointment.service_categories if (cc := fhir_appointment_service_category(sc))]
        if sc_list:
            result["serviceCategory"] = sc_list

    if appointment.service_types:
        st_list = [e for st in appointment.service_types if (e := fhir_appointment_service_type(st))]
        if st_list:
            result["serviceType"] = st_list

    if appointment.specialties:
        sp_list = [cc for sp in appointment.specialties if (cc := fhir_appointment_specialty(sp))]
        if sp_list:
            result["specialty"] = sp_list

    appt_type_cc = _cc(
        appointment.appointment_type_system,
        appointment.appointment_type_code,
        appointment.appointment_type_display,
        appointment.appointment_type_text,
    )
    if appt_type_cc:
        result["appointmentType"] = appt_type_cc

    if appointment.reasons:
        reason_list = [e for r in appointment.reasons if (e := fhir_appointment_reason(r))]
        if reason_list:
            result["reason"] = reason_list

    priority_cc = _cc(
        appointment.priority_system,
        appointment.priority_code,
        appointment.priority_display,
        appointment.priority_text,
    )
    if priority_cc:
        result["priority"] = priority_cc

    if appointment.supporting_informations:
        si_list = [e for si in appointment.supporting_informations if (e := fhir_appointment_supporting_info(si))]
        if si_list:
            result["supportingInformation"] = si_list

    if appointment.description:
        result["description"] = appointment.description

    if appointment.replaces_list:
        result["replaces"] = [fhir_appointment_replaces(r) for r in appointment.replaces_list]

    if appointment.virtual_services:
        vs_list = [e for vs in appointment.virtual_services if (e := fhir_appointment_virtual_service(vs))]
        if vs_list:
            result["virtualService"] = vs_list

    if appointment.previous_appointment_id:
        prev: dict = {"reference": f"Appointment/{appointment.previous_appointment_id}"}
        if appointment.previous_appointment_display:
            prev["display"] = appointment.previous_appointment_display
        result["previousAppointment"] = prev

    if appointment.originating_appointment_id:
        orig: dict = {"reference": f"Appointment/{appointment.originating_appointment_id}"}
        if appointment.originating_appointment_display:
            orig["display"] = appointment.originating_appointment_display
        result["originatingAppointment"] = orig

    if appointment.slots:
        result["slot"] = [fhir_appointment_slot(s) for s in appointment.slots]

    if appointment.accounts:
        result["account"] = [fhir_appointment_account(a) for a in appointment.accounts]

    if appointment.based_ons:
        result["basedOn"] = [fhir_appointment_based_on(b) for b in appointment.based_ons]

    if appointment.created:
        result["created"] = appointment.created.isoformat()

    if appointment.notes:
        result["note"] = [fhir_appointment_note(n) for n in appointment.notes]

    if appointment.patient_instructions:
        pi_list = [e for pi in appointment.patient_instructions if (e := fhir_appointment_patient_instruction(pi))]
        if pi_list:
            result["patientInstruction"] = pi_list

    if appointment.subject_type and appointment.subject_id:
        subj: dict = {"reference": f"{appointment.subject_type.value}/{appointment.subject_id}"}
        if appointment.subject_display:
            subj["display"] = appointment.subject_display
        result["subject"] = subj

    if appointment.encounter and appointment.encounter.encounter_id:
        result["encounter"] = {"reference": f"Encounter/{appointment.encounter.encounter_id}"}

    if appointment.start:
        result["start"] = appointment.start.isoformat()
    if appointment.end:
        result["end"] = appointment.end.isoformat()
    if appointment.minutes_duration is not None:
        result["minutesDuration"] = appointment.minutes_duration

    if appointment.requested_periods:
        periods = [e for rp in appointment.requested_periods if (e := fhir_appointment_requested_period(rp))]
        if periods:
            result["requestedPeriod"] = periods

    result["participant"] = [fhir_appointment_participant(p) for p in appointment.participants]

    if appointment.recurrence_id is not None:
        result["recurrenceId"] = appointment.recurrence_id
    if appointment.occurrence_changed is not None:
        result["occurrenceChanged"] = appointment.occurrence_changed

    if appointment.recurrence_template:
        result["recurrenceTemplate"] = fhir_appointment_recurrence_template(appointment.recurrence_template)

    return {k: v for k, v in result.items() if v is not None}
