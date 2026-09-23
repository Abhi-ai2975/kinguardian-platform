from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_identifier


def fhir_slot_identifier(i) -> dict:
    return fhir_identifier(i)


def fhir_slot_service_category(sc) -> dict:
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


def fhir_slot_service_type(st) -> dict:
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


def fhir_slot_specialty(sp) -> dict:
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


def to_fhir_slot(slot) -> dict:
    result: dict = {
        "resourceType": "Slot",
        "id": str(slot.slot_id),
    }

    identifiers = [fhir_slot_identifier(i) for i in (slot.identifiers or [])]
    if identifiers:
        result["identifier"] = identifiers

    service_categories = [fhir_slot_service_category(sc) for sc in (slot.service_categories or [])]
    if service_categories:
        result["serviceCategory"] = service_categories

    service_types = [fhir_slot_service_type(st) for st in (slot.service_types or [])]
    if service_types:
        result["serviceType"] = service_types

    specialties = [fhir_slot_specialty(sp) for sp in (slot.specialties or [])]
    if specialties:
        result["specialty"] = specialties

    if slot.appointment_type_code or slot.appointment_type_system or slot.appointment_type_text:
        coding = {k: v for k, v in {
            "system": slot.appointment_type_system,
            "code": slot.appointment_type_code,
            "display": slot.appointment_type_display,
        }.items() if v}
        appt_type: dict = {}
        if coding:
            appt_type["coding"] = [coding]
        if slot.appointment_type_text:
            appt_type["text"] = slot.appointment_type_text
        result["appointmentType"] = appt_type

    if slot.schedule:
        sched_ref: dict = {"reference": f"Schedule/{slot.schedule.schedule_id}"}
        if slot.schedule_display:
            sched_ref["display"] = slot.schedule_display
        result["schedule"] = sched_ref

    if slot.status is not None:
        result["status"] = fhir_enum(slot.status)

    if slot.start:
        result["start"] = slot.start.isoformat()

    if slot.end:
        result["end"] = slot.end.isoformat()

    if slot.overbooked is not None:
        result["overbooked"] = slot.overbooked

    if slot.comment:
        result["comment"] = slot.comment

    return {k: v for k, v in result.items() if v is not None}
