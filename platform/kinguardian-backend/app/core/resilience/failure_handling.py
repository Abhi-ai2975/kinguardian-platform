"""
Resilience & Graceful Failure Handling:
Implements graceful degradation patterns for external dependency outages:
1. FHIR Unavailability -> Family data returned with clinical data marked temporarily unavailable.
2. Notification Provider Failure -> Notification intent safely persisted for async background retry.
3. AI Generation Failure -> Safe fallback message:
   'KinGuardian couldn't generate the insight right now. You can review the underlying health information.'
"""

from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime, timezone

from app.core.logging import get_logger

logger = get_logger(__name__)

SAFE_AI_FALLBACK_MESSAGE = (
    "KinGuardian couldn't generate the insight right now. "
    "You can review the underlying health information."
)


class ResilientFHIRHandler:
    """
    Handles FHIR R4 outages by degrading clinical sections gracefully
    without crashing the Coordinator Home or Family dashboard.
    """

    @classmethod
    def build_degraded_clinical_payload(
        cls,
        subject_id: uuid.UUID,
        error_message: Optional[str] = None
    ) -> Dict[str, Any]:
        logger.warning(f"FHIR temporarily unavailable for subject={subject_id}: {error_message}")
        return {
            "status": "temporarily_unavailable",
            "warning": "clinical data temporarily unavailable",
            "subject_id": str(subject_id),
            "medications": [],
            "vitals": {},
            "appointments": [],
            "last_synced_at": None,
            "fallback_active": True
        }


class ResilientNotificationHandler:
    """
    Handles Notification Provider (FCM, Twilio, WhatsApp) outages by safely
    persisting the notification intent in local database and queuing for async retry.
    """

    @classmethod
    def build_persisted_intent(
        cls,
        family_id: uuid.UUID,
        recipient_id: uuid.UUID,
        title: str,
        body: str,
        channel: str,
        error_reason: str
    ) -> Dict[str, Any]:
        logger.warning(
            f"Notification provider failed for recipient={recipient_id} on channel={channel}. "
            f"Persisting intent for async retry. Error: {error_reason}"
        )
        return {
            "id": str(uuid.uuid4()),
            "family_id": str(family_id),
            "recipient_id": str(recipient_id),
            "title": title,
            "body": body,
            "channel": channel,
            "status": "pending_retry",
            "last_error": error_reason,
            "retry_scheduled": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }


class ResilientAIHandler:
    """
    Handles AI inference timeouts, rate limits, or safety refusals with safe clinical fallbacks.
    """

    @classmethod
    def get_safe_fallback_insight(
        cls,
        subject_id: uuid.UUID,
        raw_health_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        logger.warning(f"AI generation failed for subject={subject_id}. Returning safe fallback.")
        return {
            "subject_id": str(subject_id),
            "title": "Health Summary",
            "summary": SAFE_AI_FALLBACK_MESSAGE,
            "recommendation": "Please review recent check-ins and vital signs directly.",
            "is_fallback": True,
            "underlying_health_data_accessible": True,
            "raw_health_context": raw_health_context or {},
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
