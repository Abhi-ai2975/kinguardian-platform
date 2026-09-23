from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_identifier, fhir_split


def _fhir_cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if text:
        entry["text"] = text
    return entry or None


def _fhir_ref(ref_type, ref_id, display=None) -> dict | None:
    if ref_type is None and ref_id is None:
        return None
    entry: dict = {}
    if ref_type is not None and ref_id is not None:
        entry["reference"] = f"{fhir_enum(ref_type)}/{ref_id}"
    if display:
        entry["display"] = display
    return entry or None


def _fhir_performed(proc) -> dict:
    if proc.performed_datetime:
        return {"performedDateTime": proc.performed_datetime.isoformat()}
    if proc.performed_period_start or proc.performed_period_end:
        period = {k: v for k, v in {
            "start": proc.performed_period_start.isoformat() if proc.performed_period_start else None,
            "end": proc.performed_period_end.isoformat() if proc.performed_period_end else None,
        }.items() if v}
        return {"performedPeriod": period}
    if proc.performed_string:
        return {"performedString": proc.performed_string}
    if proc.performed_age_value is not None:
        age = {k: v for k, v in {
            "value": proc.performed_age_value,
            "unit": proc.performed_age_unit,
            "system": proc.performed_age_system,
            "code": proc.performed_age_code,
        }.items() if v is not None}
        return {"performedAge": age}
    if proc.performed_range_low_value is not None or proc.performed_range_high_value is not None:
        range_: dict = {}
        if proc.performed_range_low_value is not None:
            range_["low"] = {k: v for k, v in {
                "value": proc.performed_range_low_value,
                "unit": proc.performed_range_low_unit,
            }.items() if v is not None}
        if proc.performed_range_high_value is not None:
            range_["high"] = {k: v for k, v in {
                "value": proc.performed_range_high_value,
                "unit": proc.performed_range_high_unit,
            }.items() if v is not None}
        return {"performedRange": range_}
    return {}


def fhir_proc_identifier(i) -> dict:
    return fhir_identifier(i)


def fhir_proc_based_on(b) -> dict:
    return {k: v for k, v in {
        "reference": f"{fhir_enum(b.reference_type)}/{b.reference_id}" if b.reference_type and b.reference_id else None,
        "display": b.reference_display,
    }.items() if v}


def fhir_proc_part_of(p) -> dict:
    return {k: v for k, v in {
        "reference": f"{fhir_enum(p.reference_type)}/{p.reference_id}" if p.reference_type and p.reference_id else None,
        "display": p.reference_display,
    }.items() if v}


def fhir_proc_performer(p) -> dict:
    entry: dict = {}
    fn = _fhir_cc(p.function_system, p.function_code, p.function_display, p.function_text)
    if fn:
        entry["function"] = fn
    actor = _fhir_ref(p.actor_type, p.actor_id, p.actor_display)
    if actor:
        entry["actor"] = actor
    obo = _fhir_ref(p.on_behalf_of_type, p.on_behalf_of_id, p.on_behalf_of_display)
    if obo:
        entry["onBehalfOf"] = obo
    return entry


def fhir_proc_reason_code(r) -> dict:
    return _fhir_cc(r.coding_system, r.coding_code, r.coding_display, r.text) or {}


def fhir_proc_reason_reference(r) -> dict:
    return {k: v for k, v in {
        "reference": f"{fhir_enum(r.reference_type)}/{r.reference_id}" if r.reference_type and r.reference_id else None,
        "display": r.reference_display,
    }.items() if v}


def fhir_proc_body_site(b) -> dict:
    return _fhir_cc(b.coding_system, b.coding_code, b.coding_display, b.text) or {}


def fhir_proc_report(r) -> dict:
    return {k: v for k, v in {
        "reference": f"{fhir_enum(r.reference_type)}/{r.reference_id}" if r.reference_type and r.reference_id else None,
        "display": r.reference_display,
    }.items() if v}


def fhir_proc_complication(c) -> dict:
    return _fhir_cc(c.coding_system, c.coding_code, c.coding_display, c.text) or {}


def fhir_proc_complication_detail(c) -> dict:
    return {k: v for k, v in {
        "reference": f"{fhir_enum(c.reference_type)}/{c.reference_id}" if c.reference_type and c.reference_id else None,
        "display": c.reference_display,
    }.items() if v}


def fhir_proc_follow_up(f) -> dict:
    return _fhir_cc(f.coding_system, f.coding_code, f.coding_display, f.text) or {}


def fhir_proc_note(n) -> dict:
    entry: dict = {"text": n.text}
    if n.time:
        entry["time"] = n.time.isoformat()
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id is not None:
        ref_entry: dict = {"reference": f"{fhir_enum(n.author_reference_type)}/{n.author_reference_id}"}
        if n.author_reference_display:
            ref_entry["display"] = n.author_reference_display
        entry["authorReference"] = ref_entry
    return entry


