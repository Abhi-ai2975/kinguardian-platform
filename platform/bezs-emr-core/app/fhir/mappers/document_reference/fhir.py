from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.document_reference.document_reference import (
        DocumentReferenceAuthor,
        DocumentReferenceCategory,
        DocumentReferenceContent,
        DocumentReferenceContextEncounter,
        DocumentReferenceContextEvent,
        DocumentReferenceContextRelated,
        DocumentReferenceIdentifier,
        DocumentReferenceModel,
        DocumentReferenceRelatesTo,
        DocumentReferenceSecurityLabel,
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


def fhir_document_reference_identifier(i: "DocumentReferenceIdentifier") -> dict:
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


def fhir_document_reference_category(c: "DocumentReferenceCategory") -> dict | None:
    return _cc(c.coding_system, c.coding_code, c.coding_display, c.text)


def fhir_document_reference_author(a: "DocumentReferenceAuthor") -> dict | None:
    return _ref(a.reference_type, a.reference_id, a.reference_display)


def fhir_document_reference_relates_to(r: "DocumentReferenceRelatesTo") -> dict:
    entry: dict = {"code": _ev(r.code) or r.code}
    target = _ref(r.target_type, r.target_id, r.target_display)
    if target:
        entry["target"] = target
    return entry


def fhir_document_reference_security_label(sl: "DocumentReferenceSecurityLabel") -> dict | None:
    return _cc(sl.coding_system, sl.coding_code, sl.coding_display, sl.text)


def fhir_document_reference_content(c: "DocumentReferenceContent") -> dict:
    attachment: dict = {}
    if c.attachment_content_type:
        attachment["contentType"] = c.attachment_content_type
    if c.attachment_language:
        attachment["language"] = c.attachment_language
    if c.attachment_data:
        attachment["data"] = c.attachment_data
    if c.attachment_url:
        attachment["url"] = c.attachment_url
    if c.attachment_size is not None:
        attachment["size"] = c.attachment_size
    if c.attachment_hash:
        attachment["hash"] = c.attachment_hash
    if c.attachment_title:
        attachment["title"] = c.attachment_title
    if c.attachment_creation:
        attachment["creation"] = c.attachment_creation.isoformat()
    entry: dict = {"attachment": attachment}
    fmt: dict = {}
    if c.format_system:
        fmt["system"] = c.format_system
    if c.format_version:
        fmt["version"] = c.format_version
    if c.format_code:
        fmt["code"] = c.format_code
    if c.format_display:
        fmt["display"] = c.format_display
    if fmt:
        entry["format"] = fmt
    return entry


def fhir_document_reference_context_encounter(e: "DocumentReferenceContextEncounter") -> dict | None:
    return _ref(e.reference_type, e.reference_id, e.reference_display)


def fhir_document_reference_context_event(ev: "DocumentReferenceContextEvent") -> dict | None:
    return _cc(ev.coding_system, ev.coding_code, ev.coding_display, ev.text)


def fhir_document_reference_context_related(r: "DocumentReferenceContextRelated") -> dict | None:
    if not (r.reference_type and r.reference_id is not None):
        return None
    entry: dict = {"reference": f"{r.reference_type}/{r.reference_id}"}
    if r.reference_display:
        entry["display"] = r.reference_display
    return entry


def _fhir_master_identifier(m: "DocumentReferenceModel") -> dict | None:
    if not (m.master_identifier_system or m.master_identifier_value):
        return None
    entry: dict = {}
    if m.master_identifier_use:
        entry["use"] = m.master_identifier_use
    coding = {k: v for k, v in {"system": m.master_identifier_type_system, "code": m.master_identifier_type_code, "display": m.master_identifier_type_display}.items() if v}
    type_cc: dict = {}
    if coding:
        type_cc["coding"] = [coding]
    if m.master_identifier_type_text:
        type_cc["text"] = m.master_identifier_type_text
    if type_cc:
        entry["type"] = type_cc
    if m.master_identifier_system:
        entry["system"] = m.master_identifier_system
    if m.master_identifier_value:
        entry["value"] = m.master_identifier_value
    period: dict = {}
    if m.master_identifier_period_start:
        period["start"] = m.master_identifier_period_start.isoformat()
    if m.master_identifier_period_end:
        period["end"] = m.master_identifier_period_end.isoformat()
    if period:
        entry["period"] = period
    if m.master_identifier_assigner:
        entry["assigner"] = {"display": m.master_identifier_assigner}
    return entry


def _fhir_context(m: "DocumentReferenceModel") -> dict | None:
    ctx: dict = {}
    encounters = [fhir_document_reference_context_encounter(e) for e in (m.context_encounters or [])]
    encounters = [e for e in encounters if e]
    if encounters:
        ctx["encounter"] = encounters
    events = [fhir_document_reference_context_event(e) for e in (m.context_events or [])]
    events = [e for e in events if e]
    if events:
        ctx["event"] = events
    period: dict = {}
    if m.context_period_start:
        period["start"] = m.context_period_start.isoformat()
    if m.context_period_end:
        period["end"] = m.context_period_end.isoformat()
    if period:
        ctx["period"] = period
    ft = _cc(m.context_facility_type_system, m.context_facility_type_code, m.context_facility_type_display, m.context_facility_type_text)
    if ft:
        ctx["facilityType"] = ft
    ps = _cc(m.context_practice_setting_system, m.context_practice_setting_code, m.context_practice_setting_display, m.context_practice_setting_text)
    if ps:
        ctx["practiceSetting"] = ps
    spi = _ref(m.context_source_patient_info_type, m.context_source_patient_info_id, m.context_source_patient_info_display)
    if spi:
        ctx["sourcePatientInfo"] = spi
    related = [fhir_document_reference_context_related(r) for r in (m.context_related or [])]
    related = [r for r in related if r]
    if related:
        ctx["related"] = related
    return ctx if ctx else None


def to_fhir_document_reference(m: "DocumentReferenceModel") -> dict:
    result: dict = {
        "resourceType": "DocumentReference",
        "id": str(m.document_reference_id),
        "status": _ev(m.status),
    }
    if m.doc_status:
        result["docStatus"] = _ev(m.doc_status)
    mi = _fhir_master_identifier(m)
    if mi:
        result["masterIdentifier"] = mi
    identifiers = [fhir_document_reference_identifier(i) for i in (m.identifiers or [])]
    if identifiers:
        result["identifier"] = identifiers
    type_cc = _cc(m.type_system, m.type_code, m.type_display, m.type_text)
    if type_cc:
        result["type"] = type_cc
    categories = [fhir_document_reference_category(c) for c in (m.categories or [])]
    categories = [c for c in categories if c]
    if categories:
        result["category"] = categories
    subject = _ref(m.subject_type, m.subject_id, m.subject_display)
    if subject:
        result["subject"] = subject
    if m.date:
        result["date"] = m.date.isoformat()
    authors = [fhir_document_reference_author(a) for a in (m.authors or [])]
    authors = [a for a in authors if a]
    if authors:
        result["author"] = authors
    authenticator = _ref(m.authenticator_type, m.authenticator_id, m.authenticator_display)
    if authenticator:
        result["authenticator"] = authenticator
    if m.custodian and m.custodian.document_reference_id is not None:
        # navigate relationship for public ID
        pass
    if m.custodian_type and m.custodian_id is not None:
        cust_ref: dict = {}
        if m.custodian and hasattr(m.custodian, "organization_id"):
            cust_ref["reference"] = f"Organization/{m.custodian.organization_id}"
        else:
            cust_ref["reference"] = f"{_ev(m.custodian_type)}/{m.custodian_id}"
        if m.custodian_display:
            cust_ref["display"] = m.custodian_display
        result["custodian"] = cust_ref
    relates_to = [fhir_document_reference_relates_to(r) for r in (m.relates_to or [])]
    if relates_to:
        result["relatesTo"] = relates_to
    if m.description:
        result["description"] = m.description
    security_labels = [fhir_document_reference_security_label(sl) for sl in (m.security_labels or [])]
    security_labels = [sl for sl in security_labels if sl]
    if security_labels:
        result["securityLabel"] = security_labels
    result["content"] = [fhir_document_reference_content(c) for c in (m.content or [])]
    ctx = _fhir_context(m)
    if ctx:
        result["context"] = ctx
    return {k: v for k, v in result.items() if v is not None}
