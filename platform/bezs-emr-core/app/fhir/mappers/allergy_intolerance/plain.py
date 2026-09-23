from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.allergy_intolerance.allergy_intolerance import (
        AllergyIntoleranceCategory,
        AllergyIntoleranceIdentifier,
        AllergyIntoleranceModel,
        AllergyIntoleranceNote,
        AllergyIntoleranceReaction,
        AllergyIntoleranceReactionManifestation,
        AllergyIntoleranceReactionNote,
    )


def _ev(v):
    """Extract enum value or return as-is."""
    return v.value if v and hasattr(v, "value") else v


def plain_allergy_intolerance_identifier(i: "AllergyIntoleranceIdentifier") -> dict:
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


def plain_allergy_intolerance_category(c: "AllergyIntoleranceCategory") -> dict:
    return {
        "id": c.id,
        "category": _ev(c.category),
    }


def plain_allergy_intolerance_note(n: "AllergyIntoleranceNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_allergy_intolerance_reaction_manifestation(m: "AllergyIntoleranceReactionManifestation") -> dict:
    return {
        "id": m.id,
        "coding_system": m.coding_system,
        "coding_code": m.coding_code,
        "coding_display": m.coding_display,
        "text": m.text,
    }


def plain_allergy_intolerance_reaction_note(n: "AllergyIntoleranceReactionNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_allergy_intolerance_reaction(r: "AllergyIntoleranceReaction") -> dict:
    return {
        "id": r.id,
        "substance_system": r.substance_system,
        "substance_code": r.substance_code,
        "substance_display": r.substance_display,
        "substance_text": r.substance_text,
        "description": r.description,
        "onset": r.onset.isoformat() if r.onset else None,
        "severity": _ev(r.severity),
        "exposure_route_system": r.exposure_route_system,
        "exposure_route_code": r.exposure_route_code,
        "exposure_route_display": r.exposure_route_display,
        "exposure_route_text": r.exposure_route_text,
        "manifestations": [plain_allergy_intolerance_reaction_manifestation(m) for m in r.manifestations],
        "reaction_notes": [plain_allergy_intolerance_reaction_note(n) for n in r.reaction_notes],
    }


def to_plain_allergy_intolerance(model: "AllergyIntoleranceModel") -> dict:
    result: dict = {
        "id": model.allergy_intolerance_id,
        "clinical_status_system": model.clinical_status_system,
        "clinical_status_code": model.clinical_status_code,
        "clinical_status_display": model.clinical_status_display,
        "clinical_status_text": model.clinical_status_text,
        "verification_status_system": model.verification_status_system,
        "verification_status_code": model.verification_status_code,
        "verification_status_display": model.verification_status_display,
        "verification_status_text": model.verification_status_text,
        "type": _ev(model.type),
        "criticality": _ev(model.criticality),
        "code_system": model.code_system,
        "code_code": model.code_code,
        "code_display": model.code_display,
        "code_text": model.code_text,
        "patient_type": _ev(model.patient_type),
        "patient_id": model.patient_id,
        "patient_display": model.patient_display,
        "encounter_type": _ev(model.encounter_type),
        "encounter_id": model.encounter_id,
        "encounter_display": model.encounter_display,
        "onset_date_time": model.onset_date_time.isoformat() if model.onset_date_time else None,
        "onset_age_value": float(model.onset_age_value) if model.onset_age_value is not None else None,
        "onset_age_comparator": model.onset_age_comparator,
        "onset_age_unit": model.onset_age_unit,
        "onset_age_system": model.onset_age_system,
        "onset_age_code": model.onset_age_code,
        "onset_period_start": model.onset_period_start.isoformat() if model.onset_period_start else None,
        "onset_period_end": model.onset_period_end.isoformat() if model.onset_period_end else None,
        "onset_range_low_value": float(model.onset_range_low_value) if model.onset_range_low_value is not None else None,
        "onset_range_low_unit": model.onset_range_low_unit,
        "onset_range_low_system": model.onset_range_low_system,
        "onset_range_low_code": model.onset_range_low_code,
        "onset_range_high_value": float(model.onset_range_high_value) if model.onset_range_high_value is not None else None,
        "onset_range_high_unit": model.onset_range_high_unit,
        "onset_range_high_system": model.onset_range_high_system,
        "onset_range_high_code": model.onset_range_high_code,
        "onset_string": model.onset_string,
        "recorded_date": model.recorded_date.isoformat() if model.recorded_date else None,
        "recorder_type": _ev(model.recorder_type),
        "recorder_id": model.recorder_id,
        "recorder_display": model.recorder_display,
        "asserter_type": _ev(model.asserter_type),
        "asserter_id": model.asserter_id,
        "asserter_display": model.asserter_display,
        "last_occurrence": model.last_occurrence.isoformat() if model.last_occurrence else None,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
    }

    if model.identifiers:
        result["identifiers"] = [plain_allergy_intolerance_identifier(i) for i in model.identifiers]
    if model.categories:
        result["categories"] = [plain_allergy_intolerance_category(c) for c in model.categories]
    if model.notes:
        result["notes"] = [plain_allergy_intolerance_note(n) for n in model.notes]
    if model.reactions:
        result["reactions"] = [plain_allergy_intolerance_reaction(r) for r in model.reactions]

    return {k: v for k, v in result.items() if v is not None}
