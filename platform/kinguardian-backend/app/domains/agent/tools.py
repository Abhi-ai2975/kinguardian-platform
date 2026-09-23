import abc
import uuid
from typing import Dict, Any, List, Optional, Type
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.domains.family.domain.exceptions import FamilyAccessError
from app.domains.family.domain.interfaces import IFamilyRepository, IConsentRepository, IAppProfileRepository, IEventLogger
from app.domains.clinical.gateway import ClinicalRecordGateway, FHIRClinicalRecordGateway
from app.domains.wearables.gateway import IOpenWearablesGateway, HttpOpenWearablesGateway

logger = get_logger(__name__)


# ==========================================
# Tool Context & Result Models
# ==========================================

class AgentToolContext(BaseModel):
    """
    Caller context passed to every domain tool execution.
    Contains Actor, Family, target Subject, and requested scope for least-privilege authorization.

    INVARIANT: The LLM does NOT decide whether a user is allowed to see wearable data;
    the tool runtime independently verifies authorization against deterministic consent grants.
    """
    actor_id: uuid.UUID
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    requested_scope: Optional[str] = None
    session_id: Optional[str] = None
    permissions_override: Optional[Dict[str, bool]] = None


class AgentToolResult(BaseModel):
    """
    Standardized result returned by domain tools to the bezs-agent runtime.
    """
    tool_name: str
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    disclaimer: Optional[str] = None
    executed_at: datetime = Field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "disclaimer": self.disclaimer,
            "executed_at": self.executed_at.isoformat()
        }


# ==========================================
# Abstract Domain Tool
# ==========================================

class KinGuardianDomainTool(abc.ABC):
    """
    Base class for all KinGuardian domain tools exposed to bezs-agent.
    Enforces independent authorization and least privilege.
    """
    name: str
    description: str
    required_permission: str  # e.g. "profile", "medications", "adherence", "vitals", "labs", "appointments", "family", "care_tasks", "messages", "insights", "wearables"
    required_scope: Optional[str] = None  # Granular consent scope (e.g. view_wearable_sleep, view_wearable_summary)
    parameters_schema: Dict[str, Any]

    def __init__(
        self,
        family_repo: IFamilyRepository,
        consent_repo: IConsentRepository,
        profile_repo: IAppProfileRepository,
        event_logger: IEventLogger,
        gateway: Optional[ClinicalRecordGateway] = None,
        wearable_gateway: Optional[IOpenWearablesGateway] = None
    ):
        self.family_repo = family_repo
        self.consent_repo = consent_repo
        self.profile_repo = profile_repo
        self.event_logger = event_logger
        self.gateway = gateway or FHIRClinicalRecordGateway()
        self.wearable_gateway = wearable_gateway or HttpOpenWearablesGateway()


    async def check_authorization(self, context: AgentToolContext, target_subject_id: Optional[uuid.UUID] = None) -> bool:
        """
        Independent Authorization Verification:
        Receives: actor, family, subject, and requested scope.
        The tool independently verifies authorization without relying on LLM discretion.
        """
        # 1. Family membership check (Actor + Family)
        membership = await self.family_repo.get_member(context.family_id, context.actor_id)
        if not membership or membership.status != "active":
            return False

        # Family-wide tools (family roster, messages) require active membership only
        if self.required_permission in ("family", "messages"):
            return True

        # Subject-specific tools (Subject)
        subj_id = target_subject_id or context.subject_id
        if not subj_id:
            return False

        subject = await self.family_repo.get_care_subject(subj_id)
        if not subject or subject.family_id != context.family_id:
            return False

        # Self-access
        if subject.profile_id == context.actor_id:
            return True

        # Basic profile / care tasks / checkins permitted for active family members if not explicitly revoked
        if self.required_permission in ("profile", "care_tasks", "check_ins", "insights"):
            if not subject.profile_id:
                return True
            consent = await self.consent_repo.get_consent(
                family_id=context.family_id,
                subject_id=subj_id,
                grantor_profile_id=subject.profile_id,
                grantee_profile_id=context.actor_id
            )
            if consent and consent.status == "active":
                scope = consent.scope or {}
                return scope.get(self.required_permission, True) is not False
            return True

        # Sensitive clinical and wearable permissions require explicit consent
        if not subject.profile_id:
            return False

        consent = await self.consent_repo.get_consent(
            family_id=context.family_id,
            subject_id=subj_id,
            grantor_profile_id=subject.profile_id,
            grantee_profile_id=context.actor_id
        )
        if not consent or consent.status != "active":
            return False
        if consent.expires_at and consent.expires_at <= datetime.now():
            return False

        scope = consent.scope or {}
        # Effective scope evaluated: requested scope from context or tool required scope/permission
        effective_scope = context.requested_scope or self.required_scope or self.required_permission

        # Check granular scope grant
        if scope.get(effective_scope) is True:
            return True
        # Check parent wearable scope if applicable
        if self.required_permission == "wearables" and scope.get("wearables") is True:
            # If the user specifically had this granular scope explicitly denied (False), block it
            if scope.get(effective_scope) is False:
                return False
            return True
        if self.required_permission == "adherence" and scope.get("medications") is True:
            return True
        if self.required_permission == "labs" and scope.get("documents") is True:
            return True

        return False


    @abc.abstractmethod
    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        """Internal execution logic after authorization is confirmed."""
        pass

    async def execute(self, params: Dict[str, Any], context: AgentToolContext) -> AgentToolResult:
        """
        Public entrypoint for bezs-agent execution.
        Guarantees independent authorization verification before running the tool.
        """
        target_subj_id = None
        if "subject_id" in params:
            try:
                target_subj_id = uuid.UUID(str(params["subject_id"]))
            except ValueError:
                pass

        authorized = await self.check_authorization(context, target_subj_id)
        if not authorized:
            logger.warning(
                f"Agent Tool Access Denied: Actor {context.actor_id} unauthorized for tool '{self.name}' "
                f"requiring permission '{self.required_permission}'."
            )
            return AgentToolResult(
                tool_name=self.name,
                success=False,
                error=(
                    f"Authorization Denied: Actor does not possess active consent or permission for "
                    f"scope '{self.required_permission}'."
                )
            )

        try:
            data = await self.run(params, context)
            return AgentToolResult(
                tool_name=self.name,
                success=True,
                data=data
            )
        except Exception as e:
            logger.error(f"Error executing tool '{self.name}': {e}", exc_info=True)
            return AgentToolResult(
                tool_name=self.name,
                success=False,
                error=f"Execution error: {str(e)}"
            )


