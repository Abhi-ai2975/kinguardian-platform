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


def fhir_pr_identifier(i) -> dict:
    return fhir_identifier(i)


def fhir_pr_code(c) -> dict:
    return _fhir_cc(c.coding_system, c.coding_code, c.coding_display, c.text)


def fhir_pr_specialty(sp) -> dict:
    return _fhir_cc(sp.coding_system, sp.coding_code, sp.coding_display, sp.text)


def fhir_pr_location(loc) -> dict:
    ref_type = fhir_enum(loc.reference_type)
    entry: dict = {}
    if ref_type and loc.reference_id is not None:
        entry["reference"] = f"{ref_type}/{loc.reference_id}"
    if loc.reference_display:
        entry["display"] = loc.reference_display
    return entry


def fhir_pr_healthcare_service(hs) -> dict:
    ref_type = fhir_enum(hs.reference_type)
    entry: dict = {}
    if ref_type and hs.reference_id is not None:
        entry["reference"] = f"{ref_type}/{hs.reference_id}"
    if hs.reference_display:
        entry["display"] = hs.reference_display
    return entry


def fhir_pr_characteristic(c) -> dict:
    return _fhir_cc(c.coding_system, c.coding_code, c.coding_display, c.text)


def fhir_pr_communication(cm) -> dict:
    return _fhir_cc(cm.coding_system, cm.coding_code, cm.coding_display, cm.text)


def fhir_pr_contact_name(n) -> dict:
    entry: dict = {}
    if n.use:
        entry["use"] = fhir_enum(n.use)
    if n.text:
        entry["text"] = n.text
    if n.family:
        entry["family"] = n.family
    given = fhir_split(n.given)
    if given:
        entry["given"] = given
    prefix = fhir_split(n.prefix)
    if prefix:
        entry["prefix"] = prefix
    suffix = fhir_split(n.suffix)
    if suffix:
        entry["suffix"] = suffix
    if n.period_start or n.period_end:
        entry["period"] = {k: v for k, v in {
            "start": n.period_start.isoformat() if n.period_start else None,
            "end": n.period_end.isoformat() if n.period_end else None,
        }.items() if v}
    return entry


def fhir_pr_contact_telecom(t) -> dict:
    return fhir_telecom(t)


def fhir_pr_contact(c) -> dict:
    entry: dict = {}

    if c.purpose_code or c.purpose_system or c.purpose_text:
        entry["purpose"] = _fhir_cc(c.purpose_system, c.purpose_code, c.purpose_display, c.purpose_text)

    names = [fhir_pr_contact_name(n) for n in (c.names or [])]
    if names:
        entry["name"] = names

    telecoms = [fhir_pr_contact_telecom(t) for t in (c.telecoms or [])]
    if telecoms:
        entry["telecom"] = telecoms

    addr: dict = {}
    if c.address_use:
        addr["use"] = fhir_enum(c.address_use)
    if c.address_type:
        addr["type"] = fhir_enum(c.address_type)
    if c.address_text:
        addr["text"] = c.address_text
    lines = fhir_split(c.address_line)
    if lines:
        addr["line"] = lines
    if c.address_city:
        addr["city"] = c.address_city
    if c.address_district:
        addr["district"] = c.address_district
    if c.address_state:
        addr["state"] = c.address_state
    if c.address_postal_code:
        addr["postalCode"] = c.address_postal_code
    if c.address_country:
        addr["country"] = c.address_country
    if c.address_period_start or c.address_period_end:
        addr["period"] = {k: v for k, v in {
            "start": c.address_period_start.isoformat() if c.address_period_start else None,
            "end": c.address_period_end.isoformat() if c.address_period_end else None,
        }.items() if v}
    if addr:
        entry["address"] = addr

    org_type = fhir_enum(c.organization_type)
    if org_type and c.organization_id is not None:
        org_ref: dict = {"reference": f"{org_type}/{c.organization_id}"}
        if c.organization_display:
            org_ref["display"] = c.organization_display
        entry["organization"] = org_ref

    if c.period_start or c.period_end:
        entry["period"] = {k: v for k, v in {
            "start": c.period_start.isoformat() if c.period_start else None,
            "end": c.period_end.isoformat() if c.period_end else None,
        }.items() if v}

    return entry


