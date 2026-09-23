from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_identifier


def fhir_schedule_identifier(i) -> dict:
    return fhir_identifier(i)


def fhir_schedule_service_category(sc) -> dict:
    coding = {k: v for k, v in {
        "system": sc.coding_system,
        "code": sc.coding_code,
        "display": sc.coding_display,
    }.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if sc.text:
        entry["text"] = sc.text
    return entry


def fhir_schedule_service_type(st) -> dict:
    coding = {k: v for k, v in {
        "system": st.coding_system,
        "code": st.coding_code,
        "display": st.coding_display,
    }.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if st.text:
        entry["text"] = st.text
    return entry


def fhir_schedule_specialty(sp) -> dict:
    coding = {k: v for k, v in {
        "system": sp.coding_system,
        "code": sp.coding_code,
        "display": sp.coding_display,
    }.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if sp.text:
        entry["text"] = sp.text
    return entry


def fhir_schedule_actor(a) -> dict:
    entry: dict = {}
    ref_type = fhir_enum(a.reference_type)
    if ref_type and a.reference_id is not None:
        entry["reference"] = f"{ref_type}/{a.reference_id}"
    if a.reference_display:
        entry["display"] = a.reference_display
    return entry


def to_fhir_schedule(sched) -> dict:
    result: dict = {
        "resourceType": "Schedule",
        "id": str(sched.schedule_id),
    }

    if sched.active is not None:
        result["active"] = sched.active

    identifiers = [fhir_schedule_identifier(i) for i in (sched.identifiers or [])]
    if identifiers:
        result["identifier"] = identifiers

    service_categories = [fhir_schedule_service_category(sc) for sc in (sched.service_categories or [])]
    if service_categories:
        result["serviceCategory"] = service_categories

    service_types = [fhir_schedule_service_type(st) for st in (sched.service_types or [])]
    if service_types:
        result["serviceType"] = service_types

    specialties = [fhir_schedule_specialty(sp) for sp in (sched.specialties or [])]
    if specialties:
        result["specialty"] = specialties

    actors = [fhir_schedule_actor(a) for a in (sched.actors or [])]
    if actors:
        result["actor"] = actors

    if sched.planning_horizon_start or sched.planning_horizon_end:
        result["planningHorizon"] = {k: v for k, v in {
            "start": sched.planning_horizon_start.isoformat() if sched.planning_horizon_start else None,
            "end": sched.planning_horizon_end.isoformat() if sched.planning_horizon_end else None,
        }.items() if v}

    if sched.comment:
        result["comment"] = sched.comment

    return {k: v for k, v in result.items() if v is not None}
