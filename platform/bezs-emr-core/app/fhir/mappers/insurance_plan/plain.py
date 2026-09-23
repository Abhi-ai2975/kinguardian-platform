from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.insurance_plan.insurance_plan import (
        InsurancePlanContact,
        InsurancePlanCoverage,
        InsurancePlanModel,
        InsurancePlanPlan,
    )


def _ev(v):
    return v.value if v and hasattr(v, "value") else v


def _dt(v):
    return v.isoformat() if v else None


def _plain_identifier(i) -> dict:
    return {k: v for k, v in {
        "id": i.id,
        "use": i.use,
        "type_system": i.type_system,
        "type_code": i.type_code,
        "type_display": i.type_display,
        "type_text": i.type_text,
        "system": i.system,
        "value": i.value,
        "period_start": _dt(i.period_start),
        "period_end": _dt(i.period_end),
        "assigner": i.assigner,
    }.items() if v is not None}


def plain_insurance_plan_contact(c: "InsurancePlanContact") -> dict:
    result: dict = {
        "id": c.id,
        "purpose_system": c.purpose_system,
        "purpose_code": c.purpose_code,
        "purpose_display": c.purpose_display,
        "purpose_text": c.purpose_text,
        "name_use": c.name_use,
        "name_text": c.name_text,
        "name_family": c.name_family,
        "name_given": c.name_given,
        "name_prefix": c.name_prefix,
        "name_suffix": c.name_suffix,
        "address_use": c.address_use,
        "address_type": c.address_type,
        "address_text": c.address_text,
        "address_line": c.address_line,
        "address_city": c.address_city,
        "address_district": c.address_district,
        "address_state": c.address_state,
        "address_postal_code": c.address_postal_code,
        "address_country": c.address_country,
        "telecoms": [
            {k: v for k, v in {"id": t.id, "system": t.system, "value": t.value, "use": t.use, "rank": t.rank}.items() if v is not None}
            for t in c.telecoms
        ] if c.telecoms else None,
    }
    return {k: v for k, v in result.items() if v is not None}


def plain_insurance_plan_coverage(cov: "InsurancePlanCoverage") -> dict:
    result: dict = {
        "id": cov.id,
        "type_system": cov.type_system,
        "type_code": cov.type_code,
        "type_display": cov.type_display,
        "type_text": cov.type_text,
        "networks": [
            {k: v for k, v in {"id": n.id, "reference_id": n.reference_id, "reference_display": n.reference_display}.items() if v is not None}
            for n in cov.networks
        ] if cov.networks else None,
        "benefits": [
            {k: v for k, v in {
                "id": b.id,
                "type_system": b.type_system,
                "type_code": b.type_code,
                "type_display": b.type_display,
                "type_text": b.type_text,
                "requirement": b.requirement,
                "limits": [
                    {k2: v2 for k2, v2 in {
                        "id": lim.id,
                        "value_value": float(lim.value_value) if lim.value_value is not None else None,
                        "value_comparator": lim.value_comparator,
                        "value_unit": lim.value_unit,
                        "value_system": lim.value_system,
                        "value_code": lim.value_code,
                        "code_system": lim.code_system,
                        "code_code": lim.code_code,
                        "code_display": lim.code_display,
                        "code_text": lim.code_text,
                    }.items() if v2 is not None}
                    for lim in b.limits
                ] if b.limits else None,
            }.items() if v is not None}
            for b in cov.benefits
        ] if cov.benefits else None,
    }
    return {k: v for k, v in result.items() if v is not None}


