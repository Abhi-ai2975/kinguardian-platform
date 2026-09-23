from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
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


def _cc(system, code, display, text=None) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def _qty(value, unit, system=None, code=None) -> dict | None:
    if value is None:
        return None
    q: dict = {"value": value}
    if unit:
        q["unit"] = unit
    if system:
        q["system"] = system
    if code:
        q["code"] = code
    return q


def fhir_mr_identifier(i: "MedicationRequestIdentifier") -> dict:
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


def fhir_mr_category(cat: "MedicationRequestCategory") -> dict | None:
    return _cc(cat.coding_system, cat.coding_code, cat.coding_display, cat.text)


def fhir_mr_supporting_info(si: "MedicationRequestSupportingInfo") -> dict:
    entry: dict = {}
    if si.reference_type and si.reference_id:
        entry["reference"] = f"{si.reference_type}/{si.reference_id}"
    if si.reference_display:
        entry["display"] = si.reference_display
    return entry


def fhir_mr_reason_code(rc: "MedicationRequestReasonCode") -> dict | None:
    return _cc(rc.coding_system, rc.coding_code, rc.coding_display, rc.text)


def fhir_mr_reason_reference(rr: "MedicationRequestReasonReference") -> dict:
    entry: dict = {}
    if rr.reference_type and rr.reference_id:
        entry["reference"] = f"{rr.reference_type.value}/{rr.reference_id}"
    if rr.reference_display:
        entry["display"] = rr.reference_display
    return entry


def fhir_mr_based_on(bo: "MedicationRequestBasedOn") -> dict:
    entry: dict = {}
    if bo.reference_type and bo.reference_id:
        entry["reference"] = f"{bo.reference_type.value}/{bo.reference_id}"
    if bo.reference_display:
        entry["display"] = bo.reference_display
    return entry


def fhir_mr_insurance(ins: "MedicationRequestInsurance") -> dict:
    entry: dict = {}
    if ins.reference_type and ins.reference_id:
        entry["reference"] = f"{ins.reference_type.value}/{ins.reference_id}"
    if ins.reference_display:
        entry["display"] = ins.reference_display
    return entry


def fhir_mr_note(n: "MedicationRequestNote") -> dict:
    entry: dict = {"text": n.text}
    if n.time:
        entry["time"] = n.time.isoformat()
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id:
        ref: dict = {"reference": f"{n.author_reference_type.value}/{n.author_reference_id}"}
        if n.author_reference_display:
            ref["display"] = n.author_reference_display
        entry["authorReference"] = ref
    return entry


def fhir_mr_additional_instruction(ai: "MedicationRequestDosageAdditionalInstruction") -> dict | None:
    return _cc(ai.coding_system, ai.coding_code, ai.coding_display, ai.text)


def fhir_mr_dose_and_rate(dar: "MedicationRequestDosageDoseAndRate") -> dict:
    entry: dict = {}
    type_cc = _cc(dar.type_system, dar.type_code, dar.type_display)
    if type_cc:
        entry["type"] = type_cc

    # dose[x]: Quantity preferred over Range
    if dar.dose_quantity_value is not None:
        entry["doseQuantity"] = _qty(dar.dose_quantity_value, dar.dose_quantity_unit,
                                     dar.dose_quantity_system, dar.dose_quantity_code)
    elif dar.dose_range_low_value is not None or dar.dose_range_high_value is not None:
        rng: dict = {}
        if dar.dose_range_low_value is not None:
            rng["low"] = _qty(dar.dose_range_low_value, dar.dose_range_low_unit)
        if dar.dose_range_high_value is not None:
            rng["high"] = _qty(dar.dose_range_high_value, dar.dose_range_high_unit)
        entry["doseRange"] = rng

    # rate[x]: Ratio preferred, then Range, then Quantity
    if dar.rate_ratio_numerator_value is not None:
        ratio: dict = {}
        if dar.rate_ratio_numerator_value is not None:
            ratio["numerator"] = _qty(dar.rate_ratio_numerator_value, dar.rate_ratio_numerator_unit)
        if dar.rate_ratio_denominator_value is not None:
            ratio["denominator"] = _qty(dar.rate_ratio_denominator_value, dar.rate_ratio_denominator_unit)
        entry["rateRatio"] = ratio
    elif dar.rate_range_low_value is not None or dar.rate_range_high_value is not None:
        rng2: dict = {}
        if dar.rate_range_low_value is not None:
            rng2["low"] = _qty(dar.rate_range_low_value, dar.rate_range_low_unit)
        if dar.rate_range_high_value is not None:
            rng2["high"] = _qty(dar.rate_range_high_value, dar.rate_range_high_unit)
        entry["rateRange"] = rng2
    elif dar.rate_quantity_value is not None:
        entry["rateQuantity"] = _qty(dar.rate_quantity_value, dar.rate_quantity_unit,
                                     dar.rate_quantity_system, dar.rate_quantity_code)

    return entry


