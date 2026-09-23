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


def plain_dr_identifier(i: "DeviceRequestIdentifier") -> dict:
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


def plain_dr_based_on(bo: "DeviceRequestBasedOn") -> dict:
    return {
        "id": bo.id,
        "reference_type": bo.reference_type,
        "reference_id": bo.reference_id,
        "reference_display": bo.reference_display,
    }


def plain_dr_prior_request(pr: "DeviceRequestPriorRequest") -> dict:
    return {
        "id": pr.id,
        "reference_type": pr.reference_type,
        "reference_id": pr.reference_id,
        "reference_display": pr.reference_display,
    }


def plain_dr_parameter(p: "DeviceRequestParameter") -> dict:
    return {
        "id": p.id,
        "code_system": p.code_system,
        "code_code": p.code_code,
        "code_display": p.code_display,
        "code_text": p.code_text,
        "value_concept_system": p.value_concept_system,
        "value_concept_code": p.value_concept_code,
        "value_concept_display": p.value_concept_display,
        "value_concept_text": p.value_concept_text,
        "value_quantity_value": p.value_quantity_value,
        "value_quantity_unit": p.value_quantity_unit,
        "value_quantity_system": p.value_quantity_system,
        "value_quantity_code": p.value_quantity_code,
        "value_range_low_value": p.value_range_low_value,
        "value_range_low_unit": p.value_range_low_unit,
        "value_range_high_value": p.value_range_high_value,
        "value_range_high_unit": p.value_range_high_unit,
        "value_boolean": p.value_boolean,
    }


def plain_dr_reason_code(rc: "DeviceRequestReasonCode") -> dict:
    return {
        "id": rc.id,
        "coding_system": rc.coding_system,
        "coding_code": rc.coding_code,
        "coding_display": rc.coding_display,
        "text": rc.text,
    }


def plain_dr_reason_reference(rr: "DeviceRequestReasonReference") -> dict:
    return {
        "id": rr.id,
        "reference_type": rr.reference_type.value if rr.reference_type else None,
        "reference_id": rr.reference_id,
        "reference_display": rr.reference_display,
    }


def plain_dr_insurance(ins: "DeviceRequestInsurance") -> dict:
    return {
        "id": ins.id,
        "reference_type": ins.reference_type.value if ins.reference_type else None,
        "reference_id": ins.reference_id,
        "reference_display": ins.reference_display,
    }


def plain_dr_supporting_info(si: "DeviceRequestSupportingInfo") -> dict:
    return {
        "id": si.id,
        "reference_type": si.reference_type,
        "reference_id": si.reference_id,
        "reference_display": si.reference_display,
    }


