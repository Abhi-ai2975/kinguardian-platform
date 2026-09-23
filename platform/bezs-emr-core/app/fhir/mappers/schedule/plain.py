from __future__ import annotations

from app.fhir.datatypes import fhir_enum, plain_identifier


def plain_schedule_identifier(i) -> dict:
    return {"id": i.id, **plain_identifier(i)}


def plain_schedule_service_category(sc) -> dict:
    return {
        "id": sc.id,
        "coding_system": sc.coding_system,
        "coding_code": sc.coding_code,
        "coding_display": sc.coding_display,
        "text": sc.text,
    }


def plain_schedule_service_type(st) -> dict:
    return {
        "id": st.id,
        "coding_system": st.coding_system,
        "coding_code": st.coding_code,
        "coding_display": st.coding_display,
        "text": st.text,
    }


def plain_schedule_specialty(sp) -> dict:
    return {
        "id": sp.id,
        "coding_system": sp.coding_system,
        "coding_code": sp.coding_code,
        "coding_display": sp.coding_display,
        "text": sp.text,
    }


def plain_schedule_actor(a) -> dict:
    return {
        "id": a.id,
        "reference_type": fhir_enum(a.reference_type),
        "reference_id": a.reference_id,
        "reference_display": a.reference_display,
    }


def to_plain_schedule(sched) -> dict:
    return {
        "id": sched.schedule_id,
        "active": sched.active,
        "comment": sched.comment,
        "planning_horizon_start": sched.planning_horizon_start.isoformat() if sched.planning_horizon_start else None,
        "planning_horizon_end": sched.planning_horizon_end.isoformat() if sched.planning_horizon_end else None,
        "identifier": [plain_schedule_identifier(i) for i in (sched.identifiers or [])],
        "service_category": [plain_schedule_service_category(sc) for sc in (sched.service_categories or [])],
        "service_type": [plain_schedule_service_type(st) for st in (sched.service_types or [])],
        "specialty": [plain_schedule_specialty(sp) for sp in (sched.specialties or [])],
        "actor": [plain_schedule_actor(a) for a in (sched.actors or [])],
        "user_id": sched.user_id,
        "org_id": sched.org_id,
        "created_at": sched.created_at.isoformat() if sched.created_at else None,
        "updated_at": sched.updated_at.isoformat() if sched.updated_at else None,
        "created_by": sched.created_by,
        "updated_by": sched.updated_by,
    }
