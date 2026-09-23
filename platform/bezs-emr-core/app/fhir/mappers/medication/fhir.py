from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.medication.medication import (
        MedicationIdentifier,
        MedicationIngredient,
        MedicationModel,
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


def _quantity(value, unit, system, code) -> dict | None:
    if value is None and not unit:
        return None
    q: dict = {}
    if value is not None:
        q["value"] = float(value)
    if unit:
        q["unit"] = unit
    if system:
        q["system"] = system
    if code:
        q["code"] = code
    return q if q else None


def _ratio(num_value, num_unit, num_system, num_code,
           den_value, den_unit, den_system, den_code) -> dict | None:
    numerator = _quantity(num_value, num_unit, num_system, num_code)
    denominator = _quantity(den_value, den_unit, den_system, den_code)
    if not (numerator or denominator):
        return None
    ratio: dict = {}
    if numerator:
        ratio["numerator"] = numerator
    if denominator:
        ratio["denominator"] = denominator
    return ratio


def fhir_medication_identifier(i: "MedicationIdentifier") -> dict:
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


def fhir_medication_ingredient(ing: "MedicationIngredient") -> dict:
    entry: dict = {}

    item_cc = _cc(
        ing.item_codeable_concept_system,
        ing.item_codeable_concept_code,
        ing.item_codeable_concept_display,
        ing.item_codeable_concept_text,
    )
    if item_cc:
        entry["itemCodeableConcept"] = item_cc

    item_ref = _ref(ing.item_reference_type, ing.item_reference_id, ing.item_reference_display)
    if item_ref:
        entry["itemReference"] = item_ref

    if ing.is_active is not None:
        entry["isActive"] = ing.is_active

    strength = _ratio(
        ing.strength_numerator_value, ing.strength_numerator_unit,
        ing.strength_numerator_system, ing.strength_numerator_code,
        ing.strength_denominator_value, ing.strength_denominator_unit,
        ing.strength_denominator_system, ing.strength_denominator_code,
    )
    if strength:
        entry["strength"] = strength

    return entry


def to_fhir_medication(model: "MedicationModel") -> dict:
    result: dict = {
        "resourceType": "Medication",
        "id": str(model.medication_id),
    }

    if model.identifiers:
        result["identifier"] = [fhir_medication_identifier(i) for i in model.identifiers]

    code_cc = _cc(model.code_system, model.code_code, model.code_display, model.code_text)
    if code_cc:
        result["code"] = code_cc

    if model.status:
        result["status"] = model.status.value if hasattr(model.status, "value") else model.status

    mfr = _ref(model.manufacturer_type, model.manufacturer_id, model.manufacturer_display)
    if mfr:
        result["manufacturer"] = mfr

    form_cc = _cc(model.form_system, model.form_code, model.form_display, model.form_text)
    if form_cc:
        result["form"] = form_cc

    amount = _ratio(
        model.amount_numerator_value, model.amount_numerator_unit,
        model.amount_numerator_system, model.amount_numerator_code,
        model.amount_denominator_value, model.amount_denominator_unit,
        model.amount_denominator_system, model.amount_denominator_code,
    )
    if amount:
        result["amount"] = amount

    if model.ingredients:
        result["ingredient"] = [fhir_medication_ingredient(i) for i in model.ingredients]

    if model.batch_lot_number or model.batch_expiration_date:
        batch: dict = {}
        if model.batch_lot_number:
            batch["lotNumber"] = model.batch_lot_number
        if model.batch_expiration_date:
            batch["expirationDate"] = model.batch_expiration_date.isoformat()
        result["batch"] = batch

    return {k: v for k, v in result.items() if v is not None}
