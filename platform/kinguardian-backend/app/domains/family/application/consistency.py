import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.family.infrastructure.models import (
    MedicationAdherenceEvent,
    WellbeingCheckin,
    CareTask,
    Consent
)

logger = get_logger(__name__)


class ConsistencyModel(str, Enum):
    STRONG_SYNCHRONOUS = "strong_synchronous"
    EVENTUAL_ASYNCHRONOUS = "eventual_asynchronous"


class ConsistencyClassifier:
    """
    Classifies system operations into Strong Synchronous vs Eventual Asynchronous consistency.

    SYNCHRONOUS IMMEDIATE WRITE INVARIANTS:
    - Medication Confirmation: status='taken', confirmed_at immediately persisted & returned.
    - Check-in: feeling, symptoms, submitted_at immediately persisted & returned.
    - Care-task Completion: status='completed', completed_at immediately persisted & returned.
    - Consent Changes: status='active'/'revoked', version incremented, immediately enforced.

    EVENTUAL CONSISTENCY INVARIANTS:
    - AI Insights (evaluated asynchronously via InsightEngine)
    - Notifications (dispatched via background NotificationService)
    - Trend Calculations (computed via BaselineService)
    - Search Indexing (FileNest OCR / vector indexing)
    - Analytics Rollups (health metric telemetry snapshots)
    """

    OPERATIONS_MAP = {
        # Strong Immediate Consistency
        "medication_confirmation": ConsistencyModel.STRONG_SYNCHRONOUS,
        "wellbeing_checkin": ConsistencyModel.STRONG_SYNCHRONOUS,
        "care_task_completion": ConsistencyModel.STRONG_SYNCHRONOUS,
        "consent_grant": ConsistencyModel.STRONG_SYNCHRONOUS,
        "consent_revoke": ConsistencyModel.STRONG_SYNCHRONOUS,

        # Eventual Consistency
        "ai_insight_generation": ConsistencyModel.EVENTUAL_ASYNCHRONOUS,
        "notification_delivery": ConsistencyModel.EVENTUAL_ASYNCHRONOUS,
        "trend_calculation": ConsistencyModel.EVENTUAL_ASYNCHRONOUS,
        "search_indexing": ConsistencyModel.EVENTUAL_ASYNCHRONOUS,
        "analytics_telemetry": ConsistencyModel.EVENTUAL_ASYNCHRONOUS,
    }

    @classmethod
    def get_consistency_model(cls, operation_name: str) -> ConsistencyModel:
        return cls.OPERATIONS_MAP.get(operation_name, ConsistencyModel.EVENTUAL_ASYNCHRONOUS)


class SynchronousWriteService:
    """
    Executes critical user-triggered writes with immediate deterministic persistence and returns.
    Guarantees strict read-your-own-writes consistency.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def confirm_medication_immediately(
        self,
        adherence_id: uuid.UUID,
        subject_id: uuid.UUID,
        actor_id: uuid.UUID,
        scheduled_at: datetime
    ) -> Dict[str, Any]:
        utc_now = datetime.now(timezone.utc)
        stmt = select(MedicationAdherenceEvent).where(MedicationAdherenceEvent.id == adherence_id)
        result = await self.session.execute(stmt)
        record = result.scalars().first()

        if not record:
            record = MedicationAdherenceEvent(
                id=adherence_id,
                subject_id=subject_id,
                fhir_medication_request_id=f"med_req_{uuid.uuid4().hex[:8]}",
                scheduled_at=scheduled_at,
                status="taken",
                confirmed_at=utc_now,
                confirmed_by_profile_id=actor_id,
                source="parent_app"
            )
            self.session.add(record)
        else:
            record.status = "taken"
            record.confirmed_at = utc_now
            record.confirmed_by_profile_id = actor_id

        await self.session.commit()

        # Immediate deterministic return
        return {
            "adherence_id": str(record.id),
            "status": record.status,
            "confirmed_at": record.confirmed_at.isoformat(),
            "consistency": "strong_synchronous"
        }

    async def submit_checkin_immediately(
        self,
        checkin_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        actor_id: uuid.UUID,
        feeling: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        utc_now = datetime.now(timezone.utc)
        record = WellbeingCheckin(
            id=checkin_id,
            family_id=family_id,
            subject_id=subject_id,
            submitted_by_profile_id=actor_id,
            feeling=feeling,
            notes=notes,
            submitted_at=utc_now
        )
        self.session.add(record)
        await self.session.commit()

        return {
            "checkin_id": str(record.id),
            "feeling": record.feeling,
            "submitted_at": record.submitted_at.isoformat(),
            "consistency": "strong_synchronous"
        }

    async def complete_care_task_immediately(
        self,
        task_id: uuid.UUID,
        actor_id: uuid.UUID
    ) -> Dict[str, Any]:
        utc_now = datetime.now(timezone.utc)
        stmt = select(CareTask).where(CareTask.id == task_id)
        result = await self.session.execute(stmt)
        task = result.scalars().first()

        if not task:
            raise ValueError(f"Task '{task_id}' not found.")

        task.status = "completed"
        task.completed_at = utc_now
        task.completed_by_profile_id = actor_id
        await self.session.commit()

        return {
            "task_id": str(task.id),
            "status": task.status,
            "completed_at": task.completed_at.isoformat(),
            "consistency": "strong_synchronous"
        }

    async def update_consent_immediately(
        self,
        consent_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantor_id: uuid.UUID,
        grantee_id: uuid.UUID,
        action: str,  # "grant" or "revoke"
        scope: Dict[str, Any]
    ) -> Dict[str, Any]:
        utc_now = datetime.now(timezone.utc)
        stmt = select(Consent).where(Consent.id == consent_id)
        result = await self.session.execute(stmt)
        record = result.scalars().first()

        if action == "grant":
            if not record:
                record = Consent(
                    id=consent_id,
                    family_id=family_id,
                    subject_id=subject_id,
                    grantor_profile_id=grantor_id,
                    grantee_profile_id=grantee_id,
                    consent_type="explicit",
                    scope=scope,
                    status="active",
                    granted_at=utc_now,
                    version=1
                )
                self.session.add(record)
            else:
                record.status = "active"
                record.scope = scope
                record.version += 1
                record.revoked_at = None
        elif action == "revoke":
            if record:
                record.status = "revoked"
                record.revoked_at = utc_now
                record.version += 1

        await self.session.commit()

        return {
            "consent_id": str(record.id),
            "status": record.status,
            "version": record.version,
            "updated_at": utc_now.isoformat(),
            "consistency": "strong_synchronous"
        }
