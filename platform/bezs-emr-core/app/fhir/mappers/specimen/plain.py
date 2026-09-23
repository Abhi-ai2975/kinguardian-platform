from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.specimen.specimen import (
        SpecimenContainer,
        SpecimenContainerIdentifier,
        SpecimenIdentifier,
        SpecimenModel,
        SpecimenNote,
        SpecimenParent,
        SpecimenProcessing,
        SpecimenProcessingAdditive,
        SpecimenRequest,
    )


def _ev(v):
    return v.value if v and hasattr(v, "value") else v


def plain_specimen_identifier(i: "SpecimenIdentifier") -> dict:
    return {k: v for k, v in {
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
    }.items() if v is not None}


def plain_specimen_parent(p: "SpecimenParent") -> dict:
    return {k: v for k, v in {
        "reference_type": _ev(p.reference_type),
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }.items() if v is not None}


def plain_specimen_request(r: "SpecimenRequest") -> dict:
    return {k: v for k, v in {
        "reference_type": _ev(r.reference_type),
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }.items() if v is not None}


def plain_specimen_processing_additive(a: "SpecimenProcessingAdditive") -> dict:
    return {k: v for k, v in {
        "reference_type": _ev(a.reference_type),
        "reference_id": a.reference_id,
        "reference_display": a.reference_display,
    }.items() if v is not None}


def plain_specimen_processing(p: "SpecimenProcessing") -> dict:
    return {k: v for k, v in {
        "description": p.description,
        "procedure_system": p.procedure_system,
        "procedure_code": p.procedure_code,
        "procedure_display": p.procedure_display,
        "procedure_text": p.procedure_text,
        "time_datetime": p.time_datetime.isoformat() if p.time_datetime else None,
        "time_period_start": p.time_period_start.isoformat() if p.time_period_start else None,
        "time_period_end": p.time_period_end.isoformat() if p.time_period_end else None,
        "additives": [plain_specimen_processing_additive(a) for a in (p.additives or [])],
    }.items() if v is not None}


def plain_specimen_container_identifier(i: "SpecimenContainerIdentifier") -> dict:
    return {k: v for k, v in {
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
    }.items() if v is not None}


def plain_specimen_container(c: "SpecimenContainer") -> dict:
    return {k: v for k, v in {
        "description": c.description,
        "type_system": c.type_system,
        "type_code": c.type_code,
        "type_display": c.type_display,
        "type_text": c.type_text,
        "capacity_value": float(c.capacity_value) if c.capacity_value is not None else None,
        "capacity_unit": c.capacity_unit,
        "capacity_system": c.capacity_system,
        "capacity_code": c.capacity_code,
        "specimen_quantity_value": float(c.specimen_quantity_value) if c.specimen_quantity_value is not None else None,
        "specimen_quantity_unit": c.specimen_quantity_unit,
        "specimen_quantity_system": c.specimen_quantity_system,
        "specimen_quantity_code": c.specimen_quantity_code,
        "additive_cc_system": c.additive_cc_system,
        "additive_cc_code": c.additive_cc_code,
        "additive_cc_display": c.additive_cc_display,
        "additive_cc_text": c.additive_cc_text,
        "additive_reference_type": _ev(c.additive_reference_type),
        "additive_reference_id": c.additive_reference_id,
        "additive_reference_display": c.additive_reference_display,
        "identifiers": [plain_specimen_container_identifier(i) for i in (c.container_identifiers or [])],
    }.items() if v is not None}


