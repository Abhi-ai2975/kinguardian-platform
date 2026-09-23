from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRReference,
)


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRAdjudication(BaseModel):
    category: Optional[FHIRCodeableConcept] = None
    reason: Optional[FHIRCodeableConcept] = None
    amount: Optional[Dict[str, Any]] = None
    value: Optional[float] = None


class FHIRItemDetailSubDetail(BaseModel):
    subDetailSequence: Optional[int] = None
    noteNumber: Optional[List[int]] = None
    adjudication: Optional[List[FHIRAdjudication]] = None


class FHIRItemDetail(BaseModel):
    detailSequence: Optional[int] = None
    noteNumber: Optional[List[int]] = None
    adjudication: Optional[List[FHIRAdjudication]] = None
    subDetail: Optional[List[FHIRItemDetailSubDetail]] = None


class FHIRItem(BaseModel):
    itemSequence: Optional[int] = None
    noteNumber: Optional[List[int]] = None
    adjudication: Optional[List[FHIRAdjudication]] = None
    detail: Optional[List[FHIRItemDetail]] = None


class FHIRAddItemDetail(BaseModel):
    productOrService: Optional[FHIRCodeableConcept] = None
    modifier: Optional[List[FHIRCodeableConcept]] = None
    quantity: Optional[Dict[str, Any]] = None
    unitPrice: Optional[Dict[str, Any]] = None
    factor: Optional[float] = None
    net: Optional[Dict[str, Any]] = None
    noteNumber: Optional[List[int]] = None
    adjudication: Optional[List[FHIRAdjudication]] = None
    subDetail: Optional[List[Dict[str, Any]]] = None


class FHIRAddItem(BaseModel):
    itemSequence: Optional[List[int]] = None
    detailSequence: Optional[List[int]] = None
    subdetailSequence: Optional[List[int]] = None
    provider: Optional[List[FHIRReference]] = None
    productOrService: Optional[FHIRCodeableConcept] = None
    modifier: Optional[List[FHIRCodeableConcept]] = None
    programCode: Optional[List[FHIRCodeableConcept]] = None
    servicedDate: Optional[str] = None
    servicedPeriod: Optional[Dict[str, Any]] = None
    locationCodeableConcept: Optional[FHIRCodeableConcept] = None
    locationAddress: Optional[Dict[str, Any]] = None
    locationReference: Optional[FHIRReference] = None
    quantity: Optional[Dict[str, Any]] = None
    unitPrice: Optional[Dict[str, Any]] = None
    factor: Optional[float] = None
    net: Optional[Dict[str, Any]] = None
    bodySite: Optional[FHIRCodeableConcept] = None
    subSite: Optional[List[FHIRCodeableConcept]] = None
    noteNumber: Optional[List[int]] = None
    adjudication: Optional[List[FHIRAdjudication]] = None
    detail: Optional[List[FHIRAddItemDetail]] = None


class FHIRTotal(BaseModel):
    category: Optional[FHIRCodeableConcept] = None
    amount: Optional[Dict[str, Any]] = None


class FHIRProcessNote(BaseModel):
    number: Optional[int] = None
    type: Optional[str] = None
    text: Optional[str] = None
    language: Optional[FHIRCodeableConcept] = None


class FHIRPayment(BaseModel):
    type: Optional[FHIRCodeableConcept] = None
    adjustment: Optional[Dict[str, Any]] = None
    adjustmentReason: Optional[FHIRCodeableConcept] = None
    date: Optional[str] = None
    amount: Optional[Dict[str, Any]] = None
    identifier: Optional[FHIRIdentifier] = None


class FHIRInsurance(BaseModel):
    sequence: Optional[int] = None
    focal: Optional[bool] = None
    coverage: Optional[FHIRReference] = None
    businessArrangement: Optional[str] = None
    claimResponse: Optional[FHIRReference] = None


class FHIRError(BaseModel):
    itemSequence: Optional[int] = None
    detailSequence: Optional[int] = None
    subDetailSequence: Optional[int] = None
    code: Optional[FHIRCodeableConcept] = None


# ---------------------------------------------------------------------------
# Root FHIR ClaimResponse schema
# ---------------------------------------------------------------------------


