from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.care_plan.care_plan import (
        CarePlanActivity,
        CarePlanModel,
    )


def _ev(v):
    return v.value if v and hasattr(v, "value") else v


def _dt(v):
    return v.isoformat() if v else None


def plain_care_plan_activity(a: "CarePlanActivity") -> dict:
    return {k: v for k, v in {
        "id": a.id,
        "reference_type": _ev(a.reference_type),
        "reference_id": a.reference_id,
        "reference_display": a.reference_display,
        "detail_kind": a.detail_kind,
        "detail_instantiates_canonical": a.detail_instantiates_canonical,
        "detail_instantiates_uri": a.detail_instantiates_uri,
        "detail_code_system": a.detail_code_system,
        "detail_code_code": a.detail_code_code,
        "detail_code_display": a.detail_code_display,
        "detail_code_text": a.detail_code_text,
        "detail_status": _ev(a.detail_status),
        "detail_status_reason_system": a.detail_status_reason_system,
        "detail_status_reason_code": a.detail_status_reason_code,
        "detail_status_reason_display": a.detail_status_reason_display,
        "detail_status_reason_text": a.detail_status_reason_text,
        "detail_do_not_perform": a.detail_do_not_perform,
        "detail_scheduled_timing_event": a.detail_scheduled_timing_event,
        "detail_scheduled_timing_code_system": a.detail_scheduled_timing_code_system,
        "detail_scheduled_timing_code_code": a.detail_scheduled_timing_code_code,
        "detail_scheduled_timing_code_display": a.detail_scheduled_timing_code_display,
        "detail_scheduled_timing_code_text": a.detail_scheduled_timing_code_text,
        "detail_scheduled_timing_repeat_count": a.detail_scheduled_timing_repeat_count,
        "detail_scheduled_timing_repeat_count_max": a.detail_scheduled_timing_repeat_count_max,
        "detail_scheduled_timing_repeat_duration": float(a.detail_scheduled_timing_repeat_duration) if a.detail_scheduled_timing_repeat_duration is not None else None,
        "detail_scheduled_timing_repeat_duration_max": float(a.detail_scheduled_timing_repeat_duration_max) if a.detail_scheduled_timing_repeat_duration_max is not None else None,
        "detail_scheduled_timing_repeat_duration_unit": a.detail_scheduled_timing_repeat_duration_unit,
        "detail_scheduled_timing_repeat_frequency": a.detail_scheduled_timing_repeat_frequency,
        "detail_scheduled_timing_repeat_frequency_max": a.detail_scheduled_timing_repeat_frequency_max,
        "detail_scheduled_timing_repeat_period": float(a.detail_scheduled_timing_repeat_period) if a.detail_scheduled_timing_repeat_period is not None else None,
        "detail_scheduled_timing_repeat_period_max": float(a.detail_scheduled_timing_repeat_period_max) if a.detail_scheduled_timing_repeat_period_max is not None else None,
        "detail_scheduled_timing_repeat_period_unit": a.detail_scheduled_timing_repeat_period_unit,
        "detail_scheduled_timing_repeat_day_of_week": a.detail_scheduled_timing_repeat_day_of_week,
        "detail_scheduled_timing_repeat_time_of_day": a.detail_scheduled_timing_repeat_time_of_day,
        "detail_scheduled_timing_repeat_when": a.detail_scheduled_timing_repeat_when,
        "detail_scheduled_timing_repeat_offset": a.detail_scheduled_timing_repeat_offset,
        "detail_scheduled_timing_repeat_bounds_start": _dt(a.detail_scheduled_timing_repeat_bounds_start),
        "detail_scheduled_timing_repeat_bounds_end": _dt(a.detail_scheduled_timing_repeat_bounds_end),
        "detail_scheduled_period_start": _dt(a.detail_scheduled_period_start),
        "detail_scheduled_period_end": _dt(a.detail_scheduled_period_end),
        "detail_scheduled_string": a.detail_scheduled_string,
        "detail_location_type": _ev(a.detail_location_type),
        "detail_location_id": a.detail_location_id,
        "detail_location_display": a.detail_location_display,
        "detail_product_codeable_concept_system": a.detail_product_codeable_concept_system,
        "detail_product_codeable_concept_code": a.detail_product_codeable_concept_code,
        "detail_product_codeable_concept_display": a.detail_product_codeable_concept_display,
        "detail_product_codeable_concept_text": a.detail_product_codeable_concept_text,
        "detail_product_reference_type": _ev(a.detail_product_reference_type),
        "detail_product_reference_id": a.detail_product_reference_id,
        "detail_product_reference_display": a.detail_product_reference_display,
        "detail_daily_amount_value": float(a.detail_daily_amount_value) if a.detail_daily_amount_value is not None else None,
        "detail_daily_amount_unit": a.detail_daily_amount_unit,
        "detail_daily_amount_system": a.detail_daily_amount_system,
        "detail_daily_amount_code": a.detail_daily_amount_code,
        "detail_quantity_value": float(a.detail_quantity_value) if a.detail_quantity_value is not None else None,
        "detail_quantity_unit": a.detail_quantity_unit,
        "detail_quantity_system": a.detail_quantity_system,
        "detail_quantity_code": a.detail_quantity_code,
        "detail_description": a.detail_description,
        "outcome_codeable_concepts": [
            {"id": oc.id, "coding_system": oc.coding_system, "coding_code": oc.coding_code,
             "coding_display": oc.coding_display, "text": oc.text}
            for oc in a.outcome_codeable_concepts
        ] if a.outcome_codeable_concepts else None,
        "outcome_references": [
            {"id": r.id, "reference_type": r.reference_type, "reference_id": r.reference_id, "reference_display": r.reference_display}
            for r in a.outcome_references
        ] if a.outcome_references else None,
        "progress": [
            {"id": p.id, "text": p.text, "time": _dt(p.time), "author_string": p.author_string,
             "author_reference_type": p.author_reference_type, "author_reference_id": p.author_reference_id,
             "author_reference_display": p.author_reference_display}
            for p in a.progress
        ] if a.progress else None,
        "detail_reason_codes": [
            {"id": rc.id, "coding_system": rc.coding_system, "coding_code": rc.coding_code,
             "coding_display": rc.coding_display, "text": rc.text}
            for rc in a.detail_reason_codes
        ] if a.detail_reason_codes else None,
        "detail_reason_references": [
            {"id": rr.id, "reference_type": _ev(rr.reference_type), "reference_id": rr.reference_id, "reference_display": rr.reference_display}
            for rr in a.detail_reason_references
        ] if a.detail_reason_references else None,
        "detail_goals": [
            {"id": g.id, "reference_type": _ev(g.reference_type), "reference_id": g.reference_id, "reference_display": g.reference_display}
            for g in a.detail_goals
        ] if a.detail_goals else None,
        "detail_performers": [
            {"id": dp.id, "reference_type": _ev(dp.reference_type), "reference_id": dp.reference_id, "reference_display": dp.reference_display}
            for dp in a.detail_performers
        ] if a.detail_performers else None,
    }.items() if v is not None}


