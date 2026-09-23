from __future__ import annotations

from typing import TYPE_CHECKING

from app.fhir.datatypes import (
    fhir_enum, fhir_split, fhir_human_name, fhir_identifier, fhir_telecom,
    fhir_address, fhir_photo, fhir_communication,
)

if TYPE_CHECKING:
    from app.models.patient.patient import PatientModel, PatientContact, PatientGeneralPractitioner, PatientLink


def fhir_contact(c: "PatientContact") -> dict:
    entry: dict = {}
    if c.relationships:
        entry["relationship"] = [{k: v for k, v in {
            "coding": [{k2: v2 for k2, v2 in {
                "system": r.coding_system,
                "code": r.coding_code,
                "display": r.coding_display,
            }.items() if v2}],
            "text": r.text,
        }.items() if v} for r in c.relationships]
    name_entry: dict = {}
    if c.name_use:
        name_entry["use"] = fhir_enum(c.name_use)
    if c.name_text:
        name_entry["text"] = c.name_text
    if c.name_family:
        name_entry["family"] = c.name_family
    given = fhir_split(c.name_given)
    if given:
        name_entry["given"] = given
    prefix = fhir_split(c.name_prefix)
    if prefix:
        name_entry["prefix"] = prefix
    suffix = fhir_split(c.name_suffix)
    if suffix:
        name_entry["suffix"] = suffix
    if name_entry:
        entry["name"] = name_entry
    if c.telecoms:
        entry["telecom"] = [fhir_telecom(t) for t in c.telecoms]
    addr_entry: dict = {}
    if c.address_use:
        addr_entry["use"] = fhir_enum(c.address_use)
    if c.address_type:
        addr_entry["type"] = fhir_enum(c.address_type)
    if c.address_text:
        addr_entry["text"] = c.address_text
    addr_lines = fhir_split(c.address_line)
    if addr_lines:
        addr_entry["line"] = addr_lines
    if c.address_city:
        addr_entry["city"] = c.address_city
    if c.address_district:
        addr_entry["district"] = c.address_district
    if c.address_state:
        addr_entry["state"] = c.address_state
    if c.address_postal_code:
        addr_entry["postalCode"] = c.address_postal_code
    if c.address_country:
        addr_entry["country"] = c.address_country
    if c.address_period_start or c.address_period_end:
        addr_entry["period"] = {k: v for k, v in {
            "start": c.address_period_start.isoformat() if c.address_period_start else None,
            "end": c.address_period_end.isoformat() if c.address_period_end else None,
        }.items() if v}
    if addr_entry:
        entry["address"] = addr_entry
    if c.gender:
        entry["gender"] = fhir_enum(c.gender)
    if c.organization_type and c.organization_id:
        entry["organization"] = {k: v for k, v in {
            "reference": f"{fhir_enum(c.organization_type)}/{c.organization_id}",
            "display": c.organization_display,
        }.items() if v}
    if c.period_start or c.period_end:
        entry["period"] = {k: v for k, v in {
            "start": c.period_start.isoformat() if c.period_start else None,
            "end": c.period_end.isoformat() if c.period_end else None,
        }.items() if v}
    return entry


def fhir_general_practitioner(gp: "PatientGeneralPractitioner") -> dict:
    entry: dict = {}
    if gp.reference_type and gp.reference_id:
        entry["reference"] = f"{fhir_enum(gp.reference_type)}/{gp.reference_id}"
    if gp.reference_display:
        entry["display"] = gp.reference_display
    return entry


def fhir_link(lk: "PatientLink") -> dict:
    other: dict = {}
    if lk.other_type and lk.other_id:
        other["reference"] = f"{fhir_enum(lk.other_type)}/{lk.other_id}"
    if lk.other_display:
        other["display"] = lk.other_display
    entry: dict = {"other": other}
    if lk.type:
        entry["type"] = fhir_enum(lk.type)
    return entry


def to_fhir_patient(patient: "PatientModel") -> dict:
    result: dict = {
        "resourceType": "Patient",
        "id": str(patient.patient_id),
        "active": patient.active,
        "gender": fhir_enum(patient.gender) if patient.gender else None,
        "birthDate": patient.birth_date.isoformat() if patient.birth_date else None,
        "deceasedBoolean": patient.deceased_boolean,
        "deceasedDateTime": patient.deceased_datetime.isoformat() if patient.deceased_datetime else None,
    }

    if patient.marital_status_code or patient.marital_status_text:
        cc: dict = {}
        if patient.marital_status_system or patient.marital_status_code:
            cc["coding"] = [{k: v for k, v in {
                "system": patient.marital_status_system,
                "code": patient.marital_status_code,
                "display": patient.marital_status_display,
            }.items() if v}]
        if patient.marital_status_text:
            cc["text"] = patient.marital_status_text
        result["maritalStatus"] = cc

    if patient.multiple_birth_integer is not None:
        result["multipleBirthInteger"] = patient.multiple_birth_integer
    elif patient.multiple_birth_boolean is not None:
        result["multipleBirthBoolean"] = patient.multiple_birth_boolean

    if patient.managing_organization_type and patient.managing_organization_id:
        result["managingOrganization"] = {k: v for k, v in {
            "reference": f"{fhir_enum(patient.managing_organization_type)}/{patient.managing_organization_id}",
            "display": patient.managing_organization_display,
        }.items() if v}

    if patient.names:
        result["name"] = [fhir_human_name(n) for n in patient.names]
    if patient.identifiers:
        result["identifier"] = [fhir_identifier(i) for i in patient.identifiers]
    if patient.telecoms:
        result["telecom"] = [fhir_telecom(t) for t in patient.telecoms]
    if patient.addresses:
        result["address"] = [fhir_address(a) for a in patient.addresses]
    if patient.photos:
        result["photo"] = [fhir_photo(p) for p in patient.photos]
    if patient.contacts:
        result["contact"] = [fhir_contact(c) for c in patient.contacts]
    if patient.communications:
        result["communication"] = [fhir_communication(cm) for cm in patient.communications]
    if patient.general_practitioners:
        result["generalPractitioner"] = [fhir_general_practitioner(gp) for gp in patient.general_practitioners]
    if patient.links:
        result["link"] = [fhir_link(lk) for lk in patient.links]

    return {k: v for k, v in result.items() if v is not None}
