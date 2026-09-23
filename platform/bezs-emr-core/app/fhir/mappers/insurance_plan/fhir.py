from __future__ import annotations

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.insurance_plan.insurance_plan import (
        InsurancePlanCoverage,
        InsurancePlanCoverageBenefit,
        InsurancePlanCoverageNetwork,
        InsurancePlanContact,
        InsurancePlanModel,
        InsurancePlanPlan,
        InsurancePlanPlanGeneralCost,
        InsurancePlanPlanSpecificCost,
        InsurancePlanPlanSCBenefit,
        InsurancePlanPlanSCBenefitCost,
    )


def _ev(v):
    return v.value if v and hasattr(v, "value") else v


def _cc_coding(system, code, display) -> dict:
    return {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}


def _cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def _qty(value, comparator, unit, system, code) -> dict | None:
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


def _period(start, end) -> dict | None:
    p: dict = {}
    if start:
        p["start"] = start.isoformat()
    if end:
        p["end"] = end.isoformat()
    return p if p else None


# ---------------------------------------------------------------------------
# Identifier
# ---------------------------------------------------------------------------


def _fhir_identifier(i) -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    coding = {k: v for k, v in {"system": i.type_system, "code": i.type_code, "display": i.type_display}.items() if v}
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
    period = _period(i.period_start, i.period_end)
    if period:
        entry["period"] = period
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


# ---------------------------------------------------------------------------
# Contact
# ---------------------------------------------------------------------------


def fhir_insurance_plan_contact(c: "InsurancePlanContact") -> dict:
    entry: dict = {}
    purpose = _cc(c.purpose_system, c.purpose_code, c.purpose_display, c.purpose_text)
    if purpose:
        entry["purpose"] = purpose

    name: dict = {}
    if c.name_use:
        name["use"] = c.name_use
    if c.name_text:
        name["text"] = c.name_text
    if c.name_family:
        name["family"] = c.name_family
    if c.name_given:
        name["given"] = [c.name_given]
    if c.name_prefix:
        name["prefix"] = [c.name_prefix]
    if c.name_suffix:
        name["suffix"] = [c.name_suffix]
    if name:
        entry["name"] = name

    if c.telecoms:
        telecoms = []
        for t in c.telecoms:
            tc: dict = {}
            if t.system:
                tc["system"] = t.system
            if t.value:
                tc["value"] = t.value
            if t.use:
                tc["use"] = t.use
            if t.rank is not None:
                tc["rank"] = t.rank
            if tc:
                telecoms.append(tc)
        if telecoms:
            entry["telecom"] = telecoms

    address: dict = {}
    if c.address_use:
        address["use"] = c.address_use
    if c.address_type:
        address["type"] = c.address_type
    if c.address_text:
        address["text"] = c.address_text
    if c.address_line:
        address["line"] = [c.address_line]
    if c.address_city:
        address["city"] = c.address_city
    if c.address_district:
        address["district"] = c.address_district
    if c.address_state:
        address["state"] = c.address_state
    if c.address_postal_code:
        address["postalCode"] = c.address_postal_code
    if c.address_country:
        address["country"] = c.address_country
    if address:
        entry["address"] = address

    return entry


# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------


def _fhir_coverage_benefit(b: "InsurancePlanCoverageBenefit") -> dict:
    entry: dict = {}
    type_cc = _cc(b.type_system, b.type_code, b.type_display, b.type_text)
    if type_cc:
        entry["type"] = type_cc
    if b.requirement:
        entry["requirement"] = b.requirement
    if b.limits:
        limits = []
        for lim in b.limits:
            l: dict = {}
            qty = _qty(lim.value_value, lim.value_comparator, lim.value_unit, lim.value_system, lim.value_code)
            if qty:
                l["value"] = qty
            code_cc = _cc(lim.code_system, lim.code_code, lim.code_display, lim.code_text)
            if code_cc:
                l["code"] = code_cc
            if l:
                limits.append(l)
        if limits:
            entry["limit"] = limits
    return entry


def fhir_insurance_plan_coverage(cov: "InsurancePlanCoverage") -> dict:
    entry: dict = {}
    type_cc = _cc(cov.type_system, cov.type_code, cov.type_display, cov.type_text)
    if type_cc:
        entry["type"] = type_cc
    if cov.networks:
        entry["network"] = [
            {k: v for k, v in {"reference": f"Organization/{n.reference_id}" if n.reference_id else None, "display": n.reference_display}.items() if v}
            for n in cov.networks
        ]
    if cov.benefits:
        entry["benefit"] = [_fhir_coverage_benefit(b) for b in cov.benefits]
    return entry


# ---------------------------------------------------------------------------
# Plan
# ---------------------------------------------------------------------------


def _fhir_sc_benefit_cost(cost: "InsurancePlanPlanSCBenefitCost") -> dict:
    entry: dict = {}
    type_cc = _cc(cost.type_system, cost.type_code, cost.type_display, cost.type_text)
    if type_cc:
        entry["type"] = type_cc
    appl_cc = _cc(cost.applicability_system, cost.applicability_code, cost.applicability_display, cost.applicability_text)
    if appl_cc:
        entry["applicability"] = appl_cc
    if cost.qualifiers_json:
        try:
            qs = json.loads(cost.qualifiers_json)
            if qs:
                entry["qualifiers"] = qs
        except (json.JSONDecodeError, TypeError):
            pass
    qty = _qty(cost.value_value, cost.value_comparator, cost.value_unit, cost.value_system, cost.value_code)
    if qty:
        entry["value"] = qty
    return entry


