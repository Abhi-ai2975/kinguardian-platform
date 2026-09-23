import uuid
from typing import List, Optional, Dict, Any, Set
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.family.domain.exceptions import FamilyAccessError
from app.domains.clinical.gateway import ClinicalRecordGateway, FHIRClinicalRecordGateway
from app.domains.wearables.gateway import IOpenWearablesGateway, HttpOpenWearablesGateway
from app.domains.wearables.domain.baselines import WearableBaselineCalculator



logger = get_logger(__name__)

ALL_POSSIBLE_DIMENSIONS: Set[str] = {
    "family_profile",
    "parent_summary",
    "recent_observations",
    "medications",
    "adherence",
    "appointments",
    "labs",
    "documents",
    "check_ins",
    "previous_ai_insights",
    "care_tasks",
    "wearables"
}

# Mapping of clinical dimensions to required consent scope keys
DIMENSION_CONSENT_MAP = {
    "recent_observations": "vitals",
    "medications": "medications",
    "adherence": "adherence",
    "appointments": "appointments",
    "labs": "labs",
    "documents": "documents",
    "check_ins": "check_ins",
    "previous_ai_insights": "insights",
    "care_tasks": "care_tasks",
    "wearables": "wearables",
    "parent_summary": "profile",
    "family_profile": "family"
}



# ==========================================
# Scoped Context Models
# ==========================================

class ActorContext(BaseModel):
    """Context of the caller/actor invoking the AI."""
    profile_id: uuid.UUID
    display_name: str
    role: str  # coordinator | parent | caregiver | viewer
    timezone: str = "UTC"
    email: Optional[str] = None


class FamilyContext(BaseModel):
    """Context of the Family / Care Circle boundary."""
    family_id: uuid.UUID
    name: str
    member_count: int
    coordinator_profile_id: Optional[uuid.UUID] = None


class SubjectContext(BaseModel):
    """Consent-filtered context for an individual Care Subject."""
    subject_id: uuid.UUID
    display_name: str
    relationship: Optional[str] = None
    timezone: str = "UTC"
    city: Optional[str] = None
    country_code: Optional[str] = None
    fhir_patient_id: Optional[str] = None
    permission_scope: Dict[str, bool] = Field(default_factory=dict)
    authorized_dimensions: List[str] = Field(default_factory=list)
    suppressed_dimensions: List[str] = Field(default_factory=list)

    # Scoped Clinical, Wearables and Family data dimensions
    parent_summary: Optional[Dict[str, Any]] = None
    recent_observations: Optional[List[Dict[str, Any]]] = None
    medications: Optional[List[Dict[str, Any]]] = None
    adherence: Optional[Dict[str, Any]] = None
    appointments: Optional[List[Dict[str, Any]]] = None
    labs: Optional[List[Dict[str, Any]]] = None
    documents: Optional[List[Dict[str, Any]]] = None
    check_ins: Optional[List[Dict[str, Any]]] = None
    previous_ai_insights: Optional[List[Dict[str, Any]]] = None
    care_tasks: Optional[List[Dict[str, Any]]] = None
    wearables: Optional[Dict[str, Any]] = None



class ConversationContext(BaseModel):
    """Context of the active AI conversation session."""
    conversation_id: Optional[uuid.UUID] = None
    session_id: str
    conversation_type: str = "consultation"
    recent_messages: List[Dict[str, Any]] = Field(default_factory=list)
    active_intent: Optional[str] = None


