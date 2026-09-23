from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRReference,
    FHIRAddress,
    FHIRPeriod,
)


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRClaimRelated(BaseModel):
    claim: Optional[FHIRReference] = None
    relationship: Optional[FHIRCodeableConcept] = None
    reference: Optional[FHIRIdentifier] = None


class FHIRClaimPayee(BaseModel):
    type: Optional[FHIRCodeableConcept] = None
    party: Optional[FHIRReference] = None


class FHIRClaimCareTeam(BaseModel):
    sequence: Optional[int] = None
    provider: Optional[FHIRReference] = None
    responsible: Optional[bool] = None
    role: Optional[FHIRCodeableConcept] = None
    qualification: Optional[FHIRCodeableConcept] = None


class FHIRClaimSupportingInfo(BaseModel):
    sequence: Optional[int] = None
    category: Optional[FHIRCodeableConcept] = None
    code: Optional[FHIRCodeableConcept] = None
    timingDate: Optional[str] = None
    timingPeriod: Optional[FHIRPeriod] = None
    valueBoolean: Optional[bool] = None
    valueString: Optional[str] = None
    valueQuantity: Optional[Dict[str, Any]] = None
    valueAttachment: Optional[Dict[str, Any]] = None
    valueReference: Optional[FHIRReference] = None
    reason: Optional[FHIRCodeableConcept] = None


class FHIRClaimDiagnosisType(BaseModel):
    coding: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None


class FHIRClaimDiagnosis(BaseModel):
    sequence: Optional[int] = None
    diagnosisCodeableConcept: Optional[FHIRCodeableConcept] = None
    diagnosisReference: Optional[FHIRReference] = None
    type: Optional[List[FHIRClaimDiagnosisType]] = None
    onAdmission: Optional[FHIRCodeableConcept] = None
    packageCode: Optional[FHIRCodeableConcept] = None


class FHIRClaimProcedureType(BaseModel):
    coding: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None


class FHIRClaimProcedure(BaseModel):
    sequence: Optional[int] = None
    date: Optional[str] = None
    procedureCodeableConcept: Optional[FHIRCodeableConcept] = None
    procedureReference: Optional[FHIRReference] = None
    type: Optional[List[FHIRClaimProcedureType]] = None
    udi: Optional[List[FHIRReference]] = None


class FHIRClaimInsurance(BaseModel):
    sequence: Optional[int] = None
    focal: Optional[bool] = None
    identifier: Optional[FHIRIdentifier] = None
    coverage: Optional[FHIRReference] = None
    businessArrangement: Optional[str] = None
    preAuthRef: Optional[List[str]] = None
    claimResponse: Optional[FHIRReference] = None


class FHIRClaimItemDetailSubDetail(BaseModel):
    sequence: Optional[int] = None
    revenue: Optional[FHIRCodeableConcept] = None
    category: Optional[FHIRCodeableConcept] = None
    productOrService: Optional[FHIRCodeableConcept] = None
    modifier: Optional[List[FHIRCodeableConcept]] = None
    programCode: Optional[List[FHIRCodeableConcept]] = None
    quantity: Optional[Dict[str, Any]] = None
    unitPrice: Optional[Dict[str, Any]] = None
    factor: Optional[Decimal] = None
    net: Optional[Dict[str, Any]] = None
    udi: Optional[List[FHIRReference]] = None


class FHIRClaimItemDetail(BaseModel):
    sequence: Optional[int] = None
    revenue: Optional[FHIRCodeableConcept] = None
    category: Optional[FHIRCodeableConcept] = None
    productOrService: Optional[FHIRCodeableConcept] = None
    modifier: Optional[List[FHIRCodeableConcept]] = None
    programCode: Optional[List[FHIRCodeableConcept]] = None
    quantity: Optional[Dict[str, Any]] = None
    unitPrice: Optional[Dict[str, Any]] = None
    factor: Optional[Decimal] = None
    net: Optional[Dict[str, Any]] = None
    udi: Optional[List[FHIRReference]] = None
    subDetail: Optional[List[FHIRClaimItemDetailSubDetail]] = None


