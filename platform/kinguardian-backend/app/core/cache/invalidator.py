"""
Domain Cache Invalidator:
Implements rule-based, event-driven cache invalidation routines for all domain workflows.

Example:
Medication confirmed:
invalidate:
- parent.home
- coordinator.home
- subject.medications
- notifications
"""

from typing import List, Optional, Any, Dict
import uuid
from app.core.logging import get_logger
from app.core.redis import redis_service, RedisCacheService
from app.core.cache.keys import CacheKeys

logger = get_logger(__name__)


class DomainCacheInvalidator:
    """
    Coordinates multi-key and pattern-based cache invalidation triggered by domain lifecycle events.
    """

    def __init__(self, cache_service: Optional[RedisCacheService] = None):
        self.cache = cache_service or redis_service

    def invalidate_on_medication_confirmed(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        parent_id: Optional[uuid.UUID] = None,
        recipient_id: Optional[uuid.UUID] = None
    ) -> List[str]:
        """
        Invalidates cached projections when a medication dose is confirmed:
        1. parent.home
        2. coordinator.home
        3. subject.medications
        4. notifications
        """
        keys_to_invalidate = [
            # 1. parent.home (scoped to subject or all parents in circle)
            CacheKeys.parent_home(parent_id=parent_id, subject_id=subject_id),
            # 2. coordinator.home
            CacheKeys.coordinator_home(family_id=family_id),
            # 3. subject.medications
            CacheKeys.subject_medications(subject_id=subject_id),
            # 4. notifications
            CacheKeys.notifications(family_id=family_id, recipient_id=recipient_id)
        ]

        invalidated = self.cache.invalidate_keys(keys_to_invalidate)
        logger.info(
            f"Cache Invalidation [medication_confirmed]: family={family_id}, subject={subject_id}, "
            f"invalidated_keys={invalidated}"
        )
        return invalidated

    def invalidate_on_checkin_submitted(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        parent_id: Optional[uuid.UUID] = None
    ) -> List[str]:
        """
        Invalidates cache projections on daily wellbeing checkin:
        - parent.home
        - coordinator.home
        - subject.timeline
        - notifications
        """
        keys = [
            CacheKeys.parent_home(parent_id=parent_id, subject_id=subject_id),
            CacheKeys.coordinator_home(family_id=family_id),
            CacheKeys.subject_timeline(subject_id=subject_id),
            CacheKeys.notifications(family_id=family_id)
        ]
        return self.cache.invalidate_keys(keys)

    def invalidate_on_care_task_updated(
        self,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None
    ) -> List[str]:
        """
        Invalidates cache projections on care task state transitions:
        - parent.home
        - coordinator.home
        - family.care_tasks
        - notifications
        """
        keys = [
            CacheKeys.parent_home(subject_id=subject_id) if subject_id else "parent.home:*",
            CacheKeys.coordinator_home(family_id=family_id),
            CacheKeys.care_tasks(family_id=family_id),
            CacheKeys.notifications(family_id=family_id)
        ]
        return self.cache.invalidate_keys(keys)

    def invalidate_for_event(
        self,
        event_type: str,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None,
        parent_id: Optional[uuid.UUID] = None,
        recipient_id: Optional[uuid.UUID] = None
    ) -> List[str]:
        """
        Generic event dispatcher mapping domain event names to invalidation handlers.
        """
        if event_type in ("medication_confirmed", "medication_adherence_recorded", "medication_adherence_logged"):
            if not subject_id:
                raise ValueError("subject_id is required for medication invalidation.")
            return self.invalidate_on_medication_confirmed(
                family_id=family_id,
                subject_id=subject_id,
                parent_id=parent_id,
                recipient_id=recipient_id
            )
        elif event_type in ("wellbeing_checkin_submitted", "wellbeing_checkin_created"):
            if not subject_id:
                raise ValueError("subject_id is required for checkin invalidation.")
            return self.invalidate_on_checkin_submitted(
                family_id=family_id,
                subject_id=subject_id,
                parent_id=parent_id
            )
        elif event_type in ("care_task_created", "care_task_updated", "care_task_completed"):
            return self.invalidate_on_care_task_updated(
                family_id=family_id,
                subject_id=subject_id
            )
        else:
            # Fallback: invalidate coordinator home and family summary
            keys = [
                CacheKeys.coordinator_home(family_id=family_id),
                CacheKeys.family_summary(family_id=family_id)
            ]
            return self.cache.invalidate_keys(keys)


# Global singleton invalidator instance
domain_cache_invalidator = DomainCacheInvalidator()
