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


def _cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def _ref(ref_type, ref_id, display) -> dict | None:
    if not (ref_type and ref_id is not None):
        return None
    r: dict = {"reference": f"{_ev(ref_type)}/{ref_id}"}
    if display:
        r["display"] = display
    return r


def _qty(value, unit, system, code) -> dict | None:
    if value is None:
        return None
    q: dict = {"value": float(value)}
    if unit:
        q["unit"] = unit
    if system:
        q["system"] = system
    if code:
        q["code"] = code
    return q


def fhir_specimen_identifier(i: "SpecimenIdentifier") -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    coding = {k: v for k, v in {"system": i.type_system, "code": i.type_code, "display": i.type_display}.items() if v}
    type_cc: dict = {}
    if coding:
        type_cc["coding"] = [coding]
    if i.type_text:
        type_cc["text"] = i.type_text
    if type_cc:
        entry["type"] = type_cc
    if i.system:
        entry["system"] = i.system
    if i.value:
        entry["value"] = i.value
    period: dict = {}
    if i.period_start:
        period["start"] = i.period_start.isoformat()
    if i.period_end:
        period["end"] = i.period_end.isoformat()
    if period:
        entry["period"] = period
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_specimen_note(n: "SpecimenNote") -> dict:
    entry: dict = {"text": n.text}
    if n.time:
        entry["time"] = n.time.isoformat()
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id is not None:
        ref: dict = {"reference": f"{n.author_reference_type}/{n.author_reference_id}"}
        if n.author_reference_display:
            ref["display"] = n.author_reference_display
        entry["authorReference"] = ref
    return entry


def fhir_specimen_processing_additive(a: "SpecimenProcessingAdditive") -> dict | None:
    return _ref(a.reference_type, a.reference_id, a.reference_display)


def fhir_specimen_processing(p: "SpecimenProcessing") -> dict:
    entry: dict = {}
    if p.description:
        entry["description"] = p.description
    proc_cc = _cc(p.procedure_system, p.procedure_code, p.procedure_display, p.procedure_text)
    if proc_cc:
        entry["procedure"] = proc_cc
    additives_out = [r for a in (p.additives or []) if (r := fhir_specimen_processing_additive(a))]
    if additives_out:
        entry["additive"] = additives_out
    if p.time_datetime:
        entry["timeDateTime"] = p.time_datetime.isoformat()
    elif p.time_period_start or p.time_period_end:
        period: dict = {}
        if p.time_period_start:
            period["start"] = p.time_period_start.isoformat()
        if p.time_period_end:
            period["end"] = p.time_period_end.isoformat()
        entry["timePeriod"] = period
    return entry


def fhir_specimen_container_identifier(i: "SpecimenContainerIdentifier") -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    coding = {k: v for k, v in {"system": i.type_system, "code": i.type_code, "display": i.type_display}.items() if v}
    type_cc: dict = {}
    if coding:
        type_cc["coding"] = [coding]
    if i.type_text:
        type_cc["text"] = i.type_text
    if type_cc:
        entry["type"] = type_cc
    if i.system:
        entry["system"] = i.system
    if i.value:
        entry["value"] = i.value
    period: dict = {}
    if i.period_start:
        period["start"] = i.period_start.isoformat()
    if i.period_end:
        period["end"] = i.period_end.isoformat()
    if period:
        entry["period"] = period
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_specimen_container(c: "SpecimenContainer") -> dict:
    entry: dict = {}
    container_ids = [fhir_specimen_container_identifier(i) for i in (c.container_identifiers or [])]
    if container_ids:
        entry["identifier"] = container_ids
    if c.description:
        entry["description"] = c.description
    type_cc = _cc(c.type_system, c.type_code, c.type_display, c.type_text)
    if type_cc:
        entry["type"] = type_cc
    qty = _qty(c.capacity_value, c.capacity_unit, c.capacity_system, c.capacity_code)
    if qty:
        entry["capacity"] = qty
    spec_qty = _qty(c.specimen_quantity_value, c.specimen_quantity_unit, c.specimen_quantity_system, c.specimen_quantity_code)
    if spec_qty:
        entry["specimenQuantity"] = spec_qty
    add_cc = _cc(c.additive_cc_system, c.additive_cc_code, c.additive_cc_display, c.additive_cc_text)
    if add_cc:
        entry["additiveCodeableConcept"] = add_cc
    add_ref = _ref(c.additive_reference_type, c.additive_reference_id, c.additive_reference_display)
    if add_ref:
        entry["additiveReference"] = add_ref
    return entry


