from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.medication.medication import (
        MedicationIdentifier,
        MedicationIngredient,
        MedicationModel,
    )


def plain_medication_identifier(i: "MedicationIdentifier") -> dict:
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


def plain_medication_ingredient(ing: "MedicationIngredient") -> dict:
    ref_type = ing.item_reference_type.value if ing.item_reference_type and hasattr(ing.item_reference_type, "value") else ing.item_reference_type
    return {
        "id": ing.id,
        "item_codeable_concept_system": ing.item_codeable_concept_system,
        "item_codeable_concept_code": ing.item_codeable_concept_code,
        "item_codeable_concept_display": ing.item_codeable_concept_display,
        "item_codeable_concept_text": ing.item_codeable_concept_text,
        "item_reference_type": ref_type,
        "item_reference_id": ing.item_reference_id,
        "item_reference_display": ing.item_reference_display,
        "is_active": ing.is_active,
        "strength_numerator_value": float(ing.strength_numerator_value) if ing.strength_numerator_value is not None else None,
        "strength_numerator_unit": ing.strength_numerator_unit,
        "strength_numerator_system": ing.strength_numerator_system,
        "strength_numerator_code": ing.strength_numerator_code,
        "strength_denominator_value": float(ing.strength_denominator_value) if ing.strength_denominator_value is not None else None,
        "strength_denominator_unit": ing.strength_denominator_unit,
        "strength_denominator_system": ing.strength_denominator_system,
        "strength_denominator_code": ing.strength_denominator_code,
    }


def to_plain_medication(model: "MedicationModel") -> dict:
    status = model.status.value if model.status and hasattr(model.status, "value") else model.status
    mfr_type = model.manufacturer_type.value if model.manufacturer_type and hasattr(model.manufacturer_type, "value") else model.manufacturer_type

    result: dict = {
        "id": model.medication_id,
        "code_system": model.code_system,
        "code_code": model.code_code,
        "code_display": model.code_display,
        "code_text": model.code_text,
        "status": status,
        "manufacturer_type": mfr_type,
        "manufacturer_id": model.manufacturer_id,
        "manufacturer_display": model.manufacturer_display,
        "form_system": model.form_system,
        "form_code": model.form_code,
        "form_display": model.form_display,
        "form_text": model.form_text,
        "amount_numerator_value": float(model.amount_numerator_value) if model.amount_numerator_value is not None else None,
        "amount_numerator_unit": model.amount_numerator_unit,
        "amount_numerator_system": model.amount_numerator_system,
        "amount_numerator_code": model.amount_numerator_code,
        "amount_denominator_value": float(model.amount_denominator_value) if model.amount_denominator_value is not None else None,
        "amount_denominator_unit": model.amount_denominator_unit,
        "amount_denominator_system": model.amount_denominator_system,
        "amount_denominator_code": model.amount_denominator_code,
        "batch_lot_number": model.batch_lot_number,
        "batch_expiration_date": model.batch_expiration_date.isoformat() if model.batch_expiration_date else None,
        "user_id": model.user_id,
        "org_id": model.org_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
        "created_by": model.created_by,
        "updated_by": model.updated_by,
    }

    if model.identifiers:
        result["identifier"] = [plain_medication_identifier(i) for i in model.identifiers]
    if model.ingredients:
        result["ingredient"] = [plain_medication_ingredient(i) for i in model.ingredients]

    return {k: v for k, v in result.items() if v is not None}
