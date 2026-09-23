from __future__ import annotations


def fhir_split(value: str | None) -> list[str]:
    if not value:
        return []
    return [s.strip() for s in value.split(",") if s.strip()]


def fhir_enum(v):
    """Return .value if v is an enum, otherwise return as-is (handles both str and SQLAlchemy Enum columns)."""
    return v.value if hasattr(v, "value") else v


def fhir_human_name(n) -> dict:
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


def fhir_identifier(i) -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = fhir_enum(i.use)
    if i.type_system or i.type_code or i.type_text:
        type_cc: dict = {}
        if i.type_system or i.type_code:
            type_cc["coding"] = [{k: v for k, v in {
                "system": i.type_system,
                "code": i.type_code,
                "display": i.type_display,
            }.items() if v}]
        if i.type_text:
            type_cc["text"] = i.type_text
        entry["type"] = type_cc
    if i.system:
        entry["system"] = i.system
    if i.value:
        entry["value"] = i.value
    if i.period_start or i.period_end:
        entry["period"] = {k: v for k, v in {
            "start": i.period_start.isoformat() if i.period_start else None,
            "end": i.period_end.isoformat() if i.period_end else None,
        }.items() if v}
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_telecom(t) -> dict:
    entry: dict = {}
    if t.system:
        entry["system"] = fhir_enum(t.system)
    if t.value:
        entry["value"] = t.value
    if t.use:
        entry["use"] = fhir_enum(t.use)
    if t.rank is not None:
        entry["rank"] = t.rank
    if t.period_start or t.period_end:
        entry["period"] = {k: v for k, v in {
            "start": t.period_start.isoformat() if t.period_start else None,
            "end": t.period_end.isoformat() if t.period_end else None,
        }.items() if v}
    return entry


def fhir_address(a) -> dict:
    entry: dict = {}
    if a.use:
        entry["use"] = fhir_enum(a.use)
    if a.type:
        entry["type"] = fhir_enum(a.type)
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


def fhir_photo(p) -> dict:
    return {k: v for k, v in {
        "contentType": p.content_type,
        "language": p.language,
        "data": p.data,
        "url": p.url,
        "size": p.size,
        "hash": p.hash,
        "title": p.title,
        "creation": p.creation.isoformat() if p.creation else None,
    }.items() if v is not None}


def fhir_communication(cm) -> dict:
    coding = {k: v for k, v in {
        "system": cm.language_system,
        "code": cm.language_code,
        "display": cm.language_display,
    }.items() if v}
    language_cc: dict = {}
    if coding:
        language_cc["coding"] = [coding]
    if cm.language_text:
        language_cc["text"] = cm.language_text
    entry: dict = {}
    if language_cc:
        entry["language"] = language_cc
    if cm.preferred is not None:
        entry["preferred"] = cm.preferred
    return entry


# ── Plain (snake_case) helpers — shared across patient + practitioner ──────────


def plain_name(n) -> dict:
    return {
        "id": n.id,
        "org_id": n.org_id,
        "use": fhir_enum(n.use),
        "text": n.text,
        "family": n.family,
        "given": fhir_split(n.given),
        "prefix": fhir_split(n.prefix),
        "suffix": fhir_split(n.suffix),
        "period_start": n.period_start.isoformat() if n.period_start else None,
        "period_end": n.period_end.isoformat() if n.period_end else None,
    }


def plain_identifier(i) -> dict:
    return {
        "id": i.id,
        "org_id": i.org_id,
        "use": fhir_enum(i.use),
        "type_system": i.type_system,
        "type_code": i.type_code,
        "type_display": i.type_display,
        "type_text": i.type_text,
        "system": i.system,
        "value": i.value,
        "period_start": i.period_start.isoformat() if i.period_start else None,
        "period_end": i.period_end.isoformat() if i.period_end else None,
        "assigner": i.assigner,
    }


def plain_telecom(t) -> dict:
    return {
        "id": t.id,
        "org_id": t.org_id,
        "system": fhir_enum(t.system),
        "value": t.value,
        "use": fhir_enum(t.use),
        "rank": t.rank,
        "period_start": t.period_start.isoformat() if t.period_start else None,
        "period_end": t.period_end.isoformat() if t.period_end else None,
    }


def plain_address(a) -> dict:
    return {
        "id": a.id,
        "org_id": a.org_id,
        "use": fhir_enum(a.use),
        "type": fhir_enum(a.type),
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


def plain_photo(p) -> dict:
    return {
        "id": p.id,
        "org_id": p.org_id,
        "content_type": p.content_type,
        "language": p.language,
        "data": p.data,
        "url": p.url,
        "size": p.size,
        "hash": p.hash,
        "title": p.title,
        "creation": p.creation.isoformat() if p.creation else None,
    }


def plain_communication(cm) -> dict:
    return {
        "id": cm.id,
        "org_id": cm.org_id,
        "language_system": cm.language_system,
        "language_code": cm.language_code,
        "language_display": cm.language_display,
        "language_text": cm.language_text,
        "preferred": cm.preferred,
    }
