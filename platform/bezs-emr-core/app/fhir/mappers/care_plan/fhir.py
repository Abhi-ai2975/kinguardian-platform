from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.care_plan.care_plan import (
        CarePlanActivity,
        CarePlanActivityDetailGoal,
        CarePlanActivityDetailPerformer,
        CarePlanActivityDetailReasonCode,
        CarePlanActivityDetailReasonRef,
        CarePlanActivityOutcomeCC,
        CarePlanActivityOutcomeRef,
        CarePlanActivityProgress,
        CarePlanIdentifier,
        CarePlanModel,
        CarePlanNote,
    )


def _ev(v):
    return v.value if v and hasattr(v, "value") else v


def _ref(ref_type, ref_id, display) -> dict | None:
    if not (ref_type and ref_id):
        return None
    t = _ev(ref_type)
    r: dict = {"reference": f"{t}/{ref_id}"}
    if display:
        r["display"] = display
    return r


def _cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def fhir_care_plan_identifier(i: "CarePlanIdentifier") -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    coding = {k: v for k, v in {
        "system": i.type_system, "code": i.type_code, "display": i.type_display,
    }.items() if v}
    type_cc: dict = {}
    if coding:
        type_cc["coding"] = [coding]
    if i.type_text:
        type_cc["text"] = i.type_text
    if type_cc:
        entry["type"] = type_cc
    if i.system:
        entry["system"] = i.system
    if i.value:
        entry["value"] = i.value
    period: dict = {}
    if i.period_start:
        period["start"] = i.period_start.isoformat()
    if i.period_end:
        period["end"] = i.period_end.isoformat()
    if period:
        entry["period"] = period
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_care_plan_note(n: "CarePlanNote | CarePlanActivityProgress") -> dict:
    entry: dict = {"text": n.text}
    if n.time:
        entry["time"] = n.time.isoformat()
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id:
        ar: dict = {"reference": f"{n.author_reference_type}/{n.author_reference_id}"}
        if n.author_reference_display:
            ar["display"] = n.author_reference_display
        entry["authorReference"] = ar
    return entry


def fhir_care_plan_activity(a: "CarePlanActivity") -> dict:
    entry: dict = {}

    # outcomeCodeableConcept
    if a.outcome_codeable_concepts:
        entry["outcomeCodeableConcept"] = [
            _cc(oc.coding_system, oc.coding_code, oc.coding_display, oc.text) or {}
            for oc in a.outcome_codeable_concepts
        ]

    # outcomeReference
    if a.outcome_references:
        entry["outcomeReference"] = [
            {k: v for k, v in {
                "reference": f"{r.reference_type}/{r.reference_id}" if r.reference_type and r.reference_id else None,
                "display": r.reference_display,
            }.items() if v}
            for r in a.outcome_references
        ]

    # progress
    if a.progress:
        entry["progress"] = [fhir_care_plan_note(p) for p in a.progress]

    # reference
    ref = _ref(a.reference_type, a.reference_id, a.reference_display)
    if ref:
        entry["reference"] = ref

    # detail
    detail = _fhir_activity_detail(a)
    if detail:
        entry["detail"] = detail

    return entry