class FHIRClaimResponseSchema(BaseModel):
    resourceType: str = Field("ClaimResponse", description="Always 'ClaimResponse'.")
    id: str = Field(..., description="Public claim_response_id as a string.")

    identifier: Optional[List[FHIRIdentifier]] = None
    status: Optional[str] = None
    type: Optional[FHIRCodeableConcept] = None
    subType: Optional[FHIRCodeableConcept] = None
    use: Optional[str] = None
    patient: Optional[FHIRReference] = None
    created: Optional[str] = None
    insurer: Optional[FHIRReference] = None
    requestor: Optional[FHIRReference] = None
    request: Optional[FHIRReference] = None
    outcome: Optional[str] = None
    disposition: Optional[str] = None
    preAuthRef: Optional[str] = None
    preAuthPeriod: Optional[Dict[str, Any]] = None
    payeeType: Optional[FHIRCodeableConcept] = None
    item: Optional[List[FHIRItem]] = None
    addItem: Optional[List[FHIRAddItem]] = None
    adjudication: Optional[List[FHIRAdjudication]] = None
    total: Optional[List[FHIRTotal]] = None
    payment: Optional[FHIRPayment] = None
    fundsReserve: Optional[FHIRCodeableConcept] = None
    formCode: Optional[FHIRCodeableConcept] = None
    form: Optional[Dict[str, Any]] = None
    processNote: Optional[List[FHIRProcessNote]] = None
    communicationRequest: Optional[List[FHIRReference]] = None
    insurance: Optional[List[FHIRInsurance]] = None
    error: Optional[List[FHIRError]] = None


class FHIRClaimResponseBundleEntry(BaseModel):
    resource: FHIRClaimResponseSchema


