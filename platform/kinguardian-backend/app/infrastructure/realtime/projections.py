"""
Projection Invalidation Registry:
Maps domain events to affected frontend projection keys to enable reactive, zero-polling client cache updates.
"""

from typing import List, Dict, Any, Optional
import uuid
from app.infrastructure.realtime.models import ProjectionInvalidationEvent


# Invalidation mapping: domain_event -> affected projection keys
DOMAIN_EVENT_PROJECTION_MAP: Dict[str, List[str]] = {
    "wellbeing_checkin_submitted": ["home", "timeline", "checkins", "parent_health_summary"],
    "medication_adherence_recorded": ["home", "timeline", "medications", "parent_health_summary"],
    "medication_confirmed": ["home", "timeline", "medications", "parent_health_summary"],
    "care_task_created": ["home", "timeline", "care_tasks"],
    "care_task_updated": ["home", "timeline", "care_tasks"],
    "care_task_completed": ["home", "timeline", "care_tasks"],
    "guardian_moment_generated": ["home", "timeline", "insights", "guardian_moments"],
    "ai_insight_generated": ["home", "timeline", "insights", "guardian_moments", "parent_health_summary"],
    "family_message_sent": ["conversations", "messages", "home"],
    "health_document_uploaded": ["documents", "timeline"],
    "health_document_processed": ["documents", "timeline", "parent_health_summary"],
    "document_extraction_reviewed": ["documents", "medications", "timeline", "parent_health_summary"],
    "appointment_scheduled": ["home", "timeline", "appointments"],
    "appointment_prepared": ["home", "timeline", "appointments"],
    "consent_granted": ["home", "consent", "members"],
    "consent_revoked": ["home", "consent", "members"],
}


class ProjectionInvalidationRegistry:
    """
    Translates raw domain events into standardized client cache invalidation directives.
    """

    @staticmethod
    def get_affected_projections(event_type: str) -> List[str]:
        return DOMAIN_EVENT_PROJECTION_MAP.get(event_type, ["home"])

    @classmethod
    def create_invalidation_event(
        cls,
        event_type: str,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None,
        entity_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        action: str = "refresh"
    ) -> ProjectionInvalidationEvent:
        affected = cls.get_affected_projections(event_type)
        return ProjectionInvalidationEvent(
            domain_event=event_type,
            family_id=family_id,
            subject_id=subject_id,
            affected_projections=affected,
            action=action,
            entity_id=entity_id,
            payload=payload or {}
        )