# Platform alias
KinGuardianDomainTool = KinGuardianDomainTool


# ==========================================
# 12 Domain Tool Implementations
# ==========================================


class GetParentSummaryTool(KinGuardianDomainTool):
    name = "get_parent_summary"
    description = "Retrieves the profile summary of a care subject (display name, relationship, timezone, city, country)."
    required_permission = "profile"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"}
        },
        "required": []
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        if not subj_id:
            raise ValueError("subject_id is required.")
        subject = await self.family_repo.get_care_subject(subj_id)
        if not subject:
            raise ValueError(f"Subject {subj_id} not found.")
        profile = await self.profile_repo.get_by_id(subject.profile_id) if subject.profile_id else None
        return {
            "subject_id": str(subject.id),
            "display_name": profile.display_name if profile else "Care Subject",
            "relationship": subject.relationship_to_coordinator,
            "timezone": profile.timezone if profile else (subject.timezone or "UTC"),
            "city": subject.city,
            "country_code": subject.country_code,
            "fhir_patient_id": subject.fhir_patient_id
        }


class GetMedicationsTool(KinGuardianDomainTool):
    name = "get_medications"
    description = "Retrieves active clinical medication orders and prescriptions for a care subject."
    required_permission = "medications"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"}
        },
        "required": []
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        if not subj_id:
            raise ValueError("subject_id is required.")
        subject = await self.family_repo.get_care_subject(subj_id)
        if not subject or not subject.fhir_patient_id:
            return []
        try:
            med_list = await self.gateway.get_medications(subject.fhir_patient_id, status="active")
            return [
                {
                    "id": m.get("id"),
                    "name": m.get("medicationCodeableConcept", {}).get("text", "Prescription"),
                    "dosage": m.get("dosageInstruction", [{}])[0].get("text", "As prescribed"),
                    "frequency": m.get("dosageInstruction", [{}])[0].get("timing", {}).get("code", {}).get("text", "daily"),
                    "status": m.get("status", "active")
                }
                for m in med_list
            ]
        except Exception as e:
            logger.warning(f"Failed to fetch FHIR medications: {e}")
            return []


