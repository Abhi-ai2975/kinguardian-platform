from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.task.task import (
        TaskBasedOn,
        TaskIdentifier,
        TaskInput,
        TaskInsurance,
        TaskModel,
        TaskNote,
        TaskOutput,
        TaskPartOf,
        TaskPerformerType,
        TaskRelevantHistory,
        TaskRestrictionRecipient,
    )


def _ev(v):
    return v.value if v and hasattr(v, "value") else v


def plain_task_identifier(i: "TaskIdentifier") -> dict:
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


def plain_task_based_on(b: "TaskBasedOn") -> dict:
    return {
        "id": b.id,
        "reference_type": b.reference_type,
        "reference_id": b.reference_id,
        "reference_display": b.reference_display,
    }


def plain_task_part_of(p: "TaskPartOf") -> dict:
    return {
        "id": p.id,
        "reference_type": _ev(p.reference_type),
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_task_performer_type(pt: "TaskPerformerType") -> dict:
    return {
        "id": pt.id,
        "coding_system": pt.coding_system,
        "coding_code": pt.coding_code,
        "coding_display": pt.coding_display,
        "text": pt.text,
    }


def plain_task_insurance(ins: "TaskInsurance") -> dict:
    return {
        "id": ins.id,
        "reference_type": _ev(ins.reference_type),
        "reference_id": ins.reference_id,
        "reference_display": ins.reference_display,
    }


def plain_task_note(n: "TaskNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_task_relevant_history(rh: "TaskRelevantHistory") -> dict:
    return {
        "id": rh.id,
        "reference_type": _ev(rh.reference_type),
        "reference_id": rh.reference_id,
        "reference_display": rh.reference_display,
    }


def plain_task_restriction_recipient(rr: "TaskRestrictionRecipient") -> dict:
    return {
        "id": rr.id,
        "reference_type": _ev(rr.reference_type),
        "reference_id": rr.reference_id,
        "reference_display": rr.reference_display,
    }


def plain_task_input(i: "TaskInput") -> dict:
    return {
        "id": i.id,
        "type_system": i.type_system,
        "type_code": i.type_code,
        "type_display": i.type_display,
        "type_text": i.type_text,
        "value_boolean": i.value_boolean,
        "value_code": i.value_code,
        "value_date": i.value_date.isoformat() if i.value_date else None,
        "value_date_time": i.value_date_time.isoformat() if i.value_date_time else None,
        "value_decimal": float(i.value_decimal) if i.value_decimal is not None else None,
        "value_integer": i.value_integer,
        "value_string": i.value_string,
        "value_uri": i.value_uri,
        "value_reference_type": i.value_reference_type,
        "value_reference_id": i.value_reference_id,
        "value_reference_display": i.value_reference_display,
    }


def plain_task_output(o: "TaskOutput") -> dict:
    return {
        "id": o.id,
        "type_system": o.type_system,
        "type_code": o.type_code,
        "type_display": o.type_display,
        "type_text": o.type_text,
        "value_boolean": o.value_boolean,
        "value_code": o.value_code,
        "value_date": o.value_date.isoformat() if o.value_date else None,
        "value_date_time": o.value_date_time.isoformat() if o.value_date_time else None,
        "value_decimal": float(o.value_decimal) if o.value_decimal is not None else None,
        "value_integer": o.value_integer,
        "value_string": o.value_string,
        "value_uri": o.value_uri,
        "value_reference_type": o.value_reference_type,
        "value_reference_id": o.value_reference_id,
        "value_reference_display": o.value_reference_display,
    }


def to_plain_task(model: "TaskModel") -> dict:
    result: dict = {
        "id": model.task_id,
        "status": _ev(model.status),
        "intent": _ev(model.intent),
        "priority": _ev(model.priority),
        "description": model.description,
        "instantiates_canonical": model.instantiates_canonical,
        "instantiates_uri": model.instantiates_uri,
        "group_identifier_use": model.group_identifier_use,
        "group_identifier_system": model.group_identifier_system,
        "group_identifier_value": model.group_identifier_value,
        "group_identifier_type_system": model.group_identifier_type_system,
        "group_identifier_type_code": model.group_identifier_type_code,
        "group_identifier_type_display": model.group_identifier_type_display,
        "group_identifier_type_text": model.group_identifier_type_text,
        "status_reason_system": model.status_reason_system,
        "status_reason_code": model.status_reason_code,
        "status_reason_display": model.status_reason_display,
        "status_reason_text": model.status_reason_text,
        "business_status_system": model.business_status_system,
        "business_status_code": model.business_status_code,
        "business_status_display": model.business_status_display,
        "business_status_text": model.business_status_text,
        "code_system": model.code_system,
        "code_code": model.code_code,
        "code_display": model.code_display,
        "code_text": model.code_text,
        "focus_type": model.focus_type,
        "focus_id": model.focus_id,
        "focus_display": model.focus_display,
        "for_type": model.for_type,
        "for_id": model.for_id,
        "for_display": model.for_display,
        "encounter_type": _ev(model.encounter_type),
        "encounter_id": model.encounter_id,
        "encounter_display": model.encounter_display,
        "execution_period_start": model.execution_period_start.isoformat() if model.execution_period_start else None,
        "execution_period_end": model.execution_period_end.isoformat() if model.execution_period_end else None,
        "authored_on": model.authored_on.isoformat() if model.authored_on else None,
        "last_modified": model.last_modified.isoformat() if model.last_modified else None,
        "requester_type": _ev(model.requester_type),
        "requester_id": model.requester_id,
        "requester_display": model.requester_display,
        "owner_type": _ev(model.owner_type),
        "owner_id": model.owner_id,
        "owner_display": model.owner_display,
        "location_type": _ev(model.location_type),
        "location_id": model.location_id,
        "location_display": model.location_display,
        "reason_code_system": model.reason_code_system,
        "reason_code_code": model.reason_code_code,
        "reason_code_display": model.reason_code_display,
        "reason_code_text": model.reason_code_text,
        "reason_reference_type": model.reason_reference_type,
        "reason_reference_id": model.reason_reference_id,
        "reason_reference_display": model.reason_reference_display,
        "restriction_repetitions": model.restriction_repetitions,
        "restriction_period_start": model.restriction_period_start.isoformat() if model.restriction_period_start else None,
        "restriction_period_end": model.restriction_period_end.isoformat() if model.restriction_period_end else None,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
    }

    if model.identifiers:
        result["identifiers"] = [plain_task_identifier(i) for i in model.identifiers]
    if model.based_on:
        result["based_on"] = [plain_task_based_on(b) for b in model.based_on]
    if model.part_of:
        result["part_of"] = [plain_task_part_of(p) for p in model.part_of]
    if model.performer_types:
        result["performer_types"] = [plain_task_performer_type(pt) for pt in model.performer_types]
    if model.insurance:
        result["insurance"] = [plain_task_insurance(ins) for ins in model.insurance]
    if model.notes:
        result["notes"] = [plain_task_note(n) for n in model.notes]
    if model.relevant_history:
        result["relevant_history"] = [plain_task_relevant_history(rh) for rh in model.relevant_history]
    if model.restriction_recipients:
        result["restriction_recipients"] = [plain_task_restriction_recipient(rr) for rr in model.restriction_recipients]
    if model.inputs:
        result["inputs"] = [plain_task_input(i) for i in model.inputs]
    if model.outputs:
        result["outputs"] = [plain_task_output(o) for o in model.outputs]

    return {k: v for k, v in result.items() if v is not None}
