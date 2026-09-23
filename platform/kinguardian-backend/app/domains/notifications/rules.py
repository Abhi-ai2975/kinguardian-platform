import abc
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.domains.family.domain.interfaces import IFamilyRepository, IAppProfileRepository

logger = get_logger(__name__)


class NotificationIntent(BaseModel):
    """
    Represents an intended notification produced by a policy rule.
    Decouples domain business events from transport controllers.
    """
    recipient_profile_id: uuid.UUID
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    title: str
    body: str
    type: str = "general"
    priority: str = "normal"  # critical | high | normal | low
    action_type: Optional[str] = None
    action_payload: Dict[str, Any] = Field(default_factory=dict)
    dispatch_order: int = 1  # Lower number dispatches first (e.g. 1 = parent first, 2 = coordinator second)


class NotificationRuleContext(BaseModel):
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    event_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class BaseNotificationRule(abc.ABC):
    """
    Abstract rule for evaluating domain events into notification intents.
    Prevents hardcoding notification logic inside controllers or presentation layers.
    """
    rule_name: str
    supported_event_types: List[str]

    @abc.abstractmethod
    async def evaluate(
        self,
        context: NotificationRuleContext,
        family_repo: IFamilyRepository,
        profile_repo: IAppProfileRepository
    ) -> List[NotificationIntent]:
        pass


# ==========================================
# 1. Parent Check-in Submitted Rule
# ==========================================

class ParentCheckinSubmittedRule(BaseNotificationRule):
    """
    Rule: Parent check-in submitted → notify coordinator
    """
    rule_name = "parent_checkin_submitted_rule"
    supported_event_types = ["wellbeing_checkin_submitted", "checkin_submitted"]

    async def evaluate(
        self,
        context: NotificationRuleContext,
        family_repo: IFamilyRepository,
        profile_repo: IAppProfileRepository
    ) -> List[NotificationIntent]:
        family = await family_repo.get_by_id(context.family_id)

        if not family or not family.primary_coordinator_profile_id:
            return []

        subject = await family_repo.get_care_subject(context.subject_id) if context.subject_id else None
        subject_profile = await profile_repo.get_by_id(subject.profile_id) if (subject and subject.profile_id) else None
        parent_name = subject_profile.display_name if subject_profile else "Your parent"

        feeling = context.payload.get("feeling", "okay")
        notes = context.payload.get("notes", "")
        severity = "high" if feeling in ("poor", "bad", "terrible") else "normal"

        body = f"{parent_name} submitted a daily wellbeing check-in: Feeling {feeling}."
        if notes:
            body += f" Note: \"{notes}\""

        return [
            NotificationIntent(
                recipient_profile_id=family.primary_coordinator_profile_id,
                family_id=context.family_id,
                subject_id=context.subject_id,
                title="Parent Check-in Received",
                body=body,
                type="checkin_update",
                priority=severity,
                action_type="view_checkin",
                action_payload={"subject_id": str(context.subject_id)} if context.subject_id else {},
                dispatch_order=1
            )
        ]


# ==========================================
# 2. Medication Missed Rule
# ==========================================

class MedicationMissedRule(BaseNotificationRule):
    """
    Rule: Medication missed
    → notify parent first (dispatch_order=1)
    → notify coordinator according to policy (dispatch_order=2)
    """
    rule_name = "medication_missed_rule"
    supported_event_types = ["medication_missed", "medication_adherence_logged"]

    async def evaluate(
        self,
        context: NotificationRuleContext,
        family_repo: IFamilyRepository,
        profile_repo: IAppProfileRepository
    ) -> List[NotificationIntent]:
        status = context.payload.get("status")
        if context.event_type == "medication_adherence_logged" and status != "missed":
            return []

        intents: List[NotificationIntent] = []
        family = await family_repo.get_by_id(context.family_id)

        if not family:
            return []

        subject = await family_repo.get_care_subject(context.subject_id) if context.subject_id else None
        subject_profile = await profile_repo.get_by_id(subject.profile_id) if (subject and subject.profile_id) else None
        parent_name = subject_profile.display_name if subject_profile else "Parent"

        med_name = context.payload.get("medication_name", "prescribed dose")

        # 1. Notify Parent FIRST (dispatch_order=1)
        if subject and subject.profile_id:
            intents.append(
                NotificationIntent(
                    recipient_profile_id=subject.profile_id,
                    family_id=context.family_id,
                    subject_id=context.subject_id,
                    title="Missed Medication Dose",
                    body=f"You missed your scheduled {med_name}. Please take it as soon as possible or consult your caregiver.",
                    type="medication_alert",
                    priority="high",
                    action_type="log_adherence",
                    action_payload={"medication_name": med_name},
                    dispatch_order=1
                )
            )

        # 2. Notify Coordinator SECOND (dispatch_order=2)
        if family.primary_coordinator_profile_id:
            # Policy: Coordinator is notified when dose is missed
            intents.append(
                NotificationIntent(
                    recipient_profile_id=family.primary_coordinator_profile_id,
                    family_id=context.family_id,
                    subject_id=context.subject_id,
                    title="Medication Missed Alert",
                    body=f"{parent_name} missed their scheduled {med_name}. Automatic reminder was sent to parent.",
                    type="medication_alert",
                    priority="high",
                    action_type="view_adherence",
                    action_payload={"subject_id": str(context.subject_id)} if context.subject_id else {},
                    dispatch_order=2
                )
            )

        return intents


# ==========================================
# 3. Guardian Moment Created Rule
# ==========================================

