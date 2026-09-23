from __future__ import annotations

from typing import TYPE_CHECKING

from app.fhir.datatypes import (
    fhir_enum, fhir_split, fhir_human_name, fhir_identifier, fhir_telecom,
    fhir_address, fhir_photo, fhir_communication,
)

if TYPE_CHECKING:
    from app.models.practitioner.practitioner import PractitionerModel, PractitionerQualification


def fhir_qualification(q: "PractitionerQualification") -> dict:
    entry: dict = {}
    if q.identifiers:
        entry["identifier"] = [fhir_identifier(qi) for qi in q.identifiers]
    code_cc: dict = {}
    if q.code_system or q.code_code:
        code_cc["coding"] = [{k: v for k, v in {
            "system": q.code_system,
            "code": q.code_code,
            "display": q.code_display,
        }.items() if v}]
    if q.code_text:
        code_cc["text"] = q.code_text
    if code_cc:
        entry["code"] = code_cc
    if q.status_system or q.status_code or q.status_text:
        status_cc: dict = {}
        if q.status_system or q.status_code:
            status_cc["coding"] = [{k: v for k, v in {
                "system": q.status_system,
                "code": q.status_code,
                "display": q.status_display,
            }.items() if v}]
        if q.status_text:
            status_cc["text"] = q.status_text
        entry["status"] = status_cc
    if q.period_start or q.period_end:
        entry["period"] = {k: v for k, v in {
            "start": q.period_start.isoformat() if q.period_start else None,
            "end": q.period_end.isoformat() if q.period_end else None,
        }.items() if v}
    if q.issuer_type and q.issuer_id or q.issuer_display:
        entry["issuer"] = {k: v for k, v in {
            "reference": f"{fhir_enum(q.issuer_type)}/{q.issuer_id}" if q.issuer_type and q.issuer_id else None,
            "display": q.issuer_display,
        }.items() if v}
    return entry


def to_fhir_practitioner(practitioner: "PractitionerModel") -> dict:
    result: dict = {
        "resourceType": "Practitioner",
        "id": str(practitioner.practitioner_id),
        "active": practitioner.active,
        "gender": fhir_enum(practitioner.gender) if practitioner.gender else None,
        "birthDate": practitioner.birth_date.isoformat() if practitioner.birth_date else None,
        "deceasedBoolean": practitioner.deceased_boolean,
        "deceasedDateTime": practitioner.deceased_datetime.isoformat() if practitioner.deceased_datetime else None,
    }

    if practitioner.names:
        result["name"] = [fhir_human_name(n) for n in practitioner.names]
    if practitioner.identifiers:
        result["identifier"] = [fhir_identifier(i) for i in practitioner.identifiers]
    if practitioner.telecoms:
        result["telecom"] = [fhir_telecom(t) for t in practitioner.telecoms]
    if practitioner.addresses:
        result["address"] = [fhir_address(a) for a in practitioner.addresses]
    if practitioner.photos:
        result["photo"] = [fhir_photo(p) for p in practitioner.photos]
    if practitioner.qualifications:
        result["qualification"] = [fhir_qualification(q) for q in practitioner.qualifications]
    if practitioner.communications:
        result["communication"] = [fhir_communication(c) for c in practitioner.communications]

    return {k: v for k, v in result.items() if v is not None}
