import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.domains.family.domain.interfaces import IFamilyRepository, IConsentRepository, IAppProfileRepository, IEventLogger
from app.domains.clinical.gateway import ClinicalRecordGateway, FHIRClinicalRecordGateway

logger = get_logger(__name__)


# ==========================================
# MCP Safety & Protocol Models
# ==========================================

class MCPUnsafeToolError(Exception):
    """
    Raised when an agent attempts to invoke dangerous, raw, or uncontained database operations
    such as execute_sql(), run_query(), or schema alterations.
    """
    pass


class MCPToolInfo(BaseModel):
    name: str
    description: str
    inputSchema: Dict[str, Any]


class MCPToolCallRequest(BaseModel):
    name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None


class MCPToolCallResponse(BaseModel):
    tool_name: str
    success: bool
    content: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None
    is_error: bool = False


# List of explicitly banned raw DB operations
FORBIDDEN_RAW_DB_TOOLS = {
    "execute_sql",
    "run_sql",
    "raw_query",
    "db_exec",
    "sql_query",
    "drop_table",
    "alter_table",
    "direct_db_access"
}


# ==========================================
# KinGuardian EMR MCP Bridge
# ==========================================

class KinGuardianEMRMCPBridge:
    """
    Business-Safe Model Context Protocol (MCP) Bridge for bezs-emr-mcp and bezs-agent.
    Guarantees:
    1. Zero raw database access (execute_sql is blocked and strictly rejected).
    2. All tools are domain-level, business-safe, and consent-enforced.
    3. Independent authorization and least privilege on every MCP tool call.
    """

    def __init__(
        self,
        family_repo: IFamilyRepository,
        consent_repo: IConsentRepository,
        profile_repo: IAppProfileRepository,
        event_logger: IEventLogger,
        gateway: Optional[ClinicalRecordGateway] = None
    ):
        self.family_repo = family_repo
        self.consent_repo = consent_repo
        self.profile_repo = profile_repo
        self.event_logger = event_logger
        self.gateway = gateway or FHIRClinicalRecordGateway()

    def get_tool_definitions(self) -> List[MCPToolInfo]:
        """
        Returns list of business-safe MCP tools following the MCP protocol specification.
        """
        return [
            MCPToolInfo(
                name="get_parent_health_summary",
                description="Business-safe aggregated health summary for a care subject (vitals summary, adherence rate, active care tasks, next appointment).",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "subject_id": {"type": "string", "description": "UUID of the care subject"}
                    },
                    "required": ["subject_id"]
                }
            ),
            MCPToolInfo(
                name="get_emr_patient_vitals",
                description="Retrieves structured FHIR vital signs (blood pressure, heart rate, oxygen saturation, glucose) with LOINC codes.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "subject_id": {"type": "string", "description": "UUID of the care subject"}
                    },
                    "required": ["subject_id"]
                }
            ),
            MCPToolInfo(
                name="get_emr_active_prescriptions",
                description="Retrieves active EMR clinical prescriptions with dosage and dosing schedules.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "subject_id": {"type": "string", "description": "UUID of the care subject"}
                    },
                    "required": ["subject_id"]
                }
            ),
            MCPToolInfo(
                name="get_emr_diagnostic_reports",
                description="Retrieves diagnostic lab panels, analyte results, units, and clinical flag status.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "subject_id": {"type": "string", "description": "UUID of the care subject"}
                    },
                    "required": ["subject_id"]
                }
            ),
            MCPToolInfo(
                name="schedule_emr_appointment_coordination",
                description="Coordinates pre-visit agenda and prepares doctor consultation focus areas.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "appointment_id": {"type": "string", "description": "UUID or FHIR ID of appointment"},
                        "focus_areas": {"type": "array", "items": {"type": "string"}, "description": "Specific symptoms or questions"}
                    },
                    "required": ["appointment_id"]
                }
            )
        ]

    async def execute_mcp_tool(
        self,
        actor_id: uuid.UUID,
        request: MCPToolCallRequest
    ) -> MCPToolCallResponse:
        """
        Executes an MCP tool call with strict validation:
        1. Blocks raw DB tools (execute_sql).
        2. Validates caller membership & consent.
        3. Returns structured MCP JSON-RPC compliant response.
        """
        tool_name = request.name.strip().lower()

        # Invariant: Block any raw SQL / direct DB execution attempts
        if tool_name in FORBIDDEN_RAW_DB_TOOLS or "sql" in tool_name:
            logger.error(f"MCP Security Violation: Agent attempted forbidden raw DB tool '{request.name}'.")
            return MCPToolCallResponse(
                tool_name=request.name,
                success=False,
                is_error=True,
                error=(
                    f"Security Policy Violation: Raw database execution tool '{request.name}' is strictly forbidden. "
                    f"Agents must only invoke business-safe domain tools (e.g. get_parent_health_summary)."
                )
            )

        # Verify Family Membership
        membership = await self.family_repo.get_member(request.family_id, actor_id)
        if not membership or membership.status != "active":
            return MCPToolCallResponse(
                tool_name=request.name,
                success=False,
                is_error=True,
                error="Authorization Denied: Actor is not an active member of this Care Circle."
            )

        # Subject Resolution & Consent Verification
        subj_id = request.subject_id
        if not subj_id and "subject_id" in request.arguments:
            try:
                subj_id = uuid.UUID(str(request.arguments["subject_id"]))
            except ValueError:
                pass

        if not subj_id and tool_name != "schedule_emr_appointment_coordination":
            return MCPToolCallResponse(
                tool_name=request.name,
                success=False,
                is_error=True,
                error="Missing required parameter: subject_id."
            )

        # Check Subject Consent
        if subj_id:
            subject = await self.family_repo.get_care_subject(subj_id)
            if not subject or subject.family_id != request.family_id:
                return MCPToolCallResponse(
                    tool_name=request.name,
                    success=False,
                    is_error=True,
                    error=f"Care Subject {subj_id} not found in this Family group."
                )

            # If not self-access, verify active consent grant
            if subject.profile_id != actor_id:
                consent = await self.consent_repo.get_consent(
                    family_id=request.family_id,
                    subject_id=subj_id,
                    grantor_profile_id=subject.profile_id,
                    grantee_profile_id=actor_id
                )
                if not consent or consent.status != "active":
                    return MCPToolCallResponse(
                        tool_name=request.name,
                        success=False,
                        is_error=True,
                        error=f"Authorization Denied: No active consent grant from care subject {subj_id}."
                    )

        # Execute Business-Safe MCP Tool Logic
        try:
            if tool_name == "get_parent_health_summary":
                data = await self._tool_get_parent_health_summary(request.family_id, subj_id)
            elif tool_name == "get_emr_patient_vitals":
                data = await self._tool_get_emr_patient_vitals(subj_id)
            elif tool_name == "get_emr_active_prescriptions":
                data = await self._tool_get_emr_active_prescriptions(subj_id)
            elif tool_name == "get_emr_diagnostic_reports":
                data = await self._tool_get_emr_diagnostic_reports(subj_id)
            elif tool_name == "schedule_emr_appointment_coordination":
                data = await self._tool_schedule_appointment_coordination(request.arguments)
            else:
                return MCPToolCallResponse(
                    tool_name=request.name,
                    success=False,
                    is_error=True,
                    error=f"Unknown MCP tool '{request.name}'."
                )

            return MCPToolCallResponse(
                tool_name=request.name,
                success=True,
                content=[{"type": "text", "text": str(data)}],
                is_error=False
            )
        except Exception as e:
            logger.error(f"Error executing MCP tool '{request.name}': {e}", exc_info=True)
            return MCPToolCallResponse(
                tool_name=request.name,
                success=False,
                is_error=True,
                error=f"MCP Execution Error: {str(e)}"
            )

    # -------------------------------------------------------------
    # Business-Safe Tool Implementation Methods
    # -------------------------------------------------------------

    async def _tool_get_parent_health_summary(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> Dict[str, Any]:
        """Business-Safe: Aggregates patient health status without raw SQL."""
        subject = await self.family_repo.get_care_subject(subject_id)
        profile = await self.profile_repo.get_by_id(subject.profile_id) if subject.profile_id else None

        # Adherence Rate
        events = await self.family_repo.list_adherence_events(subject_id)
        taken = sum(1 for e in events if e.status == "taken")
        total = len(events)
        rate = round((taken / total * 100), 1) if total > 0 else 100.0

        # Recent Tasks
        tasks = await self.family_repo.list_care_tasks(family_id, subject_id=subject_id)
        pending_tasks = [t.title for t in tasks if t.status != "completed"][:3]

        return {
            "subject_id": str(subject_id),
            "name": profile.display_name if profile else "Parent",
            "adherence_rate_pct": rate,
            "total_doses_logged": total,
            "pending_care_tasks": pending_tasks,
            "status": "stable" if rate >= 80.0 else "attention_needed"
        }

    async def _tool_get_emr_patient_vitals(self, subject_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Business-Safe: Retrieves clinical observations from FHIR Gateway."""
        subject = await self.family_repo.get_care_subject(subject_id)
        if not subject or not subject.fhir_patient_id:
            return []
        obs_list = await self.gateway.get_observations(subject.fhir_patient_id, category="vital-signs")
        return [
            {
                "code": o.get("code", {}).get("text", "Vital Sign"),
                "value": o.get("valueQuantity", {}).get("value"),
                "unit": o.get("valueQuantity", {}).get("unit"),
                "date": o.get("effectiveDateTime")
            }
            for o in obs_list
        ]

    async def _tool_get_emr_active_prescriptions(self, subject_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Business-Safe: Retrieves prescriptions from FHIR Gateway."""
        subject = await self.family_repo.get_care_subject(subject_id)
        if not subject or not subject.fhir_patient_id:
            return []
        med_list = await self.gateway.get_medications(subject.fhir_patient_id, status="active")
        return [
            {
                "medication_id": m.get("id"),
                "name": m.get("medicationCodeableConcept", {}).get("text", "Prescription"),
                "dosage": m.get("dosageInstruction", [{}])[0].get("text", "As directed"),
                "status": m.get("status", "active")
            }
            for m in med_list
        ]

    async def _tool_get_emr_diagnostic_reports(self, subject_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Business-Safe: Retrieves normalized lab results from verified documents."""
        docs = await self.family_repo.list_health_documents_for_subject(subject_id)
        results = []
        for d in docs:
            if d.document_type == "lab_report":
                extractions = await self.family_repo.list_document_extractions(d.id)
                for ext in extractions:
                    normalized = ext.normalized_output or {}
                    for item in normalized.get("lab_results", []):
                        results.append({
                            "test": item.get("test", "Diagnostic Test"),
                            "value": item.get("value", ""),
                            "flag": item.get("flag", "normal"),
                            "date": d.created_at.strftime("%Y-%m-%d")
                        })
        return results

    async def _tool_schedule_appointment_coordination(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Business-Safe: Prepares clinical consultation agenda."""
        appt_id = str(arguments["appointment_id"])
        focus = arguments.get("focus_areas", [])
        return {
            "appointment_id": appt_id,
            "preparation_status": "ready",
            "agenda": f"Review patient health baseline with specific focus on: {', '.join(focus) if focus else 'Routine Follow-up'}.",
            "questions_for_doctor": [
                "Are vital signs within the expected baseline range?",
                "Is the current medication dosage well tolerated?"
            ]
        }


# Platform alias
KinGuardianEMRMCPBridge = KinGuardianEMRMCPBridge

