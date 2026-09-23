"""
Indian Pharmacy & Medicine Fulfillment Interface Contracts:
Defines protocols for integrating with Indian pharmacy delivery networks:
- Tata 1mg
- Apollo Pharmacy
- Netmeds
- PharmEasy
"""

from typing import Protocol, Dict, Any, List, Optional
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class PharmacyOrderRequest:
    order_id: str
    subject_id: uuid.UUID
    delivery_address: str
    pincode: str
    prescription_file_id: Optional[str]
    medications: List[Dict[str, Any]]  # [{"name": "Metformin 500mg", "quantity": 30}]
    provider: str  # "ONE_MG", "APOLLO_PHARMACY", "NETMEDS", "PHARMEASY"


@dataclass(frozen=True)
class PharmacyOrderStatus:
    order_id: str
    external_order_ref: str
    provider: str
    status: str  # "PRESCRIPTION_VERIFYING", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"
    estimated_delivery: datetime
    tracking_url: Optional[str]


class IIndianPharmacyAdapter(Protocol):
    """Protocol for medicine orders, prescription validation, and fulfillment."""

    async def check_medicine_availability(self, pincode: str, medication_names: List[str]) -> Dict[str, bool]:
        """Checks medicine stock availability in target delivery pincode."""
        ...

    async def place_order_with_prescription(self, order: PharmacyOrderRequest) -> PharmacyOrderStatus:
        """Places medicine delivery order backed by verified prescription."""
        ...

    async def track_order_status(self, order_id: str) -> PharmacyOrderStatus:
        """Tracks real-time dispatch and delivery status."""
        ...
