from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Shared adjudication sub-schema (reused across item, detail, sub-detail,
# add-item, add-item-detail, add-item-detail-sub-detail, and header level)
# ---------------------------------------------------------------------------


class ClaimResponseAdjudicationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # category (1..1) CodeableConcept
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None

    # reason (0..1) CodeableConcept
    reason_system: Optional[str] = None
    reason_code: Optional[str] = None
    reason_display: Optional[str] = None
    reason_text: Optional[str] = None

    # amount (0..1) Money
    amount_value: Optional[float] = None
    amount_currency: Optional[str] = None

    # value (0..1) decimal
    adj_value: Optional[float] = None


# ---------------------------------------------------------------------------
# item (0..*)
# ---------------------------------------------------------------------------


class ClaimResponseItemDetailSubDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sub_detail_sequence: int = Field(..., description="1-based positiveInt for the subDetail.")
    note_number: Optional[List[int]] = Field(
        None, description="Applicable note numbers (stored comma-separated)."
    )
    adjudications: Optional[List[ClaimResponseAdjudicationInput]] = None


class ClaimResponseItemDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detail_sequence: int = Field(..., description="1-based positiveInt for the detail.")
    note_number: Optional[List[int]] = Field(
        None, description="Applicable note numbers (stored comma-separated)."
    )
    adjudications: Optional[List[ClaimResponseAdjudicationInput]] = None
    sub_details: Optional[List[ClaimResponseItemDetailSubDetailInput]] = None


class ClaimResponseItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_sequence: int = Field(..., description="1-based positiveInt for the item.")
    note_number: Optional[List[int]] = Field(
        None, description="Applicable note numbers (stored comma-separated)."
    )
    adjudications: Optional[List[ClaimResponseAdjudicationInput]] = None
    details: Optional[List[ClaimResponseItemDetailInput]] = None


# ---------------------------------------------------------------------------
# addItem (0..*)
# ---------------------------------------------------------------------------


class ClaimResponseAddItemProviderInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description=(
            "Reference to a provider, e.g. 'Practitioner/30001', "
            "'PractitionerRole/140001', or 'Organization/190001'."
        ),
    )
    reference_display: Optional[str] = None


class ClaimResponseAddItemModifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimResponseAddItemProgramCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimResponseAddItemSubSiteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ClaimResponseAddItemDetailSubDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # productOrService (1..1) CodeableConcept
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None

    # quantity (0..1)
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None

    # unitPrice (0..1) Money
    unit_price_value: Optional[float] = None
    unit_price_currency: Optional[str] = None

    factor: Optional[float] = None

    # net (0..1) Money
    net_value: Optional[float] = None
    net_currency: Optional[str] = None

    note_number: Optional[List[int]] = Field(
        None, description="Applicable note numbers (stored comma-separated)."
    )

    modifiers: Optional[List[ClaimResponseAddItemModifierInput]] = None
    adjudications: Optional[List[ClaimResponseAdjudicationInput]] = None


class ClaimResponseAddItemDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # productOrService (1..1) CodeableConcept
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None

    # quantity (0..1)
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None

    # unitPrice (0..1) Money
    unit_price_value: Optional[float] = None
    unit_price_currency: Optional[str] = None

    factor: Optional[float] = None

    # net (0..1) Money
    net_value: Optional[float] = None
    net_currency: Optional[str] = None

    note_number: Optional[List[int]] = Field(
        None, description="Applicable note numbers (stored comma-separated)."
    )

    modifiers: Optional[List[ClaimResponseAddItemModifierInput]] = None
    adjudications: Optional[List[ClaimResponseAdjudicationInput]] = None
    sub_details: Optional[List[ClaimResponseAddItemDetailSubDetailInput]] = None


class ClaimResponseAddItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # cross-reference sequences (0..* positiveInt each)
    item_sequence: Optional[List[int]] = Field(
        None, description="Item sequence numbers this addItem applies to (stored comma-separated)."
    )
    detail_sequence: Optional[List[int]] = Field(
        None, description="Detail sequence numbers this addItem applies to (stored comma-separated)."
    )
    subdetail_sequence: Optional[List[int]] = Field(
        None, description="Subdetail sequence numbers this addItem applies to (stored comma-separated)."
    )

    # productOrService (1..1) CodeableConcept
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None

    # serviced[x] (0..1)
    serviced_date: Optional[date] = None
    serviced_period_start: Optional[datetime] = None
    serviced_period_end: Optional[datetime] = None

    # location[x] CodeableConcept
    location_cc_system: Optional[str] = None
    location_cc_code: Optional[str] = None
    location_cc_display: Optional[str] = None
    location_cc_text: Optional[str] = None

    # location[x] Address
    location_address_use: Optional[str] = None
    location_address_type: Optional[str] = None
    location_address_text: Optional[str] = None
    location_address_line: Optional[List[str]] = Field(
        None, description="Address lines (stored comma-separated)."
    )
    location_address_city: Optional[str] = None
    location_address_district: Optional[str] = None
    location_address_state: Optional[str] = None
    location_address_postal_code: Optional[str] = None
    location_address_country: Optional[str] = None

    # location[x] Reference(Location)
    location_ref: Optional[str] = Field(
        None,
        description="Reference to a Location resource, e.g. 'Location/12345'.",
    )
    location_ref_display: Optional[str] = None

    # quantity (0..1)
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None

    # unitPrice (0..1) Money
    unit_price_value: Optional[float] = None
    unit_price_currency: Optional[str] = None

    factor: Optional[float] = None

    # net (0..1) Money
    net_value: Optional[float] = None
    net_currency: Optional[str] = None

    # bodySite (0..1) CodeableConcept
    body_site_system: Optional[str] = None
    body_site_code: Optional[str] = None
    body_site_display: Optional[str] = None
    body_site_text: Optional[str] = None

    note_number: Optional[List[int]] = Field(
        None, description="Applicable note numbers (stored comma-separated)."
    )

    providers: Optional[List[ClaimResponseAddItemProviderInput]] = None
    modifiers: Optional[List[ClaimResponseAddItemModifierInput]] = None
    program_codes: Optional[List[ClaimResponseAddItemProgramCodeInput]] = None
    sub_sites: Optional[List[ClaimResponseAddItemSubSiteInput]] = None
    adjudications: Optional[List[ClaimResponseAdjudicationInput]] = None
    details: Optional[List[ClaimResponseAddItemDetailInput]] = None


# ---------------------------------------------------------------------------
# Other child inputs
# ---------------------------------------------------------------------------


class ClaimResponseIdentifierInput(BaseModel):
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


class ClaimResponseTotalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # category (1..1) CodeableConcept
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None

    # amount (1..1) Money
    amount_value: Optional[float] = None
    amount_currency: Optional[str] = None


class ClaimResponseProcessNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number: Optional[int] = None
    note_type: Optional[str] = Field(None, description="display | print | printoper")
    text: str = Field(..., description="Human-readable note text.")
    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None


class ClaimResponseCommunicationRequestInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="Reference to a CommunicationRequest resource, e.g. 'CommunicationRequest/12345'.",
    )
    reference_display: Optional[str] = None


class ClaimResponseInsuranceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sequence: int = Field(..., description="1-based positiveInt for the insurance entry.")
    focal: bool = Field(..., description="Whether this is the primary coverage.")
    coverage: str = Field(
        ..., description="Reference to a Coverage resource, e.g. 'Coverage/12345'."
    )
    coverage_display: Optional[str] = None
    business_arrangement: Optional[str] = None
    claim_response_ref: Optional[str] = Field(
        None,
        description="Optional reference to a related ClaimResponse, e.g. 'ClaimResponse/180001'.",
    )
    claim_response_ref_display: Optional[str] = None


class ClaimResponseErrorInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_sequence: Optional[int] = None
    detail_sequence: Optional[int] = None
    sub_detail_sequence: Optional[int] = None

    # code (1..1) CodeableConcept
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None