def _fhir_collection(sp: "SpecimenModel") -> dict | None:
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

    col: dict = {}
    collector_ref = _ref(sp.collection_collector_type, sp.collection_collector_id, sp.collection_collector_display)
    if collector_ref:
        col["collector"] = collector_ref
    if sp.collection_collected_datetime:
        col["collectedDateTime"] = sp.collection_collected_datetime.isoformat()
    elif sp.collection_collected_period_start or sp.collection_collected_period_end:
        period: dict = {}
        if sp.collection_collected_period_start:
            period["start"] = sp.collection_collected_period_start.isoformat()
        if sp.collection_collected_period_end:
            period["end"] = sp.collection_collected_period_end.isoformat()
        col["collectedPeriod"] = period
    dur = _qty(sp.collection_duration_value, sp.collection_duration_unit, sp.collection_duration_system, sp.collection_duration_code)
    if dur:
        col["duration"] = dur
    qty = _qty(sp.collection_quantity_value, sp.collection_quantity_unit, sp.collection_quantity_system, sp.collection_quantity_code)
    if qty:
        col["quantity"] = qty
    method_cc = _cc(sp.collection_method_system, sp.collection_method_code, sp.collection_method_display, sp.collection_method_text)
    if method_cc:
        col["method"] = method_cc
    body_site_cc = _cc(sp.collection_body_site_system, sp.collection_body_site_code, sp.collection_body_site_display, sp.collection_body_site_text)
    if body_site_cc:
        col["bodySite"] = body_site_cc
    fasting_cc = _cc(sp.collection_fasting_status_cc_system, sp.collection_fasting_status_cc_code, sp.collection_fasting_status_cc_display, sp.collection_fasting_status_cc_text)
    if fasting_cc:
        col["fastingStatusCodeableConcept"] = fasting_cc
    fasting_dur = _qty(sp.collection_fasting_status_duration_value, sp.collection_fasting_status_duration_unit, sp.collection_fasting_status_duration_system, sp.collection_fasting_status_duration_code)
    if fasting_dur:
        col["fastingStatusDuration"] = fasting_dur
    return col


def to_fhir_specimen(sp: "SpecimenModel") -> dict:
    result: dict = {
        "resourceType": "Specimen",
        "id": str(sp.specimen_id),
    }

    identifiers_out = [fhir_specimen_identifier(i) for i in (sp.identifiers or [])]
    if identifiers_out:
        result["identifier"] = identifiers_out

    accession = _build_fhir_accession_identifier(sp)
    if accession:
        result["accessionIdentifier"] = accession

    if sp.status:
        result["status"] = _ev(sp.status)

    type_cc = _cc(sp.type_system, sp.type_code, sp.type_display, sp.type_text)
    if type_cc:
        result["type"] = type_cc

    subject_ref = _ref(sp.subject_type, sp.subject_id, sp.subject_display)
    if subject_ref:
        result["subject"] = subject_ref

    if sp.received_time:
        result["receivedTime"] = sp.received_time.isoformat()

    parents_out = [r for p in (sp.parents or []) if (r := _ref(p.reference_type, p.reference_id, p.reference_display))]
    if parents_out:
        result["parent"] = parents_out

    requests_out = [r for req in (sp.requests or []) if (r := _ref(req.reference_type, req.reference_id, req.reference_display))]
    if requests_out:
        result["request"] = requests_out

    collection = _fhir_collection(sp)
    if collection:
        result["collection"] = collection

    processing_out = [fhir_specimen_processing(p) for p in (sp.processing or [])]
    if processing_out:
        result["processing"] = processing_out

    containers_out = [fhir_specimen_container(c) for c in (sp.containers or [])]
    if containers_out:
        result["container"] = containers_out

    conditions_out = []
    for cond in (sp.conditions or []):
        cc = _cc(cond.coding_system, cond.coding_code, cond.coding_display, cond.text)
        if cc:
            conditions_out.append(cc)
    if conditions_out:
        result["condition"] = conditions_out

    notes_out = [fhir_specimen_note(n) for n in (sp.notes or [])]
    if notes_out:
        result["note"] = notes_out

    return {k: v for k, v in result.items() if v is not None}


def _build_fhir_accession_identifier(sp: "SpecimenModel") -> dict | None:
    if not (sp.accession_identifier_system or sp.accession_identifier_value):
        return None
    entry: dict = {}
    if sp.accession_identifier_use:
        entry["use"] = sp.accession_identifier_use
    coding = {k: v for k, v in {
        "system": sp.accession_identifier_type_system,
        "code": sp.accession_identifier_type_code,
        "display": sp.accession_identifier_type_display,
    }.items() if v}
    type_cc: dict = {}
    if coding:
        type_cc["coding"] = [coding]
    if sp.accession_identifier_type_text:
        type_cc["text"] = sp.accession_identifier_type_text
    if type_cc:
        entry["type"] = type_cc
    if sp.accession_identifier_system:
        entry["system"] = sp.accession_identifier_system
    if sp.accession_identifier_value:
        entry["value"] = sp.accession_identifier_value
    period: dict = {}
    if sp.accession_identifier_period_start:
        period["start"] = sp.accession_identifier_period_start.isoformat()
    if sp.accession_identifier_period_end:
        period["end"] = sp.accession_identifier_period_end.isoformat()
    if period:
        entry["period"] = period
    if sp.accession_identifier_assigner:
        entry["assigner"] = {"display": sp.accession_identifier_assigner}
    return entry if entry else None
