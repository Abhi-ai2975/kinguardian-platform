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


def plain_encounter_identifier(i: "EncounterIdentifier") -> dict:
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


def plain_encounter_status_history(sh: "EncounterStatusHistory") -> dict:
    return {
        "id": sh.id,
        "status": sh.status,
        "period_start": sh.period_start.isoformat() if sh.period_start else None,
        "period_end": sh.period_end.isoformat() if sh.period_end else None,
    }


def plain_encounter_class(c: "EncounterClass") -> dict:
    return {
        "id": c.id,
        "coding_system": c.coding_system,
        "coding_code": c.coding_code,
        "coding_display": c.coding_display,
        "text": c.text,
    }


def plain_encounter_class_history(ch: "EncounterClassHistory") -> dict:
    return {
        "id": ch.id,
        "class_system": ch.class_system,
        "class_version": ch.class_version,
        "class_code": ch.class_code,
        "class_display": ch.class_display,
        "period_start": ch.period_start.isoformat() if ch.period_start else None,
        "period_end": ch.period_end.isoformat() if ch.period_end else None,
    }


def plain_encounter_business_status(bs: "EncounterBusinessStatus") -> dict:
    return {
        "id": bs.id,
        "code_system": bs.code_system,
        "code_code": bs.code_code,
        "code_display": bs.code_display,
        "code_text": bs.code_text,
        "type_system": bs.type_system,
        "type_code": bs.type_code,
        "type_display": bs.type_display,
        "effective_date": bs.effective_date.isoformat() if bs.effective_date else None,
    }


def plain_encounter_type(t: "EncounterType") -> dict:
    return {
        "id": t.id,
        "coding_system": t.coding_system,
        "coding_code": t.coding_code,
        "coding_display": t.coding_display,
        "text": t.text,
    }


def plain_encounter_service_type(st: "EncounterServiceType") -> dict:
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


def plain_encounter_episode_of_care(e: "EncounterEpisodeOfCare") -> dict:
    return {
        "id": e.id,
        "reference_type": e.reference_type.value if e.reference_type else None,
        "reference_id": e.reference_id,
        "reference_display": e.reference_display,
    }


def plain_encounter_based_on(b: "EncounterBasedOn") -> dict:
    return {
        "id": b.id,
        "reference_type": b.reference_type.value if b.reference_type else None,
        "reference_id": b.reference_id,
        "reference_display": b.reference_display,
    }


def plain_encounter_care_team(ct: "EncounterCareTeam") -> dict:
    return {
        "id": ct.id,
        "reference_type": ct.reference_type.value if ct.reference_type else None,
        "reference_id": ct.reference_id,
        "reference_display": ct.reference_display,
    }


def plain_encounter_participant(p: "EncounterParticipant") -> dict:
    entry: dict = {
        "id": p.id,
        "reference_type": p.reference_type.value if p.reference_type else None,
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
        "period_start": p.period_start.isoformat() if p.period_start else None,
        "period_end": p.period_end.isoformat() if p.period_end else None,
    }
    if p.types:
        entry["type"] = [
            {"coding_system": pt.coding_system, "coding_code": pt.coding_code,
             "coding_display": pt.coding_display, "text": pt.text}
            for pt in p.types
        ]
    return entry


def plain_encounter_appointment_ref(a: "EncounterAppointmentRef") -> dict:
    return {
        "id": a.id,
        "reference_type": a.reference_type.value if a.reference_type else None,
        "reference_id": a.reference_id,
        "reference_display": a.reference_display,
    }


def plain_encounter_virtual_service(vs: "EncounterVirtualService") -> dict:
    return {
        "id": vs.id,
        "channel_type_system": vs.channel_type_system,
        "channel_type_code": vs.channel_type_code,
        "channel_type_display": vs.channel_type_display,
        "address_url": vs.address_url,
        "additional_info": vs.additional_info,
        "max_participants": vs.max_participants,
        "session_key": vs.session_key,
    }


def plain_encounter_reason(r: "EncounterReason") -> dict:
    entry: dict = {"id": r.id}
    if r.uses:
        entry["use"] = [
            {"coding_system": ru.coding_system, "coding_code": ru.coding_code,
             "coding_display": ru.coding_display, "text": ru.text}
            for ru in r.uses
        ]
    if r.values:
        entry["value"] = [
            {
                "coding_system": rv.coding_system, "coding_code": rv.coding_code,
                "coding_display": rv.coding_display, "text": rv.text,
                "reference_type": rv.reference_type.value if rv.reference_type else None,
                "reference_id": rv.reference_id,
                "reference_display": rv.reference_display,
            }
            for rv in r.values
        ]
    return entry