class AIScopedContextPayload(BaseModel):
    """
    Every AI Request MUST include:
    - actor (Identity & Role)
    - family (Care Circle Boundary)
    - subject(s) (One or more Care Subjects)
    - permission scope (Subject-level permission/consent mapping)
    - conversation context (Session & Turn History)

    The AI must NOT retrieve unauthorized family member data.
    """
    actor: ActorContext
    family: FamilyContext
    subjects: List[SubjectContext] = Field(default_factory=list)
    permission_scope: Dict[str, Dict[str, bool]] = Field(default_factory=dict)
    conversation_context: ConversationContext
    assembled_at: datetime = Field(default_factory=datetime.now)

    def to_prompt_context(self) -> str:
        """
        Renders the multi-scoped context into a clean, markdown-structured system prompt section.
        """
        sections = [
            "# AI CLINICAL CONTEXT & SCOPING",
            f"*Assembled At: {self.assembled_at.strftime('%Y-%m-%d %H:%M:%S UTC')}*",
            "",
            "## 1. Actor Context",
            f"- **User**: {self.actor.display_name} (Role: {self.actor.role})",
            f"- **Timezone**: {self.actor.timezone}",
            "",
            "## 2. Family Circle Context",
            f"- **Family Group**: {self.family.name}",
            f"- **Total Members**: {self.family.member_count}",
            "",
            "## 3. Conversation Context",
            f"- **Session ID**: {self.conversation_context.session_id}",
            f"- **Type**: {self.conversation_context.conversation_type}",
            f"- **Recent Turns Count**: {len(self.conversation_context.recent_messages)}",
            ""
        ]

        if self.conversation_context.recent_messages:
            sections.append("### Conversation History")
            for msg in self.conversation_context.recent_messages[-6:]:
                role = msg.get("sender_role", msg.get("role", "user")).capitalize()
                sections.append(f"- **{role}**: {msg.get('content', '')}")
            sections.append("")

        sections.append(f"## 4. Care Subject(s) Context ({len(self.subjects)} Authorized Subject(s))")
        sections.append("")

        for s in self.subjects:
            sections.extend([
                f"### Subject: {s.display_name} (Relationship: {s.relationship or 'Parent'})",
                f"- **Authorized Scopes**: {', '.join(s.authorized_dimensions) if s.authorized_dimensions else 'None'}",
                f"- **Suppressed/Redacted Scopes**: {', '.join(s.suppressed_dimensions) if s.suppressed_dimensions else 'None'}",
                f"- **Location & Timezone**: {s.city or 'N/A'}, {s.country_code or 'N/A'} ({s.timezone})",
                ""
            ])

            if s.recent_observations is not None:
                sections.append("#### Recent Vital Signs")
                if not s.recent_observations:
                    sections.append("- *No recent vital signs on file.*")
                else:
                    for obs in s.recent_observations[:8]:
                        sections.append(f"- **{obs.get('code_display')}**: {obs.get('value')} {obs.get('unit')} ({obs.get('effective_datetime')})")
                sections.append("")

            if s.medications is not None:
                sections.append("#### Active Medications")
                if not s.medications:
                    sections.append("- *No active prescriptions.*")
                else:
                    for med in s.medications:
                        sections.append(f"- **{med.get('name')}**: {med.get('dosage')} ({med.get('frequency')})")
                sections.append("")

            if s.adherence is not None:
                sections.extend([
                    "#### Adherence Metrics",
                    f"- **Adherence Rate**: {s.adherence.get('adherence_rate', 100)}% ({s.adherence.get('taken_count', 0)} taken, {s.adherence.get('missed_count', 0)} missed)",
                    ""
                ])

            if s.appointments is not None:
                sections.append("#### Upcoming Appointments")
                if not s.appointments:
                    sections.append("- *No scheduled appointments.*")
                else:
                    for appt in s.appointments[:4]:
                        sections.append(f"- **{appt.get('provider_name')}** ({appt.get('specialty')}) on {appt.get('start_time')} [Prep: {appt.get('preparation_status')}]")
                sections.append("")

            if s.labs is not None:
                sections.append("#### Diagnostic Lab Results")
                if not s.labs:
                    sections.append("- *No recent lab reports.*")
                else:
                    for lab in s.labs[:6]:
                        sections.append(f"- **{lab.get('test_name')}**: {lab.get('result')} (Flag: {lab.get('flag')})")
                sections.append("")

            if s.check_ins is not None:
                sections.append("#### Wellbeing Check-ins")
                if not s.check_ins:
                    sections.append("- *No recent check-ins.*")
                else:
                    for chk in s.check_ins[:5]:
                        sections.append(f"- **{chk.get('created_at')}**: Feeling **{chk.get('feeling')}** (Severity: {chk.get('severity')}) - {chk.get('notes')}")
                sections.append("")

            if s.previous_ai_insights is not None:
                sections.append("#### Previous AI Insights")
                if not s.previous_ai_insights:
                    sections.append("- *No active AI insights.*")
                else:
                    for ins in s.previous_ai_insights[:4]:
                        sections.append(f"- **[{ins.get('severity').upper()}] {ins.get('title')}**: {ins.get('summary')} (Rec: {ins.get('recommendation')})")
                sections.append("")

            if s.care_tasks is not None:
                sections.append("#### Care Tasks")
                if not s.care_tasks:
                    sections.append("- *No active care tasks.*")
                else:
                    for task in s.care_tasks[:6]:
                        sections.append(f"- **[{task.get('priority').upper()}] {task.get('title')}** (Due: {task.get('due_date')})")
                sections.append("")

            if s.wearables is not None:
                sections.append("#### Wearable Telemetry & Activity (Open Wearables)")
                wearable_data = s.wearables
                dev_src = wearable_data.get("device_source", "Connected Wearable")
                trend_str = wearable_data.get("trend")
                act_info = wearable_data.get("activity") or {}
                
                sections.append(f"- **Device/Source**: {dev_src}")
                if "today_steps" in act_info or "average_steps" in act_info:
                    sections.append(f"- **Activity (Steps)**: Today: {act_info.get('today_steps', 0):,} steps (Period Average: {act_info.get('average_steps', 0):,} steps/day)")
                if "baseline_steps" in act_info:
                    sections.append(f"- **Baseline**: {act_info.get('baseline_steps', 0):,} steps/day")
                if trend_str:
                    sections.append(f"- **Trend**: {trend_str}")
                    
                slp = wearable_data.get("latest_sleep") or {}
                rec = wearable_data.get("latest_recovery") or {}
                if slp.get("total_sleep_minutes"):
                    sections.append(f"- **Sleep**: {round(slp.get('total_sleep_minutes', 0) / 60, 1)} hrs (Score: {slp.get('sleep_score', 'N/A')}/100)")
                if rec.get("resting_heart_rate_bpm"):
                    sections.append(f"- **Recovery/Resting HR**: {rec.get('resting_heart_rate_bpm')} bpm, HRV {rec.get('hrv_ms', 'N/A')} ms, SpO2 {rec.get('spo2_percentage', 'N/A')}%")
                sections.append("")


        return "\n".join(sections)


