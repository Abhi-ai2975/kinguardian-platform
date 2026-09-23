from __future__ import annotations

from app.fhir.datatypes import fhir_enum, plain_identifier


def plain_slot_identifier(i) -> dict:
    return {"id": i.id, **plain_identifier(i)}


def plain_slot_service_category(sc) -> dict:
    return {
        "id": sc.id,
        "coding_system": sc.coding_system,
        "coding_code": sc.coding_code,
        "coding_display": sc.coding_display,
        "text": sc.text,
    }


def plain_slot_service_type(st) -> dict:
    return {
        "id": st.id,
        "coding_system": st.coding_system,
        "coding_code": st.coding_code,
        "coding_display": st.coding_display,
        "text": st.text,
    }


def plain_slot_specialty(sp) -> dict:
    return {
        "id": sp.id,
        "coding_system": sp.coding_system,
        "coding_code": sp.coding_code,
        "coding_display": sp.coding_display,
        "text": sp.text,
    }


def to_plain_slot(slot) -> dict:
    return {
        "id": slot.slot_id,
        "status": fhir_enum(slot.status),
        "start": slot.start.isoformat() if slot.start else None,
        "end": slot.end.isoformat() if slot.end else None,
        "overbooked": slot.overbooked,
        "comment": slot.comment,
        "schedule_type": fhir_enum(slot.schedule_type),
        "schedule_id": slot.schedule.schedule_id if slot.schedule else None,
        "schedule_display": slot.schedule_display,
        "appointment_type_system": slot.appointment_type_system,
        "appointment_type_code": slot.appointment_type_code,
        "appointment_type_display": slot.appointment_type_display,
        "appointment_type_text": slot.appointment_type_text,
        "identifier": [plain_slot_identifier(i) for i in (slot.identifiers or [])],
        "service_category": [plain_slot_service_category(sc) for sc in (slot.service_categories or [])],
        "service_type": [plain_slot_service_type(st) for st in (slot.service_types or [])],
        "specialty": [plain_slot_specialty(sp) for sp in (slot.specialties or [])],
        "user_id": slot.user_id,
        "org_id": slot.org_id,
        "created_at": slot.created_at.isoformat() if slot.created_at else None,
        "updated_at": slot.updated_at.isoformat() if slot.updated_at else None,
        "created_by": slot.created_by,
        "updated_by": slot.updated_by,
    }
