from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.encounter.encounter import (
        EncounterModel,
        EncounterIdentifier,
        EncounterStatusHistory,
        EncounterClass,
        EncounterClassHistory,
        EncounterBusinessStatus,
        EncounterType,
        EncounterServiceType,
        EncounterEpisodeOfCare,
        EncounterBasedOn,
        EncounterCareTeam,
        EncounterParticipant,
        EncounterAppointmentRef,
        EncounterVirtualService,
        EncounterReason,
        EncounterDiagnosis,
        EncounterAccount,
        EncounterDietPreference,
        EncounterSpecialArrangement,
        EncounterSpecialCourtesy,
        EncounterLocation,
    )


def _cc(coding_system, coding_code, coding_display, text=None) -> dict | None:
    coding = {k: v for k, v in {
        "system": coding_system, "code": coding_code, "display": coding_display,
    }.items() if v}
    cc: dict = {}
    if coding:
        cc["coding"] = [coding]
    if text:
        cc["text"] = text
    return cc or None


def _period(start, end) -> dict | None:
    p = {k: v for k, v in {
        "start": start.isoformat() if start else None,
        "end": end.isoformat() if end else None,
    }.items() if v}
    return p or None


def fhir_encounter_identifier(i: "EncounterIdentifier") -> dict:
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
    period = _period(i.period_start, i.period_end)
    if period:
        entry["period"] = period
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_encounter_status_history(sh: "EncounterStatusHistory") -> dict:
    return {k: v for k, v in {
        "status": sh.status,
        "period": _period(sh.period_start, sh.period_end),
    }.items() if v}


def fhir_encounter_class(c: "EncounterClass") -> dict | None:
    return _cc(c.coding_system, c.coding_code, c.coding_display, c.text)


def fhir_encounter_class_history(ch: "EncounterClassHistory") -> dict:
    entry: dict = {}
    cls = {k: v for k, v in {
        "system": ch.class_system, "version": ch.class_version,
        "code": ch.class_code, "display": ch.class_display,
    }.items() if v}
    if cls:
        entry["class"] = cls
    period = _period(ch.period_start, ch.period_end)
    if period:
        entry["period"] = period
    return entry


def fhir_encounter_business_status(bs: "EncounterBusinessStatus") -> dict:
    entry: dict = {}
    code_cc = _cc(bs.code_system, bs.code_code, bs.code_display, bs.code_text)
    if code_cc:
        entry["code"] = code_cc
    type_coding = {k: v for k, v in {
        "system": bs.type_system, "code": bs.type_code, "display": bs.type_display,
    }.items() if v}
    if type_coding:
        entry["type"] = type_coding
    if bs.effective_date:
        entry["effectiveDate"] = bs.effective_date.isoformat()
    return entry


def fhir_encounter_type(t: "EncounterType") -> dict | None:
    return _cc(t.coding_system, t.coding_code, t.coding_display, t.text)


def fhir_encounter_service_type(st: "EncounterServiceType") -> dict:
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


def fhir_encounter_episode_of_care(e: "EncounterEpisodeOfCare") -> dict:
    entry: dict = {}
    if e.reference_type and e.reference_id:
        entry["reference"] = f"{e.reference_type.value}/{e.reference_id}"
    if e.reference_display:
        entry["display"] = e.reference_display
    return entry


def fhir_encounter_based_on(b: "EncounterBasedOn") -> dict:
    entry: dict = {}
    if b.reference_type and b.reference_id:
        entry["reference"] = f"{b.reference_type.value}/{b.reference_id}"
    if b.reference_display:
        entry["display"] = b.reference_display
    return entry


def fhir_encounter_care_team(ct: "EncounterCareTeam") -> dict:
    entry: dict = {}
    if ct.reference_type and ct.reference_id:
        entry["reference"] = f"{ct.reference_type.value}/{ct.reference_id}"
    if ct.reference_display:
        entry["display"] = ct.reference_display
    return entry