# Backwards compatibility payload
class AIContextPayload(BaseModel):
    """
    Single-subject context payload.
    """
    family_id: uuid.UUID
    subject_id: uuid.UUID
    requester_id: uuid.UUID
    assembled_at: datetime = Field(default_factory=datetime.now)
    authorized_dimensions: List[str] = Field(default_factory=list)
    suppressed_dimensions: List[str] = Field(default_factory=list)

    family_profile: Optional[Dict[str, Any]] = None
    parent_summary: Optional[Dict[str, Any]] = None
    recent_observations: Optional[List[Dict[str, Any]]] = None
    medications: Optional[List[Dict[str, Any]]] = None
    adherence: Optional[Dict[str, Any]] = None
    appointments: Optional[List[Dict[str, Any]]] = None
    labs: Optional[List[Dict[str, Any]]] = None
    documents: Optional[List[Dict[str, Any]]] = None
    check_ins: Optional[List[Dict[str, Any]]] = None
    previous_ai_insights: Optional[List[Dict[str, Any]]] = None
    care_tasks: Optional[List[Dict[str, Any]]] = None
    wearables: Optional[Dict[str, Any]] = None


    def to_prompt_context(self) -> str:
        sections = [
            f"# CLINICAL CARE CONTEXT (Care Subject: {self.subject_id})",
            f"*Assembled At: {self.assembled_at.strftime('%Y-%m-%d %H:%M:%S UTC')}*",
            f"*Authorized Dimensions: {', '.join(self.authorized_dimensions)}*",
            ""
        ]

        if self.family_profile:
            sections.extend([
                "## Family Profile",
                f"- **Care Circle**: {self.family_profile.get('family_name', 'Unknown')}",
                f"- **Active Members**: {self.family_profile.get('member_count', 0)}",
                f"- **Coordinator**: {self.family_profile.get('coordinator_name', 'Primary Coordinator')}",
                ""
            ])

        if self.parent_summary:
            sections.extend([
                "## Care Subject Profile",
                f"- **Name**: {self.parent_summary.get('display_name', 'Parent')}",
                f"- **Relationship**: {self.parent_summary.get('relationship', 'Parent')}",
                f"- **Timezone**: {self.parent_summary.get('timezone', 'UTC')}",
                ""
            ])

        if self.recent_observations is not None:
            sections.append("## Recent Clinical Observations & Vital Signs")
            if not self.recent_observations:
                sections.append("- *No recent vital signs recorded within timeframe.*")
            else:
                for obs in self.recent_observations[:10]:
                    sections.append(f"- **{obs.get('code_display', 'Vital')}**: {obs.get('value')} {obs.get('unit')} ({obs.get('effective_datetime')})")
            sections.append("")

        if self.medications is not None:
            sections.append("## Active Prescriptions & Medications")
            if not self.medications:
                sections.append("- *No active prescriptions on file.*")
            else:
                for med in self.medications:
                    sections.append(f"- **{med.get('name', med.get('medication_name'))}**: {med.get('dosage', 'Standard')} {med.get('frequency', '')} [Status: {med.get('status', 'active')}]")
            sections.append("")

        if self.adherence is not None:
            sections.extend([
                "## Medication Adherence Summary",
                f"- **Adherence Rate**: {self.adherence.get('adherence_rate', 100)}%",
                f"- **Doses Taken**: {self.adherence.get('taken_count', 0)}",
                f"- **Doses Missed**: {self.adherence.get('missed_count', 0)}",
                f"- **Doses Skipped**: {self.adherence.get('skipped_count', 0)}",
                ""
            ])

        if self.appointments is not None:
            sections.append("## Upcoming & Recent Clinical Appointments")
            if not self.appointments:
                sections.append("- *No appointments scheduled.*")
            else:
                for appt in self.appointments[:5]:
                    sections.append(f"- **{appt.get('provider_name', 'Clinical Provider')}** ({appt.get('specialty', 'General')}) on {appt.get('start_time')} - Prep Status: {appt.get('preparation_status', 'pending')}")
            sections.append("")

        if self.labs is not None:
            sections.append("## Recent Lab & Diagnostic Reports")
            if not self.labs:
                sections.append("- *No recent lab reports available.*")
            else:
                for lab in self.labs:
                    sections.append(f"- **{lab.get('test_name', 'Lab Panel')}**: {lab.get('result', '')} [Flag: {lab.get('flag', 'normal')}] ({lab.get('date', '')})")
            sections.append("")

        if self.documents is not None:
            sections.append("## Health Documents & Summaries")
            if not self.documents:
                sections.append("- *No health documents uploaded.*")
            else:
                for doc in self.documents[:5]:
                    sections.append(f"- **Document**: {doc.get('document_type', 'Clinical')} - Status: {doc.get('status', 'active')}")
            sections.append("")

        if self.check_ins is not None:
            sections.append("## Daily Wellbeing Check-ins")
            if not self.check_ins:
                sections.append("- *No recent daily check-ins recorded.*")
            else:
                for chk in self.check_ins[:7]:
                    sections.append(f"- **{chk.get('created_at')}**: Feeling **{chk.get('feeling')}** (Severity: {chk.get('severity', 'normal')}) - Notes: {chk.get('notes', 'None')}")
            sections.append("")

        if self.previous_ai_insights is not None:
            sections.append("## Previous AI Insights & Guardian Moments")
            if not self.previous_ai_insights:
                sections.append("- *No active AI insights.*")
            else:
                for ins in self.previous_ai_insights[:5]:
                    sections.append(f"- **[{ins.get('severity', 'info').upper()}] {ins.get('title')}**: {ins.get('summary')} (Recommendation: {ins.get('recommendation', 'None')})")
            sections.append("")

        if self.care_tasks is not None:
            sections.append("## Care Tasks & Follow-ups")
            if not self.care_tasks:
                sections.append("- *No active care tasks.*")
            else:
                for task in self.care_tasks[:10]:
                    sections.append(f"- **[{task.get('status', 'pending').upper()}] {task.get('title')}**: Priority {task.get('priority', 'medium')}, Due: {task.get('due_date', 'N/A')}")
            sections.append("")

        if self.wearables is not None:
            sections.append("## Connected Wearable Telemetry (Open Wearables)")
            if not self.wearables:
                sections.append("- *No recent wearable device sync recorded.*")
            else:
                act = self.wearables.get("latest_activity") or {}
                slp = self.wearables.get("latest_sleep") or {}
                rec = self.wearables.get("latest_recovery") or {}
                sections.append(f"- **Daily Activity**: {act.get('steps', 0)} steps, {act.get('active_duration_minutes', 0)} active minutes")
                sections.append(f"- **Sleep Quality**: {round(slp.get('total_sleep_minutes', 0) / 60, 1)} hrs sleep (Score: {slp.get('sleep_score', 'N/A')}/100)")
                sections.append(f"- **Autonomic Recovery**: Resting HR {rec.get('resting_heart_rate_bpm', 'N/A')} bpm, HRV {rec.get('hrv_ms', 'N/A')} ms, SpO2 {rec.get('spo2_percentage', 'N/A')}%")
            sections.append("")

        return "\n".join(sections)



