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
    )


def _cc(system, code, display, text=None) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def _qty(value, unit=None, system=None, code=None, comparator=None) -> dict | None:
    if value is None:
        return None
    q: dict = {"value": float(value)}
    if comparator:
        q["comparator"] = comparator
    if unit:
        q["unit"] = unit
    if system:
        q["system"] = system
    if code:
        q["code"] = code
    return q


def _simple_qty(value, unit=None, system=None, code=None) -> dict | None:
    if value is None:
        return None
    q: dict = {"value": float(value)}
    if unit:
        q["unit"] = unit
    if system:
        q["system"] = system
    if code:
        q["code"] = code
    return q


def _fhir_value_x(obj: Any) -> dict:
    """Build value[x] entry from any object with value_* fields (Observation or Component)."""
    if obj.value_quantity_value is not None:
        return {"valueQuantity": _qty(
            obj.value_quantity_value, obj.value_quantity_unit,
            obj.value_quantity_system, obj.value_quantity_code,
            obj.value_quantity_comparator,
        )}
    if obj.value_codeable_concept_code or obj.value_codeable_concept_system or obj.value_codeable_concept_text:
        cc = _cc(obj.value_codeable_concept_system, obj.value_codeable_concept_code,
                 obj.value_codeable_concept_display, obj.value_codeable_concept_text)
        if cc:
            return {"valueCodeableConcept": cc}
    if obj.value_string is not None:
        return {"valueString": obj.value_string}
    if obj.value_boolean is not None:
        return {"valueBoolean": obj.value_boolean}
    if obj.value_integer is not None:
        return {"valueInteger": obj.value_integer}
    if obj.value_range_low_value is not None or obj.value_range_high_value is not None:
        rng: dict = {}
        low = _simple_qty(obj.value_range_low_value, obj.value_range_low_unit,
                          obj.value_range_low_system, obj.value_range_low_code)
        if low:
            rng["low"] = low
        high = _simple_qty(obj.value_range_high_value, obj.value_range_high_unit,
                           obj.value_range_high_system, obj.value_range_high_code)
        if high:
            rng["high"] = high
        return {"valueRange": rng}
    if obj.value_ratio_numerator_value is not None or obj.value_ratio_denominator_value is not None:
        ratio: dict = {}
        num = _qty(obj.value_ratio_numerator_value, obj.value_ratio_numerator_unit,
                   obj.value_ratio_numerator_system, obj.value_ratio_numerator_code,
                   obj.value_ratio_numerator_comparator)
        if num:
            ratio["numerator"] = num
        den = _qty(obj.value_ratio_denominator_value, obj.value_ratio_denominator_unit,
                   obj.value_ratio_denominator_system, obj.value_ratio_denominator_code,
                   obj.value_ratio_denominator_comparator)
        if den:
            ratio["denominator"] = den
        return {"valueRatio": ratio}
    if obj.value_sampled_data_period is not None:
        sd: dict = {"period": float(obj.value_sampled_data_period)}
        origin = _simple_qty(obj.value_sampled_data_origin_value, obj.value_sampled_data_origin_unit,
                             obj.value_sampled_data_origin_system, obj.value_sampled_data_origin_code)
        if origin:
            sd["origin"] = origin
        if obj.value_sampled_data_factor is not None:
            sd["factor"] = float(obj.value_sampled_data_factor)
        if obj.value_sampled_data_lower_limit is not None:
            sd["lowerLimit"] = float(obj.value_sampled_data_lower_limit)
        if obj.value_sampled_data_upper_limit is not None:
            sd["upperLimit"] = float(obj.value_sampled_data_upper_limit)
        if obj.value_sampled_data_dimensions is not None:
            sd["dimensions"] = obj.value_sampled_data_dimensions
        if obj.value_sampled_data_data:
            sd["data"] = obj.value_sampled_data_data
        return {"valueSampledData": sd}
    if obj.value_time is not None:
        return {"valueTime": obj.value_time}
    if obj.value_date_time is not None:
        return {"valueDateTime": obj.value_date_time.isoformat()}
    if obj.value_period_start is not None or obj.value_period_end is not None:
        period: dict = {}
        if obj.value_period_start:
            period["start"] = obj.value_period_start.isoformat()
        if obj.value_period_end:
            period["end"] = obj.value_period_end.isoformat()
        return {"valuePeriod": period}
    return {}


