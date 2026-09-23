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


def plain_condition_identifier(i: "ConditionIdentifier") -> dict:
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


def plain_condition_category(cat: "ConditionCategory") -> dict:
    return {
        "id": cat.id,
        "coding_system": cat.coding_system,
        "coding_code": cat.coding_code,
        "coding_display": cat.coding_display,
        "text": cat.text,
    }


def plain_condition_body_site(bs: "ConditionBodySite") -> dict:
    return {
        "id": bs.id,
        "coding_system": bs.coding_system,
        "coding_code": bs.coding_code,
        "coding_display": bs.coding_display,
        "text": bs.text,
    }


def plain_condition_stage(s: "ConditionStage") -> dict:
    entry: dict = {
        "id": s.id,
        "summary_system": s.summary_system,
        "summary_code": s.summary_code,
        "summary_display": s.summary_display,
        "summary_text": s.summary_text,
        "type_system": s.type_system,
        "type_code": s.type_code,
        "type_display": s.type_display,
        "type_text": s.type_text,
    }
    if s.assessments:
        entry["assessment"] = [
            {
                "id": a.id,
                "reference_type": a.reference_type.value if a.reference_type else None,
                "reference_id": a.reference_id,
                "reference_display": a.reference_display,
            }
            for a in s.assessments
        ]
    return entry


def plain_condition_evidence(e: "ConditionEvidence") -> dict:
    entry: dict = {"id": e.id}
    if e.codes:
        entry["code"] = [
            {
                "id": ec.id,
                "coding_system": ec.coding_system,
                "coding_code": ec.coding_code,
                "coding_display": ec.coding_display,
                "text": ec.text,
            }
            for ec in e.codes
        ]
    if e.details:
        entry["detail"] = [
            {
                "id": d.id,
                "reference_type": d.reference_type,
                "reference_id": d.reference_id,
                "reference_display": d.reference_display,
            }
            for d in e.details
        ]
    return entry


def plain_condition_note(n: "ConditionNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type.value if n.author_reference_type else None,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def to_plain_condition(condition: "ConditionModel") -> dict:
    result: dict = {
        "id": condition.condition_id,
        "user_id": condition.user_id,
        "org_id": condition.org_id,
        "clinical_status_system": condition.clinical_status_system,
        "clinical_status_code": condition.clinical_status_code,
        "clinical_status_display": condition.clinical_status_display,
        "clinical_status_text": condition.clinical_status_text,
        "verification_status_system": condition.verification_status_system,
        "verification_status_code": condition.verification_status_code,
        "verification_status_display": condition.verification_status_display,
        "verification_status_text": condition.verification_status_text,
        "severity_system": condition.severity_system,
        "severity_code": condition.severity_code,
        "severity_display": condition.severity_display,
        "severity_text": condition.severity_text,
        "code_system": condition.code_system,
        "code_code": condition.code_code,
        "code_display": condition.code_display,
        "code_text": condition.code_text,
        "subject_type": condition.subject_type.value if condition.subject_type else None,
        "subject_id": condition.subject_id,
        "subject_display": condition.subject_display,
        "encounter_id": (
            condition.encounter.encounter_id
            if condition.encounter and condition.encounter.encounter_id
            else None
        ),
        "encounter_display": condition.encounter_display,
        "onset_datetime": condition.onset_datetime.isoformat() if condition.onset_datetime else None,
        "onset_age_value": condition.onset_age_value,
        "onset_age_comparator": condition.onset_age_comparator,
        "onset_age_unit": condition.onset_age_unit,
        "onset_age_system": condition.onset_age_system,
        "onset_age_code": condition.onset_age_code,
        "onset_period_start": condition.onset_period_start.isoformat() if condition.onset_period_start else None,
        "onset_period_end": condition.onset_period_end.isoformat() if condition.onset_period_end else None,
        "onset_range_low_value": condition.onset_range_low_value,
        "onset_range_low_unit": condition.onset_range_low_unit,
        "onset_range_high_value": condition.onset_range_high_value,
        "onset_range_high_unit": condition.onset_range_high_unit,
        "onset_string": condition.onset_string,
        "abatement_datetime": condition.abatement_datetime.isoformat() if condition.abatement_datetime else None,
        "abatement_age_value": condition.abatement_age_value,
        "abatement_age_comparator": condition.abatement_age_comparator,
        "abatement_age_unit": condition.abatement_age_unit,
        "abatement_age_system": condition.abatement_age_system,
        "abatement_age_code": condition.abatement_age_code,
        "abatement_period_start": condition.abatement_period_start.isoformat() if condition.abatement_period_start else None,
        "abatement_period_end": condition.abatement_period_end.isoformat() if condition.abatement_period_end else None,
        "abatement_range_low_value": condition.abatement_range_low_value,
        "abatement_range_low_unit": condition.abatement_range_low_unit,
        "abatement_range_high_value": condition.abatement_range_high_value,
        "abatement_range_high_unit": condition.abatement_range_high_unit,
        "abatement_string": condition.abatement_string,
        "recorded_date": condition.recorded_date.isoformat() if condition.recorded_date else None,
        "recorder_type": condition.recorder_type.value if condition.recorder_type else None,
        "recorder_id": condition.recorder_id,
        "recorder_display": condition.recorder_display,
        "asserter_type": condition.asserter_type.value if condition.asserter_type else None,
        "asserter_id": condition.asserter_id,
        "asserter_display": condition.asserter_display,
        "created_at": condition.created_at.isoformat() if condition.created_at else None,
        "updated_at": condition.updated_at.isoformat() if condition.updated_at else None,
        "created_by": condition.created_by,
        "updated_by": condition.updated_by,
    }

    if condition.identifiers:
        result["identifier"] = [plain_condition_identifier(i) for i in condition.identifiers]
    if condition.categories:
        result["category"] = [plain_condition_category(c) for c in condition.categories]
    if condition.body_sites:
        result["body_site"] = [plain_condition_body_site(bs) for bs in condition.body_sites]
    if condition.stages:
        result["stage"] = [plain_condition_stage(s) for s in condition.stages]
    if condition.evidence:
        result["evidence"] = [plain_condition_evidence(e) for e in condition.evidence]
    if condition.notes:
        result["note"] = [plain_condition_note(n) for n in condition.notes]

    return {k: v for k, v in result.items() if v is not None}
