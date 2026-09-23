from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.diagnostic_report.diagnostic_report import (
        DiagnosticReportModel,
        DiagnosticReportIdentifier,
        DiagnosticReportBasedOn,
        DiagnosticReportCategory,
        DiagnosticReportPerformer,
        DiagnosticReportResultsInterpreter,
        DiagnosticReportSpecimen,
        DiagnosticReportResult,
        DiagnosticReportImagingStudy,
        DiagnosticReportMedia,
        DiagnosticReportConclusionCode,
        DiagnosticReportPresentedForm,
    )


def plain_diagrep_identifier(i: "DiagnosticReportIdentifier") -> dict:
    return {
        "id": i.id,
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
    }


def plain_diagrep_based_on(bo: "DiagnosticReportBasedOn") -> dict:
    return {
        "id": bo.id,
        "reference_type": bo.reference_type.value if bo.reference_type else None,
        "reference_id": bo.reference_id,
        "reference_display": bo.reference_display,
    }


def plain_diagrep_category(cat: "DiagnosticReportCategory") -> dict:
    return {
        "id": cat.id,
        "coding_system": cat.coding_system,
        "coding_code": cat.coding_code,
        "coding_display": cat.coding_display,
        "text": cat.text,
    }


def plain_diagrep_performer(p: "DiagnosticReportPerformer") -> dict:
    return {
        "id": p.id,
        "reference_type": p.reference_type.value if p.reference_type else None,
        "reference_id": p.reference_id,
        "reference_display": p.reference_display,
    }


def plain_diagrep_results_interpreter(ri: "DiagnosticReportResultsInterpreter") -> dict:
    return {
        "id": ri.id,
        "reference_type": ri.reference_type.value if ri.reference_type else None,
        "reference_id": ri.reference_id,
        "reference_display": ri.reference_display,
    }


def plain_diagrep_specimen(sp: "DiagnosticReportSpecimen") -> dict:
    return {
        "id": sp.id,
        "reference_type": sp.reference_type.value if sp.reference_type else None,
        "reference_id": sp.reference_id,
        "reference_display": sp.reference_display,
    }


def plain_diagrep_result(r: "DiagnosticReportResult") -> dict:
    return {
        "id": r.id,
        "reference_type": r.reference_type.value if r.reference_type else None,
        "reference_id": r.reference_id,
        "reference_display": r.reference_display,
    }


def plain_diagrep_imaging_study(img: "DiagnosticReportImagingStudy") -> dict:
    return {
        "id": img.id,
        "reference_type": img.reference_type.value if img.reference_type else None,
        "reference_id": img.reference_id,
        "reference_display": img.reference_display,
    }


def plain_diagrep_media(m: "DiagnosticReportMedia") -> dict:
    return {
        "id": m.id,
        "comment": m.comment,
        "link_reference_type": m.link_reference_type.value if m.link_reference_type else None,
        "link_reference_id": m.link_reference_id,
        "link_reference_display": m.link_reference_display,
    }


def plain_diagrep_conclusion_code(cc_row: "DiagnosticReportConclusionCode") -> dict:
    return {
        "id": cc_row.id,
        "coding_system": cc_row.coding_system,
        "coding_code": cc_row.coding_code,
        "coding_display": cc_row.coding_display,
        "text": cc_row.text,
    }


def plain_diagrep_presented_form(pf: "DiagnosticReportPresentedForm") -> dict:
    return {
        "id": pf.id,
        "content_type": pf.content_type,
        "language": pf.language,
        "data": pf.data,
        "url": pf.url,
        "size": pf.size,
        "hash": pf.hash,
        "title": pf.title,
        "creation": pf.creation.isoformat() if pf.creation else None,
    }


def to_plain_diagnostic_report(dr: "DiagnosticReportModel") -> dict:
    return {
        "id": dr.diagnostic_report_id,
        "user_id": dr.user_id,
        "org_id": dr.org_id,
        "status": dr.status.value if dr.status else None,
        "code_system": dr.code_system,
        "code_code": dr.code_code,
        "code_display": dr.code_display,
        "code_text": dr.code_text,
        "subject_type": dr.subject_type.value if dr.subject_type else None,
        "subject_id": dr.subject_id,
        "subject_display": dr.subject_display,
        "encounter_id": dr.encounter.encounter_id if dr.encounter else None,
        "encounter_display": dr.encounter_display,
        "effective_datetime": dr.effective_datetime.isoformat() if dr.effective_datetime else None,
        "effective_period_start": dr.effective_period_start.isoformat() if dr.effective_period_start else None,
        "effective_period_end": dr.effective_period_end.isoformat() if dr.effective_period_end else None,
        "issued": dr.issued.isoformat() if dr.issued else None,
        "conclusion": dr.conclusion,
        "created_at": dr.created_at.isoformat() if dr.created_at else None,
        "updated_at": dr.updated_at.isoformat() if dr.updated_at else None,
        "created_by": dr.created_by,
        "updated_by": dr.updated_by,
        "identifier": [plain_diagrep_identifier(i) for i in dr.identifiers] if dr.identifiers else None,
        "based_on": [plain_diagrep_based_on(b) for b in dr.based_on] if dr.based_on else None,
        "category": [plain_diagrep_category(c) for c in dr.categories] if dr.categories else None,
        "performer": [plain_diagrep_performer(p) for p in dr.performers] if dr.performers else None,
        "results_interpreter": [plain_diagrep_results_interpreter(ri) for ri in dr.results_interpreters] if dr.results_interpreters else None,
        "specimen": [plain_diagrep_specimen(sp) for sp in dr.specimens] if dr.specimens else None,
        "result": [plain_diagrep_result(r) for r in dr.results] if dr.results else None,
        "imaging_study": [plain_diagrep_imaging_study(img) for img in dr.imaging_studies] if dr.imaging_studies else None,
        "media": [plain_diagrep_media(m) for m in dr.media] if dr.media else None,
        "conclusion_code": [plain_diagrep_conclusion_code(cc) for cc in dr.conclusion_codes] if dr.conclusion_codes else None,
        "presented_form": [plain_diagrep_presented_form(pf) for pf in dr.presented_forms] if dr.presented_forms else None,
    }