def _fhir_sc_benefit(b: "InsurancePlanPlanSCBenefit") -> dict:
    entry: dict = {}
    type_cc = _cc(b.type_system, b.type_code, b.type_display, b.type_text)
    if type_cc:
        entry["type"] = type_cc
    if b.costs:
        entry["cost"] = [_fhir_sc_benefit_cost(c) for c in b.costs]
    return entry


def _fhir_specific_cost(sc: "InsurancePlanPlanSpecificCost") -> dict:
    entry: dict = {}
    cat_cc = _cc(sc.category_system, sc.category_code, sc.category_display, sc.category_text)
    if cat_cc:
        entry["category"] = cat_cc
    if sc.sc_benefits:
        entry["benefit"] = [_fhir_sc_benefit(b) for b in sc.sc_benefits]
    return entry


def _fhir_general_cost(gc: "InsurancePlanPlanGeneralCost") -> dict:
    entry: dict = {}
    type_cc = _cc(gc.type_system, gc.type_code, gc.type_display, gc.type_text)
    if type_cc:
        entry["type"] = type_cc
    if gc.group_size is not None:
        entry["groupSize"] = gc.group_size
    if gc.cost_value is not None:
        money: dict = {"value": float(gc.cost_value)}
        if gc.cost_currency:
            money["currency"] = gc.cost_currency
        entry["cost"] = money
    if gc.comment:
        entry["comment"] = gc.comment
    return entry


def fhir_insurance_plan_plan(plan: "InsurancePlanPlan") -> dict:
    entry: dict = {}
    if plan.plan_identifiers:
        entry["identifier"] = [_fhir_identifier(i) for i in plan.plan_identifiers]
    type_cc = _cc(plan.type_system, plan.type_code, plan.type_display, plan.type_text)
    if type_cc:
        entry["type"] = type_cc
    if plan.plan_coverage_areas:
        entry["coverageArea"] = [
            {k: v for k, v in {"reference": f"Location/{ca.reference_id}" if ca.reference_id else None, "display": ca.reference_display}.items() if v}
            for ca in plan.plan_coverage_areas
        ]
    if plan.plan_networks:
        entry["network"] = [
            {k: v for k, v in {"reference": f"Organization/{n.reference_id}" if n.reference_id else None, "display": n.reference_display}.items() if v}
            for n in plan.plan_networks
        ]
    if plan.general_costs:
        entry["generalCost"] = [_fhir_general_cost(gc) for gc in plan.general_costs]
    if plan.specific_costs:
        entry["specificCost"] = [_fhir_specific_cost(sc) for sc in plan.specific_costs]
    return entry


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------


def to_fhir_insurance_plan(model: "InsurancePlanModel") -> dict:
    result: dict = {
        "resourceType": "InsurancePlan",
        "id": str(model.insurance_plan_id),
    }

    if model.identifiers:
        result["identifier"] = [_fhir_identifier(i) for i in model.identifiers]

    if model.status:
        result["status"] = _ev(model.status)

    if model.types:
        result["type"] = [
            {k: v for k, v in {
                "coding": [_cc_coding(t.coding_system, t.coding_code, t.coding_display)] if any([t.coding_system, t.coding_code, t.coding_display]) else None,
                "text": t.text,
            }.items() if v}
            for t in model.types
        ]

    if model.name:
        result["name"] = model.name

    if model.aliases:
        result["alias"] = [a.alias for a in model.aliases]

    period = _period(model.period_start, model.period_end)
    if period:
        result["period"] = period

    if model.owned_by_id:
        ref: dict = {"reference": f"Organization/{model.owned_by_id}"}
        if model.owned_by_display:
            ref["display"] = model.owned_by_display
        result["ownedBy"] = ref

    if model.administered_by_id:
        ref2: dict = {"reference": f"Organization/{model.administered_by_id}"}
        if model.administered_by_display:
            ref2["display"] = model.administered_by_display
        result["administeredBy"] = ref2

    if model.coverage_areas:
        result["coverageArea"] = [
            {k: v for k, v in {"reference": f"Location/{ca.reference_id}" if ca.reference_id else None, "display": ca.reference_display}.items() if v}
            for ca in model.coverage_areas
        ]

    if model.contacts:
        result["contact"] = [fhir_insurance_plan_contact(c) for c in model.contacts]

    if model.endpoints:
        result["endpoint"] = [
            {k: v for k, v in {"reference": f"Endpoint/{e.reference_id}" if e.reference_id else None, "display": e.reference_display}.items() if v}
            for e in model.endpoints
        ]

    if model.networks:
        result["network"] = [
            {k: v for k, v in {"reference": f"Organization/{n.reference_id}" if n.reference_id else None, "display": n.reference_display}.items() if v}
            for n in model.networks
        ]

    if model.coverages:
        result["coverage"] = [fhir_insurance_plan_coverage(cov) for cov in model.coverages]

    if model.plans:
        result["plan"] = [fhir_insurance_plan_plan(p) for p in model.plans]

    return {k: v for k, v in result.items() if v is not None}