def _fhir_timing(a: "CarePlanActivity") -> dict | None:
    timing: dict = {}

    if a.detail_scheduled_timing_event:
        timing["event"] = [e.strip() for e in a.detail_scheduled_timing_event.split(",") if e.strip()]

    repeat: dict = {}
    if a.detail_scheduled_timing_repeat_bounds_start or a.detail_scheduled_timing_repeat_bounds_end:
        b: dict = {}
        if a.detail_scheduled_timing_repeat_bounds_start:
            b["start"] = a.detail_scheduled_timing_repeat_bounds_start.isoformat()
        if a.detail_scheduled_timing_repeat_bounds_end:
            b["end"] = a.detail_scheduled_timing_repeat_bounds_end.isoformat()
        repeat["boundsPeriod"] = b
    if a.detail_scheduled_timing_repeat_count is not None:
        repeat["count"] = a.detail_scheduled_timing_repeat_count
    if a.detail_scheduled_timing_repeat_count_max is not None:
        repeat["countMax"] = a.detail_scheduled_timing_repeat_count_max
    if a.detail_scheduled_timing_repeat_duration is not None:
        repeat["duration"] = float(a.detail_scheduled_timing_repeat_duration)
    if a.detail_scheduled_timing_repeat_duration_max is not None:
        repeat["durationMax"] = float(a.detail_scheduled_timing_repeat_duration_max)
    if a.detail_scheduled_timing_repeat_duration_unit:
        repeat["durationUnit"] = a.detail_scheduled_timing_repeat_duration_unit
    if a.detail_scheduled_timing_repeat_frequency is not None:
        repeat["frequency"] = a.detail_scheduled_timing_repeat_frequency
    if a.detail_scheduled_timing_repeat_frequency_max is not None:
        repeat["frequencyMax"] = a.detail_scheduled_timing_repeat_frequency_max
    if a.detail_scheduled_timing_repeat_period is not None:
        repeat["period"] = float(a.detail_scheduled_timing_repeat_period)
    if a.detail_scheduled_timing_repeat_period_max is not None:
        repeat["periodMax"] = float(a.detail_scheduled_timing_repeat_period_max)
    if a.detail_scheduled_timing_repeat_period_unit:
        repeat["periodUnit"] = a.detail_scheduled_timing_repeat_period_unit
    if a.detail_scheduled_timing_repeat_day_of_week:
        repeat["dayOfWeek"] = [d.strip() for d in a.detail_scheduled_timing_repeat_day_of_week.split(",") if d.strip()]
    if a.detail_scheduled_timing_repeat_time_of_day:
        repeat["timeOfDay"] = [t.strip() for t in a.detail_scheduled_timing_repeat_time_of_day.split(",") if t.strip()]
    if a.detail_scheduled_timing_repeat_when:
        repeat["when"] = [w.strip() for w in a.detail_scheduled_timing_repeat_when.split(",") if w.strip()]
    if a.detail_scheduled_timing_repeat_offset is not None:
        repeat["offset"] = a.detail_scheduled_timing_repeat_offset
    if repeat:
        timing["repeat"] = repeat

    code_cc = _cc(
        a.detail_scheduled_timing_code_system,
        a.detail_scheduled_timing_code_code,
        a.detail_scheduled_timing_code_display,
        a.detail_scheduled_timing_code_text,
    )
    if code_cc:
        timing["code"] = code_cc

    return timing if timing else None