class FHIRClaimItem(BaseModel):
    sequence: Optional[int] = None
    careTeamSequence: Optional[List[int]] = None
    diagnosisSequence: Optional[List[int]] = None
    procedureSequence: Optional[List[int]] = None
    informationSequence: Optional[List[int]] = None
    revenue: Optional[FHIRCodeableConcept] = None
    category: Optional[FHIRCodeableConcept] = None
    productOrService: Optional[FHIRCodeableConcept] = None
    modifier: Optional[List[FHIRCodeableConcept]] = None
    programCode: Optional[List[FHIRCodeableConcept]] = None
    servicedDate: Optional[str] = None
    servicedPeriod: Optional[FHIRPeriod] = None
    locationCodeableConcept: Optional[FHIRCodeableConcept] = None
    locationAddress: Optional[FHIRAddress] = None
    locationReference: Optional[FHIRReference] = None
    quantity: Optional[Dict[str, Any]] = None
    unitPrice: Optional[Dict[str, Any]] = None
    factor: Optional[Decimal] = None
    net: Optional[Dict[str, Any]] = None
    udi: Optional[List[FHIRReference]] = None
    bodySite: Optional[FHIRCodeableConcept] = None
    subSite: Optional[List[FHIRCodeableConcept]] = None
    encounter: Optional[List[FHIRReference]] = None
    detail: Optional[List[FHIRClaimItemDetail]] = None


class FHIRClaimAccident(BaseModel):
    date: Optional[str] = None
    type: Optional[FHIRCodeableConcept] = None
    locationAddress: Optional[FHIRAddress] = None
    locationReference: Optional[FHIRReference] = None


class FHIRClaimSchema(BaseModel):
    resourceType: str = Field("Claim", description="Always 'Claim'.")
    id: str = Field(..., description="Public claim_id as a string.")
    identifier: Optional[List[FHIRIdentifier]] = None
    status: Optional[str] = None
    type: Optional[FHIRCodeableConcept] = None
    subType: Optional[FHIRCodeableConcept] = None
    use: Optional[str] = None
    patient: Optional[FHIRReference] = None
    billablePeriod: Optional[FHIRPeriod] = None
    created: Optional[str] = None
    enterer: Optional[FHIRReference] = None
    insurer: Optional[FHIRReference] = None
    provider: Optional[FHIRReference] = None
    priority: Optional[FHIRCodeableConcept] = None
    fundsReserve: Optional[FHIRCodeableConcept] = None
    related: Optional[List[FHIRClaimRelated]] = None
    prescription: Optional[FHIRReference] = None
    originalPrescription: Optional[FHIRReference] = None
    payee: Optional[FHIRClaimPayee] = None
    referral: Optional[FHIRReference] = None
    facility: Optional[FHIRReference] = None
    careTeam: Optional[List[FHIRClaimCareTeam]] = None
    supportingInfo: Optional[List[FHIRClaimSupportingInfo]] = None
    diagnosis: Optional[List[FHIRClaimDiagnosis]] = None
    procedure: Optional[List[FHIRClaimProcedure]] = None
    insurance: Optional[List[FHIRClaimInsurance]] = None
    accident: Optional[FHIRClaimAccident] = None
    item: Optional[List[FHIRClaimItem]] = None
    total: Optional[Dict[str, Any]] = None


class FHIRClaimBundleEntry(BaseModel):
    resource: FHIRClaimSchema


