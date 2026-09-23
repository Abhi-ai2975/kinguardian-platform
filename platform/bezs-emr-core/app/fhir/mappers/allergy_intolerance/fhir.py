from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.allergy_intolerance.allergy_intolerance import (
        AllergyIntoleranceCategory,
        AllergyIntoleranceIdentifier,
        AllergyIntoleranceModel,
        AllergyIntoleranceNote,
        AllergyIntoleranceReaction,
        AllergyIntoleranceReactionManifestation,
        AllergyIntoleranceReactionNote,
    )


def _cc(system, code, display, text) -> dict | None:
    coding = {k: v for k, v in {"system": system, "code": code, "display": display}.items() if v}
    result: dict = {}
    if coding:
        result["coding"] = [coding]
    if text:
        result["text"] = text
    return result if result else None


def _ref(ref_type, ref_id, display) -> dict | None:
    if not (ref_type and ref_id):
        return None
    t = ref_type.value if hasattr(ref_type, "value") else ref_type
    r: dict = {"reference": f"{t}/{ref_id}"}
    if display:
        r["display"] = display
    return r


def _annotation(note) -> dict:
    entry: dict = {"text": note.text}
    if note.time:
        entry["time"] = note.time.isoformat()
    if note.author_string:
        entry["authorString"] = note.author_string
    elif note.author_reference_type and note.author_reference_id:
        entry["authorReference"] = {"reference": f"{note.author_reference_type}/{note.author_reference_id}"}
        if note.author_reference_display:
            entry["authorReference"]["display"] = note.author_reference_display
    return entry


def fhir_allergy_intolerance_identifier(i: "AllergyIntoleranceIdentifier") -> dict:
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


def fhir_allergy_intolerance_reaction_manifestation(m: "AllergyIntoleranceReactionManifestation") -> dict:
    entry: dict = {}
    coding = {k: v for k, v in {
        "system": m.coding_system,
        "code": m.coding_code,
        "display": m.coding_display,
    }.items() if v}
    if coding:
        entry["coding"] = [coding]
    if m.text:
        entry["text"] = m.text
    return entry


def fhir_allergy_intolerance_reaction(r: "AllergyIntoleranceReaction") -> dict:
    entry: dict = {}

    substance = _cc(r.substance_system, r.substance_code, r.substance_display, r.substance_text)
    if substance:
        entry["substance"] = substance

    entry["manifestation"] = [
        fhir_allergy_intolerance_reaction_manifestation(m) for m in r.manifestations
    ]

    if r.description:
        entry["description"] = r.description
    if r.onset:
        entry["onset"] = r.onset.isoformat()
    if r.severity:
        entry["severity"] = r.severity.value if hasattr(r.severity, "value") else r.severity

    exposure_route = _cc(
        r.exposure_route_system, r.exposure_route_code,
        r.exposure_route_display, r.exposure_route_text,
    )
    if exposure_route:
        entry["exposureRoute"] = exposure_route

    if r.reaction_notes:
        entry["note"] = [_annotation(n) for n in r.reaction_notes]

    return entry


def to_fhir_allergy_intolerance(model: "AllergyIntoleranceModel") -> dict:
    result: dict = {
        "resourceType": "AllergyIntolerance",
        "id": str(model.allergy_intolerance_id),
    }

    if model.identifiers:
        result["identifier"] = [fhir_allergy_intolerance_identifier(i) for i in model.identifiers]

    clinical_status = _cc(
        model.clinical_status_system, model.clinical_status_code,
        model.clinical_status_display, model.clinical_status_text,
    )
    if clinical_status:
        result["clinicalStatus"] = clinical_status

    verification_status = _cc(
        model.verification_status_system, model.verification_status_code,
        model.verification_status_display, model.verification_status_text,
    )
    if verification_status:
        result["verificationStatus"] = verification_status

    if model.type:
        result["type"] = model.type.value if hasattr(model.type, "value") else model.type

    if model.categories:
        result["category"] = [
            (c.category.value if hasattr(c.category, "value") else c.category)
            for c in model.categories
        ]

    if model.criticality:
        result["criticality"] = model.criticality.value if hasattr(model.criticality, "value") else model.criticality

    code = _cc(model.code_system, model.code_code, model.code_display, model.code_text)
    if code:
        result["code"] = code

    patient_type = model.patient_type.value if hasattr(model.patient_type, "value") else model.patient_type
    result["patient"] = {"reference": f"{patient_type}/{model.patient_id}"}
    if model.patient_display:
        result["patient"]["display"] = model.patient_display

    encounter = _ref(model.encounter_type, model.encounter_id, model.encounter_display)
    if encounter:
        result["encounter"] = encounter

    # onset[x] — output whichever variant is populated
    if model.onset_date_time is not None:
        result["onsetDateTime"] = model.onset_date_time.isoformat()
    elif model.onset_age_value is not None:
        age: dict = {"value": float(model.onset_age_value)}
        if model.onset_age_comparator:
            age["comparator"] = model.onset_age_comparator
        if model.onset_age_unit:
            age["unit"] = model.onset_age_unit
        if model.onset_age_system:
            age["system"] = model.onset_age_system
        if model.onset_age_code:
            age["code"] = model.onset_age_code
        result["onsetAge"] = age
    elif model.onset_period_start or model.onset_period_end:
        period: dict = {}
        if model.onset_period_start:
            period["start"] = model.onset_period_start.isoformat()
        if model.onset_period_end:
            period["end"] = model.onset_period_end.isoformat()
        result["onsetPeriod"] = period
    elif model.onset_range_low_value is not None or model.onset_range_high_value is not None:
        rng: dict = {}
        if model.onset_range_low_value is not None:
            low: dict = {"value": float(model.onset_range_low_value)}
            if model.onset_range_low_unit:
                low["unit"] = model.onset_range_low_unit
            if model.onset_range_low_system:
                low["system"] = model.onset_range_low_system
            if model.onset_range_low_code:
                low["code"] = model.onset_range_low_code
            rng["low"] = low
        if model.onset_range_high_value is not None:
            high: dict = {"value": float(model.onset_range_high_value)}
            if model.onset_range_high_unit:
                high["unit"] = model.onset_range_high_unit
            if model.onset_range_high_system:
                high["system"] = model.onset_range_high_system
            if model.onset_range_high_code:
                high["code"] = model.onset_range_high_code
            rng["high"] = high
        result["onsetRange"] = rng
    elif model.onset_string:
        result["onsetString"] = model.onset_string

    if model.recorded_date:
        result["recordedDate"] = model.recorded_date.isoformat()

    recorder = _ref(model.recorder_type, model.recorder_id, model.recorder_display)
    if recorder:
        result["recorder"] = recorder

    asserter = _ref(model.asserter_type, model.asserter_id, model.asserter_display)
    if asserter:
        result["asserter"] = asserter

    if model.last_occurrence:
        result["lastOccurrence"] = model.last_occurrence.isoformat()

    if model.notes:
        result["note"] = [_annotation(n) for n in model.notes]

    if model.reactions:
        result["reaction"] = [fhir_allergy_intolerance_reaction(r) for r in model.reactions]

    return {k: v for k, v in result.items() if v is not None}