def _fhir_activity_detail(a: "CarePlanActivity") -> dict | None:
    has_detail = any([
        a.detail_kind, a.detail_instantiates_canonical, a.detail_instantiates_uri,
        a.detail_code_code, a.detail_code_system, a.detail_code_text,
        a.detail_status, a.detail_status_reason_code, a.detail_do_not_perform is not None,
        a.detail_scheduled_timing_event, a.detail_scheduled_timing_repeat_frequency,
        a.detail_scheduled_period_start, a.detail_scheduled_period_end, a.detail_scheduled_string,
        a.detail_location_id, a.detail_product_codeable_concept_code, a.detail_product_reference_id,
        a.detail_daily_amount_value, a.detail_quantity_value, a.detail_description,
        a.detail_reason_codes, a.detail_reason_references, a.detail_goals, a.detail_performers,
    ])
    if not has_detail:
        return None

    detail: dict = {}

    if a.detail_kind:
        detail["kind"] = a.detail_kind
    if a.detail_instantiates_canonical:
        detail["instantiatesCanonical"] = [c.strip() for c in a.detail_instantiates_canonical.split(",") if c.strip()]
    if a.detail_instantiates_uri:
        detail["instantiatesUri"] = [u.strip() for u in a.detail_instantiates_uri.split(",") if u.strip()]

    code_cc = _cc(a.detail_code_system, a.detail_code_code, a.detail_code_display, a.detail_code_text)
    if code_cc:
        detail["code"] = code_cc

    if a.detail_reason_codes:
        detail["reasonCode"] = [
            _cc(rc.coding_system, rc.coding_code, rc.coding_display, rc.text) or {}
            for rc in a.detail_reason_codes
        ]
    if a.detail_reason_references:
        detail["reasonReference"] = [
            {k: v for k, v in {
                "reference": f"{_ev(rr.reference_type)}/{rr.reference_id}" if rr.reference_type and rr.reference_id else None,
                "display": rr.reference_display,
            }.items() if v}
            for rr in a.detail_reason_references
        ]

    if a.detail_goals:
        detail["goal"] = [
            {k: v for k, v in {
                "reference": f"{_ev(g.reference_type)}/{g.reference_id}" if g.reference_type and g.reference_id else None,
                "display": g.reference_display,
            }.items() if v}
            for g in a.detail_goals
        ]

    if a.detail_status:
        detail["status"] = _ev(a.detail_status)

    sr = _cc(a.detail_status_reason_system, a.detail_status_reason_code, a.detail_status_reason_display, a.detail_status_reason_text)
    if sr:
        detail["statusReason"] = sr

    if a.detail_do_not_perform is not None:
        detail["doNotPerform"] = a.detail_do_not_perform

    # scheduled[x]
    timing = _fhir_timing(a)
    if timing:
        detail["scheduledTiming"] = timing
    elif a.detail_scheduled_period_start or a.detail_scheduled_period_end:
        sp: dict = {}
        if a.detail_scheduled_period_start:
            sp["start"] = a.detail_scheduled_period_start.isoformat()
        if a.detail_scheduled_period_end:
            sp["end"] = a.detail_scheduled_period_end.isoformat()
        detail["scheduledPeriod"] = sp
    elif a.detail_scheduled_string:
        detail["scheduledString"] = a.detail_scheduled_string

    loc = _ref(a.detail_location_type, a.detail_location_id, a.detail_location_display)
    if loc:
        detail["location"] = loc

    if a.detail_performers:
        detail["performer"] = [
            {k: v for k, v in {
                "reference": f"{_ev(p.reference_type)}/{p.reference_id}" if p.reference_type and p.reference_id else None,
                "display": p.reference_display,
            }.items() if v}
            for p in a.detail_performers
        ]

    # product[x]
    prod_cc = _cc(
        a.detail_product_codeable_concept_system,
        a.detail_product_codeable_concept_code,
        a.detail_product_codeable_concept_display,
        a.detail_product_codeable_concept_text,
    )
    if prod_cc:
        detail["productCodeableConcept"] = prod_cc
    else:
        prod_ref = _ref(a.detail_product_reference_type, a.detail_product_reference_id, a.detail_product_reference_display)
        if prod_ref:
            detail["productReference"] = prod_ref

    if a.detail_daily_amount_value is not None:
        da: dict = {"value": float(a.detail_daily_amount_value)}
        if a.detail_daily_amount_unit:
            da["unit"] = a.detail_daily_amount_unit
        if a.detail_daily_amount_system:
            da["system"] = a.detail_daily_amount_system
        if a.detail_daily_amount_code:
            da["code"] = a.detail_daily_amount_code
        detail["dailyAmount"] = da

    if a.detail_quantity_value is not None:
        qty: dict = {"value": float(a.detail_quantity_value)}
        if a.detail_quantity_unit:
            qty["unit"] = a.detail_quantity_unit
        if a.detail_quantity_system:
            qty["system"] = a.detail_quantity_system
        if a.detail_quantity_code:
            qty["code"] = a.detail_quantity_code
        detail["quantity"] = qty

    if a.detail_description:
        detail["description"] = a.detail_description

    return detail


