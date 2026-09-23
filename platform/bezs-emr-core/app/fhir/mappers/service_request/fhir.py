from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
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


def _cc(system, code, display, text=None) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def fhir_sr_identifier(i: "ServiceRequestIdentifier") -> dict:
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


def fhir_sr_category(cat: "ServiceRequestCategory") -> dict | None:
    return _cc(cat.coding_system, cat.coding_code, cat.coding_display, cat.text)


def fhir_sr_order_detail(od: "ServiceRequestOrderDetail") -> dict | None:
    return _cc(od.coding_system, od.coding_code, od.coding_display, od.text)


def fhir_sr_performer(p: "ServiceRequestPerformer") -> dict:
    entry: dict = {}
    if p.reference_type and p.reference_id:
        entry["reference"] = f"{p.reference_type.value}/{p.reference_id}"
    if p.reference_display:
        entry["display"] = p.reference_display
    return entry


def fhir_sr_location_code(lc: "ServiceRequestLocationCode") -> dict | None:
    return _cc(lc.coding_system, lc.coding_code, lc.coding_display, lc.text)


def fhir_sr_location_reference(lr: "ServiceRequestLocationReference") -> dict:
    entry: dict = {}
    if lr.reference_type and lr.reference_id:
        entry["reference"] = f"{lr.reference_type.value}/{lr.reference_id}"
    if lr.reference_display:
        entry["display"] = lr.reference_display
    return entry


def fhir_sr_reason_code(rc: "ServiceRequestReasonCode") -> dict | None:
    return _cc(rc.coding_system, rc.coding_code, rc.coding_display, rc.text)


def fhir_sr_reason_reference(rr: "ServiceRequestReasonReference") -> dict:
    entry: dict = {}
    if rr.reference_type and rr.reference_id:
        entry["reference"] = f"{rr.reference_type.value}/{rr.reference_id}"
    if rr.reference_display:
        entry["display"] = rr.reference_display
    return entry


def fhir_sr_insurance(ins: "ServiceRequestInsurance") -> dict:
    entry: dict = {}
    if ins.reference_type and ins.reference_id:
        entry["reference"] = f"{ins.reference_type.value}/{ins.reference_id}"
    if ins.reference_display:
        entry["display"] = ins.reference_display
    return entry


def fhir_sr_supporting_info(si: "ServiceRequestSupportingInfo") -> dict:
    entry: dict = {}
    if si.reference_type and si.reference_id:
        entry["reference"] = f"{si.reference_type}/{si.reference_id}"
    if si.reference_display:
        entry["display"] = si.reference_display
    return entry


def fhir_sr_specimen(sp: "ServiceRequestSpecimen") -> dict:
    entry: dict = {}
    if sp.reference_type and sp.reference_id:
        entry["reference"] = f"{sp.reference_type.value}/{sp.reference_id}"
    if sp.reference_display:
        entry["display"] = sp.reference_display
    return entry


def fhir_sr_body_site(bs: "ServiceRequestBodySite") -> dict | None:
    return _cc(bs.coding_system, bs.coding_code, bs.coding_display, bs.text)


def fhir_sr_note(n: "ServiceRequestNote") -> dict:
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


def fhir_sr_relevant_history(rh: "ServiceRequestRelevantHistory") -> dict:
    entry: dict = {}
    if rh.reference_type and rh.reference_id:
        entry["reference"] = f"{rh.reference_type.value}/{rh.reference_id}"
    if rh.reference_display:
        entry["display"] = rh.reference_display
    return entry


def fhir_sr_based_on(bo: "ServiceRequestBasedOn") -> dict:
    entry: dict = {}
    if bo.reference_type and bo.reference_id:
        entry["reference"] = f"{bo.reference_type.value}/{bo.reference_id}"
    if bo.reference_display:
        entry["display"] = bo.reference_display
    return entry


def fhir_sr_replaces(r: "ServiceRequestReplaces") -> dict:
    entry: dict = {}
    if r.reference_type and r.reference_id:
        entry["reference"] = f"{r.reference_type.value}/{r.reference_id}"
    if r.reference_display:
        entry["display"] = r.reference_display
    return entry