def _fhir_reference_range_body(rr) -> dict:
    """Build referenceRange BackboneElement dict (shared by Observation and Component)."""
    entry: dict = {}
    low = _simple_qty(rr.low_value, rr.low_unit, rr.low_system, rr.low_code)
    if low:
        entry["low"] = low
    high = _simple_qty(rr.high_value, rr.high_unit, rr.high_system, rr.high_code)
    if high:
        entry["high"] = high
    type_cc = _cc(rr.type_system, rr.type_code, rr.type_display, rr.type_text)
    if type_cc:
        entry["type"] = type_cc
    if rr.applies_to:
        at_list = [cc for row in rr.applies_to if (cc := _cc(row.coding_system, row.coding_code, row.coding_display, row.text))]
        if at_list:
            entry["appliesTo"] = at_list
    age_low = _simple_qty(rr.age_low_value, rr.age_low_unit, rr.age_low_system, rr.age_low_code)
    age_high = _simple_qty(rr.age_high_value, rr.age_high_unit, rr.age_high_system, rr.age_high_code)
    if age_low or age_high:
        age: dict = {}
        if age_low:
            age["low"] = age_low
        if age_high:
            age["high"] = age_high
        entry["age"] = age
    if rr.text:
        entry["text"] = rr.text
    return entry


# ── Per-child helpers ───────────────────────────────────────────────────────────


def fhir_obs_identifier(i: "ObservationIdentifier") -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    type_cc = _cc(i.type_system, i.type_code, i.type_display, i.type_text)
    if type_cc:
        entry["type"] = type_cc
    if i.system:
        entry["system"] = i.system
    if i.value:
        entry["value"] = i.value
    if i.period_start or i.period_end:
        entry["period"] = {k: v for k, v in {
            "start": i.period_start.isoformat() if i.period_start else None,
            "end": i.period_end.isoformat() if i.period_end else None,
        }.items() if v}
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_obs_based_on(bo: "ObservationBasedOn") -> dict:
    entry: dict = {}
    if bo.reference_type and bo.reference_id:
        entry["reference"] = f"{bo.reference_type.value}/{bo.reference_id}"
    if bo.reference_display:
        entry["display"] = bo.reference_display
    return entry


def fhir_obs_part_of(po: "ObservationPartOf") -> dict:
    entry: dict = {}
    if po.reference_type and po.reference_id:
        entry["reference"] = f"{po.reference_type.value}/{po.reference_id}"
    if po.reference_display:
        entry["display"] = po.reference_display
    return entry


def fhir_obs_category(cat: "ObservationCategory") -> dict | None:
    return _cc(cat.coding_system, cat.coding_code, cat.coding_display, cat.text)


def fhir_obs_focus(f: "ObservationFocus") -> dict:
    entry: dict = {}
    if f.reference_type and f.reference_id:
        entry["reference"] = f"{f.reference_type}/{f.reference_id}"
    if f.reference_display:
        entry["display"] = f.reference_display
    return entry


def fhir_obs_performer(p: "ObservationPerformer") -> dict:
    entry: dict = {}
    if p.reference_type and p.reference_id:
        entry["reference"] = f"{p.reference_type.value}/{p.reference_id}"
    if p.reference_display:
        entry["display"] = p.reference_display
    return entry


def fhir_obs_interpretation(interp: "ObservationInterpretation") -> dict | None:
    return _cc(interp.coding_system, interp.coding_code, interp.coding_display, interp.text)


def fhir_obs_note(n: "ObservationNote") -> dict:
    entry: dict = {"text": n.text}
    if n.time:
        entry["time"] = n.time.isoformat()
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id:
        ref: dict = {"reference": f"{n.author_reference_type}/{n.author_reference_id}"}
        if n.author_reference_display:
            ref["display"] = n.author_reference_display
        entry["authorReference"] = ref
    return entry


def fhir_obs_reference_range(rr: "ObservationReferenceRange") -> dict:
    return _fhir_reference_range_body(rr)


def fhir_obs_has_member(hm: "ObservationHasMember") -> dict:
    entry: dict = {}
    if hm.reference_type and hm.reference_id:
        entry["reference"] = f"{hm.reference_type.value}/{hm.reference_id}"
    if hm.reference_display:
        entry["display"] = hm.reference_display
    return entry


def fhir_obs_derived_from(df: "ObservationDerivedFrom") -> dict:
    entry: dict = {}
    if df.reference_type and df.reference_id:
        entry["reference"] = f"{df.reference_type.value}/{df.reference_id}"
    if df.reference_display:
        entry["display"] = df.reference_display
    return entry


def fhir_obs_component(comp: "ObservationComponent") -> dict:
    entry: dict = {}
    code_cc = _cc(comp.code_system, comp.code_code, comp.code_display, comp.code_text)
    if code_cc:
        entry["code"] = code_cc

    entry.update(_fhir_value_x(comp))

    dar_cc = _cc(comp.data_absent_reason_system, comp.data_absent_reason_code,
                 comp.data_absent_reason_display, comp.data_absent_reason_text)
    if dar_cc:
        entry["dataAbsentReason"] = dar_cc

    if comp.interpretations:
        interp_list = [cc for i in comp.interpretations if (cc := fhir_obs_interpretation(i))]
        if interp_list:
            entry["interpretation"] = interp_list

    if comp.reference_ranges:
        entry["referenceRange"] = [_fhir_reference_range_body(rr) for rr in comp.reference_ranges]

    return entry


