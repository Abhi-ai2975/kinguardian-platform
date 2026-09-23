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


def _cc(system, code, display, text=None) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def fhir_diagrep_identifier(i: "DiagnosticReportIdentifier") -> dict:
    entry: dict = {}
    if i.use:
        entry["use"] = i.use
    type_cc = _cc(i.type_system, i.type_code, i.type_display, i.type_text)
    if type_cc:
        entry["type"] = type_cc
    if i.system:
        entry["system"] = i.system
    if i.value:
        entry["value"] = i.value
    if i.period_start or i.period_end:
        entry["period"] = {k: v for k, v in {
            "start": i.period_start.isoformat() if i.period_start else None,
            "end": i.period_end.isoformat() if i.period_end else None,
        }.items() if v}
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_diagrep_based_on(bo: "DiagnosticReportBasedOn") -> dict:
    entry: dict = {}
    if bo.reference_type and bo.reference_id:
        entry["reference"] = f"{bo.reference_type.value}/{bo.reference_id}"
    if bo.reference_display:
        entry["display"] = bo.reference_display
    return entry


def fhir_diagrep_category(cat: "DiagnosticReportCategory") -> dict | None:
    return _cc(cat.coding_system, cat.coding_code, cat.coding_display, cat.text)


def fhir_diagrep_performer(p: "DiagnosticReportPerformer") -> dict:
    entry: dict = {}
    if p.reference_type and p.reference_id:
        entry["reference"] = f"{p.reference_type.value}/{p.reference_id}"
    if p.reference_display:
        entry["display"] = p.reference_display
    return entry


def fhir_diagrep_results_interpreter(ri: "DiagnosticReportResultsInterpreter") -> dict:
    entry: dict = {}
    if ri.reference_type and ri.reference_id:
        entry["reference"] = f"{ri.reference_type.value}/{ri.reference_id}"
    if ri.reference_display:
        entry["display"] = ri.reference_display
    return entry


def fhir_diagrep_specimen(sp: "DiagnosticReportSpecimen") -> dict:
    entry: dict = {}
    if sp.reference_type and sp.reference_id:
        entry["reference"] = f"{sp.reference_type.value}/{sp.reference_id}"
    if sp.reference_display:
        entry["display"] = sp.reference_display
    return entry


def fhir_diagrep_result(r: "DiagnosticReportResult") -> dict:
    entry: dict = {}
    if r.reference_type and r.reference_id:
        entry["reference"] = f"{r.reference_type.value}/{r.reference_id}"
    if r.reference_display:
        entry["display"] = r.reference_display
    return entry


def fhir_diagrep_imaging_study(img: "DiagnosticReportImagingStudy") -> dict:
    entry: dict = {}
    if img.reference_type and img.reference_id:
        entry["reference"] = f"{img.reference_type.value}/{img.reference_id}"
    if img.reference_display:
        entry["display"] = img.reference_display
    return entry


def fhir_diagrep_media(m: "DiagnosticReportMedia") -> dict:
    entry: dict = {}
    if m.comment:
        entry["comment"] = m.comment
    if m.link_reference_type and m.link_reference_id:
        link: dict = {"reference": f"{m.link_reference_type.value}/{m.link_reference_id}"}
        if m.link_reference_display:
            link["display"] = m.link_reference_display
        entry["link"] = link
    return entry


def fhir_diagrep_conclusion_code(cc_row: "DiagnosticReportConclusionCode") -> dict | None:
    return _cc(cc_row.coding_system, cc_row.coding_code, cc_row.coding_display, cc_row.text)


def fhir_diagrep_presented_form(pf: "DiagnosticReportPresentedForm") -> dict:
    entry: dict = {}
    for attr, key in [
        ("content_type", "contentType"),
        ("language", "language"),
        ("data", "data"),
        ("url", "url"),
        ("size", "size"),
        ("hash", "hash"),
        ("title", "title"),
    ]:
        val = getattr(pf, attr)
        if val is not None:
            entry[key] = val
    if pf.creation:
        entry["creation"] = pf.creation.isoformat()
    return entry


def to_fhir_diagnostic_report(dr: "DiagnosticReportModel") -> dict:
    result: dict = {
        "resourceType": "DiagnosticReport",
        "id": str(dr.diagnostic_report_id),
        "status": dr.status.value if dr.status else None,
    }

    if dr.identifiers:
        result["identifier"] = [fhir_diagrep_identifier(i) for i in dr.identifiers]

    if dr.based_on:
        bo_list = [e for e in [fhir_diagrep_based_on(b) for b in dr.based_on] if e]
        if bo_list:
            result["basedOn"] = bo_list

    if dr.categories:
        cats = [cc for cat in dr.categories if (cc := fhir_diagrep_category(cat))]
        if cats:
            result["category"] = cats

    code_cc = _cc(dr.code_system, dr.code_code, dr.code_display, dr.code_text)
    if code_cc:
        result["code"] = code_cc

    if dr.subject_type and dr.subject_id:
        subj: dict = {"reference": f"{dr.subject_type.value}/{dr.subject_id}"}
        if dr.subject_display:
            subj["display"] = dr.subject_display
        result["subject"] = subj

    if dr.encounter and dr.encounter.encounter_id:
        enc_ref: dict = {"reference": f"Encounter/{dr.encounter.encounter_id}"}
        if dr.encounter_display:
            enc_ref["display"] = dr.encounter_display
        result["encounter"] = enc_ref

    # effective[x]
    if dr.effective_datetime:
        result["effectiveDateTime"] = dr.effective_datetime.isoformat()
    elif dr.effective_period_start or dr.effective_period_end:
        result["effectivePeriod"] = {k: v for k, v in {
            "start": dr.effective_period_start.isoformat() if dr.effective_period_start else None,
            "end": dr.effective_period_end.isoformat() if dr.effective_period_end else None,
        }.items() if v}

    if dr.issued:
        result["issued"] = dr.issued.isoformat()

    if dr.performers:
        p_list = [e for e in [fhir_diagrep_performer(p) for p in dr.performers] if e]
        if p_list:
            result["performer"] = p_list

    if dr.results_interpreters:
        ri_list = [e for e in [fhir_diagrep_results_interpreter(ri) for ri in dr.results_interpreters] if e]
        if ri_list:
            result["resultsInterpreter"] = ri_list

    if dr.specimens:
        sp_list = [e for e in [fhir_diagrep_specimen(sp) for sp in dr.specimens] if e]
        if sp_list:
            result["specimen"] = sp_list

    if dr.results:
        r_list = [e for e in [fhir_diagrep_result(r) for r in dr.results] if e]
        if r_list:
            result["result"] = r_list

    if dr.imaging_studies:
        img_list = [e for e in [fhir_diagrep_imaging_study(img) for img in dr.imaging_studies] if e]
        if img_list:
            result["imagingStudy"] = img_list

    if dr.media:
        result["media"] = [fhir_diagrep_media(m) for m in dr.media]

    if dr.conclusion:
        result["conclusion"] = dr.conclusion

    if dr.conclusion_codes:
        cc_list = [cc for cc_row in dr.conclusion_codes if (cc := fhir_diagrep_conclusion_code(cc_row))]
        if cc_list:
            result["conclusionCode"] = cc_list

    if dr.presented_forms:
        result["presentedForm"] = [fhir_diagrep_presented_form(pf) for pf in dr.presented_forms]

    return {k: v for k, v in result.items() if v is not None}
