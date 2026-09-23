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


def fhir_location_identifier(i: "LocationIdentifier") -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    type_coding: dict = {k: v for k, v in {
        "system": i.type_system, "code": i.type_code, "display": i.type_display,
    }.items() if v}
    type_cc: dict = {}
    if type_coding:
        type_cc["coding"] = [type_coding]
    if i.type_text:
        type_cc["text"] = i.type_text
    if type_cc:
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


def fhir_location_type(t: "LocationType") -> dict:
    coding: dict = {k: v for k, v in {
        "system": t.coding_system, "code": t.coding_code, "display": t.coding_display,
    }.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if t.text:
        result["text"] = t.text
    return result


def fhir_location_telecom(t: "LocationTelecom") -> dict:
    entry: dict = {}
    system = t.system.value if t.system and hasattr(t.system, "value") else t.system
    use = t.use.value if t.use and hasattr(t.use, "value") else t.use
    if system:
        entry["system"] = system
    if t.value:
        entry["value"] = t.value
    if use:
        entry["use"] = use
    if t.rank is not None:
        entry["rank"] = t.rank
    if t.period_start or t.period_end:
        entry["period"] = {k: v for k, v in {
            "start": t.period_start.isoformat() if t.period_start else None,
            "end": t.period_end.isoformat() if t.period_end else None,
        }.items() if v}
    return entry


def fhir_location_hours_of_operation(h: "LocationHoursOfOperation") -> dict:
    entry: dict = {}
    days = fhir_split(h.days_of_week)
    if days:
        entry["daysOfWeek"] = days
    if h.all_day is not None:
        entry["allDay"] = h.all_day
    if h.opening_time:
        entry["openingTime"] = h.opening_time
    if h.closing_time:
        entry["closingTime"] = h.closing_time
    return entry


def fhir_location_endpoint(e: "LocationEndpoint") -> dict:
    ref_type = e.reference_type.value if e.reference_type and hasattr(e.reference_type, "value") else e.reference_type
    entry: dict = {}
    if ref_type and e.reference_id:
        entry["reference"] = f"{ref_type}/{e.reference_id}"
    if e.reference_display:
        entry["display"] = e.reference_display
    return entry


def to_fhir_location(model: "LocationModel") -> dict:
    result: dict = {
        "resourceType": "Location",
        "id": str(model.location_id),
    }

    if model.identifiers:
        result["identifier"] = [fhir_location_identifier(i) for i in model.identifiers]

    if model.status:
        result["status"] = model.status.value if hasattr(model.status, "value") else model.status

    if model.operational_status_code or model.operational_status_system:
        op_status: dict = {}
        if model.operational_status_system:
            op_status["system"] = model.operational_status_system
        if model.operational_status_code:
            op_status["code"] = model.operational_status_code
        if model.operational_status_display:
            op_status["display"] = model.operational_status_display
        result["operationalStatus"] = op_status

    if model.name:
        result["name"] = model.name

    if model.aliases:
        result["alias"] = [a.alias for a in model.aliases]

    if model.description:
        result["description"] = model.description

    if model.mode:
        result["mode"] = model.mode.value if hasattr(model.mode, "value") else model.mode

    if model.types:
        result["type"] = [fhir_location_type(t) for t in model.types]

    if model.telecoms:
        result["telecom"] = [fhir_location_telecom(t) for t in model.telecoms]

    addr_fields = [
        model.address_use, model.address_type, model.address_text, model.address_line,
        model.address_city, model.address_district, model.address_state,
        model.address_postal_code, model.address_country,
        model.address_period_start, model.address_period_end,
    ]
    if any(addr_fields):
        addr: dict = {}
        if model.address_use:
            addr["use"] = model.address_use
        if model.address_type:
            addr["type"] = model.address_type
        if model.address_text:
            addr["text"] = model.address_text
        lines = fhir_split(model.address_line)
        if lines:
            addr["line"] = lines
        if model.address_city:
            addr["city"] = model.address_city
        if model.address_district:
            addr["district"] = model.address_district
        if model.address_state:
            addr["state"] = model.address_state
        if model.address_postal_code:
            addr["postalCode"] = model.address_postal_code
        if model.address_country:
            addr["country"] = model.address_country
        if model.address_period_start or model.address_period_end:
            addr["period"] = {k: v for k, v in {
                "start": model.address_period_start.isoformat() if model.address_period_start else None,
                "end": model.address_period_end.isoformat() if model.address_period_end else None,
            }.items() if v}
        result["address"] = addr

    pt_cc: dict = {}
    if model.physical_type_code or model.physical_type_system:
        coding: dict = {k: v for k, v in {
            "system": model.physical_type_system,
            "code": model.physical_type_code,
            "display": model.physical_type_display,
        }.items() if v}
        if coding:
            pt_cc["coding"] = [coding]
    if model.physical_type_text:
        pt_cc["text"] = model.physical_type_text
    if pt_cc:
        result["physicalType"] = pt_cc

    if model.managing_organization_type and model.managing_organization_id:
        org_type = model.managing_organization_type.value if hasattr(model.managing_organization_type, "value") else model.managing_organization_type
        org_ref: dict = {"reference": f"{org_type}/{model.managing_organization_id}"}
        if model.managing_organization_display:
            org_ref["display"] = model.managing_organization_display
        result["managingOrganization"] = org_ref

    if model.part_of_type and model.part_of_id:
        po_type = model.part_of_type.value if hasattr(model.part_of_type, "value") else model.part_of_type
        po_ref: dict = {"reference": f"{po_type}/{model.part_of_id}"}
        if model.part_of_display:
            po_ref["display"] = model.part_of_display
        result["partOf"] = po_ref

    if model.availability_exceptions:
        result["availabilityExceptions"] = model.availability_exceptions

    if model.position_longitude is not None and model.position_latitude is not None:
        pos: dict = {
            "longitude": float(model.position_longitude),
            "latitude": float(model.position_latitude),
        }
        if model.position_altitude is not None:
            pos["altitude"] = float(model.position_altitude)
        result["position"] = pos

    if model.hours_of_operation:
        result["hoursOfOperation"] = [fhir_location_hours_of_operation(h) for h in model.hours_of_operation]

    if model.endpoints:
        result["endpoint"] = [fhir_location_endpoint(e) for e in model.endpoints]

    return {k: v for k, v in result.items() if v is not None}
