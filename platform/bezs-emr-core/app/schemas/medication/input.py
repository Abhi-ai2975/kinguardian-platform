from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class MedicationIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class MedicationIngredientInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # item[x] — CodeableConcept variant
    item_codeable_concept_system: Optional[str] = None
    item_codeable_concept_code: Optional[str] = None
    item_codeable_concept_display: Optional[str] = None
    item_codeable_concept_text: Optional[str] = None

    # item[x] — Reference(Substance | Medication) variant
    item_reference: Optional[str] = Field(
        None, description="FHIR reference, e.g. 'Substance/1' or 'Medication/250001'."
    )
    item_reference_display: Optional[str] = None

    is_active: Optional[bool] = None

    # strength (Ratio) — numerator
    strength_numerator_value: Optional[Decimal] = None
    strength_numerator_unit: Optional[str] = None
    strength_numerator_system: Optional[str] = None
    strength_numerator_code: Optional[str] = None

    # strength (Ratio) — denominator
    strength_denominator_value: Optional[Decimal] = None
    strength_denominator_unit: Optional[str] = None
    strength_denominator_system: Optional[str] = None
    strength_denominator_code: Optional[str] = None


class MedicationCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "code_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                    "code_code": "1049502",
                    "code_display": "12 HR Oxycodone Hydrochloride 80 MG Extended Release Oral Tablet",
                    "status": "active",
                    "manufacturer": "Organization/190001",
                    "manufacturer_display": "Purdue Pharma",
                    "form_system": "http://snomed.info/sct",
                    "form_code": "385055001",
                    "form_display": "Tablet",
                    "amount_numerator_value": "10",
                    "amount_numerator_unit": "mg",
                    "amount_denominator_value": "1",
                    "amount_denominator_unit": "tablet",
                    "batch_lot_number": "LOT-2024-001",
                    "batch_expiration_date": "2026-12-31T00:00:00Z",
                    "ingredients": [
                        {
                            "item_codeable_concept_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                            "item_codeable_concept_code": "7804",
                            "item_codeable_concept_display": "Oxycodone",
                            "is_active": True,
                            "strength_numerator_value": "80",
                            "strength_numerator_unit": "mg",
                            "strength_denominator_value": "1",
                            "strength_denominator_unit": "tablet",
                        }
                    ],
                }
            ]
        },
    )

    user_id: str
    org_id: str
    created_by: Optional[str] = None

    # code (0..1 CodeableConcept)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    # status (0..1 code)
    status: Optional[str] = Field(None, description="active | inactive | entered-in-error")

    # manufacturer (0..1 Reference(Organization))
    manufacturer: Optional[str] = Field(None, description="Reference, e.g. 'Organization/190001'.")
    manufacturer_display: Optional[str] = None

    # form (0..1 CodeableConcept)
    form_system: Optional[str] = None
    form_code: Optional[str] = None
    form_display: Optional[str] = None
    form_text: Optional[str] = None

    # amount (0..1 Ratio) — numerator
    amount_numerator_value: Optional[Decimal] = None
    amount_numerator_unit: Optional[str] = None
    amount_numerator_system: Optional[str] = None
    amount_numerator_code: Optional[str] = None

    # amount (0..1 Ratio) — denominator
    amount_denominator_value: Optional[Decimal] = None
    amount_denominator_unit: Optional[str] = None
    amount_denominator_system: Optional[str] = None
    amount_denominator_code: Optional[str] = None

    # batch (0..1 BackboneElement)
    batch_lot_number: Optional[str] = None
    batch_expiration_date: Optional[datetime] = None

    # child arrays
    identifiers: Optional[List[MedicationIdentifierInput]] = None
    ingredients: Optional[List[MedicationIngredientInput]] = None


class MedicationPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    status: Optional[str] = None

    manufacturer: Optional[str] = None
    manufacturer_display: Optional[str] = None

    form_system: Optional[str] = None
    form_code: Optional[str] = None
    form_display: Optional[str] = None
    form_text: Optional[str] = None

    amount_numerator_value: Optional[Decimal] = None
    amount_numerator_unit: Optional[str] = None
    amount_numerator_system: Optional[str] = None
    amount_numerator_code: Optional[str] = None

    amount_denominator_value: Optional[Decimal] = None
    amount_denominator_unit: Optional[str] = None
    amount_denominator_system: Optional[str] = None
    amount_denominator_code: Optional[str] = None

    batch_lot_number: Optional[str] = None
    batch_expiration_date: Optional[datetime] = None
    updated_by: Optional[str] = None
