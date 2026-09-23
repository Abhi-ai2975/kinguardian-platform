from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRReference,
)


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRQuantity(BaseModel):
    value: Optional[Decimal] = None
    unit: Optional[str] = None
    system: Optional[str] = None
    code: Optional[str] = None


class FHIRRatio(BaseModel):
    numerator: Optional[FHIRQuantity] = None
    denominator: Optional[FHIRQuantity] = None


class FHIRMedicationIngredient(BaseModel):
    itemCodeableConcept: Optional[FHIRCodeableConcept] = None
    itemReference: Optional[FHIRReference] = None
    isActive: Optional[bool] = None
    strength: Optional[FHIRRatio] = None


class FHIRMedicationBatch(BaseModel):
    lotNumber: Optional[str] = None
    expirationDate: Optional[str] = None


class FHIRMedicationSchema(BaseModel):
    resourceType: str = Field("Medication", description="Always 'Medication'.")
    id: str = Field(..., description="Public medication_id as a string.")
    identifier: Optional[List[Dict[str, Any]]] = None
    code: Optional[FHIRCodeableConcept] = None
    status: Optional[str] = None
    manufacturer: Optional[FHIRReference] = None
    form: Optional[FHIRCodeableConcept] = None
    amount: Optional[FHIRRatio] = None
    ingredient: Optional[List[FHIRMedicationIngredient]] = None
    batch: Optional[FHIRMedicationBatch] = None

    model_config = ConfigDict(populate_by_name=True)


class FHIRMedicationBundleEntry(BaseModel):
    resource: FHIRMedicationSchema


class FHIRMedicationBundle(FHIRBundle):
    entry: Optional[List[FHIRMedicationBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainMedicationIdentifier(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    assigner: Optional[str] = None


class PlainMedicationIngredient(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    item_codeable_concept_system: Optional[str] = None
    item_codeable_concept_code: Optional[str] = None
    item_codeable_concept_display: Optional[str] = None
    item_codeable_concept_text: Optional[str] = None
    item_reference_type: Optional[str] = None
    item_reference_id: Optional[int] = None
    item_reference_display: Optional[str] = None
    is_active: Optional[bool] = None
    strength_numerator_value: Optional[Decimal] = None
    strength_numerator_unit: Optional[str] = None
    strength_numerator_system: Optional[str] = None
    strength_numerator_code: Optional[str] = None
    strength_denominator_value: Optional[Decimal] = None
    strength_denominator_unit: Optional[str] = None
    strength_denominator_system: Optional[str] = None
    strength_denominator_code: Optional[str] = None


class PlainMedicationResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    status: Optional[str] = None
    manufacturer_type: Optional[str] = None
    manufacturer_id: Optional[int] = None
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
    batch_expiration_date: Optional[str] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainMedicationIdentifier]] = None
    ingredient: Optional[List[PlainMedicationIngredient]] = None


class PaginatedMedicationResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainMedicationResponse]