def fhir_mr_dosage_instruction(di: "MedicationRequestDosageInstruction") -> dict:
    entry: dict = {}

    if di.sequence is not None:
        entry["sequence"] = di.sequence
    if di.text:
        entry["text"] = di.text
    if di.patient_instruction:
        entry["patientInstruction"] = di.patient_instruction

    if di.additional_instructions:
        ai_list = [cc for ai in di.additional_instructions if (cc := fhir_mr_additional_instruction(ai))]
        if ai_list:
            entry["additionalInstruction"] = ai_list

    # asNeeded[x]
    if di.as_needed_boolean is not None:
        entry["asNeededBoolean"] = di.as_needed_boolean
    elif di.as_needed_system or di.as_needed_code:
        an_cc = _cc(di.as_needed_system, di.as_needed_code, di.as_needed_display, di.as_needed_text)
        if an_cc:
            entry["asNeededCodeableConcept"] = an_cc

    # timing
    timing: dict = {}
    repeat: dict = {}
    timing_fields = [
        ("timing_repeat_bounds_start", None),
        ("timing_repeat_bounds_end", None),
        ("timing_repeat_count", "count"),
        ("timing_repeat_count_max", "countMax"),
        ("timing_repeat_duration", "duration"),
        ("timing_repeat_duration_max", "durationMax"),
        ("timing_repeat_duration_unit", "durationUnit"),
        ("timing_repeat_frequency", "frequency"),
        ("timing_repeat_frequency_max", "frequencyMax"),
        ("timing_repeat_period", "period"),
        ("timing_repeat_period_max", "periodMax"),
        ("timing_repeat_period_unit", "periodUnit"),
        ("timing_repeat_day_of_week", None),
        ("timing_repeat_time_of_day", None),
        ("timing_repeat_when", None),
        ("timing_repeat_offset", "offset"),
    ]
    for attr, key in timing_fields:
        val = getattr(di, attr)
        if val is None:
            continue
        if attr == "timing_repeat_bounds_start" or attr == "timing_repeat_bounds_end":
            # skip — handled as boundsPeriod below
            continue
        if attr == "timing_repeat_day_of_week":
            repeat["dayOfWeek"] = [d.strip() for d in val.split(",") if d.strip()]
        elif attr == "timing_repeat_time_of_day":
            repeat["timeOfDay"] = [t.strip() for t in val.split(",") if t.strip()]
        elif attr == "timing_repeat_when":
            repeat["when"] = [w.strip() for w in val.split(",") if w.strip()]
        elif key:
            repeat[key] = val

    if di.timing_repeat_bounds_start or di.timing_repeat_bounds_end:
        bounds: dict = {}
        if di.timing_repeat_bounds_start:
            bounds["start"] = di.timing_repeat_bounds_start.isoformat()
        if di.timing_repeat_bounds_end:
            bounds["end"] = di.timing_repeat_bounds_end.isoformat()
        repeat["boundsPeriod"] = bounds

    if repeat:
        timing["repeat"] = repeat

    timing_code_cc = _cc(di.timing_code_system, di.timing_code_code, di.timing_code_display)
    if timing_code_cc:
        timing["code"] = timing_code_cc

    if timing:
        entry["timing"] = timing

    site_cc = _cc(di.site_system, di.site_code, di.site_display, di.site_text)
    if site_cc:
        entry["site"] = site_cc

    route_cc = _cc(di.route_system, di.route_code, di.route_display, di.route_text)
    if route_cc:
        entry["route"] = route_cc

    method_cc = _cc(di.method_system, di.method_code, di.method_display, di.method_text)
    if method_cc:
        entry["method"] = method_cc

    if di.dose_and_rates:
        entry["doseAndRate"] = [fhir_mr_dose_and_rate(d) for d in di.dose_and_rates]

    # maxDose fields
    if di.max_dose_per_period_numerator_value is not None or di.max_dose_per_period_denominator_value is not None:
        ratio: dict = {}
        if di.max_dose_per_period_numerator_value is not None:
            ratio["numerator"] = _qty(di.max_dose_per_period_numerator_value, di.max_dose_per_period_numerator_unit)
        if di.max_dose_per_period_denominator_value is not None:
            ratio["denominator"] = _qty(di.max_dose_per_period_denominator_value, di.max_dose_per_period_denominator_unit)
        entry["maxDosePerPeriod"] = ratio

    if di.max_dose_per_administration_value is not None:
        entry["maxDosePerAdministration"] = _qty(di.max_dose_per_administration_value, di.max_dose_per_administration_unit)

    if di.max_dose_per_lifetime_value is not None:
        entry["maxDosePerLifetime"] = _qty(di.max_dose_per_lifetime_value, di.max_dose_per_lifetime_unit)

    return entry


