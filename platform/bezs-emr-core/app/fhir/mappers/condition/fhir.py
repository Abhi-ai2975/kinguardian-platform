from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.condition.condition import (
        ConditionModel,
        ConditionIdentifier,
        ConditionCategory,
        ConditionBodySite,
        ConditionStage,
        ConditionEvidence,
        ConditionNote,
    )


def _cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def fhir_condition_identifier(i: "ConditionIdentifier") -> dict:
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


def fhir_condition_category(cat: "ConditionCategory") -> dict | None:
    return _cc(cat.coding_system, cat.coding_code, cat.coding_display, cat.text)


def fhir_condition_body_site(bs: "ConditionBodySite") -> dict | None:
    return _cc(bs.coding_system, bs.coding_code, bs.coding_display, bs.text)


def fhir_condition_stage(s: "ConditionStage") -> dict:
    entry: dict = {}
    summary_cc = _cc(s.summary_system, s.summary_code, s.summary_display, s.summary_text)
    if summary_cc:
        entry["summary"] = summary_cc
    type_cc = _cc(s.type_system, s.type_code, s.type_display, s.type_text)
    if type_cc:
        entry["type"] = type_cc
    if s.assessments:
        assessments = []
        for a in s.assessments:
            if a.reference_type and a.reference_id:
                ref: dict = {"reference": f"{a.reference_type.value}/{a.reference_id}"}
                if a.reference_display:
                    ref["display"] = a.reference_display
                assessments.append(ref)
        if assessments:
            entry["assessment"] = assessments
    return entry


def fhir_condition_evidence(e: "ConditionEvidence") -> dict:
    entry: dict = {}
    if e.codes:
        codes = [
            cc for ec in e.codes
            if (cc := _cc(ec.coding_system, ec.coding_code, ec.coding_display, ec.text))
        ]
        if codes:
            entry["code"] = codes
    if e.details:
        details = []
        for d in e.details:
            if d.reference_type and d.reference_id:
                ref: dict = {"reference": f"{d.reference_type}/{d.reference_id}"}
                if d.reference_display:
                    ref["display"] = d.reference_display
                details.append(ref)
        if details:
            entry["detail"] = details
    return entry


def fhir_condition_note(n: "ConditionNote") -> dict:
    entry: dict = {"text": n.text}
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id:
        ref: dict = {"reference": f"{n.author_reference_type.value}/{n.author_reference_id}"}
        if n.author_reference_display:
            ref["display"] = n.author_reference_display
        entry["authorReference"] = ref
    if n.time:
        entry["time"] = n.time.isoformat()
    return entry