def fhir_encounter_participant(p: "EncounterParticipant") -> dict:
    entry: dict = {}
    if p.types:
        type_cc_list = [cc for pt in p.types if (cc := _cc(pt.coding_system, pt.coding_code, pt.coding_display, pt.text))]
        if type_cc_list:
            entry["type"] = type_cc_list
    if p.reference_type and p.reference_id:
        actor: dict = {"reference": f"{p.reference_type.value}/{p.reference_id}"}
        if p.reference_display:
            actor["display"] = p.reference_display
        entry["actor"] = actor
    period = _period(p.period_start, p.period_end)
    if period:
        entry["period"] = period
    return entry


def fhir_encounter_appointment_ref(a: "EncounterAppointmentRef") -> dict:
    entry: dict = {}
    if a.reference_type and a.reference_id:
        entry["reference"] = f"{a.reference_type.value}/{a.reference_id}"
    if a.reference_display:
        entry["display"] = a.reference_display
    return entry


def fhir_encounter_virtual_service(vs: "EncounterVirtualService") -> dict:
    entry: dict = {}
    channel = {k: v for k, v in {
        "system": vs.channel_type_system,
        "code": vs.channel_type_code,
        "display": vs.channel_type_display,
    }.items() if v}
    if channel:
        entry["channelType"] = channel
    if vs.address_url:
        entry["addressUrl"] = vs.address_url
    if vs.additional_info:
        entry["additionalInfo"] = [u.strip() for u in vs.additional_info.split(",") if u.strip()]
    if vs.max_participants is not None:
        entry["maxParticipants"] = vs.max_participants
    if vs.session_key:
        entry["sessionKey"] = vs.session_key
    return entry


def fhir_encounter_reason(r: "EncounterReason") -> dict:
    entry: dict = {}
    if r.uses:
        use_list = [cc for ru in r.uses if (cc := _cc(ru.coding_system, ru.coding_code, ru.coding_display, ru.text))]
        if use_list:
            entry["use"] = use_list
    if r.values:
        val_list = []
        for rv in r.values:
            val_entry: dict = {}
            concept = _cc(rv.coding_system, rv.coding_code, rv.coding_display, rv.text)
            if concept:
                val_entry["concept"] = concept
            if rv.reference_type and rv.reference_id:
                ref: dict = {"reference": f"{rv.reference_type.value}/{rv.reference_id}"}
                if rv.reference_display:
                    ref["display"] = rv.reference_display
                val_entry["reference"] = ref
            if val_entry:
                val_list.append(val_entry)
        if val_list:
            entry["value"] = val_list
    return entry


def fhir_encounter_diagnosis(d: "EncounterDiagnosis") -> dict:
    entry: dict = {}
    if d.conditions:
        cond_list = []
        for dc in d.conditions:
            cond_entry: dict = {}
            concept = _cc(dc.coding_system, dc.coding_code, dc.coding_display, dc.text)
            if concept:
                cond_entry["concept"] = concept
            if dc.reference_type and dc.reference_id:
                ref: dict = {"reference": f"{dc.reference_type.value}/{dc.reference_id}"}
                if dc.reference_display:
                    ref["display"] = dc.reference_display
                cond_entry["reference"] = ref
            if cond_entry:
                cond_list.append(cond_entry)
        if cond_list:
            entry["condition"] = cond_list
    if d.uses:
        use_list = [cc for du in d.uses if (cc := _cc(du.coding_system, du.coding_code, du.coding_display, du.text))]
        if use_list:
            entry["use"] = use_list
    return entry


def fhir_encounter_account(a: "EncounterAccount") -> dict:
    entry: dict = {}
    if a.reference_type and a.reference_id:
        entry["reference"] = f"{a.reference_type.value}/{a.reference_id}"
    if a.reference_display:
        entry["display"] = a.reference_display
    return entry


