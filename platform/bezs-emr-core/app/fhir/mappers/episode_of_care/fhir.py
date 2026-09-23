from __future__ import annotations


def _ev(v):
    return v.value if hasattr(v, "value") else v


def _dt(v):
    if v is None:
        return None
    return v.isoformat() if hasattr(v, "isoformat") else str(v)


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


def fhir_episode_of_care_identifier(i):
    from app.fhir.datatypes import fhir_identifier
    return fhir_identifier(i)


def fhir_episode_of_care_status_history(sh):
    out = {"status": sh.status}
    period = {}
    if sh.period_start:
        period["start"] = _dt(sh.period_start)
    if sh.period_end:
        period["end"] = _dt(sh.period_end)
    if period:
        out["period"] = period
    return out


def fhir_episode_of_care_type(t):
    return _cc(t.coding_system, t.coding_code, t.coding_display, t.text) or {}


def fhir_episode_of_care_diagnosis(d):
    out = {}
    cond_ref = _ref(d.reference_type, d.reference_id, d.reference_display)
    if cond_ref:
        out["condition"] = cond_ref
    role = _cc(d.role_system, d.role_code, d.role_display, d.role_text)
    if role:
        out["role"] = role
    if d.rank is not None:
        out["rank"] = d.rank
    return out


def fhir_episode_of_care_referral_request(r):
    ref = _ref(r.reference_type, r.reference_id, r.reference_display)
    return ref or {}


def fhir_episode_of_care_team(t):
    ref = _ref(t.reference_type, t.reference_id, t.reference_display)
    return ref or {}


def fhir_episode_of_care_account(a):
    ref = _ref(a.reference_type, a.reference_id, a.reference_display)
    return ref or {}


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def to_fhir_episode_of_care(model) -> dict:
    out = {
        "resourceType": "EpisodeOfCare",
        "id": str(model.episode_of_care_id),
        "status": _ev(model.status),
    }

    if model.identifiers:
        out["identifier"] = [fhir_episode_of_care_identifier(i) for i in model.identifiers]

    if model.status_history:
        out["statusHistory"] = [fhir_episode_of_care_status_history(sh) for sh in model.status_history]

    if model.types:
        out["type"] = [fhir_episode_of_care_type(t) for t in model.types]

    if model.diagnoses:
        out["diagnosis"] = [fhir_episode_of_care_diagnosis(d) for d in model.diagnoses]

    patient_ref = _ref(model.patient_type, model.patient_id, model.patient_display)
    if patient_ref:
        out["patient"] = patient_ref

    if model.managing_organization and model.managing_organization.organization_id:
        mo = {"reference": f"Organization/{model.managing_organization.organization_id}"}
        if model.managing_organization_display:
            mo["display"] = model.managing_organization_display
        out["managingOrganization"] = mo

    if model.period_start or model.period_end:
        period = {}
        if model.period_start:
            period["start"] = _dt(model.period_start)
        if model.period_end:
            period["end"] = _dt(model.period_end)
        out["period"] = period

    if model.referral_requests:
        out["referralRequest"] = [fhir_episode_of_care_referral_request(r) for r in model.referral_requests]

    care_mgr_ref = _ref(model.care_manager_type, model.care_manager_id, model.care_manager_display)
    if care_mgr_ref:
        out["careManager"] = care_mgr_ref

    if model.team:
        out["team"] = [fhir_episode_of_care_team(t) for t in model.team]

    if model.accounts:
        out["account"] = [fhir_episode_of_care_account(a) for a in model.accounts]

    return {k: v for k, v in out.items() if v is not None}
