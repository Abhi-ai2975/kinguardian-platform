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


def plain_document_reference_identifier(i: "DocumentReferenceIdentifier") -> dict:
    return {"id": i.id, **{k: v for k, v in {
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
    }.items() if v is not None}}


def plain_document_reference_category(c: "DocumentReferenceCategory") -> dict:
    return {"id": c.id, **{k: v for k, v in {
        "coding_system": c.coding_system,
        "coding_code": c.coding_code,
        "coding_display": c.coding_display,
        "text": c.text,
    }.items() if v is not None}}


def plain_document_reference_author(a: "DocumentReferenceAuthor") -> dict:
    return {"id": a.id, **{k: v for k, v in {
        "reference_type": _ev(a.reference_type),
        "reference_id": a.reference_id,
        "reference_display": a.reference_display,
    }.items() if v is not None}}


def plain_document_reference_relates_to(r: "DocumentReferenceRelatesTo") -> dict:
    return {"id": r.id, **{k: v for k, v in {
        "code": _ev(r.code),
        "target_type": _ev(r.target_type),
        "target_id": r.target_id,
        "target_display": r.target_display,
    }.items() if v is not None}}


def plain_document_reference_security_label(sl: "DocumentReferenceSecurityLabel") -> dict:
    return {"id": sl.id, **{k: v for k, v in {
        "coding_system": sl.coding_system,
        "coding_code": sl.coding_code,
        "coding_display": sl.coding_display,
        "text": sl.text,
    }.items() if v is not None}}


def plain_document_reference_content(c: "DocumentReferenceContent") -> dict:
    return {"id": c.id, **{k: v for k, v in {
        "attachment_content_type": c.attachment_content_type,
        "attachment_language": c.attachment_language,
        "attachment_data": c.attachment_data,
        "attachment_url": c.attachment_url,
        "attachment_size": c.attachment_size,
        "attachment_hash": c.attachment_hash,
        "attachment_title": c.attachment_title,
        "attachment_creation": c.attachment_creation.isoformat() if c.attachment_creation else None,
        "format_system": c.format_system,
        "format_version": c.format_version,
        "format_code": c.format_code,
        "format_display": c.format_display,
    }.items() if v is not None}}


def plain_document_reference_context_encounter(e: "DocumentReferenceContextEncounter") -> dict:
    return {"id": e.id, **{k: v for k, v in {
        "reference_type": _ev(e.reference_type),
        "reference_id": e.reference_id,
        "reference_display": e.reference_display,
    }.items() if v is not None}}


def plain_document_reference_context_event(ev: "DocumentReferenceContextEvent") -> dict:
    return {"id": ev.id, **{k: v for k, v in {
        "coding_system": ev.coding_system,
        "coding_code": ev.coding_code,
        "coding_display": ev.coding_display,
        "text": ev.text,
    }.items() if v is not None}}


def plain_document_reference_context_related(r: "DocumentReferenceContextRelated") -> dict:
    return {"id": r.id, **{k: v for k, v in {
        "reference_type": r.reference_type,
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }.items() if v is not None}}


def to_plain_document_reference(m: "DocumentReferenceModel") -> dict:
    result: dict = {
        "id": m.document_reference_id,
        "user_id": m.user_id,
        "org_id": m.org_id,
        "status": _ev(m.status),
        "doc_status": _ev(m.doc_status),
        "master_identifier_use": m.master_identifier_use,
        "master_identifier_type_system": m.master_identifier_type_system,
        "master_identifier_type_code": m.master_identifier_type_code,
        "master_identifier_type_display": m.master_identifier_type_display,
        "master_identifier_type_text": m.master_identifier_type_text,
        "master_identifier_system": m.master_identifier_system,
        "master_identifier_value": m.master_identifier_value,
        "master_identifier_period_start": m.master_identifier_period_start.isoformat() if m.master_identifier_period_start else None,
        "master_identifier_period_end": m.master_identifier_period_end.isoformat() if m.master_identifier_period_end else None,
        "master_identifier_assigner": m.master_identifier_assigner,
        "type_system": m.type_system,
        "type_code": m.type_code,
        "type_display": m.type_display,
        "type_text": m.type_text,
        "subject_type": _ev(m.subject_type),
        "subject_id": m.subject_id,
        "subject_display": m.subject_display,
        "date": m.date.isoformat() if m.date else None,
        "authenticator_type": _ev(m.authenticator_type),
        "authenticator_id": m.authenticator_id,
        "authenticator_display": m.authenticator_display,
        "custodian_type": _ev(m.custodian_type),
        "custodian_id": m.custodian_id,
        "custodian_display": m.custodian_display,
        "description": m.description,
        "context_period_start": m.context_period_start.isoformat() if m.context_period_start else None,
        "context_period_end": m.context_period_end.isoformat() if m.context_period_end else None,
        "context_facility_type_system": m.context_facility_type_system,
        "context_facility_type_code": m.context_facility_type_code,
        "context_facility_type_display": m.context_facility_type_display,
        "context_facility_type_text": m.context_facility_type_text,
        "context_practice_setting_system": m.context_practice_setting_system,
        "context_practice_setting_code": m.context_practice_setting_code,
        "context_practice_setting_display": m.context_practice_setting_display,
        "context_practice_setting_text": m.context_practice_setting_text,
        "context_source_patient_info_type": _ev(m.context_source_patient_info_type),
        "context_source_patient_info_id": m.context_source_patient_info_id,
        "context_source_patient_info_display": m.context_source_patient_info_display,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        "identifiers": [plain_document_reference_identifier(i) for i in (m.identifiers or [])],
        "categories": [plain_document_reference_category(c) for c in (m.categories or [])],
        "authors": [plain_document_reference_author(a) for a in (m.authors or [])],
        "relates_to": [plain_document_reference_relates_to(r) for r in (m.relates_to or [])],
        "security_labels": [plain_document_reference_security_label(sl) for sl in (m.security_labels or [])],
        "content": [plain_document_reference_content(c) for c in (m.content or [])],
        "context_encounters": [plain_document_reference_context_encounter(e) for e in (m.context_encounters or [])],
        "context_events": [plain_document_reference_context_event(e) for e in (m.context_events or [])],
        "context_related": [plain_document_reference_context_related(r) for r in (m.context_related or [])],
    }
    return {k: v for k, v in result.items() if v is not None or k in (
        "id", "status", "content", "identifiers", "categories", "authors",
        "relates_to", "security_labels", "context_encounters", "context_events", "context_related",
    )}
