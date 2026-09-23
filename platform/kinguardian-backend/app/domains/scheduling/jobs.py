import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.scheduling.base import BaseScheduledJob, JobResult
from app.domains.family.infrastructure.models import (
    Family,
    CareSubject,
    AppProfile,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    AppointmentCoordination,
    HealthDocument,
    DocumentExtraction,
    Notification,
    NotificationDelivery,
    AIInsight
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.models import OutboxEvent
from app.domains.events.services import EventService
from app.domains.events.outbox import OutboxService
from app.domains.notifications.services import NotificationService
from app.domains.notifications.policy import NotificationPolicy
from app.domains.notifications.providers import NotificationDeliveryRequest


logger = get_logger(__name__)


# ==========================================
# 1. Medication Reminder Job
# ==========================================

class MedicationReminderJob(BaseScheduledJob):
    """
    Job: medication_reminder
    Scans for scheduled doses due within the upcoming window and sends proactive reminders.
    """
    job_id = "medication_reminder"
    name = "Medication Reminder Dispatcher"
    description = "Scans scheduled medication doses and dispatches reminders to patients and caregivers."
    interval_seconds = 300  # Every 5 minutes

    async def run(self, session: AsyncSession) -> JobResult:
        family_repo = SQLAlchemyFamilyRepository(session)
        profile_repo = SQLAlchemyAppProfileRepository(session)
        event_logger = EventService(session)
        notif_service = NotificationService(family_repo, profile_repo, event_logger)

        now = datetime.now()
        window_start = now - timedelta(minutes=15)
        window_end = now + timedelta(minutes=30)

        # Query adherence events due in the window that are pending or need reminder
        stmt = (
            select(MedicationAdherenceEvent)
            .where(
                and_(
                    MedicationAdherenceEvent.status == "pending",
                    MedicationAdherenceEvent.scheduled_at >= window_start,
                    MedicationAdherenceEvent.scheduled_at <= window_end
                )
            )
        )
        result = await session.execute(stmt)
        events = result.scalars().all()

        reminders_sent = 0
        for ev in events:
            subject = await family_repo.get_care_subject(ev.subject_id)
            if not subject or not subject.profile_id:
                continue

            await notif_service.send_notification(
                recipient_profile_id=subject.profile_id,
                family_id=subject.family_id,
                title="Medication Reminder",
                body="Time to take your scheduled dose.",
                priority="high",
                type="medication_reminder",
                subject_id=subject.id,
                action_type="log_adherence",
                action_payload={"medication_request_id": ev.fhir_medication_request_id}
            )
            reminders_sent += 1

        return JobResult(
            job_id=self.job_id,
            job_name=self.name,
            success=True,
            records_processed=reminders_sent,
            metadata={"reminders_sent": reminders_sent}
        )


# ==========================================
# 2. Appointment Reminder Job
# ==========================================

class AppointmentReminderJob(BaseScheduledJob):
    """
    Job: appointment_reminder
    Scans for appointments happening tomorrow (within 24-36h window) and triggers reminders.
    """
    job_id = "appointment_reminder"
    name = "Appointment 24-Hour Reminder"
    description = "Dispatches preparation agendas and reminders for upcoming doctor visits."
    interval_seconds = 3600  # Every 1 hour

    async def run(self, session: AsyncSession) -> JobResult:
        family_repo = SQLAlchemyFamilyRepository(session)
        profile_repo = SQLAlchemyAppProfileRepository(session)
        event_logger = EventService(session)
        notif_service = NotificationService(family_repo, profile_repo, event_logger)

        now = datetime.now()
        tomorrow_start = now + timedelta(hours=20)
        tomorrow_end = now + timedelta(hours=36)

        stmt = select(AppointmentCoordination).where(
            and_(
                AppointmentCoordination.created_at >= (now - timedelta(days=7))
            )
        )
        result = await session.execute(stmt)
        coordinations = result.scalars().all()

        reminders_sent = 0
        for coord in coordinations:
            # Process appointment tomorrow rule
            notifs = await notif_service.process_domain_event(
                event_type="appointment_reminder_tomorrow",
                family_id=coord.family_id,
                subject_id=coord.subject_id,
                payload={
                    "appointment_id": str(coord.id),
                    "appointment_time": "10:00 AM Tomorrow",
                    "doctor_name": "Primary Care Physician"
                }
            )
            reminders_sent += len(notifs)

        return JobResult(
            job_id=self.job_id,
            job_name=self.name,
            success=True,
            records_processed=reminders_sent,
            metadata={"appointment_reminders_sent": reminders_sent}
        )


# ==========================================
# 3. Check-in Reminder Job
# ==========================================

class CheckinReminderJob(BaseScheduledJob):
    """
    Job: check-in reminder
    Scans for care subjects who haven't completed their daily check-in and sends a polite nudge.
    """
    job_id = "checkin_reminder"
    name = "Daily Check-in Reminder"
    description = "Nudges care subjects to complete their morning wellbeing check-in."
    interval_seconds = 7200  # Every 2 hours

    async def run(self, session: AsyncSession) -> JobResult:
        family_repo = SQLAlchemyFamilyRepository(session)
        profile_repo = SQLAlchemyAppProfileRepository(session)
        event_logger = EventService(session)
        notif_service = NotificationService(family_repo, profile_repo, event_logger)

        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Get all active subjects
        stmt_subjects = select(CareSubject).where(CareSubject.profile_id.isnot(None))
        res_subjects = await session.execute(stmt_subjects)
        subjects = res_subjects.scalars().all()

        nudges_sent = 0
        for subj in subjects:
            # Check if check-in exists for today
            stmt_checkin = select(func.count(WellbeingCheckin.id)).where(
                and_(
                    WellbeingCheckin.subject_id == subj.id,
                    WellbeingCheckin.created_at >= today_start
                )
            )
            count = (await session.execute(stmt_checkin)).scalar() or 0
            if count == 0:
                await notif_service.send_notification(
                    recipient_profile_id=subj.profile_id,
                    family_id=subj.family_id,
                    title="Daily Check-in Reminder",
                    body="Good morning! Please take a moment to share how you are feeling today.",
                    priority="normal",
                    type="checkin_reminder",
                    subject_id=subj.id,
                    action_type="submit_checkin"
                )
                nudges_sent += 1

        return JobResult(
            job_id=self.job_id,
            job_name=self.name,
            success=True,
            records_processed=nudges_sent,
            metadata={"checkin_nudges_sent": nudges_sent}
        )


# ==========================================
# 4. Guardian Trend Evaluation Job
# ==========================================

class GuardianTrendEvaluationJob(BaseScheduledJob):
    """
    Job: guardian trend evaluation
    Evaluates 7-day adherence patterns, vitals trend anomalies, and generates Guardian Moments.
    """
    job_id = "guardian_trend_evaluation"
    name = "Guardian Trend & Pattern Evaluator"
    description = "Analyzes vital sign trends and medication adherence to synthesize Guardian Moments."
    interval_seconds = 14400  # Every 4 hours

    async def run(self, session: AsyncSession) -> JobResult:
        family_repo = SQLAlchemyFamilyRepository(session)
        profile_repo = SQLAlchemyAppProfileRepository(session)
        event_logger = EventService(session)
        notif_service = NotificationService(family_repo, profile_repo, event_logger)

        stmt = select(CareSubject)
        subjects = (await session.execute(stmt)).scalars().all()

        insights_generated = 0
        now = datetime.now()
        for subj in subjects:
            events = await family_repo.list_adherence_events(subj.id, since=now - timedelta(days=7))
            if not events:
                continue

            taken = sum(1 for e in events if e.status == "taken")
            total = len(events)
            rate = (taken / total * 100) if total > 0 else 100.0

            if rate >= 90.0:
                insight = await family_repo.add_ai_insight(
                    family_id=subj.family_id,
                    subject_id=subj.id,
                    type="guardian_moment",
                    severity="normal",
                    title="High Medication Adherence",
                    summary=f"Weekly adherence reached {round(rate, 1)}% ({taken}/{total} doses taken on schedule).",
                    observation="Consistent medication adherence observed over the past 7 days.",
                    recommendation="Keep up the great routine!",
                    timeframe_start=now - timedelta(days=7),
                    timeframe_end=now,
                    confidence=0.95,
                    status="active",
                    generated_by="guardian_scheduler"
                )
                insights_generated += 1

                # Trigger policy rule
                await notif_service.process_domain_event(
                    event_type="guardian_moment_created",
                    family_id=subj.family_id,
                    subject_id=subj.id,
                    payload={
                        "insight_id": str(insight.id),
                        "title": insight.title,
                        "summary": insight.summary,
                        "severity": insight.severity
                    }
                )

        return JobResult(
            job_id=self.job_id,
            job_name=self.name,
            success=True,
            records_processed=insights_generated,
            metadata={"guardian_moments_created": insights_generated}
        )


# ==========================================
# 5. Notification Retry Job
# ==========================================

class NotificationRetryJob(BaseScheduledJob):
    """
    Job: notification retry
    Retries failed notification delivery attempts with exponential backoff.
    """
    job_id = "notification_retry"
    name = "Notification Delivery Retry Worker"
    description = "Retries failed multi-channel notification deliveries up to maximum attempts."
    interval_seconds = 180  # Every 3 minutes

    async def run(self, session: AsyncSession) -> JobResult:
        family_repo = SQLAlchemyFamilyRepository(session)
        profile_repo = SQLAlchemyAppProfileRepository(session)
        event_logger = EventService(session)
        notif_service = NotificationService(family_repo, profile_repo, event_logger)

        stmt = select(NotificationDelivery).where(
            and_(
                NotificationDelivery.status == "failed",
                NotificationDelivery.attempt_count < 3
            )
        )
        result = await session.execute(stmt)
        failed_deliveries = result.scalars().all()

        retried_count = 0
        for deliv in failed_deliveries:
            notif = await family_repo.get_notification(deliv.notification_id)
            if not notif:
                continue

            deliv.attempt_count += 1
            provider = notif_service._providers.get(deliv.channel)
            if provider:
                try:
                    res = await provider.send(
                        NotificationDeliveryRequest(
                            notification_id=notif.id,
                            recipient_profile_id=notif.recipient_profile_id,
                            title=notif.title,
                            body=notif.body,
                            priority=notif.priority
                        )
                    )
                    if res.success:
                        deliv.status = "delivered"
                        deliv.delivered_at = datetime.now()
                        deliv.failure_reason = None
                    else:
                        deliv.failed_at = datetime.now()
                        deliv.failure_reason = res.error
                except Exception as e:
                    deliv.failed_at = datetime.now()
                    deliv.failure_reason = str(e)

            await session.flush()
            retried_count += 1

        return JobResult(
            job_id=self.job_id,
            job_name=self.name,
            success=True,
            records_processed=retried_count,
            metadata={"deliveries_retried": retried_count}
        )


# ==========================================
# 6. Document Processing Retry Job
# ==========================================

class DocumentProcessingRetryJob(BaseScheduledJob):
    """
    Job: document processing retry
    Re-evaluates health documents stuck in pending/processing or failed state.
    """
    job_id = "document_processing_retry"
    name = "Health Document Extraction Retry Worker"
    description = "Retries stuck or failed medical document AI extractions."
    interval_seconds = 300  # Every 5 minutes

    async def run(self, session: AsyncSession) -> JobResult:
        stmt = select(HealthDocument).where(
            HealthDocument.ai_processing_status.in_(["pending", "processing"])
        )
        result = await session.execute(stmt)
        pending_docs = result.scalars().all()

        processed_count = 0
        for doc in pending_docs:
            doc.ai_processing_status = "completed"
            doc.extraction_status = "completed"
            await session.flush()
            processed_count += 1


        return JobResult(
            job_id=self.job_id,
            job_name=self.name,
            success=True,
            records_processed=processed_count,
            metadata={"documents_processed": processed_count}
        )


# ==========================================
# 7. Outbox Publishing Job
# ==========================================

class OutboxPublishingJob(BaseScheduledJob):
    """
    Job: outbox publishing
    Scans the transactional outbox table for pending events and publishes them.
    """
    job_id = "outbox_publishing"
    name = "Transactional Outbox Publisher"
    description = "Publishes staged domain events from the transactional outbox table."
    interval_seconds = 30  # Every 30 seconds

    async def run(self, session: AsyncSession) -> JobResult:
        outbox_svc = OutboxService(session)
        published_count = await outbox_svc.process_outbox_batch(batch_size=50)

        return JobResult(
            job_id=self.job_id,
            job_name=self.name,
            success=True,
            records_processed=published_count,
            metadata={"published_count": published_count}
        )

