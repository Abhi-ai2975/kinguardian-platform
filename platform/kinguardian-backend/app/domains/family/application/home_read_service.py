"""
FamilyHomeReadService - High-Performance Read Aggregator for Family Home Screen.
Aggregates:
1. Family Core Summary
2. Parent / Care Subject Status
3. Recent Check-ins
4. Guardian Moments (AI Insights)
5. Medication Status & Adherence
6. Clinical Appointments
7. Care Tasks
8. Unread Notifications & Alerts

Performance Strategy:
- Executes parallel sub-queries using asyncio.gather.
- Selective Redis caching: Caches relatively static family metadata while keeping
  real-time streams (adherence, notifications, live check-ins) dynamic.
- Strictly enforces server-side tenancy and membership authorization.
"""

import asyncio
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.redis import RedisCacheService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository
)
from app.domains.family.domain.exceptions import FamilyAccessError
from app.domains.family.domain.entities import CareSubjectEntity
from app.domains.family.infrastructure.models import (
    WellbeingCheckin,
    AIInsight,
    MedicationAdherenceEvent,
    AppointmentCoordination,
    CareTask,
    Notification
)


class FamilyHomeAggregateResponse(BaseModel):
    family: Dict[str, Any]
    parents: List[Dict[str, Any]]
    recent_checkins: List[Dict[str, Any]]
    guardian_moments: List[Dict[str, Any]]
    medication_status: List[Dict[str, Any]]
    appointments: List[Dict[str, Any]]
    care_tasks: List[Dict[str, Any]]
    notifications: List[Dict[str, Any]]
    cache_hit: bool = False
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FamilyHomeReadService:
    """
    Optimized aggregation service for the Family Home dashboard.
    """
    def __init__(
        self,
        session: AsyncSession,
        cache_service: Optional[RedisCacheService] = None
    ):
        self.session = session
        self.user_repo = SQLAlchemyAppProfileRepository(session)
        self.family_repo = SQLAlchemyFamilyRepository(session)
        self.cache_service = cache_service or RedisCacheService()

    async def get_family_home_view(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID
    ) -> FamilyHomeAggregateResponse:
        """
        Aggregates full Family Home dashboard in parallel requests.
        """
        # 1. Enforce Server-Side Tenancy & Authorization
        mem = await self.family_repo.get_member(family_id, requester_id)
        if not mem:
            raise FamilyAccessError("Requester is not an active member of this Family group.")

        # 2. Selective Caching: Check Redis for Family Core Metadata
        cached_family = self.cache_service.get_family_summary(family_id)

        # 3. Resolve Care Subjects
        subjects = await self.family_repo.list_care_subjects(family_id)
        subject_ids = [s.id for s in subjects]

        # 4. Parallel Requests Execution via asyncio.gather
        tasks = [
            self._fetch_family_core(family_id, cached_family),
            self._fetch_parents_status(subjects),
            self._fetch_recent_checkins(subject_ids),
            self._fetch_guardian_moments(subject_ids),
            self._fetch_medication_status(subject_ids),
            self._fetch_appointments(family_id, subject_ids),
            self._fetch_care_tasks(family_id),
            self._fetch_notifications(family_id)
        ]

        (
            family_core,
            parents,
            recent_checkins,
            guardian_moments,
            medication_status,
            appointments,
            care_tasks,
            notifications
        ) = await asyncio.gather(*tasks)

        # 5. Populate Redis Cache on Miss
        if not cached_family and family_core:
            self.cache_service.set_family_summary(family_id, family_core, ttl_seconds=300)

        return FamilyHomeAggregateResponse(
            family=family_core,
            parents=parents,
            recent_checkins=recent_checkins,
            guardian_moments=guardian_moments,
            medication_status=medication_status,
            appointments=appointments,
            care_tasks=care_tasks,
            notifications=notifications,
            cache_hit=bool(cached_family is not None),
            generated_at=datetime.now(timezone.utc)
        )

    # -------------------------------------------------------------------------
    # Parallel Sub-Fetchers
    # -------------------------------------------------------------------------

    async def _fetch_family_core(self, family_id: uuid.UUID, cached: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if cached:
            return cached

        fam = await self.family_repo.get_by_id(family_id)
        members = await self.family_repo.list_members(family_id)
        coord_name = "Coordinator"
        if fam and fam.primary_coordinator_profile_id:
            coord = await self.user_repo.get_by_id(fam.primary_coordinator_profile_id)
            if coord:
                coord_name = coord.display_name

        return {
            "family_id": str(family_id),
            "name": fam.name if fam else "Family Circle",
            "active_members_count": len(members),
            "coordinator_name": coord_name
        }

    async def _fetch_parents_status(self, subjects: List[CareSubjectEntity]) -> List[Dict[str, Any]]:
        results = []
        for s in subjects:
            profile = await self.user_repo.get_by_id(s.profile_id) if s.profile_id else None
            results.append({
                "subject_id": str(s.id),
                "display_name": profile.display_name if profile else "Parent",
                "relationship": s.relationship_to_coordinator or "Parent",
                "city": s.city or (profile.city if profile else None),
                "timezone": s.timezone or (profile.timezone if profile else "UTC"),
                "status": "active"
            })
        return results

    async def _fetch_recent_checkins(self, subject_ids: List[uuid.UUID]) -> List[Dict[str, Any]]:
        if not subject_ids:
            return []
        result = await self.session.execute(
            select(WellbeingCheckin)
            .where(WellbeingCheckin.subject_id.in_(subject_ids))
            .order_by(WellbeingCheckin.created_at.desc())
            .limit(10)
        )
        checkins = result.scalars().all()
        return [
            {
                "checkin_id": str(c.id),
                "subject_id": str(c.subject_id),
                "feeling": c.feeling,
                "severity": c.severity,
                "notes": c.notes,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in checkins
        ]

    async def _fetch_guardian_moments(self, subject_ids: List[uuid.UUID]) -> List[Dict[str, Any]]:
        if not subject_ids:
            return []
        result = await self.session.execute(
            select(AIInsight)
            .where(
                AIInsight.subject_id.in_(subject_ids),
                AIInsight.status == "active"
            )
            .order_by(AIInsight.created_at.desc())
            .limit(6)
        )
        insights = result.scalars().all()
        return [
            {
                "insight_id": str(i.id),
                "subject_id": str(i.subject_id),
                "type": i.type,
                "severity": i.severity,
                "title": i.title,
                "summary": i.summary,
                "recommendation": i.recommendation,
                "confidence": i.confidence
            }
            for i in insights
        ]

    async def _fetch_medication_status(self, subject_ids: List[uuid.UUID]) -> List[Dict[str, Any]]:
        if not subject_ids:
            return []
        since = datetime.now(timezone.utc) - timedelta(days=14)
        result = await self.session.execute(
            select(MedicationAdherenceEvent)
            .where(
                MedicationAdherenceEvent.subject_id.in_(subject_ids),
                MedicationAdherenceEvent.scheduled_at >= since
            )
            .order_by(MedicationAdherenceEvent.scheduled_at.desc())
        )
        events = result.scalars().all()

        # Group by subject
        subject_stats: Dict[uuid.UUID, Dict[str, Any]] = {}
        for s_id in subject_ids:
            subject_stats[s_id] = {"taken": 0, "missed": 0, "total": 0}

        for e in events:
            if e.subject_id in subject_stats:
                subject_stats[e.subject_id]["total"] += 1
                if e.status == "taken":
                    subject_stats[e.subject_id]["taken"] += 1
                elif e.status == "missed":
                    subject_stats[e.subject_id]["missed"] += 1

        summaries = []
        for s_id, stats in subject_stats.items():
            rate = round(stats["taken"] / stats["total"] * 100, 1) if stats["total"] > 0 else 100.0
            summaries.append({
                "subject_id": str(s_id),
                "adherence_rate": rate,
                "taken_count": stats["taken"],
                "missed_count": stats["missed"],
                "total_events": stats["total"],
                "timeframe_days": 14
            })
        return summaries

    async def _fetch_appointments(self, family_id: uuid.UUID, subject_ids: List[uuid.UUID]) -> List[Dict[str, Any]]:
        if not subject_ids:
            return []
        result = await self.session.execute(
            select(AppointmentCoordination)
            .where(
                AppointmentCoordination.family_id == family_id,
                AppointmentCoordination.subject_id.in_(subject_ids)
            )
            .order_by(AppointmentCoordination.created_at.desc())
            .limit(5)
        )
        appts = result.scalars().all()
        return [
            {
                "coordination_id": str(a.id),
                "subject_id": str(a.subject_id),
                "fhir_appointment_id": a.fhir_appointment_id,
                "preparation_status": a.preparation_status,
                "summary_status": a.summary_status,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in appts
        ]

    async def _fetch_care_tasks(self, family_id: uuid.UUID) -> List[Dict[str, Any]]:
        result = await self.session.execute(
            select(CareTask)
            .where(
                CareTask.family_id == family_id,
                CareTask.status.in_(["pending", "in_progress"])
            )
            .order_by(CareTask.due_at.asc())
            .limit(10)
        )
        tasks = result.scalars().all()
        return [
            {
                "task_id": str(t.id),
                "subject_id": str(t.subject_id),
                "title": t.title,
                "category": t.category,
                "priority": t.priority,
                "status": t.status,
                "due_at": t.due_at.isoformat() if t.due_at else None
            }
            for t in tasks
        ]

    async def _fetch_notifications(self, family_id: uuid.UUID) -> List[Dict[str, Any]]:
        result = await self.session.execute(
            select(Notification)
            .where(Notification.family_id == family_id)
            .order_by(Notification.created_at.desc())
            .limit(8)
        )
        notifs = result.scalars().all()
        return [
            {
                "notification_id": str(n.id),
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "priority": n.priority,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in notifs
        ]
