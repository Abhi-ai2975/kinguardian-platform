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


def plain_episode_of_care_identifier(i):
    return {
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
    }


def plain_episode_of_care_status_history(sh):
    return {
        "id": sh.id,
        "status": sh.status,
        "period_start": _dt(sh.period_start),
        "period_end": _dt(sh.period_end),
    }


def plain_episode_of_care_type(t):
    return {
        "id": t.id,
        "coding_system": t.coding_system,
        "coding_code": t.coding_code,
        "coding_display": t.coding_display,
        "text": t.text,
    }


def plain_episode_of_care_diagnosis(d):
    return {
        "id": d.id,
        "reference_type": _ev(d.reference_type),
        "reference_id": d.reference_id,
        "reference_display": d.reference_display,
        "role_system": d.role_system,
        "role_code": d.role_code,
        "role_display": d.role_display,
        "role_text": d.role_text,
        "rank": d.rank,
    }


def plain_episode_of_care_referral_request(r):
    return {
        "id": r.id,
        "reference_type": _ev(r.reference_type),
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }


def plain_episode_of_care_team(t):
    return {
        "id": t.id,
        "reference_type": _ev(t.reference_type),
        "reference_id": t.reference_id,
        "reference_display": t.reference_display,
    }


def plain_episode_of_care_account(a):
    return {
        "id": a.id,
        "reference_type": _ev(a.reference_type),
        "reference_id": a.reference_id,
        "reference_display": a.reference_display,
    }


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def to_plain_episode_of_care(model) -> dict:
    mo_id = None
    if model.managing_organization and model.managing_organization.organization_id:
        mo_id = model.managing_organization.organization_id

    return {
        "id": model.episode_of_care_id,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "status": _ev(model.status),
        "patient_type": _ev(model.patient_type),
        "patient_id": model.patient_id,
        "patient_display": model.patient_display,
        "managing_organization_type": _ev(model.managing_organization_type),
        "managing_organization_id": mo_id,
        "managing_organization_display": model.managing_organization_display,
        "period_start": _dt(model.period_start),
        "period_end": _dt(model.period_end),
        "care_manager_type": _ev(model.care_manager_type),
        "care_manager_id": model.care_manager_id,
        "care_manager_display": model.care_manager_display,
        "created_at": _dt(model.created_at),
        "updated_at": _dt(model.updated_at),
        "created_by": model.created_by,
        "updated_by": model.updated_by,
        "identifiers": [plain_episode_of_care_identifier(i) for i in model.identifiers],
        "status_history": [plain_episode_of_care_status_history(sh) for sh in model.status_history],
        "types": [plain_episode_of_care_type(t) for t in model.types],
        "diagnoses": [plain_episode_of_care_diagnosis(d) for d in model.diagnoses],
        "referral_requests": [plain_episode_of_care_referral_request(r) for r in model.referral_requests],
        "team": [plain_episode_of_care_team(t) for t in model.team],
        "accounts": [plain_episode_of_care_account(a) for a in model.accounts],
    }
