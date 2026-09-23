from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
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


def _cc(system, code, display, text=None) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def fhir_dr_identifier(i: "DeviceRequestIdentifier") -> dict:
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


def fhir_dr_based_on(bo: "DeviceRequestBasedOn") -> dict:
    entry: dict = {}
    if bo.reference_type and bo.reference_id:
        entry["reference"] = f"{bo.reference_type}/{bo.reference_id}"
    if bo.reference_display:
        entry["display"] = bo.reference_display
    return entry


def fhir_dr_prior_request(pr: "DeviceRequestPriorRequest") -> dict:
    entry: dict = {}
    if pr.reference_type and pr.reference_id:
        entry["reference"] = f"{pr.reference_type}/{pr.reference_id}"
    if pr.reference_display:
        entry["display"] = pr.reference_display
    return entry


def fhir_dr_parameter(p: "DeviceRequestParameter") -> dict:
    entry: dict = {}
    code_cc = _cc(p.code_system, p.code_code, p.code_display, p.code_text)
    if code_cc:
        entry["code"] = code_cc

    # value[x] — first non-null wins
    if p.value_boolean is not None:
        entry["valueBoolean"] = p.value_boolean
    elif p.value_quantity_value is not None:
        qty: dict = {"value": p.value_quantity_value}
        if p.value_quantity_unit:
            qty["unit"] = p.value_quantity_unit
        if p.value_quantity_system:
            qty["system"] = p.value_quantity_system
        if p.value_quantity_code:
            qty["code"] = p.value_quantity_code
        entry["valueQuantity"] = qty
    elif p.value_range_low_value is not None or p.value_range_high_value is not None:
        rng: dict = {}
        if p.value_range_low_value is not None:
            rng["low"] = {"value": p.value_range_low_value}
            if p.value_range_low_unit:
                rng["low"]["unit"] = p.value_range_low_unit
        if p.value_range_high_value is not None:
            rng["high"] = {"value": p.value_range_high_value}
            if p.value_range_high_unit:
                rng["high"]["unit"] = p.value_range_high_unit
        entry["valueRange"] = rng
    else:
        val_cc = _cc(p.value_concept_system, p.value_concept_code, p.value_concept_display, p.value_concept_text)
        if val_cc:
            entry["valueCodeableConcept"] = val_cc

    return entry


def fhir_dr_reason_code(rc: "DeviceRequestReasonCode") -> dict | None:
    return _cc(rc.coding_system, rc.coding_code, rc.coding_display, rc.text)


def fhir_dr_reason_reference(rr: "DeviceRequestReasonReference") -> dict:
    entry: dict = {}
    if rr.reference_type and rr.reference_id:
        entry["reference"] = f"{rr.reference_type.value}/{rr.reference_id}"
    if rr.reference_display:
        entry["display"] = rr.reference_display
    return entry


def fhir_dr_insurance(ins: "DeviceRequestInsurance") -> dict:
    entry: dict = {}
    if ins.reference_type and ins.reference_id:
        entry["reference"] = f"{ins.reference_type.value}/{ins.reference_id}"
    if ins.reference_display:
        entry["display"] = ins.reference_display
    return entry


def fhir_dr_supporting_info(si: "DeviceRequestSupportingInfo") -> dict:
    entry: dict = {}
    if si.reference_type and si.reference_id:
        entry["reference"] = f"{si.reference_type}/{si.reference_id}"
    if si.reference_display:
        entry["display"] = si.reference_display
    return entry


def fhir_dr_note(n: "DeviceRequestNote") -> dict:
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


def fhir_dr_relevant_history(rh: "DeviceRequestRelevantHistory") -> dict:
    entry: dict = {}
    if rh.reference_type and rh.reference_id:
        entry["reference"] = f"{rh.reference_type.value}/{rh.reference_id}"
    if rh.reference_display:
        entry["display"] = rh.reference_display
    return entry


