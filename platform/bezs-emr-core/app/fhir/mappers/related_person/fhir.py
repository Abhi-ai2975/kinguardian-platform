from __future__ import annotations

from typing import TYPE_CHECKING

from app.fhir.datatypes import (
    fhir_address,
    fhir_communication,
    fhir_enum,
    fhir_human_name,
    fhir_identifier,
    fhir_photo,
    fhir_telecom,
)

if TYPE_CHECKING:
    from app.models.related_person.related_person import RelatedPersonModel, RelatedPersonRelationship


def _fhir_relationship(r: "RelatedPersonRelationship") -> dict:
    cc: dict = {}
    if r.coding_system or r.coding_code:
        cc["coding"] = [{k: v for k, v in {
            "system": r.coding_system,
            "code": r.coding_code,
            "display": r.coding_display,
        }.items() if v}]
    if r.text:
        cc["text"] = r.text
    return cc


def to_fhir_related_person(rp: "RelatedPersonModel") -> dict:
    result: dict = {
        "resourceType": "RelatedPerson",
        "id": str(rp.related_person_id),
        "active": rp.active,
        "gender": fhir_enum(rp.gender) if rp.gender else None,
        "birthDate": rp.birth_date.isoformat() if rp.birth_date else None,
    }

    if rp.patient_type and rp.patient_id is not None:
        patient_ref: dict = {"reference": f"{fhir_enum(rp.patient_type)}/{rp.patient_id}"}
        if rp.patient_display:
            patient_ref["display"] = rp.patient_display
        result["patient"] = patient_ref
    elif rp.patient_display:
        result["patient"] = {"display": rp.patient_display}

    if rp.relationships:
        result["relationship"] = [_fhir_relationship(r) for r in rp.relationships]
    if rp.names:
        result["name"] = [fhir_human_name(n) for n in rp.names]
    if rp.telecoms:
        result["telecom"] = [fhir_telecom(t) for t in rp.telecoms]
    if rp.addresses:
        result["address"] = [fhir_address(a) for a in rp.addresses]
    if rp.photos:
        result["photo"] = [fhir_photo(p) for p in rp.photos]
    if rp.period_start or rp.period_end:
        result["period"] = {k: v for k, v in {
            "start": rp.period_start.isoformat() if rp.period_start else None,
            "end": rp.period_end.isoformat() if rp.period_end else None,
        }.items() if v}
    if rp.identifiers:
        result["identifier"] = [fhir_identifier(i) for i in rp.identifiers]
    if rp.communications:
        result["communication"] = [fhir_communication(c) for c in rp.communications]

    return {k: v for k, v in result.items() if v is not None}
