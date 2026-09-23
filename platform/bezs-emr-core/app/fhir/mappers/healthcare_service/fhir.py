from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_identifier, fhir_split, fhir_telecom


def _fhir_cc(coding_system, coding_code, coding_display, text) -> dict:
    coding = {k: v for k, v in {
        "system": coding_system,
        "code": coding_code,
        "display": coding_display,
    }.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if text:
        entry["text"] = text
    return entry


def fhir_hs_identifier(i) -> dict:
    return fhir_identifier(i)


def fhir_hs_category(c) -> dict:
    return _fhir_cc(c.coding_system, c.coding_code, c.coding_display, c.text)


def fhir_hs_type(t) -> dict:
    return _fhir_cc(t.coding_system, t.coding_code, t.coding_display, t.text)


def fhir_hs_specialty(sp) -> dict:
    return _fhir_cc(sp.coding_system, sp.coding_code, sp.coding_display, sp.text)


def fhir_hs_location(loc) -> dict:
    ref_type = fhir_enum(loc.reference_type)
    entry: dict = {}
    if ref_type and loc.reference_id is not None:
        entry["reference"] = f"{ref_type}/{loc.reference_id}"
    if loc.reference_display:
        entry["display"] = loc.reference_display
    return entry


def fhir_hs_telecom(t) -> dict:
    return fhir_telecom(t)


def fhir_hs_coverage_area(ca) -> dict:
    ref_type = fhir_enum(ca.reference_type)
    entry: dict = {}
    if ref_type and ca.reference_id is not None:
        entry["reference"] = f"{ref_type}/{ca.reference_id}"
    if ca.reference_display:
        entry["display"] = ca.reference_display
    return entry


def fhir_hs_service_provision_code(spc) -> dict:
    return _fhir_cc(spc.coding_system, spc.coding_code, spc.coding_display, spc.text)


def fhir_hs_eligibility(e) -> dict:
    entry: dict = {}
    code_cc = _fhir_cc(e.code_system, e.code_code, e.code_display, e.code_text)
    if code_cc:
        entry["code"] = code_cc
    if e.comment:
        entry["comment"] = e.comment
    return entry


def fhir_hs_program(p) -> dict:
    return _fhir_cc(p.coding_system, p.coding_code, p.coding_display, p.text)


def fhir_hs_characteristic(c) -> dict:
    return _fhir_cc(c.coding_system, c.coding_code, c.coding_display, c.text)


def fhir_hs_communication(cm) -> dict:
    return _fhir_cc(cm.coding_system, cm.coding_code, cm.coding_display, cm.text)


def fhir_hs_referral_method(rm) -> dict:
    return _fhir_cc(rm.coding_system, rm.coding_code, rm.coding_display, rm.text)


def fhir_hs_available_time(at) -> dict:
    entry: dict = {}
    days = fhir_split(at.days_of_week)
    if days:
        entry["daysOfWeek"] = days
    if at.all_day is not None:
        entry["allDay"] = at.all_day
    if at.available_start_time:
        entry["availableStartTime"] = at.available_start_time
    if at.available_end_time:
        entry["availableEndTime"] = at.available_end_time
    return entry


def fhir_hs_not_available(na) -> dict:
    entry: dict = {}
    if na.description:
        entry["description"] = na.description
    if na.during_start or na.during_end:
        entry["during"] = {k: v for k, v in {
            "start": na.during_start.isoformat() if na.during_start else None,
            "end": na.during_end.isoformat() if na.during_end else None,
        }.items() if v}
    return entry


def fhir_hs_endpoint(ep) -> dict:
    ref_type = fhir_enum(ep.reference_type)
    entry: dict = {}
    if ref_type and ep.reference_id is not None:
        entry["reference"] = f"{ref_type}/{ep.reference_id}"
    if ep.reference_display:
        entry["display"] = ep.reference_display
    return entry


def to_fhir_healthcare_service(hs) -> dict:
    result: dict = {
        "resourceType": "HealthcareService",
        "id": str(hs.healthcare_service_id),
    }

    identifiers = [fhir_hs_identifier(i) for i in (hs.identifiers or [])]
    if identifiers:
        result["identifier"] = identifiers

    if hs.active is not None:
        result["active"] = hs.active

    pb_type = fhir_enum(hs.provided_by_type)
    if pb_type and hs.provided_by_id is not None:
        pb_ref: dict = {"reference": f"{pb_type}/{hs.provided_by_id}"}
        if hs.provided_by_display:
            pb_ref["display"] = hs.provided_by_display
        result["providedBy"] = pb_ref

    categories = [fhir_hs_category(c) for c in (hs.categories or [])]
    if categories:
        result["category"] = categories

    types = [fhir_hs_type(t) for t in (hs.types or [])]
    if types:
        result["type"] = types

    specialties = [fhir_hs_specialty(sp) for sp in (hs.specialties or [])]
    if specialties:
        result["specialty"] = specialties

    locations = [fhir_hs_location(loc) for loc in (hs.locations or [])]
    if locations:
        result["location"] = locations

    if hs.name:
        result["name"] = hs.name

    if hs.comment:
        result["comment"] = hs.comment

    if hs.extra_details:
        result["extraDetails"] = hs.extra_details

    photo = {k: v for k, v in {
        "contentType": hs.photo_content_type,
        "language": hs.photo_language,
        "data": hs.photo_data,
        "url": hs.photo_url,
        "size": hs.photo_size,
        "hash": hs.photo_hash,
        "title": hs.photo_title,
        "creation": hs.photo_creation.isoformat() if hs.photo_creation else None,
    }.items() if v is not None}
    if photo:
        result["photo"] = photo

    telecoms = [fhir_hs_telecom(t) for t in (hs.telecoms or [])]
    if telecoms:
        result["telecom"] = telecoms

    coverage_areas = [fhir_hs_coverage_area(ca) for ca in (hs.coverage_areas or [])]
    if coverage_areas:
        result["coverageArea"] = coverage_areas

    spcs = [fhir_hs_service_provision_code(spc) for spc in (hs.service_provision_codes or [])]
    if spcs:
        result["serviceProvisionCode"] = spcs

    eligibilities = [fhir_hs_eligibility(e) for e in (hs.eligibilities or [])]
    if eligibilities:
        result["eligibility"] = eligibilities

    programs = [fhir_hs_program(p) for p in (hs.programs or [])]
    if programs:
        result["program"] = programs

    chars = [fhir_hs_characteristic(c) for c in (hs.characteristics or [])]
    if chars:
        result["characteristic"] = chars

    comms = [fhir_hs_communication(cm) for cm in (hs.communications or [])]
    if comms:
        result["communication"] = comms

    ref_methods = [fhir_hs_referral_method(rm) for rm in (hs.referral_methods or [])]
    if ref_methods:
        result["referralMethod"] = ref_methods

    if hs.appointment_required is not None:
        result["appointmentRequired"] = hs.appointment_required

    avt = [fhir_hs_available_time(at) for at in (hs.available_times or [])]
    if avt:
        result["availableTime"] = avt

    not_av = [fhir_hs_not_available(na) for na in (hs.not_available or [])]
    if not_av:
        result["notAvailable"] = not_av

    if hs.availability_exceptions:
        result["availabilityExceptions"] = hs.availability_exceptions

    endpoints = [fhir_hs_endpoint(ep) for ep in (hs.endpoints or [])]
    if endpoints:
        result["endpoint"] = endpoints

    return {k: v for k, v in result.items() if v is not None}