def fhir_mr_detected_issue(di: "MedicationRequestDetectedIssue") -> dict:
    entry: dict = {}
    if di.reference_type and di.reference_id:
        entry["reference"] = f"{di.reference_type.value}/{di.reference_id}"
    if di.reference_display:
        entry["display"] = di.reference_display
    return entry


def fhir_mr_event_history(eh: "MedicationRequestEventHistory") -> dict:
    entry: dict = {}
    if eh.reference_type and eh.reference_id:
        entry["reference"] = f"{eh.reference_type.value}/{eh.reference_id}"
    if eh.reference_display:
        entry["display"] = eh.reference_display
    return entry


def to_fhir_medication_request(mr: "MedicationRequestModel") -> dict:
    result: dict = {
        "resourceType": "MedicationRequest",
        "id": str(mr.medication_request_id),
        "status": mr.status.value if mr.status else None,
        "intent": mr.intent.value if mr.intent else None,
    }

    if mr.priority:
        result["priority"] = mr.priority.value

    if mr.do_not_perform is not None:
        result["doNotPerform"] = mr.do_not_perform

    status_reason_cc = _cc(mr.status_reason_system, mr.status_reason_code, mr.status_reason_display, mr.status_reason_text)
    if status_reason_cc:
        result["statusReason"] = status_reason_cc

    if mr.identifiers:
        result["identifier"] = [fhir_mr_identifier(i) for i in mr.identifiers]

    if mr.categories:
        cats = [cc for cat in mr.categories if (cc := fhir_mr_category(cat))]
        if cats:
            result["category"] = cats

    # medication[x]
    if mr.medication_code_system or mr.medication_code_code or mr.medication_code_text:
        result["medicationCodeableConcept"] = _cc(
            mr.medication_code_system, mr.medication_code_code,
            mr.medication_code_display, mr.medication_code_text,
        )
    elif mr.medication_reference_type and mr.medication_reference_id:
        med_ref: dict = {"reference": f"{mr.medication_reference_type.value}/{mr.medication_reference_id}"}
        if mr.medication_reference_display:
            med_ref["display"] = mr.medication_reference_display
        result["medicationReference"] = med_ref

    if mr.subject_type and mr.subject_id:
        subj: dict = {"reference": f"{mr.subject_type.value}/{mr.subject_id}"}
        if mr.subject_display:
            subj["display"] = mr.subject_display
        result["subject"] = subj

    if mr.encounter and mr.encounter.encounter_id:
        enc_ref: dict = {"reference": f"Encounter/{mr.encounter.encounter_id}"}
        if mr.encounter_display:
            enc_ref["display"] = mr.encounter_display
        result["encounter"] = enc_ref

    if mr.authored_on:
        result["authoredOn"] = mr.authored_on.isoformat()

    # reported[x]
    if mr.reported_boolean is not None:
        result["reportedBoolean"] = mr.reported_boolean
    elif mr.reported_reference_type and mr.reported_reference_id:
        rep_ref: dict = {"reference": f"{mr.reported_reference_type.value}/{mr.reported_reference_id}"}
        if mr.reported_reference_display:
            rep_ref["display"] = mr.reported_reference_display
        result["reportedReference"] = rep_ref

    if mr.requester_type and mr.requester_id:
        req: dict = {"reference": f"{mr.requester_type.value}/{mr.requester_id}"}
        if mr.requester_display:
            req["display"] = mr.requester_display
        result["requester"] = req

    if mr.performer_type and mr.performer_id:
        perf: dict = {"reference": f"{mr.performer_type.value}/{mr.performer_id}"}
        if mr.performer_display:
            perf["display"] = mr.performer_display
        result["performer"] = perf

    performer_type_cc = _cc(mr.performer_type_system, mr.performer_type_code, mr.performer_type_display, mr.performer_type_text)
    if performer_type_cc:
        result["performerType"] = performer_type_cc

    if mr.recorder_type and mr.recorder_id:
        rec: dict = {"reference": f"{mr.recorder_type.value}/{mr.recorder_id}"}
        if mr.recorder_display:
            rec["display"] = mr.recorder_display
        result["recorder"] = rec

    # groupIdentifier
    if mr.group_identifier_value or mr.group_identifier_system:
        gi: dict = {}
        if mr.group_identifier_use:
            gi["use"] = mr.group_identifier_use
        gi_type = _cc(mr.group_identifier_type_system, mr.group_identifier_type_code,
                      mr.group_identifier_type_display, mr.group_identifier_type_text)
        if gi_type:
            gi["type"] = gi_type
        if mr.group_identifier_system:
            gi["system"] = mr.group_identifier_system
        if mr.group_identifier_value:
            gi["value"] = mr.group_identifier_value
        if mr.group_identifier_period_start or mr.group_identifier_period_end:
            gi["period"] = {k: v for k, v in {
                "start": mr.group_identifier_period_start.isoformat() if mr.group_identifier_period_start else None,
                "end": mr.group_identifier_period_end.isoformat() if mr.group_identifier_period_end else None,
            }.items() if v}
        if mr.group_identifier_assigner:
            gi["assigner"] = {"display": mr.group_identifier_assigner}
        result["groupIdentifier"] = gi

    course_cc = _cc(mr.course_of_therapy_type_system, mr.course_of_therapy_type_code,
                    mr.course_of_therapy_type_display, mr.course_of_therapy_type_text)
    if course_cc:
        result["courseOfTherapyType"] = course_cc

    if mr.prior_prescription_type and mr.prior_prescription_id:
        pp: dict = {"reference": f"{mr.prior_prescription_type.value}/{mr.prior_prescription_id}"}
        if mr.prior_prescription_display:
            pp["display"] = mr.prior_prescription_display
        result["priorPrescription"] = pp

    if mr.instantiates_canonical:
        result["instantiatesCanonical"] = [u.strip() for u in mr.instantiates_canonical.split(",") if u.strip()]

    if mr.instantiates_uri:
        result["instantiatesUri"] = [u.strip() for u in mr.instantiates_uri.split(",") if u.strip()]

    if mr.supporting_info:
        si_list = [e for e in [fhir_mr_supporting_info(si) for si in mr.supporting_info] if e]
        if si_list:
            result["supportingInformation"] = si_list

    if mr.reason_codes:
        rc_list = [cc for rc in mr.reason_codes if (cc := fhir_mr_reason_code(rc))]
        if rc_list:
            result["reasonCode"] = rc_list

    if mr.reason_references:
        rr_list = [e for e in [fhir_mr_reason_reference(rr) for rr in mr.reason_references] if e]
        if rr_list:
            result["reasonReference"] = rr_list

    if mr.based_on:
        bo_list = [e for e in [fhir_mr_based_on(b) for b in mr.based_on] if e]
        if bo_list:
            result["basedOn"] = bo_list

    if mr.insurance:
        ins_list = [e for e in [fhir_mr_insurance(ins) for ins in mr.insurance] if e]
        if ins_list:
            result["insurance"] = ins_list

    if mr.notes:
        result["note"] = [fhir_mr_note(n) for n in mr.notes]

    if mr.dosage_instructions:
        result["dosageInstruction"] = [fhir_mr_dosage_instruction(di) for di in mr.dosage_instructions]

    # dispenseRequest BackboneElement
    dispense: dict = {}
    if mr.dispense_initial_fill_quantity_value is not None or mr.dispense_initial_fill_duration_value is not None:
        init_fill: dict = {}
        qty = _qty(mr.dispense_initial_fill_quantity_value, mr.dispense_initial_fill_quantity_unit,
                   mr.dispense_initial_fill_quantity_system, mr.dispense_initial_fill_quantity_code)
        if qty:
            init_fill["quantity"] = qty
        dur = _qty(mr.dispense_initial_fill_duration_value, mr.dispense_initial_fill_duration_unit)
        if dur:
            init_fill["duration"] = dur
        if init_fill:
            dispense["initialFill"] = init_fill

    if mr.dispense_interval_value is not None:
        dispense["dispenseInterval"] = _qty(mr.dispense_interval_value, mr.dispense_interval_unit)

    if mr.dispense_validity_period_start or mr.dispense_validity_period_end:
        dispense["validityPeriod"] = {k: v for k, v in {
            "start": mr.dispense_validity_period_start.isoformat() if mr.dispense_validity_period_start else None,
            "end": mr.dispense_validity_period_end.isoformat() if mr.dispense_validity_period_end else None,
        }.items() if v}

    if mr.dispense_number_of_repeats_allowed is not None:
        dispense["numberOfRepeatsAllowed"] = mr.dispense_number_of_repeats_allowed

    qty2 = _qty(mr.dispense_quantity_value, mr.dispense_quantity_unit,
                mr.dispense_quantity_system, mr.dispense_quantity_code)
    if qty2:
        dispense["quantity"] = qty2

    dur2 = _qty(mr.dispense_expected_supply_duration_value, mr.dispense_expected_supply_duration_unit)
    if dur2:
        dispense["expectedSupplyDuration"] = dur2

    if mr.dispense_performer_type and mr.dispense_performer_id:
        dp: dict = {"reference": f"{mr.dispense_performer_type.value}/{mr.dispense_performer_id}"}
        if mr.dispense_performer_display:
            dp["display"] = mr.dispense_performer_display
        dispense["performer"] = dp

    if dispense:
        result["dispenseRequest"] = dispense

    # substitution BackboneElement
    if mr.substitution_allowed_boolean is not None or mr.substitution_allowed_code or mr.substitution_reason_code:
        sub: dict = {}
        if mr.substitution_allowed_boolean is not None:
            sub["allowedBoolean"] = mr.substitution_allowed_boolean
        else:
            allowed_cc = _cc(mr.substitution_allowed_system, mr.substitution_allowed_code,
                             mr.substitution_allowed_display, mr.substitution_allowed_text)
            if allowed_cc:
                sub["allowedCodeableConcept"] = allowed_cc
        reason_cc = _cc(mr.substitution_reason_system, mr.substitution_reason_code,
                        mr.substitution_reason_display, mr.substitution_reason_text)
        if reason_cc:
            sub["reason"] = reason_cc
        result["substitution"] = sub

    if mr.detected_issues:
        di_list = [e for e in [fhir_mr_detected_issue(di) for di in mr.detected_issues] if e]
        if di_list:
            result["detectedIssue"] = di_list

    if mr.event_history:
        eh_list = [e for e in [fhir_mr_event_history(eh) for eh in mr.event_history] if e]
        if eh_list:
            result["eventHistory"] = eh_list

    return {k: v for k, v in result.items() if v is not None}