def fhir_proc_focal_device(f) -> dict:
    entry: dict = {}
    action = _fhir_cc(f.action_system, f.action_code, f.action_display, f.action_text)
    if action:
        entry["action"] = action
    manip = _fhir_ref(f.manipulated_reference_type, f.manipulated_reference_id, f.manipulated_reference_display)
    if manip:
        entry["manipulated"] = manip
    return entry


def fhir_proc_used_reference(u) -> dict:
    return {k: v for k, v in {
        "reference": f"{fhir_enum(u.reference_type)}/{u.reference_id}" if u.reference_type and u.reference_id else None,
        "display": u.reference_display,
    }.items() if v}


def fhir_proc_used_code(u) -> dict:
    return _fhir_cc(u.coding_system, u.coding_code, u.coding_display, u.text) or {}


def to_fhir_procedure(proc) -> dict:
    result: dict = {
        "resourceType": "Procedure",
        "id": str(proc.procedure_id),
        "status": fhir_enum(proc.status),
    }

    status_reason = _fhir_cc(
        proc.status_reason_system, proc.status_reason_code,
        proc.status_reason_display, proc.status_reason_text,
    )
    if status_reason:
        result["statusReason"] = status_reason

    category = _fhir_cc(proc.category_system, proc.category_code, proc.category_display, proc.category_text)
    if category:
        result["category"] = category

    code = _fhir_cc(proc.code_system, proc.code_code, proc.code_display, proc.code_text)
    if code:
        result["code"] = code

    subject = _fhir_ref(proc.subject_type, proc.subject_id, proc.subject_display)
    if subject:
        result["subject"] = subject

    if proc.encounter and proc.encounter.encounter_id:
        enc: dict = {"reference": f"Encounter/{proc.encounter.encounter_id}"}
        if proc.encounter_display:
            enc["display"] = proc.encounter_display
        result["encounter"] = enc

    result.update(_fhir_performed(proc))

    recorder = _fhir_ref(proc.recorder_type, proc.recorder_id, proc.recorder_display)
    if recorder:
        result["recorder"] = recorder

    asserter = _fhir_ref(proc.asserter_type, proc.asserter_id, proc.asserter_display)
    if asserter:
        result["asserter"] = asserter

    performers = [fhir_proc_performer(p) for p in (proc.performers or [])]
    if performers:
        result["performer"] = performers

    location = _fhir_ref(proc.location_type, proc.location_reference_id, proc.location_display)
    if location:
        result["location"] = location

    reason_codes = [fhir_proc_reason_code(r) for r in (proc.reason_codes or [])]
    if reason_codes:
        result["reasonCode"] = reason_codes

    reason_refs = [fhir_proc_reason_reference(r) for r in (proc.reason_references or [])]
    if reason_refs:
        result["reasonReference"] = reason_refs

    body_sites = [fhir_proc_body_site(b) for b in (proc.body_sites or [])]
    if body_sites:
        result["bodySite"] = body_sites

    outcome = _fhir_cc(proc.outcome_system, proc.outcome_code, proc.outcome_display, proc.outcome_text)
    if outcome:
        result["outcome"] = outcome

    reports = [fhir_proc_report(r) for r in (proc.reports or [])]
    if reports:
        result["report"] = reports

    complications = [fhir_proc_complication(c) for c in (proc.complications or [])]
    if complications:
        result["complication"] = complications

    complication_details = [fhir_proc_complication_detail(c) for c in (proc.complication_details or [])]
    if complication_details:
        result["complicationDetail"] = complication_details

    follow_ups = [fhir_proc_follow_up(f) for f in (proc.follow_ups or [])]
    if follow_ups:
        result["followUp"] = follow_ups

    notes = [fhir_proc_note(n) for n in (proc.notes or [])]
    if notes:
        result["note"] = notes

    focal_devices = [fhir_proc_focal_device(f) for f in (proc.focal_devices or [])]
    if focal_devices:
        result["focalDevice"] = focal_devices

    used_refs = [fhir_proc_used_reference(u) for u in (proc.used_references or [])]
    if used_refs:
        result["usedReference"] = used_refs

    used_codes = [fhir_proc_used_code(u) for u in (proc.used_codes or [])]
    if used_codes:
        result["usedCode"] = used_codes

    based_on = [fhir_proc_based_on(b) for b in (proc.based_on or [])]
    if based_on:
        result["basedOn"] = based_on

    part_of = [fhir_proc_part_of(p) for p in (proc.part_of or [])]
    if part_of:
        result["partOf"] = part_of

    identifiers = [fhir_proc_identifier(i) for i in (proc.identifiers or [])]
    if identifiers:
        result["identifier"] = identifiers

    canonical = fhir_split(proc.instantiates_canonical)
    if canonical:
        result["instantiatesCanonical"] = canonical

    uri = fhir_split(proc.instantiates_uri)
    if uri:
        result["instantiatesUri"] = uri

    return {k: v for k, v in result.items() if v is not None}