def fhir_encounter_admission(encounter: "EncounterModel") -> dict:
    admission: dict = {}

    if encounter.admission_pre_admission_identifier_value:
        pre_id: dict = {"value": encounter.admission_pre_admission_identifier_value}
        if encounter.admission_pre_admission_identifier_system:
            pre_id["system"] = encounter.admission_pre_admission_identifier_system
        admission["preAdmissionIdentifier"] = pre_id

    if encounter.admission_origin_id:
        ref_str = (
            f"{encounter.admission_origin_type}/{encounter.admission_origin_id}"
            if encounter.admission_origin_type
            else f"Location/{encounter.admission_origin_id}"
        )
        orig: dict = {"reference": ref_str}
        if encounter.admission_origin_display:
            orig["display"] = encounter.admission_origin_display
        admission["origin"] = orig

    for prefix, fhir_key in [
        ("admission_admit_source", "admitSource"),
        ("admission_re_admission", "reAdmission"),
        ("admission_discharge_disposition", "dischargeDisposition"),
    ]:
        cc = _cc(
            getattr(encounter, f"{prefix}_system", None),
            getattr(encounter, f"{prefix}_code", None),
            getattr(encounter, f"{prefix}_display", None),
            getattr(encounter, f"{prefix}_text", None),
        )
        if cc:
            admission[fhir_key] = cc

    if encounter.admission_destination_id:
        ref_str = (
            f"{encounter.admission_destination_type}/{encounter.admission_destination_id}"
            if encounter.admission_destination_type
            else f"Location/{encounter.admission_destination_id}"
        )
        dest: dict = {"reference": ref_str}
        if encounter.admission_destination_display:
            dest["display"] = encounter.admission_destination_display
        admission["destination"] = dest

    return admission


def fhir_encounter_diet_preference(dp: "EncounterDietPreference") -> dict | None:
    return _cc(dp.coding_system, dp.coding_code, dp.coding_display, dp.text)


def fhir_encounter_special_arrangement(sa: "EncounterSpecialArrangement") -> dict | None:
    return _cc(sa.coding_system, sa.coding_code, sa.coding_display, sa.text)


def fhir_encounter_special_courtesy(sc: "EncounterSpecialCourtesy") -> dict | None:
    return _cc(sc.coding_system, sc.coding_code, sc.coding_display, sc.text)


def fhir_encounter_location(loc: "EncounterLocation") -> dict:
    entry: dict = {}
    if loc.reference_type and loc.reference_id:
        lref: dict = {"reference": f"{loc.reference_type.value}/{loc.reference_id}"}
        if loc.reference_display:
            lref["display"] = loc.reference_display
        entry["location"] = lref
    if loc.status:
        entry["status"] = loc.status.value if hasattr(loc.status, "value") else loc.status
    form_cc = _cc(loc.form_system, loc.form_code, loc.form_display, loc.form_text)
    if form_cc:
        entry["form"] = form_cc
    period = _period(loc.period_start, loc.period_end)
    if period:
        entry["period"] = period
    return entry


