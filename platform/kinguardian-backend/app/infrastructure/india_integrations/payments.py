"""
UPI & Indian Payment Interface Contracts:
Defines protocols for:
- UPI Dynamic QR Generation (NPCI Bharat QR)
- UPI Intent Flow (PhonePe, GPay, Paytm)
- UPI AutoPay (Recurring Mandates for Care Coordinator Subscriptions)
- Payment Gateway Adapters (Razorpay, PhonePe, Cashfree)
"""

from typing import Protocol, Dict, Any, List, Optional
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class UPIPaymentRequest:
    payment_id: str
    family_id: uuid.UUID
    payer_profile_id: uuid.UUID
    amount_inr: float
    purpose: str  # "COORDINATOR_SUBSCRIPTION", "LAB_TEST_BOOKING", "MEDICINE_ORDER"
    vpa_handle: Optional[str] = None  # user@upi


@dataclass(frozen=True)
class UPIPaymentIntent:
    payment_id: str
    upi_intent_uri: str  # upi://pay?pa=...&pn=KinGuardian&am=...
    dynamic_qr_base64: str
    expires_at: datetime


@dataclass(frozen=True)
class UPIAutoPayMandate:
    mandate_id: str
    family_id: uuid.UUID
    frequency: str  # "MONTHLY", "AS_PRESENTED"
    max_amount_inr: float
    start_date: datetime
    status: str = "ACTIVE"


class IUPIPaymentGateway(Protocol):
    """Protocol for UPI payments and recurring AutoPay mandates."""

    async def create_payment_intent(self, request: UPIPaymentRequest) -> UPIPaymentIntent:
        """Generates dynamic UPI QR and mobile app intent URI."""
        ...

    async def create_recurring_autopay_mandate(
        self,
        family_id: uuid.UUID,
        monthly_amount_inr: float
    ) -> UPIAutoPayMandate:
        """Registers a recurring UPI AutoPay mandate for subscription billing."""
        ...

    async def verify_payment_webhook(self, signature: str, payload: Dict[str, Any]) -> bool:
        """Validates cryptographic signature on gateway payment webhooks."""
        ...
