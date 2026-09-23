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


def plain_provenance_target(t: "ProvenanceTarget") -> dict:
    return {
        "id": t.id,
        "reference_type": t.reference_type,
        "reference_id": t.reference_id,
        "reference_display": t.reference_display,
    }


def plain_provenance_policy(p: "ProvenancePolicy") -> dict:
    return {
        "id": p.id,
        "uri": p.uri,
    }


def plain_provenance_reason(r: "ProvenanceReason") -> dict:
    return {
        "id": r.id,
        "coding_system": r.coding_system,
        "coding_code": r.coding_code,
        "coding_display": r.coding_display,
        "text": r.text,
    }


def plain_provenance_agent_role(r: "ProvenanceAgentRole") -> dict:
    return {
        "id": r.id,
        "coding_system": r.coding_system,
        "coding_code": r.coding_code,
        "coding_display": r.coding_display,
        "text": r.text,
    }


def plain_provenance_agent(a: "ProvenanceAgent") -> dict:
    entry: dict = {
        "id": a.id,
        "type_system": a.type_system,
        "type_code": a.type_code,
        "type_display": a.type_display,
        "type_text": a.type_text,
        "who_type": _ev(a.who_type),
        "who_id": a.who_id,
        "who_display": a.who_display,
        "on_behalf_of_type": _ev(a.on_behalf_of_type),
        "on_behalf_of_id": a.on_behalf_of_id,
        "on_behalf_of_display": a.on_behalf_of_display,
    }
    if a.roles:
        entry["roles"] = [plain_provenance_agent_role(r) for r in a.roles]
    return entry


def plain_provenance_entity_agent(a: "ProvenanceEntityAgent") -> dict:
    return {
        "id": a.id,
        "type_system": a.type_system,
        "type_code": a.type_code,
        "type_display": a.type_display,
        "type_text": a.type_text,
        "who_type": _ev(a.who_type),
        "who_id": a.who_id,
        "who_display": a.who_display,
        "on_behalf_of_type": _ev(a.on_behalf_of_type),
        "on_behalf_of_id": a.on_behalf_of_id,
        "on_behalf_of_display": a.on_behalf_of_display,
    }


def plain_provenance_entity(e: "ProvenanceEntity") -> dict:
    entry: dict = {
        "id": e.id,
        "role": _ev(e.role),
        "what_type": e.what_type,
        "what_id": e.what_id,
        "what_display": e.what_display,
    }
    if e.entity_agents:
        entry["entity_agents"] = [plain_provenance_entity_agent(a) for a in e.entity_agents]
    return entry


def plain_provenance_signature_type(t: "ProvenanceSignatureType") -> dict:
    return {
        "id": t.id,
        "system": t.system,
        "code": t.code,
        "display": t.display,
    }


def plain_provenance_signature(s: "ProvenanceSignature") -> dict:
    entry: dict = {
        "id": s.id,
        "when": s.when.isoformat() if s.when else None,
        "who_type": s.who_type,
        "who_id": s.who_id,
        "who_display": s.who_display,
        "on_behalf_of_type": s.on_behalf_of_type,
        "on_behalf_of_id": s.on_behalf_of_id,
        "on_behalf_of_display": s.on_behalf_of_display,
        "target_format": s.target_format,
        "sig_format": s.sig_format,
        "data": s.data,
    }
    if s.signature_types:
        entry["signature_types"] = [plain_provenance_signature_type(t) for t in s.signature_types]
    return entry


def to_plain_provenance(model: "ProvenanceModel") -> dict:
    result: dict = {
        "id": model.provenance_id,
        "recorded": model.recorded.isoformat() if model.recorded else None,
        "occurred_period_start": model.occurred_period_start.isoformat() if model.occurred_period_start else None,
        "occurred_period_end": model.occurred_period_end.isoformat() if model.occurred_period_end else None,
        "occurred_date_time": model.occurred_date_time.isoformat() if model.occurred_date_time else None,
        "location_type": _ev(model.location_type),
        "location_id": model.location_id,
        "location_display": model.location_display,
        "activity_system": model.activity_system,
        "activity_code": model.activity_code,
        "activity_display": model.activity_display,
        "activity_text": model.activity_text,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
    }

    result["targets"] = [plain_provenance_target(t) for t in model.targets]
    result["agents"] = [plain_provenance_agent(a) for a in model.agents]

    if model.policies:
        result["policies"] = [plain_provenance_policy(p) for p in model.policies]
    if model.reasons:
        result["reasons"] = [plain_provenance_reason(r) for r in model.reasons]
    if model.entities:
        result["entities"] = [plain_provenance_entity(e) for e in model.entities]
    if model.signatures:
        result["signatures"] = [plain_provenance_signature(s) for s in model.signatures]

    return {k: v for k, v in result.items() if v is not None}
