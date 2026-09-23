"""
AI Domain Module:
Bounded domain for AI Agents, Zero-Trust Context Building, Safety Guardrails, Domain Tools, and External Gatekeeping.
"""

from app.domains.agent.context_builder import (
    AIContextBuilder,
    AIScopedContextPayload,
    infer_dimensions_from_query,
    ALL_POSSIBLE_DIMENSIONS
)
from app.domains.agent.safety import (
    AISafetyGuard,
    UntrustedContentWrapper,
    UntrustedInputType,
    ExternalToolAuthorizationGatekeeper
)
from app.domains.agent.tools import (
    KinGuardianDomainTool,
    ControlledToolRegistry,
    AgentToolContext,
    AgentToolResult,
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
    CreateInsightTool
)
from app.domains.family.infrastructure.models import AIConversation, AIAction
from app.domains.family.domain.entities import AIConversationEntity, AIActionEntity

__all__ = [
    "AIContextBuilder",
    "AIScopedContextPayload",
    "infer_dimensions_from_query",
    "ALL_POSSIBLE_DIMENSIONS",
    "AISafetyGuard",
    "UntrustedContentWrapper",
    "UntrustedInputType",
    "ExternalToolAuthorizationGatekeeper",
    "KinGuardianDomainTool",
    "ControlledToolRegistry",
    "AgentToolContext",
    "AgentToolResult",
    "GetParentSummaryTool",
    "GetMedicationsTool",
    "GetMedicationAdherenceTool",
    "GetRecentVitalsTool",
    "GetRecentLabsTool",
    "GetAppointmentsTool",
    "GetHealthTimelineTool",
    "GetFamilyMembersTool",
    "CreateCareTaskTool",
    "SendFamilyMessageTool",
    "PrepareAppointmentTool",
    "CreateInsightTool",
    "AIConversation",
    "AIAction",
    "AIConversationEntity",
    "AIActionEntity"
]
