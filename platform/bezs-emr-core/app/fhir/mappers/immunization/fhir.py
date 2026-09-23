from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.immunization.immunization import (
        ImmunizationModel,
        ImmunizationIdentifier,
        ImmunizationPerformer,
        ImmunizationNote,
        ImmunizationReasonCode,
        ImmunizationReasonReference,
        ImmunizationSubpotentReason,
        ImmunizationEducation,
        ImmunizationProgramEligibility,
        ImmunizationReaction,
        ImmunizationProtocolApplied,
        ImmunizationProtocolAppliedTargetDisease,
    )


def _ev(v):
    return v.value if v and hasattr(v, "value") else v


def _cc(system, code, display, text=None) -> dict | None:
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


def fhir_immunization_identifier(i: "ImmunizationIdentifier") -> dict:
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
    if i.period_start or i.period_end:
        entry["period"] = {k: v.isoformat() for k, v in {"start": i.period_start, "end": i.period_end}.items() if v}
    if i.assigner:
        entry["assigner"] = {"display": i.assigner}
    return entry


def fhir_immunization_performer(p: "ImmunizationPerformer") -> dict:
    entry: dict = {}
    fn = _cc(p.function_system, p.function_code, p.function_display, p.function_text)
    if fn:
        entry["function"] = fn
    actor = _ref(p.reference_type, p.reference_id, p.reference_display)
    if actor:
        entry["actor"] = actor
    return entry


def fhir_immunization_note(n: "ImmunizationNote") -> dict:
    entry: dict = {"text": n.text}
    if n.time:
        entry["time"] = n.time.isoformat()
    if n.author_string:
        entry["authorString"] = n.author_string
    elif n.author_reference_type and n.author_reference_id is not None:
        r: dict = {"reference": f"{n.author_reference_type}/{n.author_reference_id}"}
        if n.author_reference_display:
            r["display"] = n.author_reference_display
        entry["authorReference"] = r
    return entry


def fhir_immunization_reason_code(rc: "ImmunizationReasonCode") -> dict:
    entry: dict = {}
    coding = {k: v for k, v in {"system": rc.coding_system, "code": rc.coding_code, "display": rc.coding_display}.items() if v}
    if coding:
        entry["coding"] = [coding]
    if rc.text:
        entry["text"] = rc.text
    return entry


def fhir_immunization_reason_reference(rr: "ImmunizationReasonReference") -> dict:
    r: dict = {}
    if rr.reference_type and rr.reference_id is not None:
        r["reference"] = f"{_ev(rr.reference_type)}/{rr.reference_id}"
    if rr.reference_display:
        r["display"] = rr.reference_display
    return r


def fhir_immunization_subpotent_reason(sr: "ImmunizationSubpotentReason") -> dict:
    entry: dict = {}
    coding = {k: v for k, v in {"system": sr.coding_system, "code": sr.coding_code, "display": sr.coding_display}.items() if v}
    if coding:
        entry["coding"] = [coding]
    if sr.text:
        entry["text"] = sr.text
    return entry


def fhir_immunization_education(e: "ImmunizationEducation") -> dict:
    entry: dict = {}
    if e.document_type:
        entry["documentType"] = e.document_type
    if e.reference:
        entry["reference"] = e.reference
    if e.publication_date:
        entry["publicationDate"] = e.publication_date.isoformat()
    if e.presentation_date:
        entry["presentationDate"] = e.presentation_date.isoformat()
    return entry


def fhir_immunization_program_eligibility(pe: "ImmunizationProgramEligibility") -> dict:
    entry: dict = {}
    coding = {k: v for k, v in {"system": pe.coding_system, "code": pe.coding_code, "display": pe.coding_display}.items() if v}
    if coding:
        entry["coding"] = [coding]
    if pe.text:
        entry["text"] = pe.text
    return entry


def fhir_immunization_reaction(r: "ImmunizationReaction") -> dict:
    entry: dict = {}
    if r.date:
        entry["date"] = r.date.isoformat()
    detail = _ref(r.detail_type, r.detail_id, r.detail_display)
    if detail:
        entry["detail"] = detail
    if r.reported is not None:
        entry["reported"] = r.reported
    return entry


def fhir_immunization_target_disease(td: "ImmunizationProtocolAppliedTargetDisease") -> dict:
    entry: dict = {}
    coding = {k: v for k, v in {"system": td.coding_system, "code": td.coding_code, "display": td.coding_display}.items() if v}
    if coding:
        entry["coding"] = [coding]
    if td.text:
        entry["text"] = td.text
    return entry


