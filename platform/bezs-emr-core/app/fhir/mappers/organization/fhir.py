from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_identifier, fhir_split, fhir_telecom


def fhir_org_identifier(i) -> dict:
    return fhir_identifier(i)


def fhir_org_type(t) -> dict:
    coding = {k: v for k, v in {
        "system": t.coding_system,
        "code": t.coding_code,
        "display": t.coding_display,
    }.items() if v}
    entry: dict = {}
    if coding:
        entry["coding"] = [coding]
    if t.text:
        entry["text"] = t.text
    return entry


def fhir_org_alias(a) -> str:
    return a.value


def fhir_org_telecom(t) -> dict:
    return fhir_telecom(t)


def fhir_org_address(a) -> dict:
    entry: dict = {}
    if a.use:
        entry["use"] = a.use
    if a.type:
        entry["type"] = a.type
    if a.text:
        entry["text"] = a.text
    lines = fhir_split(a.line)
    if lines:
        entry["line"] = lines
    if a.city:
        entry["city"] = a.city
    if a.district:
        entry["district"] = a.district
    if a.state:
        entry["state"] = a.state
    if a.postal_code:
        entry["postalCode"] = a.postal_code
    if a.country:
        entry["country"] = a.country
    if a.period_start or a.period_end:
        entry["period"] = {k: v for k, v in {
            "start": a.period_start.isoformat() if a.period_start else None,
            "end": a.period_end.isoformat() if a.period_end else None,
        }.items() if v}
    return entry


def fhir_org_contact(c) -> dict:
    entry: dict = {}

    # purpose
    if c.purpose_system or c.purpose_code or c.purpose_text:
        coding = {k: v for k, v in {
            "system": c.purpose_system,
            "code": c.purpose_code,
            "display": c.purpose_display,
        }.items() if v}
        purpose_cc: dict = {}
        if coding:
            purpose_cc["coding"] = [coding]
        if c.purpose_text:
            purpose_cc["text"] = c.purpose_text
        if purpose_cc:
            entry["purpose"] = purpose_cc

    # name (HumanName) — columns are prefixed name_*
    if any([c.name_use, c.name_text, c.name_family, c.name_given]):
        name: dict = {}
        if c.name_use:
            name["use"] = fhir_enum(c.name_use)
        if c.name_text:
            name["text"] = c.name_text
        if c.name_family:
            name["family"] = c.name_family
        given = fhir_split(c.name_given)
        if given:
            name["given"] = given
        prefix = fhir_split(c.name_prefix)
        if prefix:
            name["prefix"] = prefix
        suffix = fhir_split(c.name_suffix)
        if suffix:
            name["suffix"] = suffix
        if c.name_period_start or c.name_period_end:
            name["period"] = {k: v for k, v in {
                "start": c.name_period_start.isoformat() if c.name_period_start else None,
                "end": c.name_period_end.isoformat() if c.name_period_end else None,
            }.items() if v}
        entry["name"] = name

    # telecom
    telecoms = [fhir_telecom(t) for t in (c.telecoms or [])]
    if telecoms:
        entry["telecom"] = telecoms

    # address — columns are prefixed address_*
    if any([c.address_use, c.address_text, c.address_line, c.address_city]):
        addr: dict = {}
        if c.address_use:
            addr["use"] = c.address_use
        if c.address_type:
            addr["type"] = c.address_type
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
        entry["address"] = addr

    return entry


def fhir_org_endpoint(e) -> dict:
    ref_type = fhir_enum(e.reference_type)
    entry: dict = {}
    if ref_type and e.reference_id is not None:
        entry["reference"] = f"{ref_type}/{e.reference_id}"
    if e.reference_display:
        entry["display"] = e.reference_display
    return entry


def to_fhir_organization(org) -> dict:
    result: dict = {
        "resourceType": "Organization",
        "id": str(org.organization_id),
    }

    if org.active is not None:
        result["active"] = org.active
    if org.name:
        result["name"] = org.name

    identifiers = [fhir_org_identifier(i) for i in (org.identifiers or [])]
    if identifiers:
        result["identifier"] = identifiers

    types = [fhir_org_type(t) for t in (org.types or [])]
    if types:
        result["type"] = types

    aliases = [fhir_org_alias(a) for a in (org.aliases or []) if a.value]
    if aliases:
        result["alias"] = aliases

    telecoms = [fhir_org_telecom(t) for t in (org.telecoms or [])]
    if telecoms:
        result["telecom"] = telecoms

    addresses = [fhir_org_address(a) for a in (org.addresses or [])]
    if addresses:
        result["address"] = addresses

    if org.partof_type and org.partof_id is not None:
        ref_str = f"{fhir_enum(org.partof_type)}/{org.partof_id}"
        partof: dict = {"reference": ref_str}
        if org.partof_display:
            partof["display"] = org.partof_display
        result["partOf"] = partof

    contacts = [fhir_org_contact(c) for c in (org.contacts or [])]
    if contacts:
        result["contact"] = contacts

    endpoints = [fhir_org_endpoint(e) for e in (org.endpoints or [])]
    if endpoints:
        result["endpoint"] = endpoints

    return {k: v for k, v in result.items() if v is not None}
