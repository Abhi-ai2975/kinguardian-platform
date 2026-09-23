from __future__ import annotations

from typing import TYPE_CHECKING

from app.fhir.datatypes import (
    fhir_enum, fhir_split, plain_name, plain_identifier, plain_telecom,
    plain_address, plain_photo, plain_communication,
)

if TYPE_CHECKING:
    from app.models.patient.patient import PatientModel, PatientContact, PatientGeneralPractitioner, PatientLink


def plain_contact(c: "PatientContact") -> dict:
    return {
        "id": c.id,
        "org_id": c.org_id,
        "relationship": [
            {"id": r.id, "org_id": r.org_id, "coding_system": r.coding_system,
             "coding_code": r.coding_code, "coding_display": r.coding_display, "text": r.text}
            for r in c.relationships
        ] if c.relationships else None,
        "name_use": fhir_enum(c.name_use),
        "name_text": c.name_text,
        "name_family": c.name_family,
        "name_given": fhir_split(c.name_given),
        "name_prefix": fhir_split(c.name_prefix),
        "name_suffix": fhir_split(c.name_suffix),
        "telecom": [
            {"id": t.id, "org_id": t.org_id, "system": fhir_enum(t.system), "value": t.value,
             "use": fhir_enum(t.use), "rank": t.rank,
             "period_start": t.period_start.isoformat() if t.period_start else None,
             "period_end": t.period_end.isoformat() if t.period_end else None}
            for t in c.telecoms
        ] if c.telecoms else None,
        "address_use": fhir_enum(c.address_use),
        "address_type": fhir_enum(c.address_type),
        "address_text": c.address_text,
        "address_line": fhir_split(c.address_line),
        "address_city": c.address_city,
        "address_district": c.address_district,
        "address_state": c.address_state,
        "address_postal_code": c.address_postal_code,
        "address_country": c.address_country,
        "address_period_start": c.address_period_start.isoformat() if c.address_period_start else None,
        "address_period_end": c.address_period_end.isoformat() if c.address_period_end else None,
        "gender": fhir_enum(c.gender),
        "organization_type": fhir_enum(c.organization_type),
        "organization_id": c.organization_id,
        "organization_display": c.organization_display,
        "period_start": c.period_start.isoformat() if c.period_start else None,
        "period_end": c.period_end.isoformat() if c.period_end else None,
    }


def plain_general_practitioner(gp: "PatientGeneralPractitioner") -> dict:
    return {
        "id": gp.id,
        "org_id": gp.org_id,
        "reference_type": fhir_enum(gp.reference_type),
        "reference_id": gp.reference_id,
        "reference_display": gp.reference_display,
    }


def plain_link(lk: "PatientLink") -> dict:
    return {
        "id": lk.id,
        "org_id": lk.org_id,
        "other_type": fhir_enum(lk.other_type),
        "other_id": lk.other_id,
        "other_display": lk.other_display,
        "type": fhir_enum(lk.type),
    }


def to_plain_patient(patient: "PatientModel") -> dict:
    result: dict = {
        "id": patient.patient_id,
        "user_id": patient.user_id,
        "org_id": patient.org_id,
        "active": patient.active,
        "gender": fhir_enum(patient.gender) if patient.gender else None,
        "birth_date": patient.birth_date.isoformat() if patient.birth_date else None,
        "deceased_boolean": patient.deceased_boolean,
        "deceased_datetime": patient.deceased_datetime.isoformat() if patient.deceased_datetime else None,
        "marital_status_system": patient.marital_status_system,
        "marital_status_code": patient.marital_status_code,
        "marital_status_display": patient.marital_status_display,
        "marital_status_text": patient.marital_status_text,
        "multiple_birth_boolean": patient.multiple_birth_boolean,
        "multiple_birth_integer": patient.multiple_birth_integer,
        "managing_organization_type": fhir_enum(patient.managing_organization_type) if patient.managing_organization_type else None,
        "managing_organization_id": patient.managing_organization_id,
        "managing_organization_display": patient.managing_organization_display,
        "created_at": patient.created_at.isoformat() if patient.created_at else None,
        "updated_at": patient.updated_at.isoformat() if patient.updated_at else None,
    }

    if patient.names:
        result["name"] = [plain_name(n) for n in patient.names]
    if patient.identifiers:
        result["identifier"] = [plain_identifier(i) for i in patient.identifiers]
    if patient.telecoms:
        result["telecom"] = [plain_telecom(t) for t in patient.telecoms]
    if patient.addresses:
        result["address"] = [plain_address(a) for a in patient.addresses]
    if patient.photos:
        result["photo"] = [plain_photo(p) for p in patient.photos]
    if patient.contacts:
        result["contact"] = [plain_contact(c) for c in patient.contacts]
    if patient.communications:
        result["communication"] = [plain_communication(cm) for cm in patient.communications]
    if patient.general_practitioners:
        result["general_practitioner"] = [plain_general_practitioner(gp) for gp in patient.general_practitioners]
    if patient.links:
        result["link"] = [plain_link(lk) for lk in patient.links]

    return {k: v for k, v in result.items() if v is not None}