def _fhir_effective_timing(obs: "ObservationModel") -> dict | None:
    """Build effectiveTiming from flat fields. Returns None if no timing fields are set."""
    timing: dict = {}

    if obs.effective_timing_event:
        timing["event"] = [e.strip() for e in obs.effective_timing_event.split(",") if e.strip()]

    repeat: dict = {}

    # bounds[x] within repeat
    if obs.effective_timing_repeat_bounds_duration_value is not None:
        dur: dict = {"value": float(obs.effective_timing_repeat_bounds_duration_value)}
        if obs.effective_timing_repeat_bounds_duration_comparator:
            dur["comparator"] = obs.effective_timing_repeat_bounds_duration_comparator
        if obs.effective_timing_repeat_bounds_duration_unit:
            dur["unit"] = obs.effective_timing_repeat_bounds_duration_unit
        if obs.effective_timing_repeat_bounds_duration_system:
            dur["system"] = obs.effective_timing_repeat_bounds_duration_system
        if obs.effective_timing_repeat_bounds_duration_code:
            dur["code"] = obs.effective_timing_repeat_bounds_duration_code
        repeat["boundsDuration"] = dur
    elif (obs.effective_timing_repeat_bounds_range_low_value is not None or
          obs.effective_timing_repeat_bounds_range_high_value is not None):
        rng: dict = {}
        low = _simple_qty(obs.effective_timing_repeat_bounds_range_low_value,
                          obs.effective_timing_repeat_bounds_range_low_unit,
                          obs.effective_timing_repeat_bounds_range_low_system,
                          obs.effective_timing_repeat_bounds_range_low_code)
        if low:
            rng["low"] = low
        high = _simple_qty(obs.effective_timing_repeat_bounds_range_high_value,
                           obs.effective_timing_repeat_bounds_range_high_unit,
                           obs.effective_timing_repeat_bounds_range_high_system,
                           obs.effective_timing_repeat_bounds_range_high_code)
        if high:
            rng["high"] = high
        repeat["boundsRange"] = rng
    elif obs.effective_timing_repeat_bounds_period_start or obs.effective_timing_repeat_bounds_period_end:
        bp: dict = {}
        if obs.effective_timing_repeat_bounds_period_start:
            bp["start"] = obs.effective_timing_repeat_bounds_period_start.isoformat()
        if obs.effective_timing_repeat_bounds_period_end:
            bp["end"] = obs.effective_timing_repeat_bounds_period_end.isoformat()
        repeat["boundsPeriod"] = bp

    scalar_repeat_map = [
        ("effective_timing_repeat_count", "count"),
        ("effective_timing_repeat_count_max", "countMax"),
        ("effective_timing_repeat_duration", "duration"),
        ("effective_timing_repeat_duration_max", "durationMax"),
        ("effective_timing_repeat_duration_unit", "durationUnit"),
        ("effective_timing_repeat_frequency", "frequency"),
        ("effective_timing_repeat_frequency_max", "frequencyMax"),
        ("effective_timing_repeat_period", "period"),
        ("effective_timing_repeat_period_max", "periodMax"),
        ("effective_timing_repeat_period_unit", "periodUnit"),
        ("effective_timing_repeat_offset", "offset"),
    ]
    for attr, key in scalar_repeat_map:
        val = getattr(obs, attr)
        if val is not None:
            repeat[key] = float(val) if key in ("duration", "durationMax", "period", "periodMax") else val

    if obs.effective_timing_repeat_day_of_week:
        repeat["dayOfWeek"] = [d.strip() for d in obs.effective_timing_repeat_day_of_week.split(",") if d.strip()]
    if obs.effective_timing_repeat_time_of_day:
        repeat["timeOfDay"] = [t.strip() for t in obs.effective_timing_repeat_time_of_day.split(",") if t.strip()]
    if obs.effective_timing_repeat_when:
        repeat["when"] = [w.strip() for w in obs.effective_timing_repeat_when.split(",") if w.strip()]

    if repeat:
        timing["repeat"] = repeat

    timing_code_cc = _cc(obs.effective_timing_code_system, obs.effective_timing_code_code,
                         obs.effective_timing_code_display, obs.effective_timing_code_text)
    if timing_code_cc:
        timing["code"] = timing_code_cc

    return timing if timing else None


