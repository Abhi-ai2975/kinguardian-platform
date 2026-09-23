from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import FHIRBundle, FHIRCodeableConcept, FHIRReference


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRInvoiceMoney(BaseModel):
    value: Optional[Decimal] = None
    currency: Optional[str] = None


class FHIRInvoiceParticipant(BaseModel):
    role: Optional[FHIRCodeableConcept] = None
    actor: Optional[FHIRReference] = None


class FHIRInvoicePriceComponent(BaseModel):
    type: Optional[str] = None
    code: Optional[FHIRCodeableConcept] = None
    factor: Optional[Decimal] = None
    amount: Optional[FHIRInvoiceMoney] = None


class FHIRInvoiceLineItem(BaseModel):
    sequence: Optional[int] = None
    chargeItemReference: Optional[FHIRReference] = None
    chargeItemCodeableConcept: Optional[FHIRCodeableConcept] = None
    priceComponent: Optional[List[FHIRInvoicePriceComponent]] = None


class FHIRInvoiceSchema(BaseModel):
    resourceType: str = Field("Invoice", description="Always 'Invoice'.")
    id: str = Field(..., description="Public invoice_id as a string.")
    identifier: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    cancelledReason: Optional[str] = None
    type: Optional[FHIRCodeableConcept] = None
    subject: Optional[FHIRReference] = None
    recipient: Optional[FHIRReference] = None
    date: Optional[str] = None
    participant: Optional[List[FHIRInvoiceParticipant]] = None
    issuer: Optional[FHIRReference] = None
    account: Optional[FHIRReference] = None
    lineItem: Optional[List[FHIRInvoiceLineItem]] = None
    totalPriceComponent: Optional[List[FHIRInvoicePriceComponent]] = None
    totalNet: Optional[FHIRInvoiceMoney] = None
    totalGross: Optional[FHIRInvoiceMoney] = None
    paymentTerms: Optional[str] = None
    note: Optional[List[Dict[str, Any]]] = None


class FHIRInvoiceBundleEntry(BaseModel):
    resource: FHIRInvoiceSchema


class FHIRInvoiceBundle(FHIRBundle):
    entry: Optional[List[FHIRInvoiceBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainInvoiceIdentifier(BaseModel):
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


class PlainInvoiceParticipant(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    role_system: Optional[str] = None
    role_code: Optional[str] = None
    role_display: Optional[str] = None
    role_text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainInvoicePriceComponent(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    factor: Optional[Decimal] = None
    amount_value: Optional[Decimal] = None
    amount_currency: Optional[str] = None


class PlainInvoiceLineItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    sequence: Optional[int] = None
    chargeitem_ref_type: Optional[str] = None
    chargeitem_ref_id: Optional[int] = None
    chargeitem_ref_display: Optional[str] = None
    chargeitem_cc_system: Optional[str] = None
    chargeitem_cc_code: Optional[str] = None
    chargeitem_cc_display: Optional[str] = None
    chargeitem_cc_text: Optional[str] = None
    price_components: Optional[List[PlainInvoicePriceComponent]] = None


class PlainInvoiceTotalPriceComponent(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    factor: Optional[Decimal] = None
    amount_value: Optional[Decimal] = None
    amount_currency: Optional[str] = None


class PlainInvoiceNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: Optional[str] = None
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainInvoiceResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    status: Optional[str] = None
    cancelled_reason: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    recipient_type: Optional[str] = None
    recipient_id: Optional[int] = None
    recipient_display: Optional[str] = None
    date: Optional[str] = None
    issuer_type: Optional[str] = None
    issuer_id: Optional[int] = None
    issuer_display: Optional[str] = None
    account_type: Optional[str] = None
    account_id: Optional[int] = None
    account_display: Optional[str] = None
    total_net_value: Optional[Decimal] = None
    total_net_currency: Optional[str] = None
    total_gross_value: Optional[Decimal] = None
    total_gross_currency: Optional[str] = None
    payment_terms: Optional[str] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainInvoiceIdentifier]] = None
    participant: Optional[List[PlainInvoiceParticipant]] = None
    line_item: Optional[List[PlainInvoiceLineItem]] = None
    total_price_component: Optional[List[PlainInvoiceTotalPriceComponent]] = None
    note: Optional[List[PlainInvoiceNote]] = None


class PaginatedInvoiceResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainInvoiceResponse]
