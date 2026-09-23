from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_split, plain_identifier, plain_telecom


def plain_hs_identifier(i) -> dict:
    return {"id": i.id, **plain_identifier(i)}


def plain_hs_category(c) -> dict:
    return {
        "id": c.id,
        "coding_system": c.coding_system,
        "coding_code": c.coding_code,
        "coding_display": c.coding_display,
        "text": c.text,
    }


def plain_hs_type(t) -> dict:
    return {
        "id": t.id,
        "coding_system": t.coding_system,
        "coding_code": t.coding_code,
        "coding_display": t.coding_display,
        "text": t.text,
    }


def plain_hs_specialty(sp) -> dict:
    return {
        "id": sp.id,
        "coding_system": sp.coding_system,
        "coding_code": sp.coding_code,
        "coding_display": sp.coding_display,
        "text": sp.text,
    }


def plain_hs_location(loc) -> dict:
    return {
        "id": loc.id,
        "reference_type": fhir_enum(loc.reference_type),
        "reference_id": loc.reference_id,
        "reference_display": loc.reference_display,
    }


def plain_hs_telecom(t) -> dict:
    return {"id": t.id, **plain_telecom(t)}


def plain_hs_coverage_area(ca) -> dict:
    return {
        "id": ca.id,
        "reference_type": fhir_enum(ca.reference_type),
        "reference_id": ca.reference_id,
        "reference_display": ca.reference_display,
    }


def plain_hs_service_provision_code(spc) -> dict:
    return {
        "id": spc.id,
        "coding_system": spc.coding_system,
        "coding_code": spc.coding_code,
        "coding_display": spc.coding_display,
        "text": spc.text,
    }


def plain_hs_eligibility(e) -> dict:
    return {
        "id": e.id,
        "code_system": e.code_system,
        "code_code": e.code_code,
        "code_display": e.code_display,
        "code_text": e.code_text,
        "comment": e.comment,
    }


def plain_hs_program(p) -> dict:
    return {
        "id": p.id,
        "coding_system": p.coding_system,
        "coding_code": p.coding_code,
        "coding_display": p.coding_display,
        "text": p.text,
    }


def plain_hs_characteristic(c) -> dict:
    return {
        "id": c.id,
        "coding_system": c.coding_system,
        "coding_code": c.coding_code,
        "coding_display": c.coding_display,
        "text": c.text,
    }


def plain_hs_communication(cm) -> dict:
    return {
        "id": cm.id,
        "coding_system": cm.coding_system,
        "coding_code": cm.coding_code,
        "coding_display": cm.coding_display,
        "text": cm.text,
    }


def plain_hs_referral_method(rm) -> dict:
    return {
        "id": rm.id,
        "coding_system": rm.coding_system,
        "coding_code": rm.coding_code,
        "coding_display": rm.coding_display,
        "text": rm.text,
    }


def plain_hs_available_time(at) -> dict:
    return {
        "id": at.id,
        "days_of_week": fhir_split(at.days_of_week),
        "all_day": at.all_day,
        "available_start_time": at.available_start_time,
        "available_end_time": at.available_end_time,
    }


def plain_hs_not_available(na) -> dict:
    return {
        "id": na.id,
        "description": na.description,
        "during_start": na.during_start.isoformat() if na.during_start else None,
        "during_end": na.during_end.isoformat() if na.during_end else None,
    }


def plain_hs_endpoint(ep) -> dict:
    return {
        "id": ep.id,
        "reference_type": fhir_enum(ep.reference_type),
        "reference_id": ep.reference_id,
        "reference_display": ep.reference_display,
    }


def to_plain_healthcare_service(hs) -> dict:
    return {
        "id": hs.healthcare_service_id,
        "active": hs.active,
        "provided_by_type": fhir_enum(hs.provided_by_type),
        "provided_by_id": hs.provided_by_id,
        "provided_by_display": hs.provided_by_display,
        "name": hs.name,
        "comment": hs.comment,
        "extra_details": hs.extra_details,
        "photo_content_type": hs.photo_content_type,
        "photo_language": hs.photo_language,
        "photo_data": hs.photo_data,
        "photo_url": hs.photo_url,
        "photo_size": hs.photo_size,
        "photo_hash": hs.photo_hash,
        "photo_title": hs.photo_title,
        "photo_creation": hs.photo_creation.isoformat() if hs.photo_creation else None,
        "appointment_required": hs.appointment_required,
        "availability_exceptions": hs.availability_exceptions,
        "identifier": [plain_hs_identifier(i) for i in (hs.identifiers or [])],
        "category": [plain_hs_category(c) for c in (hs.categories or [])],
        "type": [plain_hs_type(t) for t in (hs.types or [])],
        "specialty": [plain_hs_specialty(sp) for sp in (hs.specialties or [])],
        "location": [plain_hs_location(loc) for loc in (hs.locations or [])],
        "telecom": [plain_hs_telecom(t) for t in (hs.telecoms or [])],
        "coverage_area": [plain_hs_coverage_area(ca) for ca in (hs.coverage_areas or [])],
        "service_provision_code": [plain_hs_service_provision_code(spc) for spc in (hs.service_provision_codes or [])],
        "eligibility": [plain_hs_eligibility(e) for e in (hs.eligibilities or [])],
        "program": [plain_hs_program(p) for p in (hs.programs or [])],
        "characteristic": [plain_hs_characteristic(c) for c in (hs.characteristics or [])],
        "communication": [plain_hs_communication(cm) for cm in (hs.communications or [])],
        "referral_method": [plain_hs_referral_method(rm) for rm in (hs.referral_methods or [])],
        "available_time": [plain_hs_available_time(at) for at in (hs.available_times or [])],
        "not_available": [plain_hs_not_available(na) for na in (hs.not_available or [])],
        "endpoint": [plain_hs_endpoint(ep) for ep in (hs.endpoints or [])],
        "user_id": hs.user_id,
        "org_id": hs.org_id,
        "created_at": hs.created_at.isoformat() if hs.created_at else None,
        "updated_at": hs.updated_at.isoformat() if hs.updated_at else None,
        "created_by": hs.created_by,
        "updated_by": hs.updated_by,
    }