class GetMedicationAdherenceTool(KinGuardianDomainTool):
    name = "get_medication_adherence"
    description = "Retrieves medication adherence event logs, taken vs missed counts, and adherence rate."
    required_permission = "adherence"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"},
            "timeframe_days": {"type": "integer", "description": "Lookback window in days", "default": 14}
        },
        "required": []
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        days = int(params.get("timeframe_days", 14))
        since = datetime.now() - timedelta(days=days)
        events = await self.family_repo.list_adherence_events(subj_id, since=since)
        taken = sum(1 for e in events if e.status == "taken")
        missed = sum(1 for e in events if e.status == "missed")
        skipped = sum(1 for e in events if e.status == "skipped")
        total = len(events)
        rate = round((taken / total * 100), 1) if total > 0 else 100.0
        return {
            "subject_id": str(subj_id),
            "adherence_rate": rate,
            "total_events": total,
            "taken_count": taken,
            "missed_count": missed,
            "skipped_count": skipped,
            "timeframe_days": days
        }


class GetRecentVitalsTool(KinGuardianDomainTool):
    name = "get_recent_vitals"
    description = "Retrieves recent vital sign observations (Blood Pressure, Heart Rate, SpO2, Glucose)."
    required_permission = "vitals"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"}
        },
        "required": []
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        subject = await self.family_repo.get_care_subject(subj_id)
        if not subject or not subject.fhir_patient_id:
            return []
        try:
            obs_list = await self.gateway.get_observations(subject.fhir_patient_id, category="vital-signs")
            return [
                {
                    "code": o.get("code", {}).get("text", "Vital Sign"),
                    "value": o.get("valueQuantity", {}).get("value", 0),
                    "unit": o.get("valueQuantity", {}).get("unit", ""),
                    "effective_datetime": o.get("effectiveDateTime", "")
                }
                for o in obs_list
            ]
        except Exception as e:
            logger.warning(f"Failed to fetch FHIR vitals: {e}")
            return []


class GetRecentLabsTool(KinGuardianDomainTool):
    name = "get_recent_labs"
    description = "Retrieves extracted laboratory test results, values, units, and reference flags."
    required_permission = "labs"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"}
        },
        "required": []
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        docs = await self.family_repo.list_health_documents_for_subject(subj_id)
        results = []
        for d in docs:
            if d.document_type == "lab_report":
                extractions = await self.family_repo.list_document_extractions(d.id)
                for ext in extractions:
                    normalized = ext.normalized_output or {}
                    for item in normalized.get("lab_results", []):
                        results.append({
                            "test_name": item.get("test", "Diagnostic Test"),
                            "result": item.get("value", ""),
                            "flag": item.get("flag", "normal"),
                            "date": d.created_at.strftime("%Y-%m-%d")
                        })
        return results


class GetAppointmentsTool(KinGuardianDomainTool):
    name = "get_appointments"
    description = "Retrieves upcoming clinical appointments and doctor visit preparation statuses."
    required_permission = "appointments"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"}
        },
        "required": []
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        coords = await self.family_repo.list_appointment_coordinations(context.family_id, subj_id)
        return [
            {
                "coordination_id": str(c.id),
                "fhir_appointment_id": c.fhir_appointment_id,
                "preparation_status": c.preparation_status,
                "summary_status": c.summary_status,
                "created_at": c.created_at.strftime("%Y-%m-%d %H:%M")
            }
            for c in coords
        ]