def to_fhir_care_plan(model: "CarePlanModel") -> dict:
    result: dict = {
        "resourceType": "CarePlan",
        "id": str(model.care_plan_id),
        "status": _ev(model.status),
        "intent": _ev(model.intent),
    }

    if model.identifiers:
        result["identifier"] = [fhir_care_plan_identifier(i) for i in model.identifiers]

    if model.instantiates_canonical:
        result["instantiatesCanonical"] = [c.strip() for c in model.instantiates_canonical.split(",") if c.strip()]
    if model.instantiates_uri:
        result["instantiatesUri"] = [u.strip() for u in model.instantiates_uri.split(",") if u.strip()]

    if model.based_on:
        result["basedOn"] = [
            {k: v for k, v in {
                "reference": f"{_ev(b.reference_type)}/{b.reference_id}" if b.reference_type and b.reference_id else None,
                "display": b.reference_display,
            }.items() if v}
            for b in model.based_on
        ]

    if model.replaces:
        result["replaces"] = [
            {k: v for k, v in {
                "reference": f"{_ev(r.reference_type)}/{r.reference_id}" if r.reference_type and r.reference_id else None,
                "display": r.reference_display,
            }.items() if v}
            for r in model.replaces
        ]

    if model.part_of:
        result["partOf"] = [
            {k: v for k, v in {
                "reference": f"{_ev(p.reference_type)}/{p.reference_id}" if p.reference_type and p.reference_id else None,
                "display": p.reference_display,
            }.items() if v}
            for p in model.part_of
        ]

    if model.categories:
        result["category"] = [
            _cc(c.coding_system, c.coding_code, c.coding_display, c.text) or {}
            for c in model.categories
        ]

    if model.title:
        result["title"] = model.title
    if model.description:
        result["description"] = model.description

    subj = _ref(model.subject_type, model.subject_id, model.subject_display)
    if subj:
        result["subject"] = subj

    enc = _ref(model.encounter_type, model.encounter_id, model.encounter_display)
    if enc:
        result["encounter"] = enc

    if model.period_start or model.period_end:
        period: dict = {}
        if model.period_start:
            period["start"] = model.period_start.isoformat()
        if model.period_end:
            period["end"] = model.period_end.isoformat()
        result["period"] = period

    if model.created:
        result["created"] = model.created.isoformat()

    author = _ref(model.author_type, model.author_id, model.author_display)
    if author:
        result["author"] = author

    if model.contributors:
        result["contributor"] = [
            {k: v for k, v in {
                "reference": f"{_ev(c.reference_type)}/{c.reference_id}" if c.reference_type and c.reference_id else None,
                "display": c.reference_display,
            }.items() if v}
            for c in model.contributors
        ]

    if model.care_teams:
        result["careTeam"] = [
            {k: v for k, v in {
                "reference": f"{_ev(ct.reference_type)}/{ct.reference_id}" if ct.reference_type and ct.reference_id else None,
                "display": ct.reference_display,
            }.items() if v}
            for ct in model.care_teams
        ]

    if model.addresses:
        result["addresses"] = [
            {k: v for k, v in {
                "reference": f"{_ev(ad.reference_type)}/{ad.reference_id}" if ad.reference_type and ad.reference_id else None,
                "display": ad.reference_display,
            }.items() if v}
            for ad in model.addresses
        ]

    if model.supporting_info:
        result["supportingInfo"] = [
            {k: v for k, v in {
                "reference": f"{si.reference_type}/{si.reference_id}" if si.reference_type and si.reference_id else None,
                "display": si.reference_display,
            }.items() if v}
            for si in model.supporting_info
        ]

    if model.goals:
        result["goal"] = [
            {k: v for k, v in {
                "reference": f"{_ev(g.reference_type)}/{g.reference_id}" if g.reference_type and g.reference_id else None,
                "display": g.reference_display,
            }.items() if v}
            for g in model.goals
        ]

    if model.activities:
        result["activity"] = [fhir_care_plan_activity(a) for a in model.activities]

    if model.notes:
        result["note"] = [fhir_care_plan_note(n) for n in model.notes]

    return {k: v for k, v in result.items() if v is not None}