# ---------------------------------------------------------------------------
# Main CreateSchema
# ---------------------------------------------------------------------------


class ClaimResponseCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "status": "active",
                "use": "claim",
                "outcome": "complete",
                "created": "2024-06-01T10:00:00Z",
                "type_system": "http://terminology.hl7.org/CodeSystem/claim-type",
                "type_code": "professional",
                "type_display": "Professional",
                "type_text": None,
                "patient": "Patient/10001",
                "insurer": "Organization/190001",
                "request": "Claim/170001",
                "requestor": "Practitioner/30001",
                "disposition": "Claim settled as per contract.",
                "pre_auth_ref": "PA-2024-001",
                "totals": [
                    {
                        "category_code": "submitted",
                        "amount_value": 1500.00,
                        "amount_currency": "USD",
                    }
                ],
                "items": [
                    {
                        "item_sequence": 1,
                        "adjudications": [
                            {
                                "category_code": "eligible",
                                "amount_value": 1200.00,
                                "amount_currency": "USD",
                            }
                        ],
                    }
                ],
            }
        },
    )

    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")
    created_by: Optional[str] = None

    # Required scalars
    status: str = Field(..., description="active | cancelled | draft | entered-in-error")
    use: str = Field(..., description="claim | preauthorization | predetermination")
    outcome: str = Field(..., description="queued | complete | error | partial")
    created: datetime = Field(..., description="Response creation date/time.")

    # type (1..1) CodeableConcept
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    # subType (0..1) CodeableConcept
    sub_type_system: Optional[str] = None
    sub_type_code: Optional[str] = None
    sub_type_display: Optional[str] = None
    sub_type_text: Optional[str] = None

    # Required references
    patient: str = Field(..., description="Reference to Patient, e.g. 'Patient/10001'.")
    patient_display: Optional[str] = None

    insurer: str = Field(..., description="Reference to Organization, e.g. 'Organization/190001'.")
    insurer_display: Optional[str] = None

    # Optional references
    requestor: Optional[str] = Field(
        None,
        description=(
            "Reference to Practitioner, PractitionerRole, or Organization, "
            "e.g. 'Practitioner/30001'."
        ),
    )
    requestor_display: Optional[str] = None

    request: Optional[str] = Field(
        None, description="Reference to Claim, e.g. 'Claim/170001'."
    )
    request_display: Optional[str] = None

    # Optional scalars
    disposition: Optional[str] = None
    pre_auth_ref: Optional[str] = None
    pre_auth_period_start: Optional[datetime] = None
    pre_auth_period_end: Optional[datetime] = None

    # payeeType (0..1) CodeableConcept
    payee_type_system: Optional[str] = None
    payee_type_code: Optional[str] = None
    payee_type_display: Optional[str] = None
    payee_type_text: Optional[str] = None

    # payment (0..1) flattened
    payment_type_system: Optional[str] = None
    payment_type_code: Optional[str] = None
    payment_type_display: Optional[str] = None
    payment_type_text: Optional[str] = None
    payment_adjustment_value: Optional[float] = None
    payment_adjustment_currency: Optional[str] = None
    payment_adjustment_reason_system: Optional[str] = None
    payment_adjustment_reason_code: Optional[str] = None
    payment_adjustment_reason_display: Optional[str] = None
    payment_adjustment_reason_text: Optional[str] = None
    payment_date: Optional[date] = None
    payment_amount_value: Optional[float] = None
    payment_amount_currency: Optional[str] = None
    payment_identifier_use: Optional[str] = None
    payment_identifier_type_system: Optional[str] = None
    payment_identifier_type_code: Optional[str] = None
    payment_identifier_type_display: Optional[str] = None
    payment_identifier_type_text: Optional[str] = None
    payment_identifier_system: Optional[str] = None
    payment_identifier_value: Optional[str] = None
    payment_identifier_period_start: Optional[datetime] = None
    payment_identifier_period_end: Optional[datetime] = None
    payment_identifier_assigner: Optional[str] = None

    # fundsReserve (0..1) CodeableConcept
    funds_reserve_system: Optional[str] = None
    funds_reserve_code: Optional[str] = None
    funds_reserve_display: Optional[str] = None
    funds_reserve_text: Optional[str] = None

    # formCode (0..1) CodeableConcept
    form_code_system: Optional[str] = None
    form_code_code: Optional[str] = None
    form_code_display: Optional[str] = None
    form_code_text: Optional[str] = None

    # form (0..1) Attachment
    form_content_type: Optional[str] = None
    form_language: Optional[str] = None
    form_data: Optional[str] = None
    form_url: Optional[str] = None
    form_size: Optional[int] = None
    form_hash: Optional[str] = None
    form_title: Optional[str] = None
    form_creation: Optional[datetime] = None

    # Child lists
    identifier: Optional[List[ClaimResponseIdentifierInput]] = None
    items: Optional[List[ClaimResponseItemInput]] = None
    add_items: Optional[List[ClaimResponseAddItemInput]] = None
    adjudications: Optional[List[ClaimResponseAdjudicationInput]] = None
    totals: Optional[List[ClaimResponseTotalInput]] = None
    process_notes: Optional[List[ClaimResponseProcessNoteInput]] = None
    communication_requests: Optional[List[ClaimResponseCommunicationRequestInput]] = None
    insurances: Optional[List[ClaimResponseInsuranceInput]] = None
    errors: Optional[List[ClaimResponseErrorInput]] = None