class FHIRClaimBundle(FHIRBundle):
    entry: Optional[List[FHIRClaimBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainClaimIdentifier(BaseModel):
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


class PlainClaimRelated(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    related_claim_type: Optional[str] = None
    related_claim_id: Optional[int] = None
    related_claim_display: Optional[str] = None
    relationship_system: Optional[str] = None
    relationship_code: Optional[str] = None
    relationship_display: Optional[str] = None
    relationship_text: Optional[str] = None
    reference_use: Optional[str] = None
    reference_type_system: Optional[str] = None
    reference_type_code: Optional[str] = None
    reference_type_display: Optional[str] = None
    reference_type_text: Optional[str] = None
    reference_system: Optional[str] = None
    reference_value: Optional[str] = None
    reference_period_start: Optional[str] = None
    reference_period_end: Optional[str] = None
    reference_assigner: Optional[str] = None


class PlainClaimCareTeam(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    provider_type: Optional[str] = None
    provider_id: Optional[int] = None
    provider_display: Optional[str] = None
    responsible: Optional[bool] = None
    role_system: Optional[str] = None
    role_code: Optional[str] = None
    role_display: Optional[str] = None
    role_text: Optional[str] = None
    qualification_system: Optional[str] = None
    qualification_code: Optional[str] = None
    qualification_display: Optional[str] = None
    qualification_text: Optional[str] = None


class PlainClaimSupportingInfo(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    timing_date: Optional[str] = None
    timing_period_start: Optional[str] = None
    timing_period_end: Optional[str] = None
    value_boolean: Optional[bool] = None
    value_string: Optional[str] = None
    value_quantity_value: Optional[Decimal] = None
    value_quantity_comparator: Optional[str] = None
    value_quantity_unit: Optional[str] = None
    value_quantity_system: Optional[str] = None
    value_quantity_code: Optional[str] = None
    value_attachment_content_type: Optional[str] = None
    value_attachment_language: Optional[str] = None
    value_attachment_data: Optional[str] = None
    value_attachment_url: Optional[str] = None
    value_attachment_size: Optional[int] = None
    value_attachment_hash: Optional[str] = None
    value_attachment_title: Optional[str] = None
    value_attachment_creation: Optional[str] = None
    value_reference_type: Optional[str] = None
    value_reference_id: Optional[int] = None
    value_reference_display: Optional[str] = None
    reason_system: Optional[str] = None
    reason_code: Optional[str] = None
    reason_display: Optional[str] = None
    reason_text: Optional[str] = None


class PlainClaimDiagnosisType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimDiagnosis(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    diagnosis_codeable_concept_system: Optional[str] = None
    diagnosis_codeable_concept_code: Optional[str] = None
    diagnosis_codeable_concept_display: Optional[str] = None
    diagnosis_codeable_concept_text: Optional[str] = None
    diagnosis_reference_type: Optional[str] = None
    diagnosis_reference_id: Optional[int] = None
    diagnosis_reference_display: Optional[str] = None
    on_admission_system: Optional[str] = None
    on_admission_code: Optional[str] = None
    on_admission_display: Optional[str] = None
    on_admission_text: Optional[str] = None
    package_code_system: Optional[str] = None
    package_code_code: Optional[str] = None
    package_code_display: Optional[str] = None
    package_code_text: Optional[str] = None
    types: Optional[List[PlainClaimDiagnosisType]] = None


class PlainClaimProcedureType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimProcedureUdi(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainClaimProcedure(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    date: Optional[str] = None
    procedure_codeable_concept_system: Optional[str] = None
    procedure_codeable_concept_code: Optional[str] = None
    procedure_codeable_concept_display: Optional[str] = None
    procedure_codeable_concept_text: Optional[str] = None
    procedure_reference_type: Optional[str] = None
    procedure_reference_id: Optional[int] = None
    procedure_reference_display: Optional[str] = None
    types: Optional[List[PlainClaimProcedureType]] = None
    udi: Optional[List[PlainClaimProcedureUdi]] = None


class PlainClaimInsurancePreAuthRef(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    value: Optional[str] = None


class PlainClaimInsurance(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    focal: Optional[bool] = None
    identifier_use: Optional[str] = None
    identifier_type_system: Optional[str] = None
    identifier_type_code: Optional[str] = None
    identifier_type_display: Optional[str] = None
    identifier_type_text: Optional[str] = None
    identifier_system: Optional[str] = None
    identifier_value: Optional[str] = None
    identifier_period_start: Optional[str] = None
    identifier_period_end: Optional[str] = None
    identifier_assigner: Optional[str] = None
    coverage_type: Optional[str] = None
    coverage_id: Optional[int] = None
    coverage_display: Optional[str] = None
    business_arrangement: Optional[str] = None
    claim_response_type: Optional[str] = None
    claim_response_id: Optional[int] = None
    claim_response_display: Optional[str] = None
    pre_auth_refs: Optional[List[PlainClaimInsurancePreAuthRef]] = None


class PlainClaimItemModifier(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimItemProgramCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimItemUdi(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainClaimItemSubSite(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimItemEncounter(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    encounter_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainClaimItemDetailSubDetailModifier(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimItemDetailSubDetailProgramCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimItemDetailSubDetailUdi(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainClaimItemDetailSubDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    revenue_system: Optional[str] = None
    revenue_code: Optional[str] = None
    revenue_display: Optional[str] = None
    revenue_text: Optional[str] = None
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None
    quantity_value: Optional[Decimal] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    unit_price_value: Optional[Decimal] = None
    unit_price_currency: Optional[str] = None
    factor: Optional[Decimal] = None
    net_value: Optional[Decimal] = None
    net_currency: Optional[str] = None
    modifiers: Optional[List[PlainClaimItemDetailSubDetailModifier]] = None
    program_codes: Optional[List[PlainClaimItemDetailSubDetailProgramCode]] = None
    udi: Optional[List[PlainClaimItemDetailSubDetailUdi]] = None


class PlainClaimItemDetailModifier(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimItemDetailProgramCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainClaimItemDetailUdi(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainClaimItemDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    revenue_system: Optional[str] = None
    revenue_code: Optional[str] = None
    revenue_display: Optional[str] = None
    revenue_text: Optional[str] = None
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None
    quantity_value: Optional[Decimal] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    unit_price_value: Optional[Decimal] = None
    unit_price_currency: Optional[str] = None
    factor: Optional[Decimal] = None
    net_value: Optional[Decimal] = None
    net_currency: Optional[str] = None
    modifiers: Optional[List[PlainClaimItemDetailModifier]] = None
    program_codes: Optional[List[PlainClaimItemDetailProgramCode]] = None
    udi: Optional[List[PlainClaimItemDetailUdi]] = None
    sub_details: Optional[List[PlainClaimItemDetailSubDetail]] = None


class PlainClaimItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    care_team_sequence: Optional[str] = None
    diagnosis_sequence: Optional[str] = None
    procedure_sequence: Optional[str] = None
    information_sequence: Optional[str] = None
    revenue_system: Optional[str] = None
    revenue_code: Optional[str] = None
    revenue_display: Optional[str] = None
    revenue_text: Optional[str] = None
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None
    serviced_date: Optional[str] = None
    serviced_period_start: Optional[str] = None
    serviced_period_end: Optional[str] = None
    location_codeable_concept_system: Optional[str] = None
    location_codeable_concept_code: Optional[str] = None
    location_codeable_concept_display: Optional[str] = None
    location_codeable_concept_text: Optional[str] = None
    location_address_use: Optional[str] = None
    location_address_type: Optional[str] = None
    location_address_text: Optional[str] = None
    location_address_line: Optional[str] = None
    location_address_city: Optional[str] = None
    location_address_district: Optional[str] = None
    location_address_state: Optional[str] = None
    location_address_postal_code: Optional[str] = None
    location_address_country: Optional[str] = None
    location_address_period_start: Optional[str] = None
    location_address_period_end: Optional[str] = None
    location_reference_type: Optional[str] = None
    location_reference_id: Optional[int] = None
    location_reference_display: Optional[str] = None
    quantity_value: Optional[Decimal] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    unit_price_value: Optional[Decimal] = None
    unit_price_currency: Optional[str] = None
    factor: Optional[Decimal] = None
    net_value: Optional[Decimal] = None
    net_currency: Optional[str] = None
    body_site_system: Optional[str] = None
    body_site_code: Optional[str] = None
    body_site_display: Optional[str] = None
    body_site_text: Optional[str] = None
    modifiers: Optional[List[PlainClaimItemModifier]] = None
    program_codes: Optional[List[PlainClaimItemProgramCode]] = None
    udi: Optional[List[PlainClaimItemUdi]] = None
    sub_sites: Optional[List[PlainClaimItemSubSite]] = None
    encounters: Optional[List[PlainClaimItemEncounter]] = None
    details: Optional[List[PlainClaimItemDetail]] = None


class PlainClaimResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    status: Optional[str] = None
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    sub_type_system: Optional[str] = None
    sub_type_code: Optional[str] = None
    sub_type_display: Optional[str] = None
    sub_type_text: Optional[str] = None
    patient_type: Optional[str] = None
    patient_id: Optional[int] = None
    patient_display: Optional[str] = None
    billable_period_start: Optional[str] = None
    billable_period_end: Optional[str] = None
    created: Optional[str] = None
    enterer_type: Optional[str] = None
    enterer_id: Optional[int] = None
    enterer_display: Optional[str] = None
    insurer_type: Optional[str] = None
    insurer_id: Optional[int] = None
    insurer_display: Optional[str] = None
    provider_type: Optional[str] = None
    provider_id: Optional[int] = None
    provider_display: Optional[str] = None
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None
    funds_reserve_system: Optional[str] = None
    funds_reserve_code: Optional[str] = None
    funds_reserve_display: Optional[str] = None
    funds_reserve_text: Optional[str] = None
    prescription_type: Optional[str] = None
    prescription_id: Optional[int] = None
    prescription_display: Optional[str] = None
    original_prescription_type: Optional[str] = None
    original_prescription_id: Optional[int] = None
    original_prescription_display: Optional[str] = None
    payee_type_system: Optional[str] = None
    payee_type_code: Optional[str] = None
    payee_type_display: Optional[str] = None
    payee_type_text: Optional[str] = None
    payee_party_type: Optional[str] = None
    payee_party_id: Optional[int] = None
    payee_party_display: Optional[str] = None
    referral_type: Optional[str] = None
    referral_id: Optional[int] = None
    referral_display: Optional[str] = None
    facility_type: Optional[str] = None
    facility_id: Optional[int] = None
    facility_display: Optional[str] = None
    accident_date: Optional[str] = None
    accident_type_system: Optional[str] = None
    accident_type_code: Optional[str] = None
    accident_type_display: Optional[str] = None
    accident_type_text: Optional[str] = None
    accident_location_address_use: Optional[str] = None
    accident_location_address_type: Optional[str] = None
    accident_location_address_text: Optional[str] = None
    accident_location_address_line: Optional[str] = None
    accident_location_address_city: Optional[str] = None
    accident_location_address_district: Optional[str] = None
    accident_location_address_state: Optional[str] = None
    accident_location_address_postal_code: Optional[str] = None
    accident_location_address_country: Optional[str] = None
    accident_location_address_period_start: Optional[str] = None
    accident_location_address_period_end: Optional[str] = None
    accident_location_reference_type: Optional[str] = None
    accident_location_reference_id: Optional[int] = None
    accident_location_reference_display: Optional[str] = None
    total_value: Optional[Decimal] = None
    total_currency: Optional[str] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifiers: Optional[List[PlainClaimIdentifier]] = None
    related: Optional[List[PlainClaimRelated]] = None
    care_team: Optional[List[PlainClaimCareTeam]] = None
    supporting_info: Optional[List[PlainClaimSupportingInfo]] = None
    diagnoses: Optional[List[PlainClaimDiagnosis]] = None
    procedures: Optional[List[PlainClaimProcedure]] = None
    insurance: Optional[List[PlainClaimInsurance]] = None
    items: Optional[List[PlainClaimItem]] = None


class PaginatedClaimResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainClaimResponse]