def plain_encounter_diagnosis(d: "EncounterDiagnosis") -> dict:
    entry: dict = {"id": d.id}
    if d.conditions:
        entry["condition"] = [
            {
                "coding_system": dc.coding_system, "coding_code": dc.coding_code,
                "coding_display": dc.coding_display, "text": dc.text,
                "reference_type": dc.reference_type.value if dc.reference_type else None,
                "reference_id": dc.reference_id,
                "reference_display": dc.reference_display,
            }
            for dc in d.conditions
        ]
    if d.uses:
        entry["use"] = [
            {"coding_system": du.coding_system, "coding_code": du.coding_code,
             "coding_display": du.coding_display, "text": du.text}
            for du in d.uses
        ]
    return entry


def plain_encounter_account(a: "EncounterAccount") -> dict:
    return {
        "id": a.id,
        "reference_type": a.reference_type.value if a.reference_type else None,
        "reference_id": a.reference_id,
        "reference_display": a.reference_display,
    }


def plain_encounter_diet_preference(dp: "EncounterDietPreference") -> dict:
    return {
        "id": dp.id,
        "coding_system": dp.coding_system,
        "coding_code": dp.coding_code,
        "coding_display": dp.coding_display,
        "text": dp.text,
    }


def plain_encounter_special_arrangement(sa: "EncounterSpecialArrangement") -> dict:
    return {
        "id": sa.id,
        "coding_system": sa.coding_system,
        "coding_code": sa.coding_code,
        "coding_display": sa.coding_display,
        "text": sa.text,
    }


def plain_encounter_special_courtesy(sc: "EncounterSpecialCourtesy") -> dict:
    return {
        "id": sc.id,
        "coding_system": sc.coding_system,
        "coding_code": sc.coding_code,
        "coding_display": sc.coding_display,
        "text": sc.text,
    }


def plain_encounter_location(loc: "EncounterLocation") -> dict:
    return {
        "id": loc.id,
        "reference_type": loc.reference_type.value if loc.reference_type else None,
        "reference_id": loc.reference_id,
        "reference_display": loc.reference_display,
        "status": loc.status.value if loc.status else None,
        "form_system": loc.form_system,
        "form_code": loc.form_code,
        "form_display": loc.form_display,
        "form_text": loc.form_text,
        "period_start": loc.period_start.isoformat() if loc.period_start else None,
        "period_end": loc.period_end.isoformat() if loc.period_end else None,
    }


def plain_encounter_admission(encounter: "EncounterModel") -> dict:
    return {
        "pre_admission_identifier_system": encounter.admission_pre_admission_identifier_system,
        "pre_admission_identifier_value": encounter.admission_pre_admission_identifier_value,
        "origin_type": encounter.admission_origin_type,
        "origin_id": encounter.admission_origin_id,
        "origin_display": encounter.admission_origin_display,
        "admit_source_system": encounter.admission_admit_source_system,
        "admit_source_code": encounter.admission_admit_source_code,
        "admit_source_display": encounter.admission_admit_source_display,
        "admit_source_text": encounter.admission_admit_source_text,
        "re_admission_system": encounter.admission_re_admission_system,
        "re_admission_code": encounter.admission_re_admission_code,
        "re_admission_display": encounter.admission_re_admission_display,
        "re_admission_text": encounter.admission_re_admission_text,
        "destination_type": encounter.admission_destination_type,
        "destination_id": encounter.admission_destination_id,
        "destination_display": encounter.admission_destination_display,
        "discharge_disposition_system": encounter.admission_discharge_disposition_system,
        "discharge_disposition_code": encounter.admission_discharge_disposition_code,
        "discharge_disposition_display": encounter.admission_discharge_disposition_display,
        "discharge_disposition_text": encounter.admission_discharge_disposition_text,
    }


