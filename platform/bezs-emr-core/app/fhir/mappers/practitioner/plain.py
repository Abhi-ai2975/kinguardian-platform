from __future__ import annotations

from typing import TYPE_CHECKING

from app.fhir.datatypes import (
    fhir_enum, fhir_split, plain_name, plain_identifier, plain_telecom,
    plain_address, plain_photo, plain_communication,
)

if TYPE_CHECKING:
    from app.models.practitioner.practitioner import PractitionerModel, PractitionerQualification


def plain_qualification(q: "PractitionerQualification") -> dict:
    return {
        "id": q.id,
        "org_id": q.org_id,
        "code_system": q.code_system,
        "code_code": q.code_code,
        "code_display": q.code_display,
        "code_text": q.code_text,
        "status_system": q.status_system,
        "status_code": q.status_code,
        "status_display": q.status_display,
        "status_text": q.status_text,
        "period_start": q.period_start.isoformat() if q.period_start else None,
        "period_end": q.period_end.isoformat() if q.period_end else None,
        "issuer_type": fhir_enum(q.issuer_type),
        "issuer_id": q.issuer_id,
        "issuer_display": q.issuer_display,
        "identifier": [plain_identifier(qi) for qi in q.identifiers] if q.identifiers else None,
    }


def to_plain_practitioner(practitioner: "PractitionerModel") -> dict:
    result: dict = {
        "id": practitioner.practitioner_id,
        "user_id": practitioner.user_id,
        "org_id": practitioner.org_id,
        "active": practitioner.active,
        "gender": fhir_enum(practitioner.gender) if practitioner.gender else None,
        "birth_date": practitioner.birth_date.isoformat() if practitioner.birth_date else None,
        "deceased_boolean": practitioner.deceased_boolean,
        "deceased_datetime": practitioner.deceased_datetime.isoformat() if practitioner.deceased_datetime else None,
        "created_at": practitioner.created_at.isoformat() if practitioner.created_at else None,
        "updated_at": practitioner.updated_at.isoformat() if practitioner.updated_at else None,
        "created_by": practitioner.created_by,
        "updated_by": practitioner.updated_by,
    }

    if practitioner.names:
        result["name"] = [plain_name(n) for n in practitioner.names]
    if practitioner.identifiers:
        result["identifier"] = [plain_identifier(i) for i in practitioner.identifiers]
    if practitioner.telecoms:
        result["telecom"] = [plain_telecom(t) for t in practitioner.telecoms]
    if practitioner.addresses:
        result["address"] = [plain_address(a) for a in practitioner.addresses]
    if practitioner.photos:
        result["photo"] = [plain_photo(p) for p in practitioner.photos]
    if practitioner.qualifications:
        result["qualification"] = [plain_qualification(q) for q in practitioner.qualifications]
    if practitioner.communications:
        result["communication"] = [plain_communication(c) for c in practitioner.communications]

    return {k: v for k, v in result.items() if v is not None}
