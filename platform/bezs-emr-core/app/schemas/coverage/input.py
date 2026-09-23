from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CoverageIdentifierInput(BaseModel):
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


class CoveragePayorInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Organization/190001'.")
    reference_display: Optional[str] = None


class CoverageClassInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    value: str = Field(..., description="Insurer-issued label for this class.")
    name: Optional[str] = None


class CoverageCostToBeneficiaryExceptionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class CoverageCostToBeneficiaryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    # value[x] — SimpleQuantity variant
    value_quantity_value: Optional[Decimal] = None
    value_quantity_unit: Optional[str] = None
    value_quantity_system: Optional[str] = None
    value_quantity_code: Optional[str] = None
    # value[x] — Money variant
    value_money_value: Optional[Decimal] = None
    value_money_currency: Optional[str] = None
    exceptions: Optional[List[CoverageCostToBeneficiaryExceptionInput]] = None


class CoverageContractInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR Contract reference, e.g. 'Contract/1'.")
    reference_display: Optional[str] = None


class CoverageCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "status": "active",
                    "beneficiary": "Patient/10001",
                    "beneficiary_display": "John Smith",
                    "payor": [
                        {
                            "reference": "Organization/190001",
                            "reference_display": "General Hospital Insurance",
                        }
                    ],
                    "type_system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                    "type_code": "EHCPOL",
                    "type_display": "Extended Healthcare",
                    "subscriber": "Patient/10001",
                    "subscriber_id_value": "SUB123456",
                    "period_start": "2024-01-01T00:00:00Z",
                    "period_end": "2024-12-31T23:59:59Z",
                    "classes": [
                        {
                            "type_code": "group",
                            "type_system": "http://terminology.hl7.org/CodeSystem/coverage-class",
                            "value": "CB135",
                            "name": "Corporate Baker's Inc. Plan",
                        }
                    ],
                }
            ]
        },
    )

    user_id: str
    org_id: str
    created_by: Optional[str] = None

    status: str = Field(..., description="active | cancelled | draft | entered-in-error")

    # type (0..1 CodeableConcept)
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    # policyHolder (0..1 Reference)
    policy_holder: Optional[str] = Field(None, description="Reference, e.g. 'Patient/10001'.")
    policy_holder_display: Optional[str] = None

    # subscriber (0..1 Reference)
    subscriber: Optional[str] = Field(None, description="Reference, e.g. 'Patient/10001'.")
    subscriber_display: Optional[str] = None

    # subscriberId (0..1 string)
    subscriber_id_value: Optional[str] = Field(None, description="Insurer-assigned subscriber ID.")

    # beneficiary (1..1 Reference(Patient)) — required
    beneficiary: str = Field(..., description="Reference to Patient, e.g. 'Patient/10001'.")
    beneficiary_display: Optional[str] = None

    dependent: Optional[str] = None

    # relationship (0..1 CodeableConcept)
    relationship_system: Optional[str] = None
    relationship_code: Optional[str] = None
    relationship_display: Optional[str] = None
    relationship_text: Optional[str] = None

    # period (0..1 Period)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

    # payor (1..*) — required, at least one
    payor: List[CoveragePayorInput] = Field(..., min_length=1, description="Plan underwriter(s). At least one required.")

    order: Optional[int] = Field(None, ge=1, description="Relative order of coverage (positiveInt).")
    network: Optional[str] = None
    subrogation: Optional[bool] = None

    identifiers: Optional[List[CoverageIdentifierInput]] = None
    classes: Optional[List[CoverageClassInput]] = None
    cost_to_beneficiary: Optional[List[CoverageCostToBeneficiaryInput]] = None
    contract: Optional[List[CoverageContractInput]] = None


class CoveragePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    policy_holder: Optional[str] = None
    policy_holder_display: Optional[str] = None

    subscriber: Optional[str] = None
    subscriber_display: Optional[str] = None
    subscriber_id_value: Optional[str] = None

    dependent: Optional[str] = None

    relationship_system: Optional[str] = None
    relationship_code: Optional[str] = None
    relationship_display: Optional[str] = None
    relationship_text: Optional[str] = None

    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

    order: Optional[int] = Field(None, ge=1)
    network: Optional[str] = None
    subrogation: Optional[bool] = None
    updated_by: Optional[str] = None