def to_plain_encounter(encounter: "EncounterModel") -> dict:
    result: dict = {
        "id": encounter.encounter_id,
        "user_id": encounter.user_id,
        "org_id": encounter.org_id,
        "status": encounter.status.value if encounter.status else None,
        "priority_system": encounter.priority_system,
        "priority_code": encounter.priority_code,
        "priority_display": encounter.priority_display,
        "priority_text": encounter.priority_text,
        "subject_type": encounter.subject_type.value if encounter.subject_type else None,
        "subject_id": encounter.subject_id,
        "subject_display": encounter.subject_display,
        "subject_status_system": encounter.subject_status_system,
        "subject_status_code": encounter.subject_status_code,
        "subject_status_display": encounter.subject_status_display,
        "subject_status_text": encounter.subject_status_text,
        "actual_period_start": encounter.actual_period_start.isoformat() if encounter.actual_period_start else None,
        "actual_period_end": encounter.actual_period_end.isoformat() if encounter.actual_period_end else None,
        "planned_start_date": encounter.planned_start_date.isoformat() if encounter.planned_start_date else None,
        "planned_end_date": encounter.planned_end_date.isoformat() if encounter.planned_end_date else None,
        "service_provider_type": encounter.service_provider_type.value if encounter.service_provider_type else None,
        "service_provider_id": encounter.service_provider_id,
        "service_provider_display": encounter.service_provider_display,
        "part_of_id": encounter.part_of_id,
        "created_at": encounter.created_at.isoformat() if encounter.created_at else None,
        "updated_at": encounter.updated_at.isoformat() if encounter.updated_at else None,
        "created_by": encounter.created_by,
        "updated_by": encounter.updated_by,
    }

    if encounter.length_value is not None or encounter.length_code:
        result["length"] = {
            "value": encounter.length_value,
            "comparator": encounter.length_comparator,
            "unit": encounter.length_unit,
            "system": encounter.length_system,
            "code": encounter.length_code,
        }

    admission_fields = [
        "admission_pre_admission_identifier_system", "admission_pre_admission_identifier_value",
        "admission_origin_type", "admission_origin_id", "admission_origin_display",
        "admission_admit_source_system", "admission_admit_source_code",
        "admission_admit_source_display", "admission_admit_source_text",
        "admission_re_admission_system", "admission_re_admission_code",
        "admission_re_admission_display", "admission_re_admission_text",
        "admission_destination_type", "admission_destination_id", "admission_destination_display",
        "admission_discharge_disposition_system", "admission_discharge_disposition_code",
        "admission_discharge_disposition_display", "admission_discharge_disposition_text",
    ]
    if any(getattr(encounter, f, None) for f in admission_fields):
        result["admission"] = plain_encounter_admission(encounter)

    if encounter.identifiers:
        result["identifier"] = [plain_encounter_identifier(i) for i in encounter.identifiers]
    if encounter.status_history:
        result["status_history"] = [plain_encounter_status_history(sh) for sh in encounter.status_history]
    if encounter.class_history:
        result["class_history"] = [plain_encounter_class_history(ch) for ch in encounter.class_history]
    if encounter.classes:
        result["class"] = [plain_encounter_class(c) for c in encounter.classes]
    if encounter.business_statuses:
        result["business_status"] = [plain_encounter_business_status(bs) for bs in encounter.business_statuses]
    if encounter.service_types:
        result["service_type"] = [plain_encounter_service_type(st) for st in encounter.service_types]
    if encounter.types:
        result["type"] = [plain_encounter_type(t) for t in encounter.types]
    if encounter.episode_of_cares:
        result["episode_of_care"] = [plain_encounter_episode_of_care(e) for e in encounter.episode_of_cares]
    if encounter.based_ons:
        result["based_on"] = [plain_encounter_based_on(b) for b in encounter.based_ons]
    if encounter.care_teams:
        result["care_team"] = [plain_encounter_care_team(ct) for ct in encounter.care_teams]
    if encounter.participants:
        result["participant"] = [plain_encounter_participant(p) for p in encounter.participants]
    if encounter.appointment_refs:
        result["appointment"] = [plain_encounter_appointment_ref(a) for a in encounter.appointment_refs]
    if encounter.virtual_services:
        result["virtual_service"] = [plain_encounter_virtual_service(vs) for vs in encounter.virtual_services]
    if encounter.reasons:
        result["reason"] = [plain_encounter_reason(r) for r in encounter.reasons]
    if encounter.diagnoses:
        result["diagnosis"] = [plain_encounter_diagnosis(d) for d in encounter.diagnoses]
    if encounter.accounts:
        result["account"] = [plain_encounter_account(a) for a in encounter.accounts]
    if encounter.diet_preferences:
        result["diet_preference"] = [plain_encounter_diet_preference(dp) for dp in encounter.diet_preferences]
    if encounter.special_arrangements:
        result["special_arrangement"] = [plain_encounter_special_arrangement(sa) for sa in encounter.special_arrangements]
    if encounter.special_courtesies:
        result["special_courtesy"] = [plain_encounter_special_courtesy(sc) for sc in encounter.special_courtesies]
    if encounter.locations:
        result["location"] = [plain_encounter_location(loc) for loc in encounter.locations]

    return {k: v for k, v in result.items() if v is not None}