def plain_dr_note(n: "DeviceRequestNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type.value if n.author_reference_type else None,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_dr_relevant_history(rh: "DeviceRequestRelevantHistory") -> dict:
    return {
        "id": rh.id,
        "reference_type": rh.reference_type.value if rh.reference_type else None,
        "reference_id": rh.reference_id,
        "reference_display": rh.reference_display,
    }


def to_plain_device_request(dr: "DeviceRequestModel") -> dict:
    return {
        "id": dr.device_request_id,
        "user_id": dr.user_id,
        "org_id": dr.org_id,
        "status": dr.status.value if dr.status else None,
        "intent": dr.intent.value if dr.intent else None,
        "priority": dr.priority.value if dr.priority else None,
        "code_reference_type": dr.code_reference_type.value if dr.code_reference_type else None,
        "code_reference_id": dr.code_reference_id,
        "code_reference_display": dr.code_reference_display,
        "code_concept_system": dr.code_concept_system,
        "code_concept_code": dr.code_concept_code,
        "code_concept_display": dr.code_concept_display,
        "code_concept_text": dr.code_concept_text,
        "subject_type": dr.subject_type.value if dr.subject_type else None,
        "subject_id": dr.subject_id,
        "subject_display": dr.subject_display,
        "encounter_id": dr.encounter.encounter_id if dr.encounter else None,
        "encounter_display": dr.encounter_display,
        "occurrence_datetime": dr.occurrence_datetime.isoformat() if dr.occurrence_datetime else None,
        "occurrence_period_start": dr.occurrence_period_start.isoformat() if dr.occurrence_period_start else None,
        "occurrence_period_end": dr.occurrence_period_end.isoformat() if dr.occurrence_period_end else None,
        "occurrence_timing_code_system": dr.occurrence_timing_code_system,
        "occurrence_timing_code_code": dr.occurrence_timing_code_code,
        "occurrence_timing_code_display": dr.occurrence_timing_code_display,
        "occurrence_timing_bounds_start": dr.occurrence_timing_bounds_start.isoformat() if dr.occurrence_timing_bounds_start else None,
        "occurrence_timing_bounds_end": dr.occurrence_timing_bounds_end.isoformat() if dr.occurrence_timing_bounds_end else None,
        "occurrence_timing_count": dr.occurrence_timing_count,
        "occurrence_timing_count_max": dr.occurrence_timing_count_max,
        "occurrence_timing_duration": dr.occurrence_timing_duration,
        "occurrence_timing_duration_max": dr.occurrence_timing_duration_max,
        "occurrence_timing_duration_unit": dr.occurrence_timing_duration_unit,
        "occurrence_timing_frequency": dr.occurrence_timing_frequency,
        "occurrence_timing_frequency_max": dr.occurrence_timing_frequency_max,
        "occurrence_timing_period": dr.occurrence_timing_period,
        "occurrence_timing_period_max": dr.occurrence_timing_period_max,
        "occurrence_timing_period_unit": dr.occurrence_timing_period_unit,
        "occurrence_timing_day_of_week": dr.occurrence_timing_day_of_week,
        "occurrence_timing_time_of_day": dr.occurrence_timing_time_of_day,
        "occurrence_timing_when": dr.occurrence_timing_when,
        "occurrence_timing_offset": dr.occurrence_timing_offset,
        "authored_on": dr.authored_on.isoformat() if dr.authored_on else None,
        "requester_type": dr.requester_type.value if dr.requester_type else None,
        "requester_id": dr.requester_id,
        "requester_display": dr.requester_display,
        "performer_type_system": dr.performer_type_system,
        "performer_type_code": dr.performer_type_code,
        "performer_type_display": dr.performer_type_display,
        "performer_type_text": dr.performer_type_text,
        "performer_reference_type": dr.performer_reference_type.value if dr.performer_reference_type else None,
        "performer_reference_id": dr.performer_reference_id,
        "performer_reference_display": dr.performer_reference_display,
        "group_identifier_use": dr.group_identifier_use,
        "group_identifier_type_system": dr.group_identifier_type_system,
        "group_identifier_type_code": dr.group_identifier_type_code,
        "group_identifier_type_display": dr.group_identifier_type_display,
        "group_identifier_type_text": dr.group_identifier_type_text,
        "group_identifier_system": dr.group_identifier_system,
        "group_identifier_value": dr.group_identifier_value,
        "group_identifier_period_start": dr.group_identifier_period_start.isoformat() if dr.group_identifier_period_start else None,
        "group_identifier_period_end": dr.group_identifier_period_end.isoformat() if dr.group_identifier_period_end else None,
        "group_identifier_assigner": dr.group_identifier_assigner,
        "instantiates_canonical": dr.instantiates_canonical,
        "instantiates_uri": dr.instantiates_uri,
        "created_at": dr.created_at.isoformat() if dr.created_at else None,
        "updated_at": dr.updated_at.isoformat() if dr.updated_at else None,
        "created_by": dr.created_by,
        "updated_by": dr.updated_by,
        "identifier": [plain_dr_identifier(i) for i in dr.identifiers] if dr.identifiers else None,
        "based_on": [plain_dr_based_on(b) for b in dr.based_on] if dr.based_on else None,
        "prior_request": [plain_dr_prior_request(p) for p in dr.prior_requests] if dr.prior_requests else None,
        "parameter": [plain_dr_parameter(p) for p in dr.parameters] if dr.parameters else None,
        "reason_code": [plain_dr_reason_code(rc) for rc in dr.reason_codes] if dr.reason_codes else None,
        "reason_reference": [plain_dr_reason_reference(rr) for rr in dr.reason_references] if dr.reason_references else None,
        "insurance": [plain_dr_insurance(ins) for ins in dr.insurance] if dr.insurance else None,
        "supporting_info": [plain_dr_supporting_info(si) for si in dr.supporting_info] if dr.supporting_info else None,
        "note": [plain_dr_note(n) for n in dr.notes] if dr.notes else None,
        "relevant_history": [plain_dr_relevant_history(rh) for rh in dr.relevant_history] if dr.relevant_history else None,
    }
