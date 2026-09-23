"""
Cache Keys Standard Naming Conventions:
Defines deterministic, hierarchically scoped cache key generators across all domains.
"""

from typing import Optional, Any
import uuid


class CacheKeys:
    """
    Standardized Cache Key Patterns:
    - parent.home:{parent_id}:{subject_id}
    - coordinator.home:{family_id}
    - subject.medications:{subject_id}
    - notifications:{family_id}
    - subject.timeline:{subject_id}
    - family.summary:{family_id}
    - family.care_tasks:{family_id}
    """

    @staticmethod
    def parent_home(parent_id: Optional[uuid.UUID] = None, subject_id: Optional[uuid.UUID] = None) -> str:
        p_str = str(parent_id) if parent_id else "*"
        s_str = str(subject_id) if subject_id else "*"
        return f"parent.home:{p_str}:{s_str}"

    @staticmethod
    def coordinator_home(family_id: uuid.UUID) -> str:
        return f"coordinator.home:{str(family_id)}"

    @staticmethod
    def subject_medications(subject_id: uuid.UUID) -> str:
        return f"subject.medications:{str(subject_id)}"

    @staticmethod
    def notifications(family_id: uuid.UUID, recipient_id: Optional[uuid.UUID] = None) -> str:
        if recipient_id:
            return f"notifications:{str(family_id)}:{str(recipient_id)}"
        return f"notifications:{str(family_id)}:*"

    @staticmethod
    def subject_timeline(subject_id: uuid.UUID) -> str:
        return f"subject.timeline:{str(subject_id)}"

    @staticmethod
    def family_summary(family_id: uuid.UUID) -> str:
        return f"family_summary:{str(family_id)}"

    @staticmethod
    def care_tasks(family_id: uuid.UUID) -> str:
        return f"family.care_tasks:{str(family_id)}"