def infer_dimensions_from_query(query: str) -> Set[str]:
    """
    Data Minimization Engine:
    Inspects user query intent and infers the minimal clinical dimensions needed.
    Prevents over-fetching and over-sharing PHI (e.g. sending lab history or conditions
    when user only asks about evening medication adherence).
    """
    if not query:
        return set(ALL_POSSIBLE_DIMENSIONS)

    q = query.lower()
    dimensions = {"parent_summary"}  # Basic identity reference always safe & minimal

    # 1. Medications & Adherence
    med_keywords = [
        "medication", "medicine", "pill", "dose", "dosage", "take", "took",
        "taken", "prescription", "evening", "morning", "night", "afternoon",
        "adherence", "drug", "metformin", "statin", "insulin", "aspirin", "tablets"
    ]
    if any(kw in q for kw in med_keywords):
        dimensions.update(["medications", "adherence"])

    # 2. Vitals & Clinical Observations
    vitals_keywords = [
        "vital", "blood pressure", "bp", "heart rate", "pulse", "glucose",
        "sugar", "spo2", "oxygen", "weight", "temperature", "fever"
    ]
    if any(kw in q for kw in vitals_keywords):
        dimensions.add("recent_observations")

    # 3. Appointments & Doctor visits
    appt_keywords = [
        "appointment", "doctor", "dr", "clinic", "hospital", "visit",
        "consultation", "specialist", "cardiologist", "physician", "schedule"
    ]
    if any(kw in q for kw in appt_keywords):
        dimensions.add("appointments")

    # 4. Labs & Diagnostics
    lab_keywords = [
        "lab", "blood test", "blood work", "diagnostic", "hba1c",
        "cholesterol", "panel", "lipid", "creatinine", "ecg", "report", "test result"
    ]
    if any(kw in q for kw in lab_keywords):
        dimensions.update(["labs", "documents"])

    # 5. Care Tasks & Follow-ups
    task_keywords = [
        "task", "todo", "to-do", "reminder", "follow up", "follow-up",
        "action item", "care task", "assigned"
    ]
    if any(kw in q for kw in task_keywords):
        dimensions.add("care_tasks")

    # 6. Check-ins & Mood / Wellbeing
    checkin_keywords = [
        "check in", "check-in", "checkin", "feeling", "mood",
        "wellbeing", "sleep", "pain", "energy", "how is", "how are"
    ]
    if any(kw in q for kw in checkin_keywords):
        dimensions.add("check_ins")

    # 7. Insights & Trends
    insight_keywords = [
        "insight", "trend", "guardian", "alert", "analysis",
        "baseline", "anomaly", "pattern"
    ]
    if any(kw in q for kw in insight_keywords):
        dimensions.add("previous_ai_insights")

    # 8. Wearables & Physical Activity / Recovery
    wearable_keywords = [
        "wearable", "watch", "garmin", "oura", "whoop", "fitbit", "apple health",
        "step", "steps", "activity", "active", "how active", "mobility", "walk", "walking",
        "sleep", "recovery", "hrv", "resting heart rate"
    ]
    if any(kw in q for kw in wearable_keywords):
        dimensions.add("wearables")


    # If no specific dimension keywords match, default to safe core summary or all dimensions
    if dimensions == {"parent_summary"}:
        return set(ALL_POSSIBLE_DIMENSIONS)


    return dimensions


