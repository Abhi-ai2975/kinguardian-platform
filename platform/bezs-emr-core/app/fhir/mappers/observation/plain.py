from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.models.observation.observation import (
        ObservationModel,
        ObservationIdentifier,
        ObservationBasedOn,
        ObservationPartOf,
        ObservationCategory,
        ObservationFocus,
        ObservationPerformer,
        ObservationInterpretation,
        ObservationNote,
        ObservationReferenceRange,
        ObservationReferenceRangeAppliesTo,
        ObservationHasMember,
        ObservationDerivedFrom,
        ObservationComponent,
        ObservationComponentInterpretation,
        ObservationComponentReferenceRange,
        ObservationComponentReferenceRangeAppliesTo,
    )


def _plain_value_x(obj: Any) -> dict:
    """Emit all value[x] fields as flat snake_case keys (null for unset variants)."""
    return {
        "value_quantity_value": float(obj.value_quantity_value) if obj.value_quantity_value is not None else None,
        "value_quantity_comparator": obj.value_quantity_comparator,
        "value_quantity_unit": obj.value_quantity_unit,
        "value_quantity_system": obj.value_quantity_system,
        "value_quantity_code": obj.value_quantity_code,
        "value_codeable_concept_system": obj.value_codeable_concept_system,
        "value_codeable_concept_code": obj.value_codeable_concept_code,
        "value_codeable_concept_display": obj.value_codeable_concept_display,
        "value_codeable_concept_text": obj.value_codeable_concept_text,
        "value_string": obj.value_string,
        "value_boolean": obj.value_boolean,
        "value_integer": obj.value_integer,
        "value_time": obj.value_time,
        "value_date_time": obj.value_date_time.isoformat() if obj.value_date_time else None,
        "value_period_start": obj.value_period_start.isoformat() if obj.value_period_start else None,
        "value_period_end": obj.value_period_end.isoformat() if obj.value_period_end else None,
        "value_range_low_value": float(obj.value_range_low_value) if obj.value_range_low_value is not None else None,
        "value_range_low_unit": obj.value_range_low_unit,
        "value_range_low_system": obj.value_range_low_system,
        "value_range_low_code": obj.value_range_low_code,
        "value_range_high_value": float(obj.value_range_high_value) if obj.value_range_high_value is not None else None,
        "value_range_high_unit": obj.value_range_high_unit,
        "value_range_high_system": obj.value_range_high_system,
        "value_range_high_code": obj.value_range_high_code,
        "value_ratio_numerator_value": float(obj.value_ratio_numerator_value) if obj.value_ratio_numerator_value is not None else None,
        "value_ratio_numerator_comparator": obj.value_ratio_numerator_comparator,
        "value_ratio_numerator_unit": obj.value_ratio_numerator_unit,
        "value_ratio_numerator_system": obj.value_ratio_numerator_system,
        "value_ratio_numerator_code": obj.value_ratio_numerator_code,
        "value_ratio_denominator_value": float(obj.value_ratio_denominator_value) if obj.value_ratio_denominator_value is not None else None,
        "value_ratio_denominator_comparator": obj.value_ratio_denominator_comparator,
        "value_ratio_denominator_unit": obj.value_ratio_denominator_unit,
        "value_ratio_denominator_system": obj.value_ratio_denominator_system,
        "value_ratio_denominator_code": obj.value_ratio_denominator_code,
        "value_sampled_data_origin_value": float(obj.value_sampled_data_origin_value) if obj.value_sampled_data_origin_value is not None else None,
        "value_sampled_data_origin_unit": obj.value_sampled_data_origin_unit,
        "value_sampled_data_origin_system": obj.value_sampled_data_origin_system,
        "value_sampled_data_origin_code": obj.value_sampled_data_origin_code,
        "value_sampled_data_period": float(obj.value_sampled_data_period) if obj.value_sampled_data_period is not None else None,
        "value_sampled_data_factor": float(obj.value_sampled_data_factor) if obj.value_sampled_data_factor is not None else None,
        "value_sampled_data_lower_limit": float(obj.value_sampled_data_lower_limit) if obj.value_sampled_data_lower_limit is not None else None,
        "value_sampled_data_upper_limit": float(obj.value_sampled_data_upper_limit) if obj.value_sampled_data_upper_limit is not None else None,
        "value_sampled_data_dimensions": obj.value_sampled_data_dimensions,
        "value_sampled_data_data": obj.value_sampled_data_data,
    }


def plain_obs_identifier(i: "ObservationIdentifier") -> dict:
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


def plain_obs_based_on(bo: "ObservationBasedOn") -> dict:
    return {
        "id": bo.id,
        "reference_type": bo.reference_type.value if bo.reference_type else None,
        "reference_id": bo.reference_id,
        "reference_display": bo.reference_display,
    }


def plain_obs_part_of(po: "ObservationPartOf") -> dict:
    return {
        "id": po.id,
        "reference_type": po.reference_type.value if po.reference_type else None,
        "reference_id": po.reference_id,
        "reference_display": po.reference_display,
    }