def fhir_immunization_protocol_applied(pa: "ImmunizationProtocolApplied") -> dict:
    entry: dict = {}
    if pa.series:
        entry["series"] = pa.series
    authority = _ref(pa.authority_type, pa.authority_id, pa.authority_display)
    if authority:
        entry["authority"] = authority
    if pa.target_diseases:
        entry["targetDisease"] = [fhir_immunization_target_disease(td) for td in pa.target_diseases]
    if pa.dose_number_positive_int is not None:
        entry["doseNumberPositiveInt"] = pa.dose_number_positive_int
    elif pa.dose_number_string:
        entry["doseNumberString"] = pa.dose_number_string
    if pa.series_doses_positive_int is not None:
        entry["seriesDosesPositiveInt"] = pa.series_doses_positive_int
    elif pa.series_doses_string:
        entry["seriesDosesString"] = pa.series_doses_string
    return entry


def to_fhir_immunization(model: "ImmunizationModel") -> dict:
    out: dict = {
        "resourceType": "Immunization",
        "id": str(model.immunization_id),
        "status": _ev(model.status),
    }

    if model.occurrence_datetime:
        out["occurrenceDateTime"] = model.occurrence_datetime.isoformat()
    elif model.occurrence_string:
        out["occurrenceString"] = model.occurrence_string

    vc = _cc(model.vaccine_code_system, model.vaccine_code_code, model.vaccine_code_display, model.vaccine_code_text)
    if vc:
        out["vaccineCode"] = vc

    patient = _ref(model.patient_type, model.patient_id, model.patient_display)
    if patient:
        out["patient"] = patient

    encounter = _ref(model.encounter_type, model.encounter_id, model.encounter_display)
    if encounter:
        out["encounter"] = encounter

    if model.recorded:
        out["recorded"] = model.recorded.isoformat()

    if model.primary_source is not None:
        out["primarySource"] = model.primary_source

    ro = _cc(model.report_origin_system, model.report_origin_code, model.report_origin_display, model.report_origin_text)
    if ro:
        out["reportOrigin"] = ro

    location = _ref(model.location_type, model.location_id, model.location_display)
    if location:
        out["location"] = location

    if model.manufacturer and model.manufacturer.organization_id:
        mfr: dict = {"reference": f"Organization/{model.manufacturer.organization_id}"}
        if model.manufacturer_display:
            mfr["display"] = model.manufacturer_display
        out["manufacturer"] = mfr
    elif model.manufacturer_id:
        mfr = {"reference": f"Organization/{model.manufacturer_id}"}
        if model.manufacturer_display:
            mfr["display"] = model.manufacturer_display
        out["manufacturer"] = mfr

    if model.lot_number:
        out["lotNumber"] = model.lot_number

    if model.expiration_date:
        out["expirationDate"] = model.expiration_date.isoformat()

    site = _cc(model.site_system, model.site_code, model.site_display, model.site_text)
    if site:
        out["site"] = site

    route = _cc(model.route_system, model.route_code, model.route_display, model.route_text)
    if route:
        out["route"] = route

    if model.dose_quantity_value is not None:
        dq: dict = {"value": float(model.dose_quantity_value)}
        if model.dose_quantity_unit:
            dq["unit"] = model.dose_quantity_unit
        if model.dose_quantity_system:
            dq["system"] = model.dose_quantity_system
        if model.dose_quantity_code:
            dq["code"] = model.dose_quantity_code
        out["doseQuantity"] = dq

    if model.is_subpotent is not None:
        out["isSubpotent"] = model.is_subpotent

    sr = _cc(model.status_reason_system, model.status_reason_code, model.status_reason_display, model.status_reason_text)
    if sr:
        out["statusReason"] = sr

    fs = _cc(model.funding_source_system, model.funding_source_code, model.funding_source_display, model.funding_source_text)
    if fs:
        out["fundingSource"] = fs

    if model.identifiers:
        out["identifier"] = [fhir_immunization_identifier(i) for i in model.identifiers]
    if model.performers:
        out["performer"] = [fhir_immunization_performer(p) for p in model.performers]
    if model.notes:
        out["note"] = [fhir_immunization_note(n) for n in model.notes]
    if model.reason_codes:
        out["reasonCode"] = [fhir_immunization_reason_code(rc) for rc in model.reason_codes]
    if model.reason_references:
        out["reasonReference"] = [fhir_immunization_reason_reference(rr) for rr in model.reason_references]
    if model.subpotent_reasons:
        out["subpotentReason"] = [fhir_immunization_subpotent_reason(sr) for sr in model.subpotent_reasons]
    if model.educations:
        out["education"] = [fhir_immunization_education(e) for e in model.educations]
    if model.program_eligibilities:
        out["programEligibility"] = [fhir_immunization_program_eligibility(pe) for pe in model.program_eligibilities]
    if model.reactions:
        out["reaction"] = [fhir_immunization_reaction(r) for r in model.reactions]
    if model.protocol_applied:
        out["protocolApplied"] = [fhir_immunization_protocol_applied(pa) for pa in model.protocol_applied]

    return {k: v for k, v in out.items() if v is not None}
