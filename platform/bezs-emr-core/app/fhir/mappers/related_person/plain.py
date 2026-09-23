from __future__ import annotations

from typing import TYPE_CHECKING

from app.fhir.datatypes import (
    fhir_enum,
    fhir_split,
    plain_address,
    plain_communication,
    plain_identifier,
    plain_name,
    plain_photo,
    plain_telecom,
)

if TYPE_CHECKING:
    from app.models.related_person.related_person import RelatedPersonModel, RelatedPersonRelationship


def _plain_relationship(r: "RelatedPersonRelationship") -> dict:
    return {k: v for k, v in {
        "id": r.id,
        "coding_system": r.coding_system,
        "coding_code": r.coding_code,
        "coding_display": r.coding_display,
        "text": r.text,
    }.items() if v is not None}


def to_plain_related_person(rp: "RelatedPersonModel") -> dict:
    result: dict = {
        "id": rp.related_person_id,
        "user_id": rp.user_id,
        "org_id": rp.org_id,
        "active": rp.active,
        "patient_type": fhir_enum(rp.patient_type) if rp.patient_type else None,
        "patient_id": rp.patient_id,
        "patient_display": rp.patient_display,
        "gender": fhir_enum(rp.gender) if rp.gender else None,
        "birth_date": rp.birth_date.isoformat() if rp.birth_date else None,
        "period_start": rp.period_start.isoformat() if rp.period_start else None,
        "period_end": rp.period_end.isoformat() if rp.period_end else None,
        "created_at": rp.created_at.isoformat() if rp.created_at else None,
        "updated_at": rp.updated_at.isoformat() if rp.updated_at else None,
        "created_by": rp.created_by,
        "updated_by": rp.updated_by,
    }

    if rp.identifiers:
        result["identifiers"] = [plain_identifier(i) for i in rp.identifiers]
    if rp.relationships:
        result["relationships"] = [_plain_relationship(r) for r in rp.relationships]
    if rp.names:
        result["names"] = [plain_name(n) for n in rp.names]
    if rp.telecoms:
        result["telecoms"] = [plain_telecom(t) for t in rp.telecoms]
    if rp.addresses:
        result["addresses"] = [plain_address(a) for a in rp.addresses]
    if rp.photos:
        result["photos"] = [plain_photo(p) for p in rp.photos]
    if rp.communications:
        result["communications"] = [plain_communication(c) for c in rp.communications]

    return {k: v for k, v in result.items() if v is not None}
