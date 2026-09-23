from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.provenance.provenance import (
        ProvenanceAgent,
        ProvenanceAgentRole,
        ProvenanceEntity,
        ProvenanceEntityAgent,
        ProvenanceModel,
        ProvenancePolicy,
        ProvenanceReason,
        ProvenanceSignature,
        ProvenanceSignatureType,
        ProvenanceTarget,
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


def fhir_provenance_agent_role(r: "ProvenanceAgentRole") -> dict:
    entry: dict = {}
    coding = {k: v for k, v in {
        "system": r.coding_system, "code": r.coding_code, "display": r.coding_display,
    }.items() if v}
    if coding:
        entry["coding"] = [coding]
    if r.text:
        entry["text"] = r.text
    return entry


def fhir_provenance_agent(a: "ProvenanceAgent") -> dict:
    entry: dict = {}

    type_cc = _cc(a.type_system, a.type_code, a.type_display, a.type_text)
    if type_cc:
        entry["type"] = type_cc

    if a.roles:
        entry["role"] = [fhir_provenance_agent_role(r) for r in a.roles]

    who_ref = _ref(a.who_type, a.who_id, a.who_display)
    if who_ref:
        entry["who"] = who_ref

    on_behalf = _ref(a.on_behalf_of_type, a.on_behalf_of_id, a.on_behalf_of_display)
    if on_behalf:
        entry["onBehalfOf"] = on_behalf

    return entry


def fhir_provenance_entity_agent(a: "ProvenanceEntityAgent") -> dict:
    entry: dict = {}
    type_cc = _cc(a.type_system, a.type_code, a.type_display, a.type_text)
    if type_cc:
        entry["type"] = type_cc
    who_ref = _ref(a.who_type, a.who_id, a.who_display)
    if who_ref:
        entry["who"] = who_ref
    on_behalf = _ref(a.on_behalf_of_type, a.on_behalf_of_id, a.on_behalf_of_display)
    if on_behalf:
        entry["onBehalfOf"] = on_behalf
    return entry


def fhir_provenance_entity(e: "ProvenanceEntity") -> dict:
    entry: dict = {
        "role": _ev(e.role),
    }
    what_ref = _ref(e.what_type, e.what_id, e.what_display)
    if what_ref:
        entry["what"] = what_ref
    if e.entity_agents:
        entry["agent"] = [fhir_provenance_entity_agent(a) for a in e.entity_agents]
    return entry


def fhir_provenance_signature(s: "ProvenanceSignature") -> dict:
    entry: dict = {
        "type": [
            {k: v for k, v in {"system": t.system, "code": t.code, "display": t.display}.items() if v}
            for t in s.signature_types
        ],
        "when": s.when.isoformat(),
    }
    who_ref = _ref(s.who_type, s.who_id, s.who_display)
    if who_ref:
        entry["who"] = who_ref
    on_behalf = _ref(s.on_behalf_of_type, s.on_behalf_of_id, s.on_behalf_of_display)
    if on_behalf:
        entry["onBehalfOf"] = on_behalf
    if s.target_format:
        entry["targetFormat"] = s.target_format
    if s.sig_format:
        entry["sigFormat"] = s.sig_format
    if s.data:
        entry["data"] = s.data
    return entry


def to_fhir_provenance(model: "ProvenanceModel") -> dict:
    result: dict = {
        "resourceType": "Provenance",
        "id": str(model.provenance_id),
        "recorded": model.recorded.isoformat(),
    }

    # target (1..*)
    result["target"] = [
        {k: v for k, v in {
            "reference": f"{t.reference_type}/{t.reference_id}" if t.reference_type and t.reference_id else None,
            "display": t.reference_display,
        }.items() if v}
        for t in model.targets
    ]

    # occurred[x]
    if model.occurred_date_time is not None:
        result["occurredDateTime"] = model.occurred_date_time.isoformat()
    elif model.occurred_period_start or model.occurred_period_end:
        period: dict = {}
        if model.occurred_period_start:
            period["start"] = model.occurred_period_start.isoformat()
        if model.occurred_period_end:
            period["end"] = model.occurred_period_end.isoformat()
        result["occurredPeriod"] = period

    # policy
    if model.policies:
        result["policy"] = [p.uri for p in model.policies]

    # location
    loc = _ref(model.location_type, model.location_id, model.location_display)
    if loc:
        result["location"] = loc

    # reason
    if model.reasons:
        result["reason"] = [
            _cc(r.coding_system, r.coding_code, r.coding_display, r.text)
            for r in model.reasons
            if _cc(r.coding_system, r.coding_code, r.coding_display, r.text)
        ]

    # activity
    activity = _cc(model.activity_system, model.activity_code, model.activity_display, model.activity_text)
    if activity:
        result["activity"] = activity

    # agent (1..*)
    result["agent"] = [fhir_provenance_agent(a) for a in model.agents]

    # entity
    if model.entities:
        result["entity"] = [fhir_provenance_entity(e) for e in model.entities]

    # signature
    if model.signatures:
        result["signature"] = [fhir_provenance_signature(s) for s in model.signatures]

    return {k: v for k, v in result.items() if v is not None}