def plain_obs_category(cat: "ObservationCategory") -> dict:
    return {
        "id": cat.id,
        "coding_system": cat.coding_system,
        "coding_code": cat.coding_code,
        "coding_display": cat.coding_display,
        "text": cat.text,
    }


def plain_obs_focus(f: "ObservationFocus") -> dict:
    return {
        "id": f.id,
        "reference_type": f.reference_type,
        "reference_id": f.reference_id,
        "reference_display": f.reference_display,
    }


def plain_obs_performer(p: "ObservationPerformer") -> dict:
    return {
        "id": p.id,
        "reference_type": p.reference_type.value if p.reference_type else None,
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_obs_interpretation(interp: "ObservationInterpretation") -> dict:
    return {
        "id": interp.id,
        "coding_system": interp.coding_system,
        "coding_code": interp.coding_code,
        "coding_display": interp.coding_display,
        "text": interp.text,
    }


def plain_obs_note(n: "ObservationNote") -> dict:
    return {
        "id": n.id,
        "text": n.text,
        "time": n.time.isoformat() if n.time else None,
        "author_string": n.author_string,
        "author_reference_type": n.author_reference_type,
        "author_reference_id": n.author_reference_id,
        "author_reference_display": n.author_reference_display,
    }


def plain_obs_applies_to(at: "ObservationReferenceRangeAppliesTo") -> dict:
    return {
        "id": at.id,
        "coding_system": at.coding_system,
        "coding_code": at.coding_code,
        "coding_display": at.coding_display,
        "text": at.text,
    }


def plain_obs_reference_range(rr: "ObservationReferenceRange") -> dict:
    return {
        "id": rr.id,
        "low_value": float(rr.low_value) if rr.low_value is not None else None,
        "low_unit": rr.low_unit,
        "low_system": rr.low_system,
        "low_code": rr.low_code,
        "high_value": float(rr.high_value) if rr.high_value is not None else None,
        "high_unit": rr.high_unit,
        "high_system": rr.high_system,
        "high_code": rr.high_code,
        "type_system": rr.type_system,
        "type_code": rr.type_code,
        "type_display": rr.type_display,
        "type_text": rr.type_text,
        "age_low_value": float(rr.age_low_value) if rr.age_low_value is not None else None,
        "age_low_unit": rr.age_low_unit,
        "age_low_system": rr.age_low_system,
        "age_low_code": rr.age_low_code,
        "age_high_value": float(rr.age_high_value) if rr.age_high_value is not None else None,
        "age_high_unit": rr.age_high_unit,
        "age_high_system": rr.age_high_system,
        "age_high_code": rr.age_high_code,
        "text": rr.text,
        "applies_to": [plain_obs_applies_to(at) for at in rr.applies_to] if rr.applies_to else None,
    }


def plain_obs_has_member(hm: "ObservationHasMember") -> dict:
    return {
        "id": hm.id,
        "reference_type": hm.reference_type.value if hm.reference_type else None,
        "reference_id": hm.reference_id,
        "reference_display": hm.reference_display,
    }


def plain_obs_derived_from(df: "ObservationDerivedFrom") -> dict:
    return {
        "id": df.id,
        "reference_type": df.reference_type.value if df.reference_type else None,
        "reference_id": df.reference_id,
        "reference_display": df.reference_display,
    }


def plain_obs_component_interpretation(ci: "ObservationComponentInterpretation") -> dict:
    return {
        "id": ci.id,
        "coding_system": ci.coding_system,
        "coding_code": ci.coding_code,
        "coding_display": ci.coding_display,
        "text": ci.text,
    }


def plain_obs_component_rr_applies_to(at: "ObservationComponentReferenceRangeAppliesTo") -> dict:
    return {
        "id": at.id,
        "coding_system": at.coding_system,
        "coding_code": at.coding_code,
        "coding_display": at.coding_display,
        "text": at.text,
    }


def plain_obs_component_reference_range(rr: "ObservationComponentReferenceRange") -> dict:
    return {
        "id": rr.id,
        "low_value": float(rr.low_value) if rr.low_value is not None else None,
        "low_unit": rr.low_unit,
        "low_system": rr.low_system,
        "low_code": rr.low_code,
        "high_value": float(rr.high_value) if rr.high_value is not None else None,
        "high_unit": rr.high_unit,
        "high_system": rr.high_system,
        "high_code": rr.high_code,
        "type_system": rr.type_system,
        "type_code": rr.type_code,
        "type_display": rr.type_display,
        "type_text": rr.type_text,
        "age_low_value": float(rr.age_low_value) if rr.age_low_value is not None else None,
        "age_low_unit": rr.age_low_unit,
        "age_low_system": rr.age_low_system,
        "age_low_code": rr.age_low_code,
        "age_high_value": float(rr.age_high_value) if rr.age_high_value is not None else None,
        "age_high_unit": rr.age_high_unit,
        "age_high_system": rr.age_high_system,
        "age_high_code": rr.age_high_code,
        "text": rr.text,
        "applies_to": [plain_obs_component_rr_applies_to(at) for at in rr.applies_to] if rr.applies_to else None,
    }


def plain_obs_component(comp: "ObservationComponent") -> dict:
    entry: dict = {
        "id": comp.id,
        "code_system": comp.code_system,
        "code_code": comp.code_code,
        "code_display": comp.code_display,
        "code_text": comp.code_text,
        "data_absent_reason_system": comp.data_absent_reason_system,
        "data_absent_reason_code": comp.data_absent_reason_code,
        "data_absent_reason_display": comp.data_absent_reason_display,
        "data_absent_reason_text": comp.data_absent_reason_text,
        "interpretation": [plain_obs_component_interpretation(ci) for ci in comp.interpretations] if comp.interpretations else None,
        "reference_range": [plain_obs_component_reference_range(rr) for rr in comp.reference_ranges] if comp.reference_ranges else None,
    }
    entry.update(_plain_value_x(comp))
    return entry


def to_plain_observation(obs: "ObservationModel") -> dict:
    result: dict = {
        "id": obs.observation_id,
        "user_id": obs.user_id,
        "org_id": obs.org_id,
        "status": obs.status.value if obs.status else None,
        "code_system": obs.code_system,
        "code_code": obs.code_code,
        "code_display": obs.code_display,
        "code_text": obs.code_text,
        "subject_type": obs.subject_type.value if obs.subject_type else None,
        "subject_id": obs.subject_id,
        "subject_display": obs.subject_display,
        "encounter_id": obs.encounter.encounter_id if obs.encounter else None,
        "encounter_display": obs.encounter_display,
        "effective_date_time": obs.effective_date_time.isoformat() if obs.effective_date_time else None,
        "effective_period_start": obs.effective_period_start.isoformat() if obs.effective_period_start else None,
        "effective_period_end": obs.effective_period_end.isoformat() if obs.effective_period_end else None,
        "effective_instant": obs.effective_instant.isoformat() if obs.effective_instant else None,
        "effective_timing_event": obs.effective_timing_event,
        "effective_timing_code_system": obs.effective_timing_code_system,
        "effective_timing_code_code": obs.effective_timing_code_code,
        "effective_timing_code_display": obs.effective_timing_code_display,
        "effective_timing_code_text": obs.effective_timing_code_text,
        "issued": obs.issued.isoformat() if obs.issued else None,
        "data_absent_reason_system": obs.data_absent_reason_system,
        "data_absent_reason_code": obs.data_absent_reason_code,
        "data_absent_reason_display": obs.data_absent_reason_display,
        "data_absent_reason_text": obs.data_absent_reason_text,
        "body_site_system": obs.body_site_system,
        "body_site_code": obs.body_site_code,
        "body_site_display": obs.body_site_display,
        "body_site_text": obs.body_site_text,
        "method_system": obs.method_system,
        "method_code": obs.method_code,
        "method_display": obs.method_display,
        "method_text": obs.method_text,
        "specimen_type": obs.specimen_type.value if obs.specimen_type else None,
        "specimen_id": obs.specimen_id,
        "specimen_display": obs.specimen_display,
        "device_type": obs.device_type.value if obs.device_type else None,
        "device_id": obs.device_id,
        "device_display": obs.device_display,
        "created_at": obs.created_at.isoformat() if obs.created_at else None,
        "updated_at": obs.updated_at.isoformat() if obs.updated_at else None,
        "created_by": obs.created_by,
        "updated_by": obs.updated_by,
        "identifier": [plain_obs_identifier(i) for i in obs.identifiers] if obs.identifiers else None,
        "based_on": [plain_obs_based_on(b) for b in obs.based_on] if obs.based_on else None,
        "part_of": [plain_obs_part_of(p) for p in obs.part_of] if obs.part_of else None,
        "category": [plain_obs_category(c) for c in obs.categories] if obs.categories else None,
        "focus": [plain_obs_focus(f) for f in obs.focus] if obs.focus else None,
        "performer": [plain_obs_performer(p) for p in obs.performers] if obs.performers else None,
        "interpretation": [plain_obs_interpretation(i) for i in obs.interpretations] if obs.interpretations else None,
        "note": [plain_obs_note(n) for n in obs.notes] if obs.notes else None,
        "reference_range": [plain_obs_reference_range(rr) for rr in obs.reference_ranges] if obs.reference_ranges else None,
        "has_member": [plain_obs_has_member(hm) for hm in obs.has_members] if obs.has_members else None,
        "derived_from": [plain_obs_derived_from(df) for df in obs.derived_from] if obs.derived_from else None,
        "component": [plain_obs_component(c) for c in obs.components] if obs.components else None,
    }
    result.update(_plain_value_x(obs))
    return result