class GuardianMomentCreatedRule(BaseNotificationRule):
    """
    Rule: Guardian moment created → notify coordinator
    """
    rule_name = "guardian_moment_created_rule"
    supported_event_types = ["guardian_moment_created", "ai_insight_generated"]

    async def evaluate(
        self,
        context: NotificationRuleContext,
        family_repo: IFamilyRepository,
        profile_repo: IAppProfileRepository
    ) -> List[NotificationIntent]:
        insight_type = context.payload.get("type", "guardian_moment")
        if context.event_type == "ai_insight_generated" and insight_type != "guardian_moment":
            return []

        family = await family_repo.get_by_id(context.family_id)

        if not family or not family.primary_coordinator_profile_id:
            return []

        title = context.payload.get("title", "New Guardian Moment Detected")
        summary = context.payload.get("summary", "New AI health insight is available.")
        severity = context.payload.get("severity", "normal")
        if severity == "critical":
            priority = "critical"
        elif severity == "warning":
            priority = "high"
        else:
            priority = "normal"

        return [
            NotificationIntent(
                recipient_profile_id=family.primary_coordinator_profile_id,
                family_id=context.family_id,
                subject_id=context.subject_id,
                title=f"Guardian Moment: {title}",
                body=summary,
                type="ai_insight",
                priority=priority,
                action_type="view_insight",
                action_payload={"insight_id": context.payload.get("insight_id")},
                dispatch_order=1
            )
        ]


# ==========================================
# 4. Appointment Tomorrow Rule
# ==========================================

class AppointmentTomorrowRule(BaseNotificationRule):
    """
    Rule: Appointment tomorrow
    → notify parent
    → notify assigned caregiver / coordinator
    """
    rule_name = "appointment_tomorrow_rule"
    supported_event_types = ["appointment_reminder_tomorrow", "appointment_scheduled_tomorrow"]

    async def evaluate(
        self,
        context: NotificationRuleContext,
        family_repo: IFamilyRepository,
        profile_repo: IAppProfileRepository
    ) -> List[NotificationIntent]:
        family = await family_repo.get_by_id(context.family_id)

        if not family:
            return []

        subject = await family_repo.get_care_subject(context.subject_id) if context.subject_id else None
        subject_profile = await profile_repo.get_by_id(subject.profile_id) if (subject and subject.profile_id) else None
        parent_name = subject_profile.display_name if subject_profile else "Parent"

        appt_time = context.payload.get("appointment_time", "tomorrow")
        doctor_name = context.payload.get("doctor_name", "your physician")

        intents: List[NotificationIntent] = []

        # 1. Notify Parent (Care Subject)
        if subject and subject.profile_id:
            intents.append(
                NotificationIntent(
                    recipient_profile_id=subject.profile_id,
                    family_id=context.family_id,
                    subject_id=context.subject_id,
                    title="Appointment Reminder: Tomorrow",
                    body=f"Reminder: You have a scheduled appointment with {doctor_name} at {appt_time}.",
                    type="appointment_reminder",
                    priority="high",
                    action_type="view_appointment",
                    action_payload={"appointment_id": context.payload.get("appointment_id")},
                    dispatch_order=1
                )
            )

        # 2. Notify Assigned Caregiver / Coordinator
        caregiver_id = context.payload.get("assigned_caregiver_profile_id")
        target_caregiver_id = uuid.UUID(str(caregiver_id)) if caregiver_id else family.primary_coordinator_profile_id

        if target_caregiver_id and (not subject or target_caregiver_id != subject.profile_id):
            intents.append(
                NotificationIntent(
                    recipient_profile_id=target_caregiver_id,
                    family_id=context.family_id,
                    subject_id=context.subject_id,
                    title="Upcoming Appointment Tomorrow",
                    body=f"{parent_name} has a scheduled doctor visit tomorrow ({appt_time}). Visit agenda is prepared.",
                    type="appointment_reminder",
                    priority="high",
                    action_type="view_appointment",
                    action_payload={"appointment_id": context.payload.get("appointment_id")},
                    dispatch_order=2
                )
            )

        return intents


# ==========================================
# Notification Policy Engine
# ==========================================

class NotificationPolicyEngine:
    """
    Notification Policy Engine:
    Evaluates domain events through decoupled declarative rules without hardcoding
    notification logic into presentation controllers.
    """

    DEFAULT_RULES: List[BaseNotificationRule] = [
        ParentCheckinSubmittedRule(),
        MedicationMissedRule(),
        GuardianMomentCreatedRule(),
        AppointmentTomorrowRule()
    ]

    def __init__(
        self,
        family_repo: IFamilyRepository,
        profile_repo: IAppProfileRepository,
        rules: Optional[List[BaseNotificationRule]] = None
    ):
        self.family_repo = family_repo
        self.profile_repo = profile_repo
        self.rules = rules or list(self.DEFAULT_RULES)

    def register_rule(self, rule: BaseNotificationRule) -> None:
        self.rules.append(rule)

    async def evaluate_event(
        self,
        event_type: str,
        family_id: uuid.UUID,
        payload: Dict[str, Any],
        subject_id: Optional[uuid.UUID] = None
    ) -> List[NotificationIntent]:
        """
        Evaluates matching rules for a domain event and returns ordered NotificationIntent objects.
        """
        context = NotificationRuleContext(
            family_id=family_id,
            subject_id=subject_id,
            event_type=event_type,
            payload=payload
        )

        all_intents: List[NotificationIntent] = []
        for rule in self.rules:
            if event_type in rule.supported_event_types:
                try:
                    intents = await rule.evaluate(context, self.family_repo, self.profile_repo)
                    all_intents.extend(intents)
                except Exception as e:
                    logger.error(f"Error evaluating rule '{rule.rule_name}': {e}", exc_info=True)

        # Sort intents by dispatch_order (e.g. parent first, coordinator second)
        all_intents.sort(key=lambda x: x.dispatch_order)
        return all_intents