def to_plain_care_plan(model: "CarePlanModel") -> dict:
    result: dict = {
        "id": model.care_plan_id,
        "status": _ev(model.status),
        "intent": _ev(model.intent),
        "title": model.title,
        "description": model.description,
        "instantiates_canonical": model.instantiates_canonical,
        "instantiates_uri": model.instantiates_uri,
        "subject_type": _ev(model.subject_type),
        "subject_id": model.subject_id,
        "subject_display": model.subject_display,
        "encounter_type": _ev(model.encounter_type),
        "encounter_id": model.encounter_id,
        "encounter_display": model.encounter_display,
        "period_start": _dt(model.period_start),
        "period_end": _dt(model.period_end),
        "created": _dt(model.created),
        "author_type": _ev(model.author_type),
        "author_id": model.author_id,
        "author_display": model.author_display,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": _dt(model.created_at),
        "updated_at": _dt(model.updated_at),
        "created_by": model.created_by,
        "updated_by": model.updated_by,
        "identifiers": [
            {"id": i.id, "use": i.use, "type_system": i.type_system, "type_code": i.type_code,
             "type_display": i.type_display, "type_text": i.type_text, "system": i.system,
             "value": i.value, "period_start": _dt(i.period_start), "period_end": _dt(i.period_end),
             "assigner": i.assigner}
            for i in model.identifiers
        ] if model.identifiers else None,
        "based_on": [
            {"id": b.id, "reference_type": _ev(b.reference_type), "reference_id": b.reference_id, "reference_display": b.reference_display}
            for b in model.based_on
        ] if model.based_on else None,
        "replaces": [
            {"id": r.id, "reference_type": _ev(r.reference_type), "reference_id": r.reference_id, "reference_display": r.reference_display}
            for r in model.replaces
        ] if model.replaces else None,
        "part_of": [
            {"id": p.id, "reference_type": _ev(p.reference_type), "reference_id": p.reference_id, "reference_display": p.reference_display}
            for p in model.part_of
        ] if model.part_of else None,
        "categories": [
            {"id": c.id, "coding_system": c.coding_system, "coding_code": c.coding_code,
             "coding_display": c.coding_display, "text": c.text}
            for c in model.categories
        ] if model.categories else None,
        "contributors": [
            {"id": c.id, "reference_type": _ev(c.reference_type), "reference_id": c.reference_id, "reference_display": c.reference_display}
            for c in model.contributors
        ] if model.contributors else None,
        "care_teams": [
            {"id": ct.id, "reference_type": _ev(ct.reference_type), "reference_id": ct.reference_id, "reference_display": ct.reference_display}
            for ct in model.care_teams
        ] if model.care_teams else None,
        "addresses": [
            {"id": ad.id, "reference_type": _ev(ad.reference_type), "reference_id": ad.reference_id, "reference_display": ad.reference_display}
            for ad in model.addresses
        ] if model.addresses else None,
        "supporting_info": [
            {"id": si.id, "reference_type": si.reference_type, "reference_id": si.reference_id, "reference_display": si.reference_display}
            for si in model.supporting_info
        ] if model.supporting_info else None,
        "goals": [
            {"id": g.id, "reference_type": _ev(g.reference_type), "reference_id": g.reference_id, "reference_display": g.reference_display}
            for g in model.goals
        ] if model.goals else None,
        "activities": [plain_care_plan_activity(a) for a in model.activities] if model.activities else None,
        "notes": [
            {"id": n.id, "text": n.text, "time": _dt(n.time), "author_string": n.author_string,
             "author_reference_type": n.author_reference_type, "author_reference_id": n.author_reference_id,
             "author_reference_display": n.author_reference_display}
            for n in model.notes
        ] if model.notes else None,
    }
    return {k: v for k, v in result.items() if v is not None}