def fhir_pr_available_time(at) -> dict:
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


def fhir_pr_not_available_time(nat) -> dict:
    entry: dict = {}
    if nat.description:
        entry["description"] = nat.description
    if nat.during_start or nat.during_end:
        entry["during"] = {k: v for k, v in {
            "start": nat.during_start.isoformat() if nat.during_start else None,
            "end": nat.during_end.isoformat() if nat.during_end else None,
        }.items() if v}
    return entry


def fhir_pr_availability(av) -> dict:
    entry: dict = {}
    avt = [fhir_pr_available_time(t) for t in (av.available_times or [])]
    if avt:
        entry["availableTime"] = avt
    nat = [fhir_pr_not_available_time(t) for t in (av.not_available_times or [])]
    if nat:
        entry["notAvailableTime"] = nat
    return entry


def fhir_pr_endpoint(ep) -> dict:
    ref_type = fhir_enum(ep.reference_type)
    entry: dict = {}
    if ref_type and ep.reference_id is not None:
        entry["reference"] = f"{ref_type}/{ep.reference_id}"
    if ep.reference_display:
        entry["display"] = ep.reference_display
    return entry


def to_fhir_practitioner_role(pr) -> dict:
    result: dict = {
        "resourceType": "PractitionerRole",
        "id": str(pr.practitioner_role_id),
    }

    if pr.active is not None:
        result["active"] = pr.active

    if pr.period_start or pr.period_end:
        result["period"] = {k: v for k, v in {
            "start": pr.period_start.isoformat() if pr.period_start else None,
            "end": pr.period_end.isoformat() if pr.period_end else None,
        }.items() if v}

    if pr.practitioner_ref_id:
        prac_ref: dict = {"reference": f"Practitioner/{pr.practitioner_ref_id}"}
        if pr.practitioner_display:
            prac_ref["display"] = pr.practitioner_display
        result["practitioner"] = prac_ref

    org_type = fhir_enum(pr.organization_type)
    if org_type and pr.organization_id is not None:
        org_ref: dict = {"reference": f"{org_type}/{pr.organization_id}"}
        if pr.organization_display:
            org_ref["display"] = pr.organization_display
        result["organization"] = org_ref

    identifiers = [fhir_pr_identifier(i) for i in (pr.identifiers or [])]
    if identifiers:
        result["identifier"] = identifiers

    codes = [fhir_pr_code(c) for c in (pr.codes or [])]
    if codes:
        result["code"] = codes

    specialties = [fhir_pr_specialty(sp) for sp in (pr.specialties or [])]
    if specialties:
        result["specialty"] = specialties

    locations = [fhir_pr_location(loc) for loc in (pr.locations or [])]
    if locations:
        result["location"] = locations

    hcs = [fhir_pr_healthcare_service(hs) for hs in (pr.healthcare_services or [])]
    if hcs:
        result["healthcareService"] = hcs

    chars = [fhir_pr_characteristic(c) for c in (pr.characteristics or [])]
    if chars:
        result["characteristic"] = chars

    comms = [fhir_pr_communication(cm) for cm in (pr.communications or [])]
    if comms:
        result["communication"] = comms

    contacts = [fhir_pr_contact(c) for c in (pr.contacts or [])]
    if contacts:
        result["contact"] = contacts

    avs = [fhir_pr_availability(av) for av in (pr.availabilities or [])]
    if avs:
        result["availability"] = avs

    if pr.availability_exceptions:
        result["availabilityExceptions"] = pr.availability_exceptions

    endpoints = [fhir_pr_endpoint(ep) for ep in (pr.endpoints or [])]
    if endpoints:
        result["endpoint"] = endpoints

    return {k: v for k, v in result.items() if v is not None}
