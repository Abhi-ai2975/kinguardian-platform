from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.coverage.coverage import (
        CoverageClass,
        CoverageContract,
        CoverageCostToBeneficiary,
        CoverageCostToBeneficiaryException,
        CoverageIdentifier,
        CoverageModel,
        CoveragePayor,
    )


def _cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def _ref(ref_type, ref_id, display) -> dict | None:
    if not (ref_type and ref_id):
        return None
    t = ref_type.value if hasattr(ref_type, "value") else ref_type
    r: dict = {"reference": f"{t}/{ref_id}"}
    if display:
        r["display"] = display
    return r


def fhir_coverage_identifier(i: "CoverageIdentifier") -> dict:
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


def fhir_coverage_payor(p: "CoveragePayor") -> dict:
    ref = _ref(p.reference_type, p.reference_id, p.reference_display)
    return ref if ref else {}


def fhir_coverage_class(c: "CoverageClass") -> dict:
    entry: dict = {}
    type_cc = _cc(c.type_system, c.type_code, c.type_display, c.type_text)
    if type_cc:
        entry["type"] = type_cc
    if c.value:
        entry["value"] = c.value
    if c.name:
        entry["name"] = c.name
    return entry


def fhir_coverage_exception(e: "CoverageCostToBeneficiaryException") -> dict:
    entry: dict = {}
    type_cc = _cc(e.type_system, e.type_code, e.type_display, e.type_text)
    if type_cc:
        entry["type"] = type_cc
    if e.period_start or e.period_end:
        entry["period"] = {k: v for k, v in {
            "start": e.period_start.isoformat() if e.period_start else None,
            "end": e.period_end.isoformat() if e.period_end else None,
        }.items() if v}
    return entry


def fhir_coverage_cost_to_beneficiary(c: "CoverageCostToBeneficiary") -> dict:
    entry: dict = {}
    type_cc = _cc(c.type_system, c.type_code, c.type_display, c.type_text)
    if type_cc:
        entry["type"] = type_cc
    if c.value_quantity_value is not None or c.value_quantity_unit:
        qty: dict = {}
        if c.value_quantity_value is not None:
            qty["value"] = float(c.value_quantity_value)
        if c.value_quantity_unit:
            qty["unit"] = c.value_quantity_unit
        if c.value_quantity_system:
            qty["system"] = c.value_quantity_system
        if c.value_quantity_code:
            qty["code"] = c.value_quantity_code
        entry["valueSimpleQuantity"] = qty
    elif c.value_money_value is not None or c.value_money_currency:
        money: dict = {}
        if c.value_money_value is not None:
            money["value"] = float(c.value_money_value)
        if c.value_money_currency:
            money["currency"] = c.value_money_currency
        entry["valueMoney"] = money
    if c.exceptions:
        entry["exception"] = [fhir_coverage_exception(e) for e in c.exceptions]
    return entry


def fhir_coverage_contract(c: "CoverageContract") -> dict:
    ref = _ref(c.reference_type, c.reference_id, c.reference_display)
    return ref if ref else {}


def to_fhir_coverage(model: "CoverageModel") -> dict:
    result: dict = {
        "resourceType": "Coverage",
        "id": str(model.coverage_id),
    }

    if model.identifiers:
        result["identifier"] = [fhir_coverage_identifier(i) for i in model.identifiers]

    if model.status:
        result["status"] = model.status.value if hasattr(model.status, "value") else model.status

    type_cc = _cc(model.type_system, model.type_code, model.type_display, model.type_text)
    if type_cc:
        result["type"] = type_cc

    ph = _ref(model.policy_holder_type, model.policy_holder_id, model.policy_holder_display)
    if ph:
        result["policyHolder"] = ph

    sub = _ref(model.subscriber_type, model.subscriber_id, model.subscriber_display)
    if sub:
        result["subscriber"] = sub

    if model.subscriber_id_value:
        result["subscriberId"] = model.subscriber_id_value

    ben = _ref(model.beneficiary_type, model.beneficiary_id, model.beneficiary_display)
    if ben:
        result["beneficiary"] = ben

    if model.dependent:
        result["dependent"] = model.dependent

    rel_cc = _cc(model.relationship_system, model.relationship_code, model.relationship_display, model.relationship_text)
    if rel_cc:
        result["relationship"] = rel_cc

    if model.period_start or model.period_end:
        result["period"] = {k: v for k, v in {
            "start": model.period_start.isoformat() if model.period_start else None,
            "end": model.period_end.isoformat() if model.period_end else None,
        }.items() if v}

    if model.payors:
        result["payor"] = [fhir_coverage_payor(p) for p in model.payors]

    if model.classes:
        result["class"] = [fhir_coverage_class(c) for c in model.classes]

    if model.order is not None:
        result["order"] = model.order

    if model.network:
        result["network"] = model.network

    if model.subrogation is not None:
        result["subrogation"] = model.subrogation

    if model.cost_to_beneficiaries:
        result["costToBeneficiary"] = [fhir_coverage_cost_to_beneficiary(c) for c in model.cost_to_beneficiaries]

    if model.contracts:
        result["contract"] = [fhir_coverage_contract(c) for c in model.contracts]

    return {k: v for k, v in result.items() if v is not None}
