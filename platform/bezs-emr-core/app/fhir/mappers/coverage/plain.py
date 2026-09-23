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


def plain_coverage_identifier(i: "CoverageIdentifier") -> dict:
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


def plain_coverage_payor(p: "CoveragePayor") -> dict:
    ref_type = p.reference_type.value if p.reference_type and hasattr(p.reference_type, "value") else p.reference_type
    return {
        "id": p.id,
        "reference_type": ref_type,
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_coverage_class(c: "CoverageClass") -> dict:
    return {
        "id": c.id,
        "type_system": c.type_system,
        "type_code": c.type_code,
        "type_display": c.type_display,
        "type_text": c.type_text,
        "value": c.value,
        "name": c.name,
    }


def plain_coverage_exception(e: "CoverageCostToBeneficiaryException") -> dict:
    return {
        "id": e.id,
        "type_system": e.type_system,
        "type_code": e.type_code,
        "type_display": e.type_display,
        "type_text": e.type_text,
        "period_start": e.period_start.isoformat() if e.period_start else None,
        "period_end": e.period_end.isoformat() if e.period_end else None,
    }


def plain_coverage_cost_to_beneficiary(c: "CoverageCostToBeneficiary") -> dict:
    entry: dict = {
        "id": c.id,
        "type_system": c.type_system,
        "type_code": c.type_code,
        "type_display": c.type_display,
        "type_text": c.type_text,
        "value_quantity_value": float(c.value_quantity_value) if c.value_quantity_value is not None else None,
        "value_quantity_unit": c.value_quantity_unit,
        "value_quantity_system": c.value_quantity_system,
        "value_quantity_code": c.value_quantity_code,
        "value_money_value": float(c.value_money_value) if c.value_money_value is not None else None,
        "value_money_currency": c.value_money_currency,
    }
    if c.exceptions:
        entry["exception"] = [plain_coverage_exception(e) for e in c.exceptions]
    return entry


def plain_coverage_contract(c: "CoverageContract") -> dict:
    ref_type = c.reference_type.value if c.reference_type and hasattr(c.reference_type, "value") else c.reference_type
    return {
        "id": c.id,
        "reference_type": ref_type,
        "reference_id": c.reference_id,
        "reference_display": c.reference_display,
    }


def to_plain_coverage(model: "CoverageModel") -> dict:
    status = model.status.value if model.status and hasattr(model.status, "value") else model.status
    ph_type = model.policy_holder_type.value if model.policy_holder_type and hasattr(model.policy_holder_type, "value") else model.policy_holder_type
    sub_type = model.subscriber_type.value if model.subscriber_type and hasattr(model.subscriber_type, "value") else model.subscriber_type
    ben_type = model.beneficiary_type.value if model.beneficiary_type and hasattr(model.beneficiary_type, "value") else model.beneficiary_type

    result: dict = {
        "id": model.coverage_id,
        "status": status,
        "type_system": model.type_system,
        "type_code": model.type_code,
        "type_display": model.type_display,
        "type_text": model.type_text,
        "policy_holder_type": ph_type,
        "policy_holder_id": model.policy_holder_id,
        "policy_holder_display": model.policy_holder_display,
        "subscriber_type": sub_type,
        "subscriber_id": model.subscriber_id,
        "subscriber_display": model.subscriber_display,
        "subscriber_id_value": model.subscriber_id_value,
        "beneficiary_type": ben_type,
        "beneficiary_id": model.beneficiary_id,
        "beneficiary_display": model.beneficiary_display,
        "dependent": model.dependent,
        "relationship_system": model.relationship_system,
        "relationship_code": model.relationship_code,
        "relationship_display": model.relationship_display,
        "relationship_text": model.relationship_text,
        "period_start": model.period_start.isoformat() if model.period_start else None,
        "period_end": model.period_end.isoformat() if model.period_end else None,
        "order": model.order,
        "network": model.network,
        "subrogation": model.subrogation,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
    }

    if model.identifiers:
        result["identifier"] = [plain_coverage_identifier(i) for i in model.identifiers]
    if model.payors:
        result["payor"] = [plain_coverage_payor(p) for p in model.payors]
    if model.classes:
        result["classes"] = [plain_coverage_class(c) for c in model.classes]
    if model.cost_to_beneficiaries:
        result["cost_to_beneficiary"] = [plain_coverage_cost_to_beneficiary(c) for c in model.cost_to_beneficiaries]
    if model.contracts:
        result["contract"] = [plain_coverage_contract(c) for c in model.contracts]

    return {k: v for k, v in result.items() if v is not None}
