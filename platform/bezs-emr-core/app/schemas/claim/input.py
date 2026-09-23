from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Shared CodeableConcept-style sub-schemas
# ---------------------------------------------------------------------------


class ClaimCodeableConceptInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None
    text: Optional[str] = None


# ---------------------------------------------------------------------------
# Identifier
# ---------------------------------------------------------------------------


class ClaimIdentifierInput(BaseModel):
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
# Related
# ---------------------------------------------------------------------------


class ClaimRelatedInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # claim reference
    related_claim_type: Optional[str] = None
    related_claim_id: Optional[int] = None
    related_claim_display: Optional[str] = None
    # relationship CC
    relationship_system: Optional[str] = None
    relationship_code: Optional[str] = None
    relationship_display: Optional[str] = None
    relationship_text: Optional[str] = None
    # reference Identifier
    reference_use: Optional[str] = None
    reference_type_system: Optional[str] = None
    reference_type_code: Optional[str] = None
    reference_type_display: Optional[str] = None
    reference_type_text: Optional[str] = None
    reference_system: Optional[str] = None
    reference_value: Optional[str] = None
    reference_period_start: Optional[datetime] = None
    reference_period_end: Optional[datetime] = None
    reference_assigner: Optional[str] = None


# ---------------------------------------------------------------------------
# CareTeam
# ---------------------------------------------------------------------------


class ClaimCareTeamInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: int = Field(..., description="Sequence number for this care team member.")
    provider: str = Field(..., description="Provider reference, e.g. 'Practitioner/30001'.")
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


# ---------------------------------------------------------------------------
# SupportingInfo
# ---------------------------------------------------------------------------


class ClaimSupportingInfoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: int = Field(..., description="Sequence number for this supporting info entry.")
    # category (1..1)
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    # code
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    # timing
    timing_date: Optional[date] = None
    timing_period_start: Optional[datetime] = None
    timing_period_end: Optional[datetime] = None
    # value[x]
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
    value_attachment_creation: Optional[datetime] = None
    value_reference_type: Optional[str] = None
    value_reference_id: Optional[int] = None
    value_reference_display: Optional[str] = None
    # reason
    reason_system: Optional[str] = None
    reason_code: Optional[str] = None
    reason_display: Optional[str] = None
    reason_text: Optional[str] = None


# ---------------------------------------------------------------------------
# Diagnosis
# ---------------------------------------------------------------------------


class ClaimDiagnosisTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimDiagnosisInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: int = Field(..., description="Sequence number for this diagnosis.")
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
    types: Optional[List[ClaimDiagnosisTypeInput]] = None


# ---------------------------------------------------------------------------
# Procedure
# ---------------------------------------------------------------------------


class ClaimProcedureTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimProcedureUdiInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class ClaimProcedureInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: int = Field(..., description="Sequence number for this procedure.")
    date: Optional[datetime] = None
    procedure_codeable_concept_system: Optional[str] = None
    procedure_codeable_concept_code: Optional[str] = None
    procedure_codeable_concept_display: Optional[str] = None
    procedure_codeable_concept_text: Optional[str] = None
    procedure_reference_type: Optional[str] = None
    procedure_reference_id: Optional[int] = None
    procedure_reference_display: Optional[str] = None
    types: Optional[List[ClaimProcedureTypeInput]] = None
    udi: Optional[List[ClaimProcedureUdiInput]] = None


# ---------------------------------------------------------------------------
# Insurance
# ---------------------------------------------------------------------------


class ClaimInsurancePreAuthRefInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: str = Field(..., description="Pre-authorization reference string.")


class ClaimInsuranceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: int = Field(..., description="Sequence number for this insurance entry.")
    focal: bool = Field(..., description="Whether this is the focal coverage.")
    coverage: str = Field(..., description="Coverage reference, e.g. 'Coverage/12345'.")
    coverage_display: Optional[str] = None
    # identifier (flattened)
    identifier_use: Optional[str] = None
    identifier_type_system: Optional[str] = None
    identifier_type_code: Optional[str] = None
    identifier_type_display: Optional[str] = None
    identifier_type_text: Optional[str] = None
    identifier_system: Optional[str] = None
    identifier_value: Optional[str] = None
    identifier_period_start: Optional[datetime] = None
    identifier_period_end: Optional[datetime] = None
    identifier_assigner: Optional[str] = None
    business_arrangement: Optional[str] = None
    # claimResponse reference
    claim_response_type: Optional[str] = None
    claim_response_id: Optional[int] = None
    claim_response_display: Optional[str] = None
    pre_auth_refs: Optional[List[ClaimInsurancePreAuthRefInput]] = None


# ---------------------------------------------------------------------------
# Item detail sub-detail children
# ---------------------------------------------------------------------------


class ClaimItemDetailSubDetailModifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimItemDetailSubDetailProgramCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimItemDetailSubDetailUdiInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class ClaimItemDetailSubDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: int = Field(..., description="Sequence number for this sub-detail.")
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
    modifiers: Optional[List[ClaimItemDetailSubDetailModifierInput]] = None
    program_codes: Optional[List[ClaimItemDetailSubDetailProgramCodeInput]] = None
    udi: Optional[List[ClaimItemDetailSubDetailUdiInput]] = None


# ---------------------------------------------------------------------------
# Item detail children
# ---------------------------------------------------------------------------


class ClaimItemDetailModifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimItemDetailProgramCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimItemDetailUdiInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class ClaimItemDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: int = Field(..., description="Sequence number for this detail.")
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
    modifiers: Optional[List[ClaimItemDetailModifierInput]] = None
    program_codes: Optional[List[ClaimItemDetailProgramCodeInput]] = None
    udi: Optional[List[ClaimItemDetailUdiInput]] = None
    sub_details: Optional[List[ClaimItemDetailSubDetailInput]] = None


# ---------------------------------------------------------------------------
# Item children
# ---------------------------------------------------------------------------


class ClaimItemModifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimItemProgramCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimItemUdiInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class ClaimItemSubSiteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimItemEncounterInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_type: Optional[str] = None
    reference_id: Optional[int] = Field(None, description="Public encounter_id of the referenced Encounter.")
    reference_display: Optional[str] = None


class ClaimItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: int = Field(..., description="Sequence number for this item.")
    # cross-reference sequences (stored comma-separated)
    care_team_sequence: Optional[List[int]] = None
    diagnosis_sequence: Optional[List[int]] = None
    procedure_sequence: Optional[List[int]] = None
    information_sequence: Optional[List[int]] = None
    # revenue CC
    revenue_system: Optional[str] = None
    revenue_code: Optional[str] = None
    revenue_display: Optional[str] = None
    revenue_text: Optional[str] = None
    # category CC
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    # productOrService CC (1..1)
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None
    # serviced[x]
    serviced_date: Optional[date] = None
    serviced_period_start: Optional[datetime] = None
    serviced_period_end: Optional[datetime] = None
    # location[x] CC
    location_codeable_concept_system: Optional[str] = None
    location_codeable_concept_code: Optional[str] = None
    location_codeable_concept_display: Optional[str] = None
    location_codeable_concept_text: Optional[str] = None
    # location[x] Address
    location_address_use: Optional[str] = None
    location_address_type: Optional[str] = None
    location_address_text: Optional[str] = None
    location_address_line: Optional[str] = None
    location_address_city: Optional[str] = None
    location_address_district: Optional[str] = None
    location_address_state: Optional[str] = None
    location_address_postal_code: Optional[str] = None
    location_address_country: Optional[str] = None
    location_address_period_start: Optional[datetime] = None
    location_address_period_end: Optional[datetime] = None
    # location[x] Reference
    location_reference_type: Optional[str] = None
    location_reference_id: Optional[int] = None
    location_reference_display: Optional[str] = None
    # quantity
    quantity_value: Optional[Decimal] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    # unitPrice
    unit_price_value: Optional[Decimal] = None
    unit_price_currency: Optional[str] = None
    factor: Optional[Decimal] = None
    # net
    net_value: Optional[Decimal] = None
    net_currency: Optional[str] = None
    # bodySite CC
    body_site_system: Optional[str] = None
    body_site_code: Optional[str] = None
    body_site_display: Optional[str] = None
    body_site_text: Optional[str] = None
    # children
    modifiers: Optional[List[ClaimItemModifierInput]] = None
    program_codes: Optional[List[ClaimItemProgramCodeInput]] = None
    udi: Optional[List[ClaimItemUdiInput]] = None
    sub_sites: Optional[List[ClaimItemSubSiteInput]] = None
    encounters: Optional[List[ClaimItemEncounterInput]] = None
    details: Optional[List[ClaimItemDetailInput]] = None


# ---------------------------------------------------------------------------
# Top-level Create / Patch schemas
# ---------------------------------------------------------------------------


class ClaimCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "status": "active",
                "use": "claim",
                "type_system": "http://terminology.hl7.org/CodeSystem/claim-type",
                "type_code": "professional",
                "type_display": "Professional",
                "type_text": None,
                "priority_system": "http://terminology.hl7.org/CodeSystem/processpriority",
                "priority_code": "normal",
                "priority_display": "Normal",
                "created": "2024-06-01T09:00:00Z",
                "patient": "Patient/10001",
                "provider": "Practitioner/30001",
                "insurance": [
                    {
                        "sequence": 1,
                        "focal": True,
                        "coverage": "Coverage/99001",
                    }
                ],
            }
        },
    )

    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")
    created_by: Optional[str] = None

    # Required scalars
    status: str = Field(..., description="Claim status: active | cancelled | draft | entered-in-error.")
    use: str = Field(..., description="Claim use: claim | preauthorization | predetermination.")
    created: datetime = Field(..., description="Date/time when the claim was created.")

    # type CC (1..1)
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    # subType CC (0..1)
    sub_type_system: Optional[str] = None
    sub_type_code: Optional[str] = None
    sub_type_display: Optional[str] = None
    sub_type_text: Optional[str] = None

    # patient (1..1)
    patient: str = Field(..., description="Patient reference, e.g. 'Patient/10001'.")
    patient_display: Optional[str] = None

    # billablePeriod
    billable_period_start: Optional[datetime] = None
    billable_period_end: Optional[datetime] = None

    # enterer (0..1)
    enterer: Optional[str] = Field(None, description="Enterer reference, e.g. 'Practitioner/30001'.")
    enterer_display: Optional[str] = None

    # insurer (0..1)
    insurer: Optional[str] = Field(None, description="Insurer reference, e.g. 'Organization/190001'.")
    insurer_display: Optional[str] = None

    # provider (1..1)
    provider: str = Field(..., description="Provider reference, e.g. 'Practitioner/30001'.")
    provider_display: Optional[str] = None

    # priority CC (1..1)
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None

    # fundsReserve CC (0..1)
    funds_reserve_system: Optional[str] = None
    funds_reserve_code: Optional[str] = None
    funds_reserve_display: Optional[str] = None
    funds_reserve_text: Optional[str] = None

    # prescription (0..1)
    prescription: Optional[str] = Field(None, description="Prescription reference.")
    prescription_display: Optional[str] = None

    # originalPrescription (0..1)
    original_prescription: Optional[str] = Field(None, description="Original prescription reference.")
    original_prescription_display: Optional[str] = None

    # payee (flattened)
    payee_type_system: Optional[str] = None
    payee_type_code: Optional[str] = None
    payee_type_display: Optional[str] = None
    payee_type_text: Optional[str] = None
    payee_party: Optional[str] = Field(None, description="Payee party reference.")
    payee_party_display: Optional[str] = None

    # referral (0..1)
    referral: Optional[str] = Field(None, description="Referral reference, e.g. 'ServiceRequest/80001'.")
    referral_display: Optional[str] = None

    # facility (0..1)
    facility: Optional[str] = Field(None, description="Facility reference, e.g. 'Location/12345'.")
    facility_display: Optional[str] = None

    # accident (flattened)
    accident_date: Optional[date] = None
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
    accident_location_address_period_start: Optional[datetime] = None
    accident_location_address_period_end: Optional[datetime] = None
    accident_location_reference_type: Optional[str] = None
    accident_location_reference_id: Optional[int] = None
    accident_location_reference_display: Optional[str] = None

    # total
    total_value: Optional[Decimal] = None
    total_currency: Optional[str] = None

    # Child arrays
    identifiers: Optional[List[ClaimIdentifierInput]] = None
    related: Optional[List[ClaimRelatedInput]] = None
    care_team: Optional[List[ClaimCareTeamInput]] = None
    supporting_info: Optional[List[ClaimSupportingInfoInput]] = None
    diagnoses: Optional[List[ClaimDiagnosisInput]] = None
    procedures: Optional[List[ClaimProcedureInput]] = None
    insurance: List[ClaimInsuranceInput] = Field(..., description="Insurance coverage (1..*).")
    items: Optional[List[ClaimItemInput]] = None


class ClaimPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    use: Optional[str] = None
    created: Optional[datetime] = None

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    sub_type_system: Optional[str] = None
    sub_type_code: Optional[str] = None
    sub_type_display: Optional[str] = None
    sub_type_text: Optional[str] = None

    billable_period_start: Optional[datetime] = None
    billable_period_end: Optional[datetime] = None

    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None

    funds_reserve_system: Optional[str] = None
    funds_reserve_code: Optional[str] = None
    funds_reserve_display: Optional[str] = None
    funds_reserve_text: Optional[str] = None

    payee_type_system: Optional[str] = None
    payee_type_code: Optional[str] = None
    payee_type_display: Optional[str] = None
    payee_type_text: Optional[str] = None

    accident_date: Optional[date] = None
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
    accident_location_address_period_start: Optional[datetime] = None
    accident_location_address_period_end: Optional[datetime] = None

    total_value: Optional[Decimal] = None
    total_currency: Optional[str] = None

    patient_display: Optional[str] = None
    enterer_display: Optional[str] = None
    insurer_display: Optional[str] = None
    provider_display: Optional[str] = None
    prescription_display: Optional[str] = None
    original_prescription_display: Optional[str] = None
    payee_party_display: Optional[str] = None
    referral_display: Optional[str] = None
    facility_display: Optional[str] = None
    updated_by: Optional[str] = None
