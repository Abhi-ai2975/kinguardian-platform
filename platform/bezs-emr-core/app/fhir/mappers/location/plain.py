from __future__ import annotations

from typing import TYPE_CHECKING

from app.fhir.datatypes import fhir_split

if TYPE_CHECKING:
    from app.models.location.location import (
        LocationAlias,
        LocationEndpoint,
        LocationHoursOfOperation,
        LocationIdentifier,
        LocationModel,
        LocationTelecom,
        LocationType,
    )


def plain_location_identifier(i: "LocationIdentifier") -> dict:
    return {
        "id": i.id,
        "use": i.use,
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


def plain_location_alias(a: "LocationAlias") -> dict:
    return {"id": a.id, "alias": a.alias}


def plain_location_type(t: "LocationType") -> dict:
    return {
        "id": t.id,
        "coding_system": t.coding_system,
        "coding_code": t.coding_code,
        "coding_display": t.coding_display,
        "text": t.text,
    }


def plain_location_telecom(t: "LocationTelecom") -> dict:
    system = t.system.value if t.system and hasattr(t.system, "value") else t.system
    use = t.use.value if t.use and hasattr(t.use, "value") else t.use
    return {
        "id": t.id,
        "system": system,
        "value": t.value,
        "use": use,
        "rank": t.rank,
        "period_start": t.period_start.isoformat() if t.period_start else None,
        "period_end": t.period_end.isoformat() if t.period_end else None,
    }


def plain_location_hours_of_operation(h: "LocationHoursOfOperation") -> dict:
    return {
        "id": h.id,
        "days_of_week": fhir_split(h.days_of_week),
        "all_day": h.all_day,
        "opening_time": h.opening_time,
        "closing_time": h.closing_time,
    }


def plain_location_endpoint(e: "LocationEndpoint") -> dict:
    ref_type = e.reference_type.value if e.reference_type and hasattr(e.reference_type, "value") else e.reference_type
    return {
        "id": e.id,
        "reference_type": ref_type,
        "reference_id": e.reference_id,
        "reference_display": e.reference_display,
    }


def to_plain_location(model: "LocationModel") -> dict:
    status = model.status.value if model.status and hasattr(model.status, "value") else model.status
    mode = model.mode.value if model.mode and hasattr(model.mode, "value") else model.mode
    org_type = model.managing_organization_type.value if model.managing_organization_type and hasattr(model.managing_organization_type, "value") else model.managing_organization_type
    po_type = model.part_of_type.value if model.part_of_type and hasattr(model.part_of_type, "value") else model.part_of_type

    result: dict = {
        "id": model.location_id,
        "status": status,
        "operational_status_system": model.operational_status_system,
        "operational_status_code": model.operational_status_code,
        "operational_status_display": model.operational_status_display,
        "name": model.name,
        "description": model.description,
        "mode": mode,
        "address_use": model.address_use,
        "address_type": model.address_type,
        "address_text": model.address_text,
        "address_line": fhir_split(model.address_line) if model.address_line else None,
        "address_city": model.address_city,
        "address_district": model.address_district,
        "address_state": model.address_state,
        "address_postal_code": model.address_postal_code,
        "address_country": model.address_country,
        "address_period_start": model.address_period_start.isoformat() if model.address_period_start else None,
        "address_period_end": model.address_period_end.isoformat() if model.address_period_end else None,
        "physical_type_system": model.physical_type_system,
        "physical_type_code": model.physical_type_code,
        "physical_type_display": model.physical_type_display,
        "physical_type_text": model.physical_type_text,
        "managing_organization_type": org_type,
        "managing_organization_id": model.managing_organization_id,
        "managing_organization_display": model.managing_organization_display,
        "part_of_type": po_type,
        "part_of_id": model.part_of_id,
        "part_of_display": model.part_of_display,
        "availability_exceptions": model.availability_exceptions,
        "position_longitude": float(model.position_longitude) if model.position_longitude is not None else None,
        "position_latitude": float(model.position_latitude) if model.position_latitude is not None else None,
        "position_altitude": float(model.position_altitude) if model.position_altitude is not None else None,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
    }

    if model.identifiers:
        result["identifier"] = [plain_location_identifier(i) for i in model.identifiers]
    if model.aliases:
        result["alias"] = [plain_location_alias(a) for a in model.aliases]
    if model.types:
        result["type"] = [plain_location_type(t) for t in model.types]
    if model.telecoms:
        result["telecom"] = [plain_location_telecom(t) for t in model.telecoms]
    if model.hours_of_operation:
        result["hours_of_operation"] = [plain_location_hours_of_operation(h) for h in model.hours_of_operation]
    if model.endpoints:
        result["endpoint"] = [plain_location_endpoint(e) for e in model.endpoints]

    return {k: v for k, v in result.items() if v is not None}
