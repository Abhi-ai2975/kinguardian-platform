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


def plain_mr_identifier(i: "MedicationRequestIdentifier") -> dict:
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


def plain_mr_category(cat: "MedicationRequestCategory") -> dict:
    return {
        "id": cat.id,
        "coding_system": cat.coding_system,
        "coding_code": cat.coding_code,
        "coding_display": cat.coding_display,
        "text": cat.text,
    }


def plain_mr_supporting_info(si: "MedicationRequestSupportingInfo") -> dict:
    return {
        "id": si.id,
        "reference_type": si.reference_type,
        "reference_id": si.reference_id,
        "reference_display": si.reference_display,
    }


def plain_mr_reason_code(rc: "MedicationRequestReasonCode") -> dict:
    return {
        "id": rc.id,
        "coding_system": rc.coding_system,
        "coding_code": rc.coding_code,
        "coding_display": rc.coding_display,
        "text": rc.text,
    }


def plain_mr_reason_reference(rr: "MedicationRequestReasonReference") -> dict:
    return {
        "id": rr.id,
        "reference_type": rr.reference_type.value if rr.reference_type else None,
        "reference_id": rr.reference_id,
        "reference_display": rr.reference_display,
    }


def plain_mr_based_on(bo: "MedicationRequestBasedOn") -> dict:
    return {
        "id": bo.id,
        "reference_type": bo.reference_type.value if bo.reference_type else None,
        "reference_id": bo.reference_id,
        "reference_display": bo.reference_display,
    }


def plain_mr_insurance(ins: "MedicationRequestInsurance") -> dict:
    return {
        "id": ins.id,
        "reference_type": ins.reference_type.value if ins.reference_type else None,
        "reference_id": ins.reference_id,
        "reference_display": ins.reference_display,
    }