def to_fhir_encounter(encounter: "EncounterModel") -> dict:
    result: dict = {
        "resourceType": "Encounter",
        "id": str(encounter.encounter_id),
        "status": encounter.status.value if encounter.status else None,
    }

    if encounter.identifiers:
        result["identifier"] = [fhir_encounter_identifier(i) for i in encounter.identifiers]

    if encounter.status_history:
        result["statusHistory"] = [fhir_encounter_status_history(sh) for sh in encounter.status_history]

    if encounter.classes:
        class_list = [cc for c in encounter.classes if (cc := fhir_encounter_class(c))]
        if class_list:
            result["class"] = class_list

    if encounter.class_history:
        ch_list = [e for ch in encounter.class_history if (e := fhir_encounter_class_history(ch))]
        if ch_list:
            result["classHistory"] = ch_list

    if encounter.business_statuses:
        bs_list = [e for bs in encounter.business_statuses if (e := fhir_encounter_business_status(bs))]
        if bs_list:
            result["businessStatus"] = bs_list

    if encounter.types:
        type_list = [cc for t in encounter.types if (cc := fhir_encounter_type(t))]
        if type_list:
            result["type"] = type_list

    if encounter.service_types:
        st_list = [e for st in encounter.service_types if (e := fhir_encounter_service_type(st))]
        if st_list:
            result["serviceType"] = st_list

    priority_cc = _cc(encounter.priority_system, encounter.priority_code,
                      encounter.priority_display, encounter.priority_text)
    if priority_cc:
        result["priority"] = priority_cc

    if encounter.subject_type and encounter.subject_id:
        subj: dict = {"reference": f"{encounter.subject_type.value}/{encounter.subject_id}"}
        if encounter.subject_display:
            subj["display"] = encounter.subject_display
        result["subject"] = subj

    subject_status_cc = _cc(encounter.subject_status_system, encounter.subject_status_code,
                            encounter.subject_status_display, encounter.subject_status_text)
    if subject_status_cc:
        result["subjectStatus"] = subject_status_cc

    if encounter.episode_of_cares:
        eoc_list = [e for e in [fhir_encounter_episode_of_care(ep) for ep in encounter.episode_of_cares] if e]
        if eoc_list:
            result["episodeOfCare"] = eoc_list

    if encounter.based_ons:
        bo_list = [e for e in [fhir_encounter_based_on(b) for b in encounter.based_ons] if e]
        if bo_list:
            result["basedOn"] = bo_list

    if encounter.care_teams:
        ct_list = [e for e in [fhir_encounter_care_team(ct) for ct in encounter.care_teams] if e]
        if ct_list:
            result["careTeam"] = ct_list

    if encounter.participants:
        p_list = [e for p in encounter.participants if (e := fhir_encounter_participant(p))]
        if p_list:
            result["participant"] = p_list

    if encounter.appointment_refs:
        appt_list = [e for e in [fhir_encounter_appointment_ref(a) for a in encounter.appointment_refs] if e]
        if appt_list:
            result["appointment"] = appt_list

    if encounter.virtual_services:
        vs_list = [e for vs in encounter.virtual_services if (e := fhir_encounter_virtual_service(vs))]
        if vs_list:
            result["virtualService"] = vs_list

    period = _period(encounter.actual_period_start, encounter.actual_period_end)
    if period:
        result["actualPeriod"] = period

    if encounter.planned_start_date:
        result["plannedStartDate"] = encounter.planned_start_date.isoformat()
    if encounter.planned_end_date:
        result["plannedEndDate"] = encounter.planned_end_date.isoformat()

    if encounter.length_value is not None or encounter.length_code:
        result["length"] = {k: v for k, v in {
            "value": encounter.length_value,
            "comparator": encounter.length_comparator,
            "unit": encounter.length_unit,
            "system": encounter.length_system,
            "code": encounter.length_code,
        }.items() if v is not None}

    if encounter.reasons:
        reason_list = [e for r in encounter.reasons if (e := fhir_encounter_reason(r))]
        if reason_list:
            result["reason"] = reason_list

    if encounter.diagnoses:
        diag_list = [e for d in encounter.diagnoses if (e := fhir_encounter_diagnosis(d))]
        if diag_list:
            result["diagnosis"] = diag_list

    if encounter.accounts:
        acct_list = [e for e in [fhir_encounter_account(a) for a in encounter.accounts] if e]
        if acct_list:
            result["account"] = acct_list

    admission = fhir_encounter_admission(encounter)
    if admission:
        result["admission"] = admission

    if encounter.diet_preferences:
        dp_list = [cc for dp in encounter.diet_preferences if (cc := fhir_encounter_diet_preference(dp))]
        if dp_list:
            result["dietPreference"] = dp_list

    if encounter.special_arrangements:
        sa_list = [cc for sa in encounter.special_arrangements if (cc := fhir_encounter_special_arrangement(sa))]
        if sa_list:
            result["specialArrangement"] = sa_list

    if encounter.special_courtesies:
        sc_list = [cc for sc in encounter.special_courtesies if (cc := fhir_encounter_special_courtesy(sc))]
        if sc_list:
            result["specialCourtesy"] = sc_list

    if encounter.locations:
        loc_list = [e for loc in encounter.locations if (e := fhir_encounter_location(loc))]
        if loc_list:
            result["location"] = loc_list

    if encounter.service_provider_type and encounter.service_provider_id:
        sp: dict = {"reference": f"{encounter.service_provider_type.value}/{encounter.service_provider_id}"}
        if encounter.service_provider_display:
            sp["display"] = encounter.service_provider_display
        result["serviceProvider"] = sp

    if encounter.part_of_id:
        result["partOf"] = {"reference": f"Encounter/{encounter.part_of_id}"}

    return {k: v for k, v in result.items() if v is not None}