class FHIRClaimResponseBundle(FHIRBundle):
    entry: Optional[List[FHIRClaimResponseBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainClaimResponseIdentifier(BaseModel):
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


class PlainAdjudication(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    reason_system: Optional[str] = None
    reason_code: Optional[str] = None
    reason_display: Optional[str] = None
    reason_text: Optional[str] = None
    amount_value: Optional[float] = None
    amount_currency: Optional[str] = None
    adj_value: Optional[float] = None


class PlainItemDetailSubDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sub_detail_sequence: Optional[int] = None
    note_number: Optional[List[int]] = None
    adjudications: Optional[List[PlainAdjudication]] = None


class PlainItemDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    detail_sequence: Optional[int] = None
    note_number: Optional[List[int]] = None
    adjudications: Optional[List[PlainAdjudication]] = None
    sub_details: Optional[List[PlainItemDetailSubDetail]] = None


class PlainItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    item_sequence: Optional[int] = None
    note_number: Optional[List[int]] = None
    adjudications: Optional[List[PlainAdjudication]] = None
    details: Optional[List[PlainItemDetail]] = None


class PlainAddItemModifier(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAddItemProgramCode(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAddItemSubSite(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAddItemProvider(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAddItemDetailSubDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    unit_price_value: Optional[float] = None
    unit_price_currency: Optional[str] = None
    factor: Optional[float] = None
    net_value: Optional[float] = None
    net_currency: Optional[str] = None
    note_number: Optional[List[int]] = None
    modifiers: Optional[List[PlainAddItemModifier]] = None
    adjudications: Optional[List[PlainAdjudication]] = None


class PlainAddItemDetail(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    unit_price_value: Optional[float] = None
    unit_price_currency: Optional[str] = None
    factor: Optional[float] = None
    net_value: Optional[float] = None
    net_currency: Optional[str] = None
    note_number: Optional[List[int]] = None
    modifiers: Optional[List[PlainAddItemModifier]] = None
    adjudications: Optional[List[PlainAdjudication]] = None
    sub_details: Optional[List[PlainAddItemDetailSubDetail]] = None


class PlainAddItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    item_sequence: Optional[List[int]] = None
    detail_sequence: Optional[List[int]] = None
    subdetail_sequence: Optional[List[int]] = None
    product_or_service_system: Optional[str] = None
    product_or_service_code: Optional[str] = None
    product_or_service_display: Optional[str] = None
    product_or_service_text: Optional[str] = None
    serviced_date: Optional[str] = None
    serviced_period_start: Optional[str] = None
    serviced_period_end: Optional[str] = None
    location_cc_system: Optional[str] = None
    location_cc_code: Optional[str] = None
    location_cc_display: Optional[str] = None
    location_cc_text: Optional[str] = None
    location_address_use: Optional[str] = None
    location_address_type: Optional[str] = None
    location_address_text: Optional[str] = None
    location_address_line: Optional[List[str]] = None
    location_address_city: Optional[str] = None
    location_address_district: Optional[str] = None
    location_address_state: Optional[str] = None
    location_address_postal_code: Optional[str] = None
    location_address_country: Optional[str] = None
    location_ref_type: Optional[str] = None
    location_ref_id: Optional[int] = None
    location_ref_display: Optional[str] = None
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    unit_price_value: Optional[float] = None
    unit_price_currency: Optional[str] = None
    factor: Optional[float] = None
    net_value: Optional[float] = None
    net_currency: Optional[str] = None
    body_site_system: Optional[str] = None
    body_site_code: Optional[str] = None
    body_site_display: Optional[str] = None
    body_site_text: Optional[str] = None
    note_number: Optional[List[int]] = None
    providers: Optional[List[PlainAddItemProvider]] = None
    modifiers: Optional[List[PlainAddItemModifier]] = None
    program_codes: Optional[List[PlainAddItemProgramCode]] = None
    sub_sites: Optional[List[PlainAddItemSubSite]] = None
    adjudications: Optional[List[PlainAdjudication]] = None
    details: Optional[List[PlainAddItemDetail]] = None


class PlainTotal(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    category_system: Optional[str] = None
    category_code: Optional[str] = None
    category_display: Optional[str] = None
    category_text: Optional[str] = None
    amount_value: Optional[float] = None
    amount_currency: Optional[str] = None


class PlainProcessNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    number: Optional[int] = None
    note_type: Optional[str] = None
    text: Optional[str] = None
    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None


class PlainCommunicationRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainInsurance(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    focal: Optional[bool] = None
    coverage_type: Optional[str] = None
    coverage_id: Optional[int] = None
    coverage_display: Optional[str] = None
    business_arrangement: Optional[str] = None
    claim_response_ref_type: Optional[str] = None
    claim_response_ref_id: Optional[int] = None
    claim_response_ref_display: Optional[str] = None


class PlainError(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    item_sequence: Optional[int] = None
    detail_sequence: Optional[int] = None
    sub_detail_sequence: Optional[int] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None


class PlainClaimResponseResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int

    status: Optional[str] = None
    use: Optional[str] = None
    outcome: Optional[str] = None
    created: Optional[str] = None

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

    insurer_type: Optional[str] = None
    insurer_id: Optional[int] = None
    insurer_display: Optional[str] = None

    requestor_type: Optional[str] = None
    requestor_id: Optional[int] = None
    requestor_display: Optional[str] = None

    request_type: Optional[str] = None
    request_id: Optional[int] = None
    request_display: Optional[str] = None

    disposition: Optional[str] = None
    pre_auth_ref: Optional[str] = None
    pre_auth_period_start: Optional[str] = None
    pre_auth_period_end: Optional[str] = None

    payee_type_system: Optional[str] = None
    payee_type_code: Optional[str] = None
    payee_type_display: Optional[str] = None
    payee_type_text: Optional[str] = None

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
    payment_date: Optional[str] = None
    payment_amount_value: Optional[float] = None
    payment_amount_currency: Optional[str] = None
    payment_identifier_use: Optional[str] = None
    payment_identifier_type_system: Optional[str] = None
    payment_identifier_type_code: Optional[str] = None
    payment_identifier_type_display: Optional[str] = None
    payment_identifier_type_text: Optional[str] = None
    payment_identifier_system: Optional[str] = None
    payment_identifier_value: Optional[str] = None
    payment_identifier_period_start: Optional[str] = None
    payment_identifier_period_end: Optional[str] = None
    payment_identifier_assigner: Optional[str] = None

    funds_reserve_system: Optional[str] = None
    funds_reserve_code: Optional[str] = None
    funds_reserve_display: Optional[str] = None
    funds_reserve_text: Optional[str] = None

    form_code_system: Optional[str] = None
    form_code_code: Optional[str] = None
    form_code_display: Optional[str] = None
    form_code_text: Optional[str] = None

    form_content_type: Optional[str] = None
    form_language: Optional[str] = None
    form_data: Optional[str] = None
    form_url: Optional[str] = None
    form_size: Optional[int] = None
    form_hash: Optional[str] = None
    form_title: Optional[str] = None
    form_creation: Optional[str] = None

    identifier: Optional[List[PlainClaimResponseIdentifier]] = None
    items: Optional[List[PlainItem]] = None
    add_items: Optional[List[PlainAddItem]] = None
    adjudications: Optional[List[PlainAdjudication]] = None
    totals: Optional[List[PlainTotal]] = None
    process_notes: Optional[List[PlainProcessNote]] = None
    communication_requests: Optional[List[PlainCommunicationRequest]] = None
    insurances: Optional[List[PlainInsurance]] = None
    errors: Optional[List[PlainError]] = None

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedClaimResponseResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainClaimResponseResponse]