# ---------------------------------------------------------------------------
# Patch schema — only scalar/flat fields on the main table
# ---------------------------------------------------------------------------


class ClaimResponsePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    use: Optional[str] = None
    outcome: Optional[str] = None
    disposition: Optional[str] = None
    pre_auth_ref: Optional[str] = None
    pre_auth_period_start: Optional[datetime] = None
    pre_auth_period_end: Optional[datetime] = None

    # payeeType
    payee_type_system: Optional[str] = None
    payee_type_code: Optional[str] = None
    payee_type_display: Optional[str] = None
    payee_type_text: Optional[str] = None

    # payment
    payment_type_system: Optional[str] = None
    payment_type_code: Optional[str] = None
    payment_type_display: Optional[str] = None
    payment_type_text: Optional[str] = None
    payment_adjustment_value: Optional[float] = None
    payment_adjustment_currency: Optional[str] = None
    payment_adjustment_reason_system: Optional[str] = None
    payment_adjustment_reason_code: Optional[str] = None
    payment_adjustment_reason_display: Optional[str] = None
    payment_adjustment_reason_text: Optional[str] = None
    payment_date: Optional[date] = None
    payment_amount_value: Optional[float] = None
    payment_amount_currency: Optional[str] = None
    payment_identifier_use: Optional[str] = None
    payment_identifier_type_system: Optional[str] = None
    payment_identifier_type_code: Optional[str] = None
    payment_identifier_type_display: Optional[str] = None
    payment_identifier_type_text: Optional[str] = None
    payment_identifier_system: Optional[str] = None
    payment_identifier_value: Optional[str] = None
    payment_identifier_period_start: Optional[datetime] = None
    payment_identifier_period_end: Optional[datetime] = None
    payment_identifier_assigner: Optional[str] = None

    # fundsReserve
    funds_reserve_system: Optional[str] = None
    funds_reserve_code: Optional[str] = None
    funds_reserve_display: Optional[str] = None
    funds_reserve_text: Optional[str] = None

    # formCode
    form_code_system: Optional[str] = None
    form_code_code: Optional[str] = None
    form_code_display: Optional[str] = None
    form_code_text: Optional[str] = None

    # form
    form_content_type: Optional[str] = None
    form_language: Optional[str] = None
    form_data: Optional[str] = None
    form_url: Optional[str] = None
    form_size: Optional[int] = None
    form_hash: Optional[str] = None
    form_title: Optional[str] = None
    form_creation: Optional[datetime] = None
    updated_by: Optional[str] = None