def plain_mr_note(n: "MedicationRequestNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type.value if n.author_reference_type else None,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_mr_additional_instruction(ai: "MedicationRequestDosageAdditionalInstruction") -> dict:
    return {
        "id": ai.id,
        "coding_system": ai.coding_system,
        "coding_code": ai.coding_code,
        "coding_display": ai.coding_display,
        "text": ai.text,
    }


def plain_mr_dose_and_rate(dar: "MedicationRequestDosageDoseAndRate") -> dict:
    return {
        "id": dar.id,
        "type_system": dar.type_system,
        "type_code": dar.type_code,
        "type_display": dar.type_display,
        "dose_quantity_value": dar.dose_quantity_value,
        "dose_quantity_unit": dar.dose_quantity_unit,
        "dose_quantity_system": dar.dose_quantity_system,
        "dose_quantity_code": dar.dose_quantity_code,
        "dose_range_low_value": dar.dose_range_low_value,
        "dose_range_low_unit": dar.dose_range_low_unit,
        "dose_range_high_value": dar.dose_range_high_value,
        "dose_range_high_unit": dar.dose_range_high_unit,
        "rate_ratio_numerator_value": dar.rate_ratio_numerator_value,
        "rate_ratio_numerator_unit": dar.rate_ratio_numerator_unit,
        "rate_ratio_denominator_value": dar.rate_ratio_denominator_value,
        "rate_ratio_denominator_unit": dar.rate_ratio_denominator_unit,
        "rate_range_low_value": dar.rate_range_low_value,
        "rate_range_low_unit": dar.rate_range_low_unit,
        "rate_range_high_value": dar.rate_range_high_value,
        "rate_range_high_unit": dar.rate_range_high_unit,
        "rate_quantity_value": dar.rate_quantity_value,
        "rate_quantity_unit": dar.rate_quantity_unit,
        "rate_quantity_system": dar.rate_quantity_system,
        "rate_quantity_code": dar.rate_quantity_code,
    }


def plain_mr_dosage_instruction(di: "MedicationRequestDosageInstruction") -> dict:
    return {
        "id": di.id,
        "sequence": di.sequence,
        "text": di.text,
        "patient_instruction": di.patient_instruction,
        "as_needed_boolean": di.as_needed_boolean,
        "as_needed_system": di.as_needed_system,
        "as_needed_code": di.as_needed_code,
        "as_needed_display": di.as_needed_display,
        "as_needed_text": di.as_needed_text,
        "site_system": di.site_system,
        "site_code": di.site_code,
        "site_display": di.site_display,
        "site_text": di.site_text,
        "route_system": di.route_system,
        "route_code": di.route_code,
        "route_display": di.route_display,
        "route_text": di.route_text,
        "method_system": di.method_system,
        "method_code": di.method_code,
        "method_display": di.method_display,
        "method_text": di.method_text,
        "timing_code_system": di.timing_code_system,
        "timing_code_code": di.timing_code_code,
        "timing_code_display": di.timing_code_display,
        "timing_repeat_bounds_start": di.timing_repeat_bounds_start.isoformat() if di.timing_repeat_bounds_start else None,
        "timing_repeat_bounds_end": di.timing_repeat_bounds_end.isoformat() if di.timing_repeat_bounds_end else None,
        "timing_repeat_count": di.timing_repeat_count,
        "timing_repeat_count_max": di.timing_repeat_count_max,
        "timing_repeat_duration": di.timing_repeat_duration,
        "timing_repeat_duration_max": di.timing_repeat_duration_max,
        "timing_repeat_duration_unit": di.timing_repeat_duration_unit,
        "timing_repeat_frequency": di.timing_repeat_frequency,
        "timing_repeat_frequency_max": di.timing_repeat_frequency_max,
        "timing_repeat_period": di.timing_repeat_period,
        "timing_repeat_period_max": di.timing_repeat_period_max,
        "timing_repeat_period_unit": di.timing_repeat_period_unit,
        "timing_repeat_day_of_week": di.timing_repeat_day_of_week,
        "timing_repeat_time_of_day": di.timing_repeat_time_of_day,
        "timing_repeat_when": di.timing_repeat_when,
        "timing_repeat_offset": di.timing_repeat_offset,
        "max_dose_per_period_numerator_value": di.max_dose_per_period_numerator_value,
        "max_dose_per_period_numerator_unit": di.max_dose_per_period_numerator_unit,
        "max_dose_per_period_denominator_value": di.max_dose_per_period_denominator_value,
        "max_dose_per_period_denominator_unit": di.max_dose_per_period_denominator_unit,
        "max_dose_per_administration_value": di.max_dose_per_administration_value,
        "max_dose_per_administration_unit": di.max_dose_per_administration_unit,
        "max_dose_per_lifetime_value": di.max_dose_per_lifetime_value,
        "max_dose_per_lifetime_unit": di.max_dose_per_lifetime_unit,
        "additional_instruction": [plain_mr_additional_instruction(ai) for ai in di.additional_instructions] if di.additional_instructions else None,
        "dose_and_rate": [plain_mr_dose_and_rate(d) for d in di.dose_and_rates] if di.dose_and_rates else None,
    }


def plain_mr_detected_issue(di: "MedicationRequestDetectedIssue") -> dict:
    return {
        "id": di.id,
        "reference_type": di.reference_type.value if di.reference_type else None,
        "reference_id": di.reference_id,
        "reference_display": di.reference_display,
    }


def plain_mr_event_history(eh: "MedicationRequestEventHistory") -> dict:
    return {
        "id": eh.id,
        "reference_type": eh.reference_type.value if eh.reference_type else None,
        "reference_id": eh.reference_id,
        "reference_display": eh.reference_display,
    }


def to_plain_medication_request(mr: "MedicationRequestModel") -> dict:
    return {
        "id": mr.medication_request_id,
        "user_id": mr.user_id,
        "org_id": mr.org_id,
        "status": mr.status.value if mr.status else None,
        "intent": mr.intent.value if mr.intent else None,
        "priority": mr.priority.value if mr.priority else None,
        "do_not_perform": mr.do_not_perform,
        "status_reason_system": mr.status_reason_system,
        "status_reason_code": mr.status_reason_code,
        "status_reason_display": mr.status_reason_display,
        "status_reason_text": mr.status_reason_text,
        "medication_code_system": mr.medication_code_system,
        "medication_code_code": mr.medication_code_code,
        "medication_code_display": mr.medication_code_display,
        "medication_code_text": mr.medication_code_text,
        "medication_reference_type": mr.medication_reference_type.value if mr.medication_reference_type else None,
        "medication_reference_id": mr.medication_reference_id,
        "medication_reference_display": mr.medication_reference_display,
        "subject_type": mr.subject_type.value if mr.subject_type else None,
        "subject_id": mr.subject_id,
        "subject_display": mr.subject_display,
        "encounter_id": mr.encounter.encounter_id if mr.encounter else None,
        "encounter_display": mr.encounter_display,
        "authored_on": mr.authored_on.isoformat() if mr.authored_on else None,
        "reported_boolean": mr.reported_boolean,
        "reported_reference_type": mr.reported_reference_type.value if mr.reported_reference_type else None,
        "reported_reference_id": mr.reported_reference_id,
        "reported_reference_display": mr.reported_reference_display,
        "requester_type": mr.requester_type.value if mr.requester_type else None,
        "requester_id": mr.requester_id,
        "requester_display": mr.requester_display,
        "performer_type": mr.performer_type.value if mr.performer_type else None,
        "performer_id": mr.performer_id,
        "performer_display": mr.performer_display,
        "performer_type_system": mr.performer_type_system,
        "performer_type_code": mr.performer_type_code,
        "performer_type_display": mr.performer_type_display,
        "performer_type_text": mr.performer_type_text,
        "recorder_type": mr.recorder_type.value if mr.recorder_type else None,
        "recorder_id": mr.recorder_id,
        "recorder_display": mr.recorder_display,
        "group_identifier_use": mr.group_identifier_use,
        "group_identifier_type_system": mr.group_identifier_type_system,
        "group_identifier_type_code": mr.group_identifier_type_code,
        "group_identifier_type_display": mr.group_identifier_type_display,
        "group_identifier_type_text": mr.group_identifier_type_text,
        "group_identifier_system": mr.group_identifier_system,
        "group_identifier_value": mr.group_identifier_value,
        "group_identifier_period_start": mr.group_identifier_period_start.isoformat() if mr.group_identifier_period_start else None,
        "group_identifier_period_end": mr.group_identifier_period_end.isoformat() if mr.group_identifier_period_end else None,
        "group_identifier_assigner": mr.group_identifier_assigner,
        "course_of_therapy_type_system": mr.course_of_therapy_type_system,
        "course_of_therapy_type_code": mr.course_of_therapy_type_code,
        "course_of_therapy_type_display": mr.course_of_therapy_type_display,
        "course_of_therapy_type_text": mr.course_of_therapy_type_text,
        "prior_prescription_type": mr.prior_prescription_type.value if mr.prior_prescription_type else None,
        "prior_prescription_id": mr.prior_prescription_id,
        "prior_prescription_display": mr.prior_prescription_display,
        "instantiates_canonical": mr.instantiates_canonical,
        "instantiates_uri": mr.instantiates_uri,
        "dispense_initial_fill_quantity_value": mr.dispense_initial_fill_quantity_value,
        "dispense_initial_fill_quantity_unit": mr.dispense_initial_fill_quantity_unit,
        "dispense_initial_fill_quantity_system": mr.dispense_initial_fill_quantity_system,
        "dispense_initial_fill_quantity_code": mr.dispense_initial_fill_quantity_code,
        "dispense_initial_fill_duration_value": mr.dispense_initial_fill_duration_value,
        "dispense_initial_fill_duration_unit": mr.dispense_initial_fill_duration_unit,
        "dispense_interval_value": mr.dispense_interval_value,
        "dispense_interval_unit": mr.dispense_interval_unit,
        "dispense_validity_period_start": mr.dispense_validity_period_start.isoformat() if mr.dispense_validity_period_start else None,
        "dispense_validity_period_end": mr.dispense_validity_period_end.isoformat() if mr.dispense_validity_period_end else None,
        "dispense_number_of_repeats_allowed": mr.dispense_number_of_repeats_allowed,
        "dispense_quantity_value": mr.dispense_quantity_value,
        "dispense_quantity_unit": mr.dispense_quantity_unit,
        "dispense_quantity_system": mr.dispense_quantity_system,
        "dispense_quantity_code": mr.dispense_quantity_code,
        "dispense_expected_supply_duration_value": mr.dispense_expected_supply_duration_value,
        "dispense_expected_supply_duration_unit": mr.dispense_expected_supply_duration_unit,
        "dispense_performer_type": mr.dispense_performer_type.value if mr.dispense_performer_type else None,
        "dispense_performer_id": mr.dispense_performer_id,
        "dispense_performer_display": mr.dispense_performer_display,
        "substitution_allowed_boolean": mr.substitution_allowed_boolean,
        "substitution_allowed_system": mr.substitution_allowed_system,
        "substitution_allowed_code": mr.substitution_allowed_code,
        "substitution_allowed_display": mr.substitution_allowed_display,
        "substitution_allowed_text": mr.substitution_allowed_text,
        "substitution_reason_system": mr.substitution_reason_system,
        "substitution_reason_code": mr.substitution_reason_code,
        "substitution_reason_display": mr.substitution_reason_display,
        "substitution_reason_text": mr.substitution_reason_text,
        "created_at": mr.created_at.isoformat() if mr.created_at else None,
        "updated_at": mr.updated_at.isoformat() if mr.updated_at else None,
        "created_by": mr.created_by,
        "updated_by": mr.updated_by,
        "identifier": [plain_mr_identifier(i) for i in mr.identifiers] if mr.identifiers else None,
        "category": [plain_mr_category(c) for c in mr.categories] if mr.categories else None,
        "supporting_info": [plain_mr_supporting_info(si) for si in mr.supporting_info] if mr.supporting_info else None,
        "reason_code": [plain_mr_reason_code(rc) for rc in mr.reason_codes] if mr.reason_codes else None,
        "reason_reference": [plain_mr_reason_reference(rr) for rr in mr.reason_references] if mr.reason_references else None,
        "based_on": [plain_mr_based_on(b) for b in mr.based_on] if mr.based_on else None,
        "insurance": [plain_mr_insurance(ins) for ins in mr.insurance] if mr.insurance else None,
        "note": [plain_mr_note(n) for n in mr.notes] if mr.notes else None,
        "dosage_instruction": [plain_mr_dosage_instruction(di) for di in mr.dosage_instructions] if mr.dosage_instructions else None,
        "detected_issue": [plain_mr_detected_issue(di) for di in mr.detected_issues] if mr.detected_issues else None,
        "event_history": [plain_mr_event_history(eh) for eh in mr.event_history] if mr.event_history else None,
    }
