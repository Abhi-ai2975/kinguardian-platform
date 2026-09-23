from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_split, plain_identifier


def plain_proc_identifier(i) -> dict:
    return {"id": i.id, **plain_identifier(i)}


def plain_proc_based_on(b) -> dict:
    return {
        "id": b.id,
        "reference_type": fhir_enum(b.reference_type),
        "reference_id": b.reference_id,
        "reference_display": b.reference_display,
    }


def plain_proc_part_of(p) -> dict:
    return {
        "id": p.id,
        "reference_type": fhir_enum(p.reference_type),
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_proc_performer(p) -> dict:
    return {
        "id": p.id,
        "function_system": p.function_system,
        "function_code": p.function_code,
        "function_display": p.function_display,
        "function_text": p.function_text,
        "actor_type": fhir_enum(p.actor_type),
        "actor_id": p.actor_id,
        "actor_display": p.actor_display,
        "on_behalf_of_type": fhir_enum(p.on_behalf_of_type),
        "on_behalf_of_id": p.on_behalf_of_id,
        "on_behalf_of_display": p.on_behalf_of_display,
    }


def plain_proc_reason_code(r) -> dict:
    return {
        "id": r.id,
        "coding_system": r.coding_system,
        "coding_code": r.coding_code,
        "coding_display": r.coding_display,
        "text": r.text,
    }


def plain_proc_reason_reference(r) -> dict:
    return {
        "id": r.id,
        "reference_type": fhir_enum(r.reference_type),
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }


def plain_proc_body_site(b) -> dict:
    return {
        "id": b.id,
        "coding_system": b.coding_system,
        "coding_code": b.coding_code,
        "coding_display": b.coding_display,
        "text": b.text,
    }


def plain_proc_report(r) -> dict:
    return {
        "id": r.id,
        "reference_type": fhir_enum(r.reference_type),
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }


def plain_proc_complication(c) -> dict:
    return {
        "id": c.id,
        "coding_system": c.coding_system,
        "coding_code": c.coding_code,
        "coding_display": c.coding_display,
        "text": c.text,
    }


def plain_proc_complication_detail(c) -> dict:
    return {
        "id": c.id,
        "reference_type": fhir_enum(c.reference_type),
        "reference_id": c.reference_id,
        "reference_display": c.reference_display,
    }


def plain_proc_follow_up(f) -> dict:
    return {
        "id": f.id,
        "coding_system": f.coding_system,
        "coding_code": f.coding_code,
        "coding_display": f.coding_display,
        "text": f.text,
    }


def plain_proc_note(n) -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": fhir_enum(n.author_reference_type),
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_proc_focal_device(f) -> dict:
    return {
        "id": f.id,
        "action_system": f.action_system,
        "action_code": f.action_code,
        "action_display": f.action_display,
        "action_text": f.action_text,
        "manipulated_reference_type": fhir_enum(f.manipulated_reference_type),
        "manipulated_reference_id": f.manipulated_reference_id,
        "manipulated_reference_display": f.manipulated_reference_display,
    }


def plain_proc_used_reference(u) -> dict:
    return {
        "id": u.id,
        "reference_type": fhir_enum(u.reference_type),
        "reference_id": u.reference_id,
        "reference_display": u.reference_display,
    }


def plain_proc_used_code(u) -> dict:
    return {
        "id": u.id,
        "coding_system": u.coding_system,
        "coding_code": u.coding_code,
        "coding_display": u.coding_display,
        "text": u.text,
    }


def to_plain_procedure(proc) -> dict:
    enc_id = proc.encounter.encounter_id if proc.encounter else None
    return {
        "id": proc.procedure_id,
        "status": fhir_enum(proc.status),
        "status_reason_system": proc.status_reason_system,
        "status_reason_code": proc.status_reason_code,
        "status_reason_display": proc.status_reason_display,
        "status_reason_text": proc.status_reason_text,
        "category_system": proc.category_system,
        "category_code": proc.category_code,
        "category_display": proc.category_display,
        "category_text": proc.category_text,
        "code_system": proc.code_system,
        "code_code": proc.code_code,
        "code_display": proc.code_display,
        "code_text": proc.code_text,
        "subject_type": fhir_enum(proc.subject_type),
        "subject_id": proc.subject_id,
        "subject_display": proc.subject_display,
        "encounter_type": fhir_enum(proc.encounter_type),
        "encounter_id": enc_id,
        "encounter_display": proc.encounter_display,
        "performed_datetime": proc.performed_datetime.isoformat() if proc.performed_datetime else None,
        "performed_period_start": proc.performed_period_start.isoformat() if proc.performed_period_start else None,
        "performed_period_end": proc.performed_period_end.isoformat() if proc.performed_period_end else None,
        "performed_string": proc.performed_string,
        "performed_age_value": proc.performed_age_value,
        "performed_age_unit": proc.performed_age_unit,
        "performed_age_system": proc.performed_age_system,
        "performed_age_code": proc.performed_age_code,
        "performed_range_low_value": proc.performed_range_low_value,
        "performed_range_low_unit": proc.performed_range_low_unit,
        "performed_range_high_value": proc.performed_range_high_value,
        "performed_range_high_unit": proc.performed_range_high_unit,
        "recorder_type": fhir_enum(proc.recorder_type),
        "recorder_id": proc.recorder_id,
        "recorder_display": proc.recorder_display,
        "asserter_type": fhir_enum(proc.asserter_type),
        "asserter_id": proc.asserter_id,
        "asserter_display": proc.asserter_display,
        "location_type": fhir_enum(proc.location_type),
        "location_reference_id": proc.location_reference_id,
        "location_display": proc.location_display,
        "outcome_system": proc.outcome_system,
        "outcome_code": proc.outcome_code,
        "outcome_display": proc.outcome_display,
        "outcome_text": proc.outcome_text,
        "instantiates_canonical": fhir_split(proc.instantiates_canonical),
        "instantiates_uri": fhir_split(proc.instantiates_uri),
        "identifier": [plain_proc_identifier(i) for i in (proc.identifiers or [])],
        "based_on": [plain_proc_based_on(b) for b in (proc.based_on or [])],
        "part_of": [plain_proc_part_of(p) for p in (proc.part_of or [])],
        "performer": [plain_proc_performer(p) for p in (proc.performers or [])],
        "reason_code": [plain_proc_reason_code(r) for r in (proc.reason_codes or [])],
        "reason_reference": [plain_proc_reason_reference(r) for r in (proc.reason_references or [])],
        "body_site": [plain_proc_body_site(b) for b in (proc.body_sites or [])],
        "report": [plain_proc_report(r) for r in (proc.reports or [])],
        "complication": [plain_proc_complication(c) for c in (proc.complications or [])],
        "complication_detail": [plain_proc_complication_detail(c) for c in (proc.complication_details or [])],
        "follow_up": [plain_proc_follow_up(f) for f in (proc.follow_ups or [])],
        "note": [plain_proc_note(n) for n in (proc.notes or [])],
        "focal_device": [plain_proc_focal_device(f) for f in (proc.focal_devices or [])],
        "used_reference": [plain_proc_used_reference(u) for u in (proc.used_references or [])],
        "used_code": [plain_proc_used_code(u) for u in (proc.used_codes or [])],
        "user_id": proc.user_id,
        "org_id": proc.org_id,
        "created_at": proc.created_at.isoformat() if proc.created_at else None,
        "updated_at": proc.updated_at.isoformat() if proc.updated_at else None,
        "created_by": proc.created_by,
        "updated_by": proc.updated_by,
    }