def plain_insurance_plan_plan(plan: "InsurancePlanPlan") -> dict:
    result: dict = {
        "id": plan.id,
        "type_system": plan.type_system,
        "type_code": plan.type_code,
        "type_display": plan.type_display,
        "type_text": plan.type_text,
        "plan_identifiers": [_plain_identifier(i) for i in plan.plan_identifiers] if plan.plan_identifiers else None,
        "plan_coverage_areas": [
            {k: v for k, v in {"id": ca.id, "reference_id": ca.reference_id, "reference_display": ca.reference_display}.items() if v is not None}
            for ca in plan.plan_coverage_areas
        ] if plan.plan_coverage_areas else None,
        "plan_networks": [
            {k: v for k, v in {"id": n.id, "reference_id": n.reference_id, "reference_display": n.reference_display}.items() if v is not None}
            for n in plan.plan_networks
        ] if plan.plan_networks else None,
        "general_costs": [
            {k: v for k, v in {
                "id": gc.id,
                "type_system": gc.type_system,
                "type_code": gc.type_code,
                "type_display": gc.type_display,
                "type_text": gc.type_text,
                "group_size": gc.group_size,
                "cost_value": float(gc.cost_value) if gc.cost_value is not None else None,
                "cost_currency": gc.cost_currency,
                "comment": gc.comment,
            }.items() if v is not None}
            for gc in plan.general_costs
        ] if plan.general_costs else None,
        "specific_costs": [
            {k: v for k, v in {
                "id": sc.id,
                "category_system": sc.category_system,
                "category_code": sc.category_code,
                "category_display": sc.category_display,
                "category_text": sc.category_text,
                "sc_benefits": [
                    {k2: v2 for k2, v2 in {
                        "id": b.id,
                        "type_system": b.type_system,
                        "type_code": b.type_code,
                        "type_display": b.type_display,
                        "type_text": b.type_text,
                        "costs": [
                            {k3: v3 for k3, v3 in {
                                "id": cost.id,
                                "type_system": cost.type_system,
                                "type_code": cost.type_code,
                                "type_display": cost.type_display,
                                "type_text": cost.type_text,
                                "applicability_system": cost.applicability_system,
                                "applicability_code": cost.applicability_code,
                                "applicability_display": cost.applicability_display,
                                "applicability_text": cost.applicability_text,
                                "qualifiers_json": cost.qualifiers_json,
                                "value_value": float(cost.value_value) if cost.value_value is not None else None,
                                "value_comparator": cost.value_comparator,
                                "value_unit": cost.value_unit,
                                "value_system": cost.value_system,
                                "value_code": cost.value_code,
                            }.items() if v3 is not None}
                            for cost in b.costs
                        ] if b.costs else None,
                    }.items() if v2 is not None}
                    for b in sc.sc_benefits
                ] if sc.sc_benefits else None,
            }.items() if v is not None}
            for sc in plan.specific_costs
        ] if plan.specific_costs else None,
    }
    return {k: v for k, v in result.items() if v is not None}


def to_plain_insurance_plan(model: "InsurancePlanModel") -> dict:
    result: dict = {
        "id": model.insurance_plan_id,
        "status": _ev(model.status),
        "name": model.name,
        "period_start": _dt(model.period_start),
        "period_end": _dt(model.period_end),
        "owned_by_id": model.owned_by_id,
        "owned_by_display": model.owned_by_display,
        "administered_by_id": model.administered_by_id,
        "administered_by_display": model.administered_by_display,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": _dt(model.created_at),
        "updated_at": _dt(model.updated_at),
        "created_by": model.created_by,
        "updated_by": model.updated_by,
        "identifiers": [_plain_identifier(i) for i in model.identifiers] if model.identifiers else None,
        "types": [
            {k: v for k, v in {"id": t.id, "coding_system": t.coding_system, "coding_code": t.coding_code, "coding_display": t.coding_display, "text": t.text}.items() if v is not None}
            for t in model.types
        ] if model.types else None,
        "aliases": [
            {"id": a.id, "alias": a.alias}
            for a in model.aliases
        ] if model.aliases else None,
        "coverage_areas": [
            {k: v for k, v in {"id": ca.id, "reference_id": ca.reference_id, "reference_display": ca.reference_display}.items() if v is not None}
            for ca in model.coverage_areas
        ] if model.coverage_areas else None,
        "endpoints": [
            {k: v for k, v in {"id": e.id, "reference_id": e.reference_id, "reference_display": e.reference_display}.items() if v is not None}
            for e in model.endpoints
        ] if model.endpoints else None,
        "networks": [
            {k: v for k, v in {"id": n.id, "reference_id": n.reference_id, "reference_display": n.reference_display}.items() if v is not None}
            for n in model.networks
        ] if model.networks else None,
        "contacts": [plain_insurance_plan_contact(c) for c in model.contacts] if model.contacts else None,
        "coverages": [plain_insurance_plan_coverage(cov) for cov in model.coverages] if model.coverages else None,
        "plans": [plain_insurance_plan_plan(p) for p in model.plans] if model.plans else None,
    }
    return {k: v for k, v in result.items() if v is not None}