def to_fhir_device_request(dr: "DeviceRequestModel") -> dict:
    result: dict = {
        "resourceType": "DeviceRequest",
        "id": str(dr.device_request_id),
        "intent": dr.intent.value if dr.intent else None,
        "status": dr.status.value if dr.status else None,
        "priority": dr.priority.value if dr.priority else None,
    }

    if dr.identifiers:
        result["identifier"] = [fhir_dr_identifier(i) for i in dr.identifiers]

    if dr.instantiates_canonical:
        result["instantiatesCanonical"] = [u.strip() for u in dr.instantiates_canonical.split(",") if u.strip()]
    if dr.instantiates_uri:
        result["instantiatesUri"] = [u.strip() for u in dr.instantiates_uri.split(",") if u.strip()]

    if dr.based_on:
        bo_list = [e for e in [fhir_dr_based_on(b) for b in dr.based_on] if e]
        if bo_list:
            result["basedOn"] = bo_list

    if dr.prior_requests:
        pr_list = [e for e in [fhir_dr_prior_request(p) for p in dr.prior_requests] if e]
        if pr_list:
            result["priorRequest"] = pr_list

    # code[x]
    if dr.code_reference_type and dr.code_reference_id:
        code_ref: dict = {"reference": f"{dr.code_reference_type.value}/{dr.code_reference_id}"}
        if dr.code_reference_display:
            code_ref["display"] = dr.code_reference_display
        result["codeReference"] = code_ref
    else:
        code_cc = _cc(dr.code_concept_system, dr.code_concept_code, dr.code_concept_display, dr.code_concept_text)
        if code_cc:
            result["codeCodeableConcept"] = code_cc

    # parameter[]
    if dr.parameters:
        result["parameter"] = [fhir_dr_parameter(p) for p in dr.parameters]

    # subject
    if dr.subject_type and dr.subject_id:
        subj: dict = {"reference": f"{dr.subject_type.value}/{dr.subject_id}"}
        if dr.subject_display:
            subj["display"] = dr.subject_display
        result["subject"] = subj

    # encounter
    if dr.encounter and dr.encounter.encounter_id:
        enc_ref: dict = {"reference": f"Encounter/{dr.encounter.encounter_id}"}
        if dr.encounter_display:
            enc_ref["display"] = dr.encounter_display
        result["encounter"] = enc_ref

    # occurrence[x]
    if dr.occurrence_datetime:
        result["occurrenceDateTime"] = dr.occurrence_datetime.isoformat()
    elif dr.occurrence_period_start or dr.occurrence_period_end:
        result["occurrencePeriod"] = {k: v for k, v in {
            "start": dr.occurrence_period_start.isoformat() if dr.occurrence_period_start else None,
            "end": dr.occurrence_period_end.isoformat() if dr.occurrence_period_end else None,
        }.items() if v}
    elif any([
        dr.occurrence_timing_frequency, dr.occurrence_timing_period,
        dr.occurrence_timing_code_code, dr.occurrence_timing_bounds_start,
    ]):
        repeat: dict = {}
        if dr.occurrence_timing_bounds_start or dr.occurrence_timing_bounds_end:
            repeat["boundsPeriod"] = {k: v for k, v in {
                "start": dr.occurrence_timing_bounds_start.isoformat() if dr.occurrence_timing_bounds_start else None,
                "end": dr.occurrence_timing_bounds_end.isoformat() if dr.occurrence_timing_bounds_end else None,
            }.items() if v}
        for attr, key in [
            ("occurrence_timing_count", "count"),
            ("occurrence_timing_count_max", "countMax"),
            ("occurrence_timing_duration", "duration"),
            ("occurrence_timing_duration_max", "durationMax"),
            ("occurrence_timing_duration_unit", "durationUnit"),
            ("occurrence_timing_frequency", "frequency"),
            ("occurrence_timing_frequency_max", "frequencyMax"),
            ("occurrence_timing_period", "period"),
            ("occurrence_timing_period_max", "periodMax"),
            ("occurrence_timing_period_unit", "periodUnit"),
            ("occurrence_timing_offset", "offset"),
        ]:
            val = getattr(dr, attr)
            if val is not None:
                repeat[key] = val
        if dr.occurrence_timing_day_of_week:
            repeat["dayOfWeek"] = [d.strip() for d in dr.occurrence_timing_day_of_week.split(",") if d.strip()]
        if dr.occurrence_timing_time_of_day:
            repeat["timeOfDay"] = [t.strip() for t in dr.occurrence_timing_time_of_day.split(",") if t.strip()]
        if dr.occurrence_timing_when:
            repeat["when"] = [w.strip() for w in dr.occurrence_timing_when.split(",") if w.strip()]
        timing: dict = {}
        if repeat:
            timing["repeat"] = repeat
        code_cc = _cc(dr.occurrence_timing_code_system, dr.occurrence_timing_code_code, dr.occurrence_timing_code_display)
        if code_cc:
            timing["code"] = code_cc
        if timing:
            result["occurrenceTiming"] = timing

    if dr.authored_on:
        result["authoredOn"] = dr.authored_on.isoformat()

    if dr.requester_type and dr.requester_id:
        req: dict = {"reference": f"{dr.requester_type.value}/{dr.requester_id}"}
        if dr.requester_display:
            req["display"] = dr.requester_display
        result["requester"] = req

    performer_type_cc = _cc(
        dr.performer_type_system, dr.performer_type_code,
        dr.performer_type_display, dr.performer_type_text,
    )
    if performer_type_cc:
        result["performerType"] = performer_type_cc

    if dr.performer_reference_type and dr.performer_reference_id:
        perf_ref: dict = {"reference": f"{dr.performer_reference_type.value}/{dr.performer_reference_id}"}
        if dr.performer_reference_display:
            perf_ref["display"] = dr.performer_reference_display
        result["performer"] = perf_ref

    if dr.reason_codes:
        rc_list = [cc for rc in dr.reason_codes if (cc := fhir_dr_reason_code(rc))]
        if rc_list:
            result["reasonCode"] = rc_list

    if dr.reason_references:
        rr_list = [e for e in [fhir_dr_reason_reference(rr) for rr in dr.reason_references] if e]
        if rr_list:
            result["reasonReference"] = rr_list

    if dr.insurance:
        ins_list = [e for e in [fhir_dr_insurance(ins) for ins in dr.insurance] if e]
        if ins_list:
            result["insurance"] = ins_list

    if dr.supporting_info:
        si_list = [e for e in [fhir_dr_supporting_info(si) for si in dr.supporting_info] if e]
        if si_list:
            result["supportingInfo"] = si_list

    if dr.notes:
        result["note"] = [fhir_dr_note(n) for n in dr.notes]

    if dr.relevant_history:
        rh_list = [e for e in [fhir_dr_relevant_history(rh) for rh in dr.relevant_history] if e]
        if rh_list:
            result["relevantHistory"] = rh_list

    # groupIdentifier
    gi_fields = [dr.group_identifier_value, dr.group_identifier_system, dr.group_identifier_type_code]
    if any(gi_fields):
        gi: dict = {}
        if dr.group_identifier_use:
            gi["use"] = dr.group_identifier_use
        gi_type_cc = _cc(
            dr.group_identifier_type_system, dr.group_identifier_type_code,
            dr.group_identifier_type_display, dr.group_identifier_type_text,
        )
        if gi_type_cc:
            gi["type"] = gi_type_cc
        if dr.group_identifier_system:
            gi["system"] = dr.group_identifier_system
        if dr.group_identifier_value:
            gi["value"] = dr.group_identifier_value
        if dr.group_identifier_period_start or dr.group_identifier_period_end:
            gi["period"] = {k: v for k, v in {
                "start": dr.group_identifier_period_start.isoformat() if dr.group_identifier_period_start else None,
                "end": dr.group_identifier_period_end.isoformat() if dr.group_identifier_period_end else None,
            }.items() if v}
        if dr.group_identifier_assigner:
            gi["assigner"] = {"display": dr.group_identifier_assigner}
        result["groupIdentifier"] = gi

    return {k: v for k, v in result.items() if v is not None}
