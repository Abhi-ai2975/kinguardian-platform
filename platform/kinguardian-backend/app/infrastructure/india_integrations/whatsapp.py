"""
WhatsApp Healthcare Communication Interface Contracts:
Defines protocols for WhatsApp interactive messaging:
- Medication reminders with interactive 'Taken' / 'Snooze' buttons
- Daily wellbeing check-ins via interactive list messages
- Voice note check-ins from aging parents
"""

from typing import Protocol, Dict, Any, List, Optional
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class WhatsAppInteractiveButton:
    button_id: str
    title: str


@dataclass(frozen=True)
class WhatsAppMessagePayload:
    recipient_phone: str  # +91XXXXXXXXXX
    template_name: str
    language_code: str  # "en", "hi", "te", "ta", "mr", "bn"
    parameters: List[str]
    buttons: Optional[List[WhatsAppInteractiveButton]] = None


class IWhatsAppHealthcareAdapter(Protocol):
    """Protocol for WhatsApp Cloud API healthcare communication."""

    async def send_medication_reminder_interactive(
        self,
        phone: str,
        medication_name: str,
        dosage: str,
        language: str = "hi"
    ) -> str:
        """Sends interactive WhatsApp medication reminder with quick-reply buttons."""
        ...

    async def send_wellbeing_checkin_prompt(
        self,
        phone: str,
        parent_name: str,
        language: str = "hi"
    ) -> str:
        """Sends daily wellbeing question on WhatsApp."""
        ...

    async def handle_incoming_webhook(self, webhook_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Processes incoming button clicks or voice notes from WhatsApp."""
        ...