# ==========================================
# AIContextBuilder
# ==========================================

class AIContextBuilder:
    """
    Zero-Trust AI Context Builder with Strict Multi-Subject Context Scoping & Data Minimization.
    Every AI Request MUST include:
    1. Actor (Identity, Role, Timezone)
    2. Family (Care Circle Boundary)
    3. Subject(s) (One or more Care Subjects)
    4. Permission Scope (Calculated per subject)
    5. Conversation Context (Session, History, Intent)

    The AI must NOT retrieve unauthorized family member data, and must only retrieve
    the minimum clinical context necessary for the user's specific query.
    """
    def __init__(
        self,
        session: AsyncSession,
        gateway: Optional[ClinicalRecordGateway] = None,
        wearable_gateway: Optional[IOpenWearablesGateway] = None
    ):
        self.session = session
        self.profile_repo = SQLAlchemyAppProfileRepository(session)
        self.family_repo = SQLAlchemyFamilyRepository(session)
        self.consent_repo = SQLAlchemyConsentRepository(session)
        self.gateway = gateway or FHIRClinicalRecordGateway()
        self.wearable_gateway = wearable_gateway or HttpOpenWearablesGateway()


    async def build_scoped_context(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_ids: Optional[List[uuid.UUID]] = None,
        conversation_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        conversation_type: str = "consultation",
        user_query: Optional[str] = None,
        requested_dimensions: Optional[List[str]] = None,
        timeframe_days: int = 14
    ) -> AIScopedContextPayload:
        """
        Builds a comprehensive, consent-scoped, data-minimized context payload containing:
        - actor
        - family
        - subject(s)
        - permission scope (per subject)
        - conversation context
        """
        # 1. Resolve Family & Verify Caller Membership
        family = await self.family_repo.get_by_id(family_id)
        if not family:
            raise FamilyAccessError(f"Family {family_id} not found.")

        membership = await self.family_repo.get_member(family_id, requester_id)
        if not membership or membership.status != "active":
            raise FamilyAccessError("Requester is not an active member of this Family group.")

        requester_profile = await self.profile_repo.get_by_id(requester_id)
        all_members = await self.family_repo.list_members(family_id)

        actor_ctx = ActorContext(
            profile_id=requester_id,
            display_name=requester_profile.display_name if requester_profile else "User",
            role=membership.membership_role,
            timezone=requester_profile.timezone if requester_profile else "UTC",
            email=requester_profile.email if requester_profile else None
        )

        family_ctx = FamilyContext(
            family_id=family_id,
            name=family.name,
            member_count=len(all_members),
            coordinator_profile_id=family.primary_coordinator_profile_id
        )

        # 2. Resolve Target Subjects
        target_subject_entities = []
        all_family_subjects = await self.family_repo.list_care_subjects(family_id)

        if subject_ids:
            target_ids_set = set(subject_ids)
            target_subject_entities = [s for s in all_family_subjects if s.id in target_ids_set]
            if not target_subject_entities:
                raise FamilyAccessError("None of the specified subjects were found in this Family group.")
        else:
            target_subject_entities = all_family_subjects

        # 3. Assemble Scoped Context per Subject (Enforcing Consent & Privacy & Data Minimization)
        scoped_subjects: List[SubjectContext] = []
        global_permission_scope: Dict[str, Dict[str, bool]] = {}

        if requested_dimensions is not None:
            target_dimensions = set(requested_dimensions)
        elif user_query:
            target_dimensions = infer_dimensions_from_query(user_query)
        else:
            target_dimensions = set(ALL_POSSIBLE_DIMENSIONS)


        for subject in target_subject_entities:
            is_self = (subject.profile_id == requester_id)

            # Evaluate active consent for this subject
            active_consent_scope: Dict[str, bool] = {}
            if not is_self and subject.profile_id:
                consent = await self.consent_repo.get_consent(
                    family_id=family_id,
                    subject_id=subject.id,
                    grantor_profile_id=subject.profile_id,
                    grantee_profile_id=requester_id
                )
                if consent and consent.status == "active":
                    if consent.expires_at is None or consent.expires_at > datetime.now():
                        active_consent_scope = consent.scope or {}

            global_permission_scope[str(subject.id)] = dict(active_consent_scope) if not is_self else {"all": True}

            authorized_dims: List[str] = []
            suppressed_dims: List[str] = []

            for dim in ALL_POSSIBLE_DIMENSIONS:
                if dim not in target_dimensions:
                    continue

                if is_self:
                    authorized_dims.append(dim)
                else:
                    consent_key = DIMENSION_CONSENT_MAP.get(dim)
                    if dim in ("family_profile", "parent_summary"):
                        authorized_dims.append(dim)
                    elif dim in ("care_tasks", "check_ins", "previous_ai_insights"):
                        if active_consent_scope.get(consent_key, True) is not False:
                            authorized_dims.append(dim)
                        else:
                            suppressed_dims.append(dim)
                    else:
                        if active_consent_scope.get(consent_key) is True:
                            authorized_dims.append(dim)
                        else:
                            suppressed_dims.append(dim)

            subj_profile = await self.profile_repo.get_by_id(subject.profile_id) if subject.profile_id else None

            subj_ctx = SubjectContext(
                subject_id=subject.id,
                display_name=subj_profile.display_name if subj_profile else "Care Subject",
                relationship=subject.relationship_to_coordinator,
                timezone=subj_profile.timezone if subj_profile else (subject.timezone or "UTC"),
                city=subject.city,
                country_code=subject.country_code,
                fhir_patient_id=subject.fhir_patient_id,
                permission_scope=active_consent_scope,
                authorized_dimensions=authorized_dims,
                suppressed_dimensions=suppressed_dims
            )

            # Populate Authorized Data for this Subject
            if "parent_summary" in authorized_dims:
                subj_ctx.parent_summary = {
                    "display_name": subj_ctx.display_name,
                    "relationship": subj_ctx.relationship,
                    "timezone": subj_ctx.timezone,
                    "city": subj_ctx.city,
                    "country_code": subj_ctx.country_code
                }

            if "recent_observations" in authorized_dims and subject.fhir_patient_id:
                try:
                    obs_list = await self.gateway.get_observations(subject.fhir_patient_id, category="vital-signs")
                    subj_ctx.recent_observations = [
                        {
                            "code_display": o.get("code", {}).get("text", "Vital Sign"),
                            "value": o.get("valueQuantity", {}).get("value", 0),
                            "unit": o.get("valueQuantity", {}).get("unit", ""),
                            "effective_datetime": o.get("effectiveDateTime", "")
                        }
                        for o in obs_list
                    ]
                except Exception as e:
                    logger.warning(f"AIContextBuilder: Failed to fetch observations for {subject.fhir_patient_id}: {e}")
                    subj_ctx.recent_observations = []

            if "medications" in authorized_dims and subject.fhir_patient_id:
                try:
                    med_list = await self.gateway.get_medications(subject.fhir_patient_id, status="active")
                    subj_ctx.medications = [
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
                    logger.warning(f"AIContextBuilder: Failed to fetch medications for {subject.fhir_patient_id}: {e}")
                    subj_ctx.medications = []

            if "adherence" in authorized_dims:
                since = datetime.now() - timedelta(days=timeframe_days)
                events = await self.family_repo.list_adherence_events(subject.id, since=since)
                taken_count = sum(1 for e in events if e.status == "taken")
                missed_count = sum(1 for e in events if e.status == "missed")
                total = len(events)
                rate = round((taken_count / total * 100), 1) if total > 0 else 100.0

                subj_ctx.adherence = {
                    "adherence_rate": rate,
                    "total_events": total,
                    "taken_count": taken_count,
                    "missed_count": missed_count,
                    "timeframe_days": timeframe_days
                }

            if "appointments" in authorized_dims:
                coord_list = await self.family_repo.list_appointment_coordinations(family_id, subject.id)
                appts_summary = []
                for c in coord_list:
                    appts_summary.append({
                        "coordination_id": str(c.id),
                        "fhir_appointment_id": c.fhir_appointment_id,
                        "preparation_status": c.preparation_status,
                        "summary_status": c.summary_status,
                        "provider_name": "Dr. Specialist",
                        "specialty": "Cardiology",
                        "start_time": c.created_at.strftime("%Y-%m-%d %H:%M")
                    })
                subj_ctx.appointments = appts_summary

            if "labs" in authorized_dims:
                docs = await self.family_repo.list_health_documents_for_subject(subject.id)
                lab_results = []
                for d in docs:
                    if d.document_type == "lab_report":
                        extractions = await self.family_repo.list_document_extractions(d.id)
                        for ext in extractions:
                            normalized = ext.normalized_output or {}
                            for item in normalized.get("lab_results", []):
                                lab_results.append({
                                    "test_name": item.get("test", "Diagnostic Test"),
                                    "result": item.get("value", ""),
                                    "flag": item.get("flag", "normal"),
                                    "date": d.created_at.strftime("%Y-%m-%d")
                                })
                subj_ctx.labs = lab_results

            if "documents" in authorized_dims:
                docs = await self.family_repo.list_health_documents_for_subject(subject.id)
                subj_ctx.documents = [
                    {
                        "document_id": str(d.id),
                        "document_type": d.document_type,
                        "status": d.status,
                        "ai_processing_status": d.ai_processing_status,
                        "created_at": d.created_at.strftime("%Y-%m-%d")
                    }
                    for d in docs
                ]

            if "check_ins" in authorized_dims:
                checkins = await self.family_repo.list_checkins_for_subject(subject.id)
                subj_ctx.check_ins = [
                    {
                        "id": str(c.id),
                        "feeling": c.feeling,
                        "severity": c.severity,
                        "notes": c.notes,
                        "created_at": c.created_at.strftime("%Y-%m-%d %H:%M")
                    }
                    for c in checkins[:10]
                ]

            if "previous_ai_insights" in authorized_dims:
                insights = await self.family_repo.list_ai_insights_for_subject(subject.id)
                subj_ctx.previous_ai_insights = [
                    {
                        "id": str(i.id),
                        "type": i.type,
                        "severity": i.severity,
                        "title": i.title,
                        "summary": i.summary,
                        "recommendation": i.recommendation,
                        "status": i.status
                    }
                    for i in insights if i.status == "active"
                ]

            if "care_tasks" in authorized_dims:
                tasks = await self.family_repo.list_care_tasks(family_id, subject_id=subject.id)
                subj_ctx.care_tasks = [
                    {
                        "id": str(t.id),
                        "title": t.title,
                        "category": t.category,
                        "priority": t.priority,
                        "status": t.status,
                        "due_date": t.due_at.strftime("%Y-%m-%d") if t.due_at else None
                    }
                    for t in tasks if t.status != "completed"
                ]

            if "wearables" in authorized_dims:
                try:
                    wearable_uid = f"kinguardian_subject_{subject.id}"
                    end_d = datetime.now().strftime("%Y-%m-%d")
                    # If query mentions month or timeframe_days >= 30, evaluate 30-day window
                    eval_days = 30 if (user_query and ("month" in user_query.lower() or "30 day" in user_query.lower())) else timeframe_days
                    start_d = (datetime.now() - timedelta(days=eval_days)).strftime("%Y-%m-%d")
                    acts = await self.wearable_gateway.get_activity_summaries(wearable_uid, start_d, end_d)
                    slps = await self.wearable_gateway.get_sleep_summaries(wearable_uid, start_d, end_d)
                    recs = await self.wearable_gateway.get_recovery_summaries(wearable_uid, start_d, end_d)
                    sorted_acts = sorted(acts, key=lambda x: x.date, reverse=True) if acts else []
                    sorted_slps = sorted(slps, key=lambda x: x.date, reverse=True) if slps else []
                    sorted_recs = sorted(recs, key=lambda x: x.date, reverse=True) if recs else []

                    # Derive baseline & trend deterministically
                    step_history = [float(a.steps) for a in acts]
                    latest_steps = float(sorted_acts[0].steps) if sorted_acts else 0.0
                    avg_steps = int(sum(step_history) / len(step_history)) if step_history else 0
                    
                    baseline_comparison = WearableBaselineCalculator.compare_to_baseline(
                        subject_id=subject.id,
                        metric_name="steps",
                        current_value=latest_steps,
                        historical_values=step_history,
                        window_days=eval_days,
                        unit="steps/day"
                    )

                    device_source = sorted_acts[0].source_provider if (sorted_acts and hasattr(sorted_acts[0], "source_provider")) else "Garmin Venu 3"

                    subj_ctx.wearables = {
                        "activity": {
                            "today_steps": int(latest_steps),
                            "average_steps": avg_steps,
                            "active_duration_minutes": sorted_acts[0].active_duration_minutes if sorted_acts else 0,
                            "baseline_steps": int(baseline_comparison.baseline_value),
                            "trend": baseline_comparison.derived_observation
                        },
                        "steps": {
                            "today": int(latest_steps),
                            "period_average": avg_steps,
                            "period_days": eval_days
                        },
                        "baseline": {
                            "window_days": eval_days,
                            "baseline_steps": int(baseline_comparison.baseline_value)
                        },
                        "trend": baseline_comparison.derived_observation,
                        "device_source": device_source,
                        "latest_activity": sorted_acts[0].model_dump() if sorted_acts else None,
                        "latest_sleep": sorted_slps[0].model_dump() if sorted_slps else None,
                        "latest_recovery": sorted_recs[0].model_dump() if sorted_recs else None,
                        "weekly_average_steps": avg_steps
                    }

                except Exception as e:
                    logger.warning(f"AIContextBuilder: Failed to fetch wearables for {subject.id}: {e}")
                    subj_ctx.wearables = None


            scoped_subjects.append(subj_ctx)


        # 4. Resolve Conversation Context
        recent_messages: List[Dict[str, Any]] = []
        actual_session_id = session_id or f"sess_{uuid.uuid4().hex[:10]}"
        if conversation_id:
            conv = await self.family_repo.get_ai_conversation(conversation_id)
            if conv and conv.family_id == family_id:
                actual_session_id = conv.agent_session_id
                conversation_type = conv.conversation_type
                recent_messages = list((conv.context_scope or {}).get("messages", []))

        conv_ctx = ConversationContext(
            conversation_id=conversation_id,
            session_id=actual_session_id,
            conversation_type=conversation_type,
            recent_messages=recent_messages
        )

        return AIScopedContextPayload(
            actor=actor_ctx,
            family=family_ctx,
            subjects=scoped_subjects,
            permission_scope=global_permission_scope,
            conversation_context=conv_ctx
        )

    async def build_context(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        user_query: Optional[str] = None,
        requested_dimensions: Optional[List[str]] = None,
        timeframe_days: int = 14
    ) -> AIContextPayload:
        """
        Assembles single-subject authorized context for backwards compatibility.
        """
        scoped = await self.build_scoped_context(
            requester_id=requester_id,
            family_id=family_id,
            subject_ids=[subject_id],
            user_query=user_query,
            requested_dimensions=requested_dimensions,
            timeframe_days=timeframe_days
        )

        s = scoped.subjects[0]

        payload = AIContextPayload(
            family_id=family_id,
            subject_id=subject_id,
            requester_id=requester_id,
            authorized_dimensions=s.authorized_dimensions,
            suppressed_dimensions=s.suppressed_dimensions,
            family_profile={
                "family_name": scoped.family.name,
                "member_count": scoped.family.member_count,
                "coordinator_name": "Coordinator"
            } if "family_profile" in s.authorized_dimensions else None,
            parent_summary=s.parent_summary,
            recent_observations=s.recent_observations,
            medications=s.medications,
            adherence=s.adherence,
            appointments=s.appointments,
            labs=s.labs,
            documents=s.documents,
            check_ins=s.check_ins,
            previous_ai_insights=s.previous_ai_insights,
            care_tasks=s.care_tasks,
            wearables=s.wearables
        )
        return payload