def to_fhir_condition(condition: "ConditionModel") -> dict:
    result: dict = {
        "resourceType": "Condition",
        "id": str(condition.condition_id),
    }

    if condition.identifiers:
        result["identifier"] = [fhir_condition_identifier(i) for i in condition.identifiers]

    cs = _cc(
        condition.clinical_status_system, condition.clinical_status_code,
        condition.clinical_status_display, condition.clinical_status_text,
    )
    if cs:
        result["clinicalStatus"] = cs

    vs = _cc(
        condition.verification_status_system, condition.verification_status_code,
        condition.verification_status_display, condition.verification_status_text,
    )
    if vs:
        result["verificationStatus"] = vs

    if condition.categories:
        cats = [cc for cat in condition.categories if (cc := fhir_condition_category(cat))]
        if cats:
            result["category"] = cats

    sev = _cc(
        condition.severity_system, condition.severity_code,
        condition.severity_display, condition.severity_text,
    )
    if sev:
        result["severity"] = sev

    code_cc = _cc(condition.code_system, condition.code_code, condition.code_display, condition.code_text)
    if code_cc:
        result["code"] = code_cc

    if condition.body_sites:
        sites = [cc for bs in condition.body_sites if (cc := fhir_condition_body_site(bs))]
        if sites:
            result["bodySite"] = sites

    if condition.subject_type and condition.subject_id:
        subj: dict = {"reference": f"{condition.subject_type.value}/{condition.subject_id}"}
        if condition.subject_display:
            subj["display"] = condition.subject_display
        result["subject"] = subj

    if condition.encounter and condition.encounter.encounter_id:
        enc_ref: dict = {"reference": f"Encounter/{condition.encounter.encounter_id}"}
        if condition.encounter_display:
            enc_ref["display"] = condition.encounter_display
        result["encounter"] = enc_ref

    # onset[x] — emit whichever variant is populated
    if condition.onset_datetime:
        result["onsetDateTime"] = condition.onset_datetime.isoformat()
    elif condition.onset_age_value is not None:
        age: dict = {"value": condition.onset_age_value}
        if condition.onset_age_comparator:
            age["comparator"] = condition.onset_age_comparator
        if condition.onset_age_unit:
            age["unit"] = condition.onset_age_unit
        if condition.onset_age_system:
            age["system"] = condition.onset_age_system
        if condition.onset_age_code:
            age["code"] = condition.onset_age_code
        result["onsetAge"] = age
    elif condition.onset_period_start or condition.onset_period_end:
        result["onsetPeriod"] = {k: v for k, v in {
            "start": condition.onset_period_start.isoformat() if condition.onset_period_start else None,
            "end": condition.onset_period_end.isoformat() if condition.onset_period_end else None,
        }.items() if v}
    elif condition.onset_range_low_value is not None or condition.onset_range_high_value is not None:
        rng: dict = {}
        if condition.onset_range_low_value is not None:
            rng["low"] = {"value": condition.onset_range_low_value}
            if condition.onset_range_low_unit:
                rng["low"]["unit"] = condition.onset_range_low_unit
        if condition.onset_range_high_value is not None:
            rng["high"] = {"value": condition.onset_range_high_value}
            if condition.onset_range_high_unit:
                rng["high"]["unit"] = condition.onset_range_high_unit
        result["onsetRange"] = rng
    elif condition.onset_string:
        result["onsetString"] = condition.onset_string

    # abatement[x]
    if condition.abatement_datetime:
        result["abatementDateTime"] = condition.abatement_datetime.isoformat()
    elif condition.abatement_age_value is not None:
        age: dict = {"value": condition.abatement_age_value}
        if condition.abatement_age_comparator:
            age["comparator"] = condition.abatement_age_comparator
        if condition.abatement_age_unit:
            age["unit"] = condition.abatement_age_unit
        if condition.abatement_age_system:
            age["system"] = condition.abatement_age_system
        if condition.abatement_age_code:
            age["code"] = condition.abatement_age_code
        result["abatementAge"] = age
    elif condition.abatement_period_start or condition.abatement_period_end:
        result["abatementPeriod"] = {k: v for k, v in {
            "start": condition.abatement_period_start.isoformat() if condition.abatement_period_start else None,
            "end": condition.abatement_period_end.isoformat() if condition.abatement_period_end else None,
        }.items() if v}
    elif condition.abatement_range_low_value is not None or condition.abatement_range_high_value is not None:
        rng: dict = {}
        if condition.abatement_range_low_value is not None:
            rng["low"] = {"value": condition.abatement_range_low_value}
            if condition.abatement_range_low_unit:
                rng["low"]["unit"] = condition.abatement_range_low_unit
        if condition.abatement_range_high_value is not None:
            rng["high"] = {"value": condition.abatement_range_high_value}
            if condition.abatement_range_high_unit:
                rng["high"]["unit"] = condition.abatement_range_high_unit
        result["abatementRange"] = rng
    elif condition.abatement_string:
        result["abatementString"] = condition.abatement_string

    if condition.recorded_date:
        result["recordedDate"] = condition.recorded_date.isoformat()

    if condition.recorder_type and condition.recorder_id:
        rec: dict = {"reference": f"{condition.recorder_type.value}/{condition.recorder_id}"}
        if condition.recorder_display:
            rec["display"] = condition.recorder_display
        result["recorder"] = rec

    if condition.asserter_type and condition.asserter_id:
        asr: dict = {"reference": f"{condition.asserter_type.value}/{condition.asserter_id}"}
        if condition.asserter_display:
            asr["display"] = condition.asserter_display
        result["asserter"] = asr

    if condition.stages:
        stage_list = [e for s in condition.stages if (e := fhir_condition_stage(s))]
        if stage_list:
            result["stage"] = stage_list

    if condition.evidence:
        ev_list = [e for ev in condition.evidence if (e := fhir_condition_evidence(ev))]
        if ev_list:
            result["evidence"] = ev_list

    if condition.notes:
        result["note"] = [fhir_condition_note(n) for n in condition.notes]

    return {k: v for k, v in result.items() if v is not None}