class GetHealthTimelineTool(KinGuardianDomainTool):
    name = "get_health_timeline"
    description = "Assembles a unified chronological timeline of check-ins, vitals, adherence logs, and appointments."
    required_permission = "profile"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"},
            "timeframe_days": {"type": "integer", "description": "Lookback period in days", "default": 7}
        },
        "required": []
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        days = int(params.get("timeframe_days", 7))
        since = datetime.now() - timedelta(days=days)

        timeline = []
        # Checkins
        checkins = await self.family_repo.list_checkins_for_subject(subj_id)
        for c in checkins:
            if c.created_at >= since:
                timeline.append({
                    "event_type": "checkin",
                    "timestamp": c.created_at.isoformat(),
                    "summary": f"Feeling {c.feeling} (Severity: {c.severity})",
                    "details": c.notes
                })

        # Adherence
        events = await self.family_repo.list_adherence_events(subj_id, since=since)
        for e in events:
            timeline.append({
                "event_type": "medication_adherence",
                "timestamp": e.scheduled_at.isoformat(),
                "summary": f"Dose {e.status} (Rx: {e.fhir_medication_request_id})",
                "details": f"Confirmed by {e.source}"
            })

        timeline.sort(key=lambda x: x["timestamp"], reverse=True)
        return timeline


class GetFamilyMembersTool(KinGuardianDomainTool):
    name = "get_family_members"
    description = "Retrieves the active family member roster, roles, and contacts within the Care Circle."
    required_permission = "family"
    parameters_schema = {
        "type": "object",
        "properties": {},
        "required": []
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        members = await self.family_repo.list_members(context.family_id)
        res = []
        for m in members:
            p = await self.profile_repo.get_by_id(m.profile_id)
            res.append({
                "profile_id": str(m.profile_id),
                "display_name": p.display_name if p else "Member",
                "role": m.membership_role,
                "status": m.status,
                "email": p.email if p else None,
                "timezone": p.timezone if p else "UTC"
            })
        return res


class CreateCareTaskTool(KinGuardianDomainTool):
    name = "create_care_task"
    description = "Creates or proposes a care coordination follow-up task."
    required_permission = "care_tasks"
    parameters_schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Title of the task"},
            "category": {"type": "string", "description": "medication | vital_check | appointment | general"},
            "priority": {"type": "string", "description": "low | medium | high"},
            "due_days": {"type": "integer", "description": "Due in N days", "default": 1},
            "subject_id": {"type": "string", "description": "UUID of the care subject"}
        },
        "required": ["title"]
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        title = params["title"]
        category = params.get("category", "general")
        priority = params.get("priority", "medium")
        due_days = int(params.get("due_days", 1))

        task = await self.family_repo.add_care_task(
            family_id=context.family_id,
            subject_id=subj_id,
            created_by_profile_id=context.actor_id,
            assigned_to_profile_id=context.actor_id,
            title=title,
            description=params.get("description", "Created via AI Agent Tool"),
            category=category,
            priority=priority,
            due_at=datetime.now() + timedelta(days=due_days)
        )
        return {
            "task_id": str(task.id),
            "title": task.title,
            "status": task.status,
            "due_at": task.due_at.isoformat()
        }