def _plain_collection(sp: "SpecimenModel") -> dict | None:
    any_field = any([
        sp.collection_collector_type,
        sp.collection_collected_datetime,
        sp.collection_collected_period_start,
        sp.collection_duration_value is not None,
        sp.collection_quantity_value is not None,
        sp.collection_method_code,
        sp.collection_body_site_code,
        sp.collection_fasting_status_cc_code,
        sp.collection_fasting_status_duration_value is not None,
    ])
    if not any_field:
        return None
    return {k: v for k, v in {
        "collector_type": _ev(sp.collection_collector_type),
        "collector_id": sp.collection_collector_id,
        "collector_display": sp.collection_collector_display,
        "collected_datetime": sp.collection_collected_datetime.isoformat() if sp.collection_collected_datetime else None,
        "collected_period_start": sp.collection_collected_period_start.isoformat() if sp.collection_collected_period_start else None,
        "collected_period_end": sp.collection_collected_period_end.isoformat() if sp.collection_collected_period_end else None,
        "duration_value": float(sp.collection_duration_value) if sp.collection_duration_value is not None else None,
        "duration_unit": sp.collection_duration_unit,
        "duration_system": sp.collection_duration_system,
        "duration_code": sp.collection_duration_code,
        "quantity_value": float(sp.collection_quantity_value) if sp.collection_quantity_value is not None else None,
        "quantity_unit": sp.collection_quantity_unit,
        "quantity_system": sp.collection_quantity_system,
        "quantity_code": sp.collection_quantity_code,
        "method_system": sp.collection_method_system,
        "method_code": sp.collection_method_code,
        "method_display": sp.collection_method_display,
        "method_text": sp.collection_method_text,
        "body_site_system": sp.collection_body_site_system,
        "body_site_code": sp.collection_body_site_code,
        "body_site_display": sp.collection_body_site_display,
        "body_site_text": sp.collection_body_site_text,
        "fasting_status_cc_system": sp.collection_fasting_status_cc_system,
        "fasting_status_cc_code": sp.collection_fasting_status_cc_code,
        "fasting_status_cc_display": sp.collection_fasting_status_cc_display,
        "fasting_status_cc_text": sp.collection_fasting_status_cc_text,
        "fasting_status_duration_value": float(sp.collection_fasting_status_duration_value) if sp.collection_fasting_status_duration_value is not None else None,
        "fasting_status_duration_unit": sp.collection_fasting_status_duration_unit,
        "fasting_status_duration_system": sp.collection_fasting_status_duration_system,
        "fasting_status_duration_code": sp.collection_fasting_status_duration_code,
    }.items() if v is not None}


def to_plain_specimen(sp: "SpecimenModel") -> dict:
    result: dict = {
        "id": sp.specimen_id,
        "user_id": sp.user_id,
        "org_id": sp.org_id,
        "status": _ev(sp.status),
        "type_system": sp.type_system,
        "type_code": sp.type_code,
        "type_display": sp.type_display,
        "type_text": sp.type_text,
        "subject_type": _ev(sp.subject_type),
        "subject_id": sp.subject_id,
        "subject_display": sp.subject_display,
        "received_time": sp.received_time.isoformat() if sp.received_time else None,
        "accession_identifier_use": sp.accession_identifier_use,
        "accession_identifier_type_system": sp.accession_identifier_type_system,
        "accession_identifier_type_code": sp.accession_identifier_type_code,
        "accession_identifier_type_display": sp.accession_identifier_type_display,
        "accession_identifier_type_text": sp.accession_identifier_type_text,
        "accession_identifier_system": sp.accession_identifier_system,
        "accession_identifier_value": sp.accession_identifier_value,
        "accession_identifier_period_start": sp.accession_identifier_period_start.isoformat() if sp.accession_identifier_period_start else None,
        "accession_identifier_period_end": sp.accession_identifier_period_end.isoformat() if sp.accession_identifier_period_end else None,
        "accession_identifier_assigner": sp.accession_identifier_assigner,
        "collection": _plain_collection(sp),
        "identifiers": [plain_specimen_identifier(i) for i in (sp.identifiers or [])],
        "parents": [plain_specimen_parent(p) for p in (sp.parents or [])],
        "requests": [plain_specimen_request(r) for r in (sp.requests or [])],
        "processing": [plain_specimen_processing(p) for p in (sp.processing or [])],
        "containers": [plain_specimen_container(c) for c in (sp.containers or [])],
        "conditions": [
            {k: v for k, v in {"coding_system": cond.coding_system, "coding_code": cond.coding_code, "coding_display": cond.coding_display, "text": cond.text}.items() if v is not None}
            for cond in (sp.conditions or [])
        ],
        "notes": [
            {k: v for k, v in {
                "text": n.text,
                "time": n.time.isoformat() if n.time else None,
                "author_string": n.author_string,
                "author_reference_type": n.author_reference_type,
                "author_reference_id": n.author_reference_id,
                "author_reference_display": n.author_reference_display,
            }.items() if v is not None}
            for n in (sp.notes or [])
        ],
    }
    return {k: v for k, v in result.items() if v is not None}