def to_fhir_observation(obs: "ObservationModel") -> dict:
    result: dict = {
        "resourceType": "Observation",
        "id": str(obs.observation_id),
        "status": obs.status.value if obs.status else None,
    }

    code_cc = _cc(obs.code_system, obs.code_code, obs.code_display, obs.code_text)
    if code_cc:
        result["code"] = code_cc

    if obs.identifiers:
        result["identifier"] = [fhir_obs_identifier(i) for i in obs.identifiers]

    if obs.based_on:
        bo_list = [e for e in [fhir_obs_based_on(b) for b in obs.based_on] if e]
        if bo_list:
            result["basedOn"] = bo_list

    if obs.part_of:
        po_list = [e for e in [fhir_obs_part_of(p) for p in obs.part_of] if e]
        if po_list:
            result["partOf"] = po_list

    if obs.categories:
        cats = [cc for cat in obs.categories if (cc := fhir_obs_category(cat))]
        if cats:
            result["category"] = cats

    if obs.subject_type and obs.subject_id:
        subj: dict = {"reference": f"{obs.subject_type.value}/{obs.subject_id}"}
        if obs.subject_display:
            subj["display"] = obs.subject_display
        result["subject"] = subj

    if obs.focus:
        f_list = [e for e in [fhir_obs_focus(f) for f in obs.focus] if e]
        if f_list:
            result["focus"] = f_list

    if obs.encounter and obs.encounter.encounter_id:
        enc_ref: dict = {"reference": f"Encounter/{obs.encounter.encounter_id}"}
        if obs.encounter_display:
            enc_ref["display"] = obs.encounter_display
        result["encounter"] = enc_ref

    # effective[x] — priority: dateTime > instant > Period > Timing
    if obs.effective_date_time:
        result["effectiveDateTime"] = obs.effective_date_time.isoformat()
    elif obs.effective_instant:
        result["effectiveInstant"] = obs.effective_instant.isoformat()
    elif obs.effective_period_start is not None or obs.effective_period_end is not None:
        period: dict = {}
        if obs.effective_period_start:
            period["start"] = obs.effective_period_start.isoformat()
        if obs.effective_period_end:
            period["end"] = obs.effective_period_end.isoformat()
        result["effectivePeriod"] = period
    else:
        timing = _fhir_effective_timing(obs)
        if timing:
            result["effectiveTiming"] = timing

    if obs.issued:
        result["issued"] = obs.issued.isoformat()

    if obs.performers:
        p_list = [e for e in [fhir_obs_performer(p) for p in obs.performers] if e]
        if p_list:
            result["performer"] = p_list

    # value[x]
    result.update(_fhir_value_x(obs))

    dar_cc = _cc(obs.data_absent_reason_system, obs.data_absent_reason_code,
                 obs.data_absent_reason_display, obs.data_absent_reason_text)
    if dar_cc:
        result["dataAbsentReason"] = dar_cc

    if obs.interpretations:
        interp_list = [cc for i in obs.interpretations if (cc := fhir_obs_interpretation(i))]
        if interp_list:
            result["interpretation"] = interp_list

    if obs.notes:
        result["note"] = [fhir_obs_note(n) for n in obs.notes]

    body_cc = _cc(obs.body_site_system, obs.body_site_code, obs.body_site_display, obs.body_site_text)
    if body_cc:
        result["bodySite"] = body_cc

    method_cc = _cc(obs.method_system, obs.method_code, obs.method_display, obs.method_text)
    if method_cc:
        result["method"] = method_cc

    if obs.specimen_type and obs.specimen_id:
        spec_ref: dict = {"reference": f"{obs.specimen_type.value}/{obs.specimen_id}"}
        if obs.specimen_display:
            spec_ref["display"] = obs.specimen_display
        result["specimen"] = spec_ref

    if obs.device_type and obs.device_id:
        dev_ref: dict = {"reference": f"{obs.device_type.value}/{obs.device_id}"}
        if obs.device_display:
            dev_ref["display"] = obs.device_display
        result["device"] = dev_ref

    if obs.reference_ranges:
        result["referenceRange"] = [fhir_obs_reference_range(rr) for rr in obs.reference_ranges]

    if obs.has_members:
        hm_list = [e for e in [fhir_obs_has_member(hm) for hm in obs.has_members] if e]
        if hm_list:
            result["hasMember"] = hm_list

    if obs.derived_from:
        df_list = [e for e in [fhir_obs_derived_from(df) for df in obs.derived_from] if e]
        if df_list:
            result["derivedFrom"] = df_list

    if obs.components:
        result["component"] = [fhir_obs_component(c) for c in obs.components]

    return {k: v for k, v in result.items() if v is not None}
