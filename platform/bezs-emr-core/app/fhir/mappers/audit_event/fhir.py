from __future__ import annotations


def _ev(v):
    """Return string value of an enum or plain string."""
    return v.value if hasattr(v, "value") else v


def _coding(system, code, display):
    if not any([system, code, display]):
        return None
    c = {}
    if system:
        c["system"] = system
    if code:
        c["code"] = code
    if display:
        c["display"] = display
    return c


def _cc(system, code, display, text=None):
    coding = _coding(system, code, display)
    if not coding and not text:
        return None
    out = {}
    if coding:
        out["coding"] = [coding]
    if text:
        out["text"] = text
    return out


def _ref(ref_type, ref_id, display=None):
    if not ref_id:
        return None
    out = {"reference": f"{_ev(ref_type)}/{ref_id}"}
    if display:
        out["display"] = display
    return out


# ---------------------------------------------------------------------------
# Child helpers
# ---------------------------------------------------------------------------


def fhir_audit_event_subtype(s):
    c = _coding(s.system, s.code, s.display)
    return c or {}


def fhir_audit_event_purpose_of_event(p):
    return _cc(p.coding_system, p.coding_code, p.coding_display, p.text) or {}


def fhir_audit_event_source_type(st):
    return _coding(st.system, st.code, st.display) or {}


def fhir_audit_event_agent_role(r):
    return _cc(r.coding_system, r.coding_code, r.coding_display, r.text) or {}


def fhir_audit_event_agent_purpose_of_use(p):
    return _cc(p.coding_system, p.coding_code, p.coding_display, p.text) or {}


def fhir_audit_event_agent(a):
    out = {"requestor": a.requestor}
    if a.type_code or a.type_system:
        out["type"] = _cc(a.type_system, a.type_code, a.type_display, a.type_text)
    if a.roles:
        out["role"] = [fhir_audit_event_agent_role(r) for r in a.roles]
    who_ref = _ref(a.who_type, a.who_id, a.who_display) if a.who_type else None
    if who_ref:
        out["who"] = who_ref
    if a.alt_id:
        out["altId"] = a.alt_id
    if a.name:
        out["name"] = a.name
    loc_ref = _ref(a.location_type, a.location_id, a.location_display) if a.location_type else None
    if loc_ref:
        out["location"] = loc_ref
    if a.policies:
        out["policy"] = [p.value for p in a.policies if p.value]
    media = _coding(a.media_system, a.media_code, a.media_display)
    if media:
        out["media"] = media
    if a.network_address or a.network_type:
        net = {}
        if a.network_address:
            net["address"] = a.network_address
        if a.network_type:
            net["type"] = a.network_type
        out["network"] = net
    if a.purpose_of_uses:
        out["purposeOfUse"] = [fhir_audit_event_agent_purpose_of_use(p) for p in a.purpose_of_uses]
    return out


def fhir_audit_event_entity_security_label(sl):
    return _coding(sl.system, sl.code, sl.display) or {}


def fhir_audit_event_entity_detail(d):
    out = {"type": d.type}
    if d.value_string is not None:
        out["valueString"] = d.value_string
    elif d.value_base64_binary is not None:
        out["valueBase64Binary"] = d.value_base64_binary
    return out


def fhir_audit_event_entity(e):
    out = {}
    what_ref = _ref(e.what_type, e.what_id, e.what_display) if e.what_type else None
    if what_ref:
        out["what"] = what_ref
    t = _coding(e.type_system, e.type_code, e.type_display)
    if t:
        out["type"] = t
    role = _coding(e.role_system, e.role_code, e.role_display)
    if role:
        out["role"] = role
    lc = _coding(e.lifecycle_system, e.lifecycle_code, e.lifecycle_display)
    if lc:
        out["lifecycle"] = lc
    if e.security_labels:
        out["securityLabel"] = [fhir_audit_event_entity_security_label(sl) for sl in e.security_labels]
    if e.name:
        out["name"] = e.name
    if e.description:
        out["description"] = e.description
    if e.query:
        out["query"] = e.query
    if e.details:
        out["detail"] = [fhir_audit_event_entity_detail(d) for d in e.details]
    return out


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def to_fhir_audit_event(model) -> dict:
    out = {
        "resourceType": "AuditEvent",
        "id": str(model.audit_event_id),
        "type": _coding(model.type_system, model.type_code, model.type_display) or {},
    }

    if model.subtypes:
        out["subtype"] = [fhir_audit_event_subtype(s) for s in model.subtypes]
    if model.action:
        out["action"] = model.action
    if model.period_start or model.period_end:
        period = {}
        if model.period_start:
            period["start"] = model.period_start.isoformat() if hasattr(model.period_start, "isoformat") else str(model.period_start)
        if model.period_end:
            period["end"] = model.period_end.isoformat() if hasattr(model.period_end, "isoformat") else str(model.period_end)
        out["period"] = period

    out["recorded"] = model.recorded.isoformat() if hasattr(model.recorded, "isoformat") else str(model.recorded)

    if model.outcome:
        out["outcome"] = model.outcome
    if model.outcome_desc:
        out["outcomeDesc"] = model.outcome_desc
    if model.purpose_of_events:
        out["purposeOfEvent"] = [fhir_audit_event_purpose_of_event(p) for p in model.purpose_of_events]

    out["agent"] = [fhir_audit_event_agent(a) for a in model.agents]

    source = {}
    if model.source_site:
        source["site"] = model.source_site
    obs_ref = _ref(model.source_observer_type, model.source_observer_id, model.source_observer_display) if model.source_observer_type else None
    if obs_ref:
        source["observer"] = obs_ref
    if model.source_types:
        source["type"] = [fhir_audit_event_source_type(st) for st in model.source_types]
    out["source"] = source

    if model.entities:
        out["entity"] = [fhir_audit_event_entity(e) for e in model.entities]

    return {k: v for k, v in out.items() if v is not None}
