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


def plain_sr_identifier(i: "ServiceRequestIdentifier") -> dict:
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


def plain_sr_category(cat: "ServiceRequestCategory") -> dict:
    return {
        "id": cat.id,
        "coding_system": cat.coding_system,
        "coding_code": cat.coding_code,
        "coding_display": cat.coding_display,
        "text": cat.text,
    }


def plain_sr_order_detail(od: "ServiceRequestOrderDetail") -> dict:
    return {
        "id": od.id,
        "coding_system": od.coding_system,
        "coding_code": od.coding_code,
        "coding_display": od.coding_display,
        "text": od.text,
    }


def plain_sr_performer(p: "ServiceRequestPerformer") -> dict:
    return {
        "id": p.id,
        "reference_type": p.reference_type.value if p.reference_type else None,
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_sr_location_code(lc: "ServiceRequestLocationCode") -> dict:
    return {
        "id": lc.id,
        "coding_system": lc.coding_system,
        "coding_code": lc.coding_code,
        "coding_display": lc.coding_display,
        "text": lc.text,
    }


def plain_sr_location_reference(lr: "ServiceRequestLocationReference") -> dict:
    return {
        "id": lr.id,
        "reference_type": lr.reference_type.value if lr.reference_type else None,
        "reference_id": lr.reference_id,
        "reference_display": lr.reference_display,
    }


def plain_sr_reason_code(rc: "ServiceRequestReasonCode") -> dict:
    return {
        "id": rc.id,
        "coding_system": rc.coding_system,
        "coding_code": rc.coding_code,
        "coding_display": rc.coding_display,
        "text": rc.text,
    }


def plain_sr_reason_reference(rr: "ServiceRequestReasonReference") -> dict:
    return {
        "id": rr.id,
        "reference_type": rr.reference_type.value if rr.reference_type else None,
        "reference_id": rr.reference_id,
        "reference_display": rr.reference_display,
    }


def plain_sr_insurance(ins: "ServiceRequestInsurance") -> dict:
    return {
        "id": ins.id,
        "reference_type": ins.reference_type.value if ins.reference_type else None,
        "reference_id": ins.reference_id,
        "reference_display": ins.reference_display,
    }


def plain_sr_supporting_info(si: "ServiceRequestSupportingInfo") -> dict:
    return {
        "id": si.id,
        "reference_type": si.reference_type,
        "reference_id": si.reference_id,
        "reference_display": si.reference_display,
    }


def plain_sr_specimen(sp: "ServiceRequestSpecimen") -> dict:
    return {
        "id": sp.id,
        "reference_type": sp.reference_type.value if sp.reference_type else None,
        "reference_id": sp.reference_id,
        "reference_display": sp.reference_display,
    }


def plain_sr_body_site(bs: "ServiceRequestBodySite") -> dict:
    return {
        "id": bs.id,
        "coding_system": bs.coding_system,
        "coding_code": bs.coding_code,
        "coding_display": bs.coding_display,
        "text": bs.text,
    }


def plain_sr_note(n: "ServiceRequestNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type.value if n.author_reference_type else None,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_sr_relevant_history(rh: "ServiceRequestRelevantHistory") -> dict:
    return {
        "id": rh.id,
        "reference_type": rh.reference_type.value if rh.reference_type else None,
        "reference_id": rh.reference_id,
        "reference_display": rh.reference_display,
    }


def plain_sr_based_on(bo: "ServiceRequestBasedOn") -> dict:
    return {
        "id": bo.id,
        "reference_type": bo.reference_type.value if bo.reference_type else None,
        "reference_id": bo.reference_id,
        "reference_display": bo.reference_display,
    }


def plain_sr_replaces(r: "ServiceRequestReplaces") -> dict:
    return {
        "id": r.id,
        "reference_type": r.reference_type.value if r.reference_type else None,
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }


def to_plain_service_request(sr: "ServiceRequestModel") -> dict:
    return {
        "id": sr.service_request_id,
        "user_id": sr.user_id,
        "org_id": sr.org_id,
        "status": sr.status.value if sr.status else None,
        "intent": sr.intent.value if sr.intent else None,
        "priority": sr.priority.value if sr.priority else None,
        "do_not_perform": sr.do_not_perform,
        "code_system": sr.code_system,
        "code_code": sr.code_code,
        "code_display": sr.code_display,
        "code_text": sr.code_text,
        "subject_type": sr.subject_type.value if sr.subject_type else None,
        "subject_id": sr.subject_id,
        "subject_display": sr.subject_display,
        "encounter_id": sr.encounter.encounter_id if sr.encounter else None,
        "encounter_display": sr.encounter_display,
        "occurrence_datetime": sr.occurrence_datetime.isoformat() if sr.occurrence_datetime else None,
        "occurrence_period_start": sr.occurrence_period_start.isoformat() if sr.occurrence_period_start else None,
        "occurrence_period_end": sr.occurrence_period_end.isoformat() if sr.occurrence_period_end else None,
        "occurrence_timing_frequency": sr.occurrence_timing_frequency,
        "occurrence_timing_period": sr.occurrence_timing_period,
        "occurrence_timing_period_unit": sr.occurrence_timing_period_unit,
        "occurrence_timing_bounds_start": sr.occurrence_timing_bounds_start.isoformat() if sr.occurrence_timing_bounds_start else None,
        "occurrence_timing_bounds_end": sr.occurrence_timing_bounds_end.isoformat() if sr.occurrence_timing_bounds_end else None,
        "as_needed_boolean": sr.as_needed_boolean,
        "as_needed_system": sr.as_needed_system,
        "as_needed_code": sr.as_needed_code,
        "as_needed_display": sr.as_needed_display,
        "as_needed_text": sr.as_needed_text,
        "authored_on": sr.authored_on.isoformat() if sr.authored_on else None,
        "requester_type": sr.requester_type.value if sr.requester_type else None,
        "requester_id": sr.requester_id,
        "requester_display": sr.requester_display,
        "performer_type_system": sr.performer_type_system,
        "performer_type_code": sr.performer_type_code,
        "performer_type_display": sr.performer_type_display,
        "performer_type_text": sr.performer_type_text,
        "quantity_value": sr.quantity_value,
        "quantity_unit": sr.quantity_unit,
        "quantity_system": sr.quantity_system,
        "quantity_code": sr.quantity_code,
        "quantity_ratio_numerator_value": sr.quantity_ratio_numerator_value,
        "quantity_ratio_numerator_unit": sr.quantity_ratio_numerator_unit,
        "quantity_ratio_denominator_value": sr.quantity_ratio_denominator_value,
        "quantity_ratio_denominator_unit": sr.quantity_ratio_denominator_unit,
        "quantity_range_low_value": sr.quantity_range_low_value,
        "quantity_range_low_unit": sr.quantity_range_low_unit,
        "quantity_range_high_value": sr.quantity_range_high_value,
        "quantity_range_high_unit": sr.quantity_range_high_unit,
        "requisition_use": sr.requisition_use,
        "requisition_type_system": sr.requisition_type_system,
        "requisition_type_code": sr.requisition_type_code,
        "requisition_type_display": sr.requisition_type_display,
        "requisition_type_text": sr.requisition_type_text,
        "requisition_system": sr.requisition_system,
        "requisition_value": sr.requisition_value,
        "requisition_period_start": sr.requisition_period_start.isoformat() if sr.requisition_period_start else None,
        "requisition_period_end": sr.requisition_period_end.isoformat() if sr.requisition_period_end else None,
        "requisition_assigner": sr.requisition_assigner,
        "instantiates_canonical": sr.instantiates_canonical,
        "instantiates_uri": sr.instantiates_uri,
        "patient_instruction": sr.patient_instruction,
        "created_at": sr.created_at.isoformat() if sr.created_at else None,
        "updated_at": sr.updated_at.isoformat() if sr.updated_at else None,
        "created_by": sr.created_by,
        "updated_by": sr.updated_by,
        "identifier": [plain_sr_identifier(i) for i in sr.identifiers] if sr.identifiers else None,
        "category": [plain_sr_category(c) for c in sr.categories] if sr.categories else None,
        "order_detail": [plain_sr_order_detail(od) for od in sr.order_details] if sr.order_details else None,
        "performer": [plain_sr_performer(p) for p in sr.performers] if sr.performers else None,
        "location_code": [plain_sr_location_code(lc) for lc in sr.location_codes] if sr.location_codes else None,
        "location_reference": [plain_sr_location_reference(lr) for lr in sr.location_references] if sr.location_references else None,
        "reason_code": [plain_sr_reason_code(rc) for rc in sr.reason_codes] if sr.reason_codes else None,
        "reason_reference": [plain_sr_reason_reference(rr) for rr in sr.reason_references] if sr.reason_references else None,
        "insurance": [plain_sr_insurance(ins) for ins in sr.insurance] if sr.insurance else None,
        "supporting_info": [plain_sr_supporting_info(si) for si in sr.supporting_info] if sr.supporting_info else None,
        "specimen": [plain_sr_specimen(sp) for sp in sr.specimens] if sr.specimens else None,
        "body_site": [plain_sr_body_site(bs) for bs in sr.body_sites] if sr.body_sites else None,
        "note": [plain_sr_note(n) for n in sr.notes] if sr.notes else None,
        "relevant_history": [plain_sr_relevant_history(rh) for rh in sr.relevant_history] if sr.relevant_history else None,
        "based_on": [plain_sr_based_on(bo) for bo in sr.based_on] if sr.based_on else None,
        "replaces": [plain_sr_replaces(r) for r in sr.replaces] if sr.replaces else None,
    }
