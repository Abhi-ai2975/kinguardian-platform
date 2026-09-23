from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Identifier sub-schema (reused for top-level and plan-level)
# ---------------------------------------------------------------------------


class InsurancePlanIdentifierInput(BaseModel):
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


# ---------------------------------------------------------------------------
# Type (CodeableConcept)
# ---------------------------------------------------------------------------


class InsurancePlanTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ---------------------------------------------------------------------------
# Contact sub-schemas
# ---------------------------------------------------------------------------


class InsurancePlanContactTelecomInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[str] = Field(None, description="phone | fax | email | pager | url | sms | other")
    value: Optional[str] = None
    use: Optional[str] = Field(None, description="home | work | temp | old | mobile")
    rank: Optional[int] = None


class InsurancePlanContactInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    purpose_system: Optional[str] = None
    purpose_code: Optional[str] = None
    purpose_display: Optional[str] = None
    purpose_text: Optional[str] = None
    name_use: Optional[str] = None
    name_text: Optional[str] = None
    name_family: Optional[str] = None
    name_given: Optional[str] = None
    name_prefix: Optional[str] = None
    name_suffix: Optional[str] = None
    telecoms: Optional[List[InsurancePlanContactTelecomInput]] = None
    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_line: Optional[str] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None


# ---------------------------------------------------------------------------
# Coverage sub-schemas
# ---------------------------------------------------------------------------


class InsurancePlanCoverageBenefitLimitInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value_value: Optional[Decimal] = None
    value_comparator: Optional[str] = None
    value_unit: Optional[str] = None
    value_system: Optional[str] = None
    value_code: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None


class InsurancePlanCoverageBenefitInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    requirement: Optional[str] = None
    limits: Optional[List[InsurancePlanCoverageBenefitLimitInput]] = None


class InsurancePlanCoverageInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    networks: Optional[List[str]] = Field(
        None, description="List of Organization references, e.g. ['Organization/190001']."
    )
    benefits: Optional[List[InsurancePlanCoverageBenefitInput]] = None


# ---------------------------------------------------------------------------
# Plan sub-schemas
# ---------------------------------------------------------------------------


class InsurancePlanPlanGeneralCostInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    group_size: Optional[int] = None
    cost_value: Optional[Decimal] = None
    cost_currency: Optional[str] = None
    comment: Optional[str] = None


class InsurancePlanPlanSCBenefitCostQualifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None
    text: Optional[str] = None


class InsurancePlanPlanSCBenefitCostInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    applicability_system: Optional[str] = None
    applicability_code: Optional[str] = None
    applicability_display: Optional[str] = None
    applicability_text: Optional[str] = None
    qualifiers: Optional[List[InsurancePlanPlanSCBenefitCostQualifierInput]] = None
    value_value: Optional[Decimal] = None
    value_comparator: Optional[str] = None
    value_unit: Optional[str] = None
    value_system: Optional[str] = None
    value_code: Optional[str] = None


class InsurancePlanPlanSCBenefitInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    costs: Optional[List[InsurancePlanPlanSCBenefitCostInput]] = None


class InsurancePlanPlanSpecificCostInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    benefits: Optional[List[InsurancePlanPlanSCBenefitInput]] = None


class InsurancePlanPlanInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    plan_identifiers: Optional[List[InsurancePlanIdentifierInput]] = None
    plan_coverage_areas: Optional[List[str]] = Field(
        None, description="List of Location references, e.g. ['Location/230001']."
    )
    plan_networks: Optional[List[str]] = Field(
        None, description="List of Organization references, e.g. ['Organization/190001']."
    )
    general_costs: Optional[List[InsurancePlanPlanGeneralCostInput]] = None
    specific_costs: Optional[List[InsurancePlanPlanSpecificCostInput]] = None


# ---------------------------------------------------------------------------
# Create / Patch schemas
# ---------------------------------------------------------------------------


class InsurancePlanCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "name": "Bronze PPO 2025",
                    "status": "active",
                    "types": [{"coding_system": "http://terminology.hl7.org/CodeSystem/insurance-plan-type", "coding_code": "PPO", "text": "Preferred Provider Organization"}],
                    "period_start": "2025-01-01T00:00:00Z",
                    "period_end": "2025-12-31T23:59:59Z",
                    "owned_by": "Organization/190001",
                    "administered_by": "Organization/190002",
                }
            ]
        },
    )

    user_id: str
    org_id: str
    created_by: Optional[str] = None

    status: Optional[str] = Field(None, description="draft | active | retired | unknown")
    name: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

    owned_by: Optional[str] = Field(None, description="Reference to owning Organization, e.g. 'Organization/190001'.")
    owned_by_display: Optional[str] = None
    administered_by: Optional[str] = Field(None, description="Reference to administering Organization, e.g. 'Organization/190001'.")
    administered_by_display: Optional[str] = None

    identifiers: Optional[List[InsurancePlanIdentifierInput]] = None
    types: Optional[List[InsurancePlanTypeInput]] = None
    aliases: Optional[List[str]] = Field(None, description="List of alternate names for this plan.")
    coverage_areas: Optional[List[str]] = Field(None, description="List of Location references, e.g. ['Location/230001'].")
    endpoints: Optional[List[str]] = Field(None, description="List of Endpoint references, e.g. ['Endpoint/1'].")
    networks: Optional[List[str]] = Field(None, description="List of Organization references for the network.")
    contacts: Optional[List[InsurancePlanContactInput]] = None
    coverages: Optional[List[InsurancePlanCoverageInput]] = None
    plans: Optional[List[InsurancePlanPlanInput]] = None


class InsurancePlanPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    updated_by: Optional[str] = None

    status: Optional[str] = Field(None, description="draft | active | retired | unknown")
    name: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

    owned_by: Optional[str] = None
    owned_by_display: Optional[str] = None
    administered_by: Optional[str] = None
    administered_by_display: Optional[str] = None

    identifiers: Optional[List[InsurancePlanIdentifierInput]] = None
    types: Optional[List[InsurancePlanTypeInput]] = None
    aliases: Optional[List[str]] = None
    coverage_areas: Optional[List[str]] = None
    endpoints: Optional[List[str]] = None
    networks: Optional[List[str]] = None
    contacts: Optional[List[InsurancePlanContactInput]] = None
    coverages: Optional[List[InsurancePlanCoverageInput]] = None
    plans: Optional[List[InsurancePlanPlanInput]] = None