def to_fhir_service_request(sr: "ServiceRequestModel") -> dict:
    result: dict = {
        "resourceType": "ServiceRequest",
        "id": str(sr.service_request_id),
        "status": sr.status.value if sr.status else None,
        "intent": sr.intent.value if sr.intent else None,
    }

    if sr.based_on:
        bo_list = [e for e in [fhir_sr_based_on(b) for b in sr.based_on] if e]
        if bo_list:
            result["basedOn"] = bo_list

    if sr.replaces:
        rep_list = [e for e in [fhir_sr_replaces(r) for r in sr.replaces] if e]
        if rep_list:
            result["replaces"] = rep_list

    if sr.identifiers:
        result["identifier"] = [fhir_sr_identifier(i) for i in sr.identifiers]

    if sr.instantiates_canonical:
        result["instantiatesCanonical"] = [u.strip() for u in sr.instantiates_canonical.split(",") if u.strip()]
    if sr.instantiates_uri:
        result["instantiatesUri"] = [u.strip() for u in sr.instantiates_uri.split(",") if u.strip()]

    if sr.priority:
        result["priority"] = sr.priority.value

    if sr.do_not_perform is not None:
        result["doNotPerform"] = sr.do_not_perform

    if sr.categories:
        cats = [cc for cat in sr.categories if (cc := fhir_sr_category(cat))]
        if cats:
            result["category"] = cats

    code_cc = _cc(sr.code_system, sr.code_code, sr.code_display, sr.code_text)
    if code_cc:
        result["code"] = code_cc

    if sr.order_details:
        od_list = [cc for od in sr.order_details if (cc := fhir_sr_order_detail(od))]
        if od_list:
            result["orderDetail"] = od_list

    if sr.subject_type and sr.subject_id:
        subj: dict = {"reference": f"{sr.subject_type.value}/{sr.subject_id}"}
        if sr.subject_display:
            subj["display"] = sr.subject_display
        result["subject"] = subj

    if sr.encounter and sr.encounter.encounter_id:
        enc_ref: dict = {"reference": f"Encounter/{sr.encounter.encounter_id}"}
        if sr.encounter_display:
            enc_ref["display"] = sr.encounter_display
        result["encounter"] = enc_ref

    # occurrence[x]
    if sr.occurrence_datetime:
        result["occurrenceDateTime"] = sr.occurrence_datetime.isoformat()
    elif sr.occurrence_period_start or sr.occurrence_period_end:
        result["occurrencePeriod"] = {k: v for k, v in {
            "start": sr.occurrence_period_start.isoformat() if sr.occurrence_period_start else None,
            "end": sr.occurrence_period_end.isoformat() if sr.occurrence_period_end else None,
        }.items() if v}
    elif sr.occurrence_timing_frequency is not None or sr.occurrence_timing_period is not None:
        repeat: dict = {}
        if sr.occurrence_timing_frequency is not None:
            repeat["frequency"] = sr.occurrence_timing_frequency
        if sr.occurrence_timing_period is not None:
            repeat["period"] = sr.occurrence_timing_period
        if sr.occurrence_timing_period_unit:
            repeat["periodUnit"] = sr.occurrence_timing_period_unit
        if sr.occurrence_timing_bounds_start or sr.occurrence_timing_bounds_end:
            repeat["boundsPeriod"] = {k: v for k, v in {
                "start": sr.occurrence_timing_bounds_start.isoformat() if sr.occurrence_timing_bounds_start else None,
                "end": sr.occurrence_timing_bounds_end.isoformat() if sr.occurrence_timing_bounds_end else None,
            }.items() if v}
        result["occurrenceTiming"] = {"repeat": repeat}

    # asNeeded[x]
    if sr.as_needed_boolean is not None:
        result["asNeededBoolean"] = sr.as_needed_boolean
    else:
        as_needed_cc = _cc(sr.as_needed_system, sr.as_needed_code, sr.as_needed_display, sr.as_needed_text)
        if as_needed_cc:
            result["asNeededCodeableConcept"] = as_needed_cc

    if sr.authored_on:
        result["authoredOn"] = sr.authored_on.isoformat()

    if sr.requester_type and sr.requester_id:
        req: dict = {"reference": f"{sr.requester_type.value}/{sr.requester_id}"}
        if sr.requester_display:
            req["display"] = sr.requester_display
        result["requester"] = req

    performer_type_cc = _cc(
        sr.performer_type_system, sr.performer_type_code,
        sr.performer_type_display, sr.performer_type_text,
    )
    if performer_type_cc:
        result["performerType"] = performer_type_cc

    if sr.performers:
        p_list = [e for e in [fhir_sr_performer(p) for p in sr.performers] if e]
        if p_list:
            result["performer"] = p_list

    if sr.location_codes:
        lc_list = [cc for lc in sr.location_codes if (cc := fhir_sr_location_code(lc))]
        if lc_list:
            result["locationCode"] = lc_list

    if sr.location_references:
        lr_list = [e for e in [fhir_sr_location_reference(lr) for lr in sr.location_references] if e]
        if lr_list:
            result["locationReference"] = lr_list

    if sr.reason_codes:
        rc_list = [cc for rc in sr.reason_codes if (cc := fhir_sr_reason_code(rc))]
        if rc_list:
            result["reasonCode"] = rc_list

    if sr.reason_references:
        rr_list = [e for e in [fhir_sr_reason_reference(rr) for rr in sr.reason_references] if e]
        if rr_list:
            result["reasonReference"] = rr_list

    if sr.insurance:
        ins_list = [e for e in [fhir_sr_insurance(ins) for ins in sr.insurance] if e]
        if ins_list:
            result["insurance"] = ins_list

    if sr.supporting_info:
        si_list = [e for e in [fhir_sr_supporting_info(si) for si in sr.supporting_info] if e]
        if si_list:
            result["supportingInfo"] = si_list

    if sr.specimens:
        sp_list = [e for e in [fhir_sr_specimen(sp) for sp in sr.specimens] if e]
        if sp_list:
            result["specimen"] = sp_list

    if sr.body_sites:
        bs_list = [cc for bs in sr.body_sites if (cc := fhir_sr_body_site(bs))]
        if bs_list:
            result["bodySite"] = bs_list

    # quantity[x]
    if sr.quantity_value is not None:
        result["quantityQuantity"] = {k: v for k, v in {
            "value": sr.quantity_value,
            "unit": sr.quantity_unit,
            "system": sr.quantity_system,
            "code": sr.quantity_code,
        }.items() if v is not None}
    elif sr.quantity_ratio_numerator_value is not None:
        result["quantityRatio"] = {
            "numerator": {k: v for k, v in {
                "value": sr.quantity_ratio_numerator_value,
                "unit": sr.quantity_ratio_numerator_unit,
            }.items() if v is not None},
            "denominator": {k: v for k, v in {
                "value": sr.quantity_ratio_denominator_value,
                "unit": sr.quantity_ratio_denominator_unit,
            }.items() if v is not None},
        }
    elif sr.quantity_range_low_value is not None or sr.quantity_range_high_value is not None:
        rng: dict = {}
        if sr.quantity_range_low_value is not None:
            rng["low"] = {"value": sr.quantity_range_low_value}
            if sr.quantity_range_low_unit:
                rng["low"]["unit"] = sr.quantity_range_low_unit
        if sr.quantity_range_high_value is not None:
            rng["high"] = {"value": sr.quantity_range_high_value}
            if sr.quantity_range_high_unit:
                rng["high"]["unit"] = sr.quantity_range_high_unit
        result["quantityRange"] = rng

    # requisition
    req_fields = [sr.requisition_value, sr.requisition_system, sr.requisition_type_code]
    if any(req_fields):
        req_id: dict = {}
        if sr.requisition_use:
            req_id["use"] = sr.requisition_use
        type_cc = _cc(sr.requisition_type_system, sr.requisition_type_code,
                      sr.requisition_type_display, sr.requisition_type_text)
        if type_cc:
            req_id["type"] = type_cc
        if sr.requisition_system:
            req_id["system"] = sr.requisition_system
        if sr.requisition_value:
            req_id["value"] = sr.requisition_value
        if sr.requisition_period_start or sr.requisition_period_end:
            req_id["period"] = {k: v for k, v in {
                "start": sr.requisition_period_start.isoformat() if sr.requisition_period_start else None,
                "end": sr.requisition_period_end.isoformat() if sr.requisition_period_end else None,
            }.items() if v}
        if sr.requisition_assigner:
            req_id["assigner"] = {"display": sr.requisition_assigner}
        result["requisition"] = req_id

    if sr.patient_instruction:
        result["patientInstruction"] = sr.patient_instruction

    if sr.notes:
        result["note"] = [fhir_sr_note(n) for n in sr.notes]

    if sr.relevant_history:
        rh_list = [e for e in [fhir_sr_relevant_history(rh) for rh in sr.relevant_history] if e]
        if rh_list:
            result["relevantHistory"] = rh_list

    return {k: v for k, v in result.items() if v is not None}
