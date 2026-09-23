from __future__ import annotations


def _ev(v):
    return v.value if hasattr(v, "value") else v


def _dt(v):
    if v is None:
        return None
    return v.isoformat() if hasattr(v, "isoformat") else str(v)


# ---------------------------------------------------------------------------
# Child helpers
# ---------------------------------------------------------------------------


def plain_audit_event_subtype(s):
    return {"id": s.id, "system": s.system, "code": s.code, "display": s.display}


def plain_audit_event_purpose_of_event(p):
    return {
        "id": p.id,
        "coding_system": p.coding_system,
        "coding_code": p.coding_code,
        "coding_display": p.coding_display,
        "text": p.text,
    }


def plain_audit_event_source_type(st):
    return {"id": st.id, "system": st.system, "code": st.code, "display": st.display}


def plain_audit_event_agent_role(r):
    return {
        "id": r.id,
        "coding_system": r.coding_system,
        "coding_code": r.coding_code,
        "coding_display": r.coding_display,
        "text": r.text,
    }


def plain_audit_event_agent_policy(p):
    return {"id": p.id, "value": p.value}


def plain_audit_event_agent_purpose_of_use(p):
    return {
        "id": p.id,
        "coding_system": p.coding_system,
        "coding_code": p.coding_code,
        "coding_display": p.coding_display,
        "text": p.text,
    }


def plain_audit_event_agent(a):
    return {
        "id": a.id,
        "type_system": a.type_system,
        "type_code": a.type_code,
        "type_display": a.type_display,
        "type_text": a.type_text,
        "who_type": _ev(a.who_type),
        "who_id": a.who_id,
        "who_display": a.who_display,
        "alt_id": a.alt_id,
        "name": a.name,
        "requestor": a.requestor,
        "location_type": _ev(a.location_type),
        "location_id": a.location_id,
        "location_display": a.location_display,
        "media_system": a.media_system,
        "media_code": a.media_code,
        "media_display": a.media_display,
        "network_address": a.network_address,
        "network_type": a.network_type,
        "roles": [plain_audit_event_agent_role(r) for r in a.roles],
        "policies": [plain_audit_event_agent_policy(p) for p in a.policies],
        "purpose_of_uses": [plain_audit_event_agent_purpose_of_use(p) for p in a.purpose_of_uses],
    }


def plain_audit_event_entity_security_label(sl):
    return {"id": sl.id, "system": sl.system, "code": sl.code, "display": sl.display}


def plain_audit_event_entity_detail(d):
    return {
        "id": d.id,
        "type": d.type,
        "value_string": d.value_string,
        "value_base64_binary": d.value_base64_binary,
    }


def plain_audit_event_entity(e):
    return {
        "id": e.id,
        "what_type": e.what_type,
        "what_id": e.what_id,
        "what_display": e.what_display,
        "type_system": e.type_system,
        "type_code": e.type_code,
        "type_display": e.type_display,
        "role_system": e.role_system,
        "role_code": e.role_code,
        "role_display": e.role_display,
        "lifecycle_system": e.lifecycle_system,
        "lifecycle_code": e.lifecycle_code,
        "lifecycle_display": e.lifecycle_display,
        "name": e.name,
        "description": e.description,
        "query": e.query,
        "security_labels": [plain_audit_event_entity_security_label(sl) for sl in e.security_labels],
        "details": [plain_audit_event_entity_detail(d) for d in e.details],
    }


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def to_plain_audit_event(model) -> dict:
    return {
        "id": model.audit_event_id,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "type_system": model.type_system,
        "type_code": model.type_code,
        "type_display": model.type_display,
        "action": model.action,
        "period_start": _dt(model.period_start),
        "period_end": _dt(model.period_end),
        "recorded": _dt(model.recorded),
        "outcome": model.outcome,
        "outcome_desc": model.outcome_desc,
        "source_site": model.source_site,
        "source_observer_type": _ev(model.source_observer_type),
        "source_observer_id": model.source_observer_id,
        "source_observer_display": model.source_observer_display,
        "subtypes": [plain_audit_event_subtype(s) for s in model.subtypes],
        "purpose_of_events": [plain_audit_event_purpose_of_event(p) for p in model.purpose_of_events],
        "source_types": [plain_audit_event_source_type(st) for st in model.source_types],
        "agents": [plain_audit_event_agent(a) for a in model.agents],
        "entities": [plain_audit_event_entity(e) for e in model.entities],
    }