class SendFamilyMessageTool(KinGuardianDomainTool):
    name = "send_family_message"
    description = "Sends a message to the Family Care Circle conversation."
    required_permission = "messages"
    parameters_schema = {
        "type": "object",
        "properties": {
            "conversation_id": {"type": "string", "description": "UUID of the family conversation"},
            "message": {"type": "string", "description": "Message body to send"}
        },
        "required": ["message"]
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        body = params["message"]
        conv_id = None
        if "conversation_id" in params:
            conv_id = uuid.UUID(str(params["conversation_id"]))
        else:
            convs = await self.family_repo.list_conversations(context.family_id)
            if convs:
                conv_id = convs[0].id

        if not conv_id:
            conv = await self.family_repo.create_conversation(context.family_id, subject_id=context.subject_id)
            conv_id = conv.id


        msg = await self.family_repo.add_message(
            conversation_id=conv_id,
            sender_profile_id=context.actor_id,
            message_type="text",
            body=body
        )
        return {
            "message_id": str(msg.id),
            "conversation_id": str(conv_id),
            "body": msg.body,
            "created_at": msg.created_at.isoformat()
        }


class PrepareAppointmentTool(KinGuardianDomainTool):
    name = "prepare_appointment"
    description = "Generates clinical consultation agenda and doctor questions ahead of an upcoming visit."
    required_permission = "appointments"
    parameters_schema = {
        "type": "object",
        "properties": {
            "appointment_id": {"type": "string", "description": "UUID or FHIR ID of the appointment"}
        },
        "required": ["appointment_id"]
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        appt_id = str(params["appointment_id"])
        coord = None
        try:
            coord_uuid = uuid.UUID(appt_id)
            coord = await self.family_repo.get_appointment_coordination(coord_uuid)
        except ValueError:
            pass

        if not coord:
            coord = await self.family_repo.get_appointment_coordination_by_fhir_id(appt_id)

        if coord:
            await self.family_repo.update_appointment_coordination(
                coordination_id=coord.id,
                preparation_status="ready"
            )

        return {
            "appointment_id": appt_id,
            "preparation_status": "ready",
            "agenda": "Review vital trends and medication tolerance with physician.",
            "questions_for_doctor": [
                "How do the latest blood pressure trends compare to the target baseline?",
                "Are any dosage adjustments recommended?"
            ]
        }


class CreateInsightTool(KinGuardianDomainTool):
    name = "create_insight"
    description = "Creates a clinical insight or Guardian Moment for the Care Subject."
    required_permission = "insights"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"},
            "title": {"type": "string", "description": "Insight title"},
            "summary": {"type": "string", "description": "Executive summary"},
            "severity": {"type": "string", "description": "info | warning | critical", "default": "info"},
            "recommendation": {"type": "string", "description": "Actionable recommendation"}
        },
        "required": ["title", "summary"]
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"])) if "subject_id" in params else context.subject_id
        title = params["title"]
        summary = params["summary"]
        severity = params.get("severity", "info")
        recommendation = params.get("recommendation", "Continue scheduled monitoring.")

        now = datetime.now()
        insight = await self.family_repo.add_ai_insight(
            family_id=context.family_id,
            subject_id=subj_id,
            type="guardian_moment",
            severity=severity,
            title=title,
            summary=summary,
            observation=summary,
            timeframe_start=now - timedelta(days=7),
            timeframe_end=now,
            recommendation=recommendation,
            confidence=0.92,
            status="active",
            generated_by="bezs_agent"
        )
        return {
            "insight_id": str(insight.id),
            "title": insight.title,
            "severity": insight.severity,
            "recommendation": insight.recommendation
        }


class GetWearableMetricsTool(KinGuardianDomainTool):
    name = "get_wearable_metrics"
    description = "Queries physical activity, sleep architecture, and autonomic recovery vitals synced from connected wearable devices (Garmin, Oura, Apple Health, Fitbit)."
    required_permission = "wearables"
    parameters_schema = {
        "type": "object",
        "properties": {
            "subject_id": {"type": "string", "description": "UUID of the care subject"},
            "days": {"type": "integer", "description": "Number of days of telemetry to query (default: 7)", "default": 7}
        },
        "required": ["subject_id"]
    }

    async def run(self, params: Dict[str, Any], context: AgentToolContext) -> Any:
        subj_id = uuid.UUID(str(params["subject_id"]))
        days = int(params.get("days", 7))
        gateway = self.wearable_gateway
        wearable_uid = f"kinguardian_subject_{subj_id}"
        end_d = datetime.now().strftime("%Y-%m-%d")
        start_d = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        try:
            acts = await gateway.get_activity_summaries(wearable_uid, start_d, end_d)

            slps = await gateway.get_sleep_summaries(wearable_uid, start_d, end_d)
            recs = await gateway.get_recovery_summaries(wearable_uid, start_d, end_d)
            sorted_acts = sorted(acts, key=lambda x: x.date, reverse=True) if acts else []
            sorted_slps = sorted(slps, key=lambda x: x.date, reverse=True) if slps else []
            sorted_recs = sorted(recs, key=lambda x: x.date, reverse=True) if recs else []
            return {
                "subject_id": str(subj_id),
                "days_queried": days,
                "latest_activity": sorted_acts[0].model_dump() if sorted_acts else None,
                "latest_sleep": sorted_slps[0].model_dump() if sorted_slps else None,
                "latest_recovery": sorted_recs[0].model_dump() if sorted_recs else None,
                "weekly_average_steps": int(sum(a.steps for a in acts) / len(acts)) if acts else 0
            }

        except Exception as e:
            return {
                "subject_id": str(subj_id),
                "error": str(e),
                "latest_activity": None
            }


from app.domains.agent.wearable_tools import (
    GetWearableConnectionsTool,
    GetWearableSummaryTool,
    GetActivityTrendTool,
    GetSleepTrendTool,
    GetHeartRateTrendTool,
    GetMetricHistoryTool,
    GetWearableSyncStatusTool
)


class ControlledToolRegistry:
    """
    Controlled Domain Tool Registry for bezs-agent.
    Registers domain tools, generates tool definitions, and safely executes tools
    with independent authorization checks following least privilege.

    SECURITY INVARIANT:
    - Never exposes `raw_database_query`
    - Never exposes unrestricted Open Wearables API access
    """
    TOOL_CLASSES: List[Type[KinGuardianDomainTool]] = [
        GetParentSummaryTool,
        GetMedicationsTool,
        GetMedicationAdherenceTool,
        GetRecentVitalsTool,
        GetRecentLabsTool,
        GetAppointmentsTool,
        GetHealthTimelineTool,
        GetFamilyMembersTool,
        CreateCareTaskTool,
        SendFamilyMessageTool,
        PrepareAppointmentTool,
        CreateInsightTool,
        GetWearableMetricsTool,
        GetWearableConnectionsTool,
        GetWearableSummaryTool,
        GetActivityTrendTool,
        GetSleepTrendTool,
        GetHeartRateTrendTool,
        GetMetricHistoryTool,
        GetWearableSyncStatusTool
    ]



    def __init__(
        self,
        family_repo: IFamilyRepository,
        consent_repo: IConsentRepository,
        profile_repo: IAppProfileRepository,
        event_logger: IEventLogger,
        gateway: Optional[ClinicalRecordGateway] = None,
        wearable_gateway: Optional[IOpenWearablesGateway] = None
    ):
        self.family_repo = family_repo
        self.consent_repo = consent_repo
        self.profile_repo = profile_repo
        self.event_logger = event_logger
        self.gateway = gateway or FHIRClinicalRecordGateway()
        self.wearable_gateway = wearable_gateway or HttpOpenWearablesGateway()

        self._tools: Dict[str, KinGuardianDomainTool] = {}
        for cls in self.TOOL_CLASSES:
            tool_instance = cls(
                family_repo=self.family_repo,
                consent_repo=self.consent_repo,
                profile_repo=self.profile_repo,
                event_logger=self.event_logger,
                gateway=self.gateway,
                wearable_gateway=self.wearable_gateway
            )
            self._tools[tool_instance.name] = tool_instance


    def get_tool(self, name: str) -> Optional[KinGuardianDomainTool]:
        return self._tools.get(name)

    def list_all_tools(self) -> List[KinGuardianDomainTool]:
        return list(self._tools.values())

    async def list_available_tools_for_agent(self, context: AgentToolContext) -> List[Dict[str, Any]]:
        """
        Returns bezs-agent tool schemas filtered according to least privilege and active permissions.
        """
        available = []
        for tool in self._tools.values():
            # Check if actor is eligible to see/execute this tool
            authorized = await tool.check_authorization(context)
            if authorized:
                available.append({
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters_schema,
                    "required_permission": tool.required_permission
                })
        return available

    async def execute_tool(
        self,
        name: str,
        params: Dict[str, Any],
        context: AgentToolContext
    ) -> AgentToolResult:
        """
        Executes a registered domain tool with independent authorization check.
        """
        tool = self.get_tool(name)
        if not tool:
            return AgentToolResult(
                tool_name=name,
                success=False,
                error=f"Tool '{name}' is not registered in the Controlled Tool Registry."
            )
        return await tool.execute(params, context)
