from __future__ import annotations

from app.fhir.datatypes import fhir_enum, fhir_split, plain_identifier, plain_telecom


def plain_org_identifier(i) -> dict:
    return {"id": i.id, **plain_identifier(i)}


def plain_org_type(t) -> dict:
    return {
        "id": t.id,
        "coding_system": t.coding_system,
        "coding_code": t.coding_code,
        "coding_display": t.coding_display,
        "text": t.text,
    }


def plain_org_alias(a) -> dict:
    return {
        "id": a.id,
        "value": a.value,
    }


def plain_org_telecom(t) -> dict:
    return {"id": t.id, **plain_telecom(t)}


def plain_org_address(a) -> dict:
    return {
        "id": a.id,
        "use": a.use,
        "type": a.type,
        "text": a.text,
        "line": fhir_split(a.line),
        "city": a.city,
        "district": a.district,
        "state": a.state,
        "postal_code": a.postal_code,
        "country": a.country,
        "period_start": a.period_start.isoformat() if a.period_start else None,
        "period_end": a.period_end.isoformat() if a.period_end else None,
    }


def plain_org_contact_telecom(ct) -> dict:
    return {
        "id": ct.id,
        "system": ct.system,
        "value": ct.value,
        "use": ct.use,
        "rank": ct.rank,
        "period_start": ct.period_start.isoformat() if ct.period_start else None,
        "period_end": ct.period_end.isoformat() if ct.period_end else None,
    }


def plain_org_contact(c) -> dict:
    return {
        "id": c.id,
        "purpose_system": c.purpose_system,
        "purpose_code": c.purpose_code,
        "purpose_display": c.purpose_display,
        "purpose_text": c.purpose_text,
        "name_use": fhir_enum(c.name_use),
        "name_text": c.name_text,
        "name_family": c.name_family,
        "name_given": fhir_split(c.name_given),
        "name_prefix": fhir_split(c.name_prefix),
        "name_suffix": fhir_split(c.name_suffix),
        "name_period_start": c.name_period_start.isoformat() if c.name_period_start else None,
        "name_period_end": c.name_period_end.isoformat() if c.name_period_end else None,
        "address_use": c.address_use,
        "address_type": c.address_type,
        "address_text": c.address_text,
        "address_line": fhir_split(c.address_line),
        "address_city": c.address_city,
        "address_district": c.address_district,
        "address_state": c.address_state,
        "address_postal_code": c.address_postal_code,
        "address_country": c.address_country,
        "address_period_start": c.address_period_start.isoformat() if c.address_period_start else None,
        "address_period_end": c.address_period_end.isoformat() if c.address_period_end else None,
        "telecoms": [plain_org_contact_telecom(ct) for ct in (c.telecoms or [])],
    }


def plain_org_endpoint(e) -> dict:
    return {
        "id": e.id,
        "reference_type": fhir_enum(e.reference_type),
        "reference_id": e.reference_id,
        "reference_display": e.reference_display,
    }


def to_plain_organization(org) -> dict:
    return {
        "id": org.organization_id,
        "active": org.active,
        "name": org.name,
        "partof_type": fhir_enum(org.partof_type),
        "partof_id": org.partof_id,
        "partof_display": org.partof_display,
        "identifier": [plain_org_identifier(i) for i in (org.identifiers or [])],
        "type": [plain_org_type(t) for t in (org.types or [])],
        "alias": [plain_org_alias(a) for a in (org.aliases or [])],
        "telecom": [plain_org_telecom(t) for t in (org.telecoms or [])],
        "address": [plain_org_address(a) for a in (org.addresses or [])],
        "contact": [plain_org_contact(c) for c in (org.contacts or [])],
        "endpoint": [plain_org_endpoint(e) for e in (org.endpoints or [])],
        "user_id": org.user_id,
        "org_id": org.org_id,
        "created_at": org.created_at.isoformat() if org.created_at else None,
        "updated_at": org.updated_at.isoformat() if org.updated_at else None,
        "created_by": org.created_by,
        "updated_by": org.updated_by,
    }
