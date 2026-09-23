from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import FHIRBundle, FHIRCodeableConcept, FHIRReference


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRInsurancePlanContactTelecom(BaseModel):
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None


class FHIRInsurancePlanContact(BaseModel):
    purpose: Optional[FHIRCodeableConcept] = None
    name: Optional[Dict[str, Any]] = None
    telecom: Optional[List[FHIRInsurancePlanContactTelecom]] = None
    address: Optional[Dict[str, Any]] = None


class FHIRInsurancePlanCoverageBenefitLimit(BaseModel):
    value: Optional[Dict[str, Any]] = None
    code: Optional[FHIRCodeableConcept] = None


class FHIRInsurancePlanCoverageBenefit(BaseModel):
    type: Optional[FHIRCodeableConcept] = None
    requirement: Optional[str] = None
    limit: Optional[List[FHIRInsurancePlanCoverageBenefitLimit]] = None


class FHIRInsurancePlanCoverage(BaseModel):
    type: Optional[FHIRCodeableConcept] = None
    network: Optional[List[FHIRReference]] = None
    benefit: Optional[List[FHIRInsurancePlanCoverageBenefit]] = None


class FHIRInsurancePlanPlanGeneralCost(BaseModel):
    type: Optional[FHIRCodeableConcept] = None
    groupSize: Optional[int] = None
    cost: Optional[Dict[str, Any]] = None
    comment: Optional[str] = None


class FHIRInsurancePlanPlanSCBenefitCost(BaseModel):
    type: Optional[FHIRCodeableConcept] = None
    applicability: Optional[FHIRCodeableConcept] = None
    qualifiers: Optional[List[FHIRCodeableConcept]] = None
    value: Optional[Dict[str, Any]] = None


class FHIRInsurancePlanPlanSCBenefit(BaseModel):
    type: Optional[FHIRCodeableConcept] = None
    cost: Optional[List[FHIRInsurancePlanPlanSCBenefitCost]] = None


class FHIRInsurancePlanPlanSpecificCost(BaseModel):
    category: Optional[FHIRCodeableConcept] = None
    benefit: Optional[List[FHIRInsurancePlanPlanSCBenefit]] = None


class FHIRInsurancePlanPlan(BaseModel):
    identifier: Optional[List[Dict[str, Any]]] = None
    type: Optional[FHIRCodeableConcept] = None
    coverageArea: Optional[List[FHIRReference]] = None
    network: Optional[List[FHIRReference]] = None
    generalCost: Optional[List[FHIRInsurancePlanPlanGeneralCost]] = None
    specificCost: Optional[List[FHIRInsurancePlanPlanSpecificCost]] = None


class FHIRInsurancePlanSchema(BaseModel):
    resourceType: str = Field("InsurancePlan", description="Always 'InsurancePlan'.")
    id: str
    identifier: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    type: Optional[List[FHIRCodeableConcept]] = None
    name: Optional[str] = None
    alias: Optional[List[str]] = None
    period: Optional[Dict[str, Any]] = None
    ownedBy: Optional[FHIRReference] = None
    administeredBy: Optional[FHIRReference] = None
    coverageArea: Optional[List[FHIRReference]] = None
    contact: Optional[List[FHIRInsurancePlanContact]] = None
    endpoint: Optional[List[FHIRReference]] = None
    network: Optional[List[FHIRReference]] = None
    coverage: Optional[List[FHIRInsurancePlanCoverage]] = None
    plan: Optional[List[FHIRInsurancePlanPlan]] = None

    model_config = ConfigDict(populate_by_name=True)


class FHIRInsurancePlanBundleEntry(BaseModel):
    resource: FHIRInsurancePlanSchema


class FHIRInsurancePlanBundle(FHIRBundle):
    entry: Optional[List[FHIRInsurancePlanBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainInsurancePlanIdentifier(BaseModel):
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


class PlainInsurancePlanType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainInsurancePlanAlias(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    alias: str


class PlainInsurancePlanRef(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainInsurancePlanContactTelecom(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None


class PlainInsurancePlanContact(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
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
    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_line: Optional[str] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    telecoms: Optional[List[PlainInsurancePlanContactTelecom]] = None


class PlainInsurancePlanCoverageBenefitLimit(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    value_value: Optional[float] = None
    value_comparator: Optional[str] = None
    value_unit: Optional[str] = None
    value_system: Optional[str] = None
    value_code: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None


class PlainInsurancePlanCoverageBenefit(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    requirement: Optional[str] = None
    limits: Optional[List[PlainInsurancePlanCoverageBenefitLimit]] = None


class PlainInsurancePlanCoverageNetwork(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainInsurancePlanCoverage(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    networks: Optional[List[PlainInsurancePlanCoverageNetwork]] = None
    benefits: Optional[List[PlainInsurancePlanCoverageBenefit]] = None


class PlainInsurancePlanPlanIdentifier(BaseModel):
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


class PlainInsurancePlanPlanGeneralCost(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    group_size: Optional[int] = None
    cost_value: Optional[float] = None
    cost_currency: Optional[str] = None
    comment: Optional[str] = None


class PlainInsurancePlanPlanSCBenefitCost(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    applicability_system: Optional[str] = None
    applicability_code: Optional[str] = None
    applicability_display: Optional[str] = None
    applicability_text: Optional[str] = None
    qualifiers_json: Optional[str] = None
    value_value: Optional[float] = None
    value_comparator: Optional[str] = None
    value_unit: Optional[str] = None
    value_system: Optional[str] = None
    value_code: Optional[str] = None


class PlainInsurancePlanPlanSCBenefit(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    costs: Optional[List[PlainInsurancePlanPlanSCBenefitCost]] = None


class PlainInsurancePlanPlanSpecificCost(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    sc_benefits: Optional[List[PlainInsurancePlanPlanSCBenefit]] = None


class PlainInsurancePlanPlan(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    plan_identifiers: Optional[List[PlainInsurancePlanPlanIdentifier]] = None
    plan_coverage_areas: Optional[List[PlainInsurancePlanRef]] = None
    plan_networks: Optional[List[PlainInsurancePlanRef]] = None
    general_costs: Optional[List[PlainInsurancePlanPlanGeneralCost]] = None
    specific_costs: Optional[List[PlainInsurancePlanPlanSpecificCost]] = None


class PlainInsurancePlanResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    status: Optional[str] = None
    name: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    owned_by_id: Optional[int] = None
    owned_by_display: Optional[str] = None
    administered_by_id: Optional[int] = None
    administered_by_display: Optional[str] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifiers: Optional[List[PlainInsurancePlanIdentifier]] = None
    types: Optional[List[PlainInsurancePlanType]] = None
    aliases: Optional[List[PlainInsurancePlanAlias]] = None
    coverage_areas: Optional[List[PlainInsurancePlanRef]] = None
    endpoints: Optional[List[PlainInsurancePlanRef]] = None
    networks: Optional[List[PlainInsurancePlanRef]] = None
    contacts: Optional[List[PlainInsurancePlanContact]] = None
    coverages: Optional[List[PlainInsurancePlanCoverage]] = None
    plans: Optional[List[PlainInsurancePlanPlan]] = None


class PaginatedInsurancePlanResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainInsurancePlanResponse]
