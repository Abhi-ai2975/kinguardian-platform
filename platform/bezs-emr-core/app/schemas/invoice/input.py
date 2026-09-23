from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class InvoiceIdentifierInput(BaseModel):
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


class InvoiceParticipantInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role_system: Optional[str] = None
    role_code: Optional[str] = None
    role_display: Optional[str] = None
    role_text: Optional[str] = None
    actor: str = Field(..., description="Actor reference, e.g. 'Practitioner/30001'.")
    actor_display: Optional[str] = None


class InvoicePriceComponentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(..., description="base | surcharge | deduction | discount | tax | informational")
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    factor: Optional[Decimal] = None
    amount_value: Optional[Decimal] = None
    amount_currency: Optional[str] = None


class InvoiceLineItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sequence: Optional[int] = None
    # chargeItem[x] Reference variant
    chargeitem_ref_type: Optional[str] = Field(None, description="Reference type, e.g. 'ChargeItem'.")
    chargeitem_ref_id: Optional[int] = None
    chargeitem_ref_display: Optional[str] = None
    # chargeItem[x] CodeableConcept variant
    chargeitem_cc_system: Optional[str] = None
    chargeitem_cc_code: Optional[str] = None
    chargeitem_cc_display: Optional[str] = None
    chargeitem_cc_text: Optional[str] = None
    price_components: Optional[List[InvoicePriceComponentInput]] = None


class InvoiceTotalPriceComponentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(..., description="base | surcharge | deduction | discount | tax | informational")
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    factor: Optional[Decimal] = None
    amount_value: Optional[Decimal] = None
    amount_currency: Optional[str] = None


class InvoiceNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(..., description="Annotation text content.")
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class InvoiceCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "u-test",
                "org_id": "org-test",
                "status": "issued",
                "date": "2024-01-15T10:00:00Z",
                "subject": "Patient/10001",
                "subject_display": "John Smith",
                "issuer": "Organization/190001",
                "issuer_display": "General Hospital",
                "total_gross_value": 150.00,
                "total_gross_currency": "USD",
                "participants": [
                    {
                        "actor": "Practitioner/30001",
                        "actor_display": "Dr. Jane Doe",
                        "role_code": "doctor",
                        "role_system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                    }
                ],
                "line_items": [
                    {
                        "sequence": 1,
                        "chargeitem_cc_code": "consultation",
                        "chargeitem_cc_system": "http://example.org/charges",
                        "chargeitem_cc_display": "Consultation Fee",
                        "price_components": [
                            {
                                "type": "base",
                                "amount_value": 150.00,
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

    status: str = Field(..., description="draft | issued | balanced | cancelled | entered-in-error")
    cancelled_reason: Optional[str] = None

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    subject: Optional[str] = Field(None, description="Subject reference, e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    recipient: Optional[str] = Field(None, description="Recipient reference, e.g. 'Organization/190001'.")
    recipient_display: Optional[str] = None

    date: Optional[datetime] = None

    issuer: Optional[str] = Field(None, description="Issuer reference, e.g. 'Organization/190001'.")
    issuer_display: Optional[str] = None

    account: Optional[str] = Field(None, description="Account reference, e.g. 'Account/123'.")
    account_display: Optional[str] = None

    total_net_value: Optional[Decimal] = None
    total_net_currency: Optional[str] = None

    total_gross_value: Optional[Decimal] = None
    total_gross_currency: Optional[str] = None

    payment_terms: Optional[str] = None

    identifiers: Optional[List[InvoiceIdentifierInput]] = None
    participants: Optional[List[InvoiceParticipantInput]] = None
    line_items: Optional[List[InvoiceLineItemInput]] = None
    total_price_components: Optional[List[InvoiceTotalPriceComponentInput]] = None
    notes: Optional[List[InvoiceNoteInput]] = None


class InvoicePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    cancelled_reason: Optional[str] = None

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    subject_display: Optional[str] = None
    recipient_display: Optional[str] = None
    date: Optional[datetime] = None
    issuer_display: Optional[str] = None
    account_display: Optional[str] = None

    total_net_value: Optional[Decimal] = None
    total_net_currency: Optional[str] = None
    total_gross_value: Optional[Decimal] = None
    total_gross_currency: Optional[str] = None

    payment_terms: Optional[str] = None
    updated_by: Optional[str] = None
