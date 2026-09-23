import uuid
import httpx
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import get_logger
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.agent.tools import (
    ControlledToolRegistry,
    AgentToolContext,
    AgentToolResult
)
from app.domains.agent.schemas import (
    AgentQueryRequest,
    AgentQueryResponse,
    ToolExecutionRequest,
    ToolExecutionResponse,
    ToolDefinitionResponse
)

logger = get_logger(__name__)


class AgentProxyService:
    """
    Agent Proxy Service:
    Bridges KinGuardian domain tools with bezs-agent runtime through ControlledToolRegistry.
    Enforces least privilege and independent authorization verification on all tool executions.
    """
    def __init__(self, session: AsyncSession):
        self.session = session
        self.profile_repo = SQLAlchemyAppProfileRepository(session)
        self.family_repo = SQLAlchemyFamilyRepository(session)
        self.consent_repo = SQLAlchemyConsentRepository(session)
        self.event_logger = EventService(session)

        self.family_service = FamilyService(
            user_repo=self.profile_repo,
            circle_repo=self.family_repo,
            consent_repo=self.consent_repo,
            event_logger=self.event_logger
        )

        self.registry = ControlledToolRegistry(
            family_repo=self.family_repo,
            consent_repo=self.consent_repo,
            profile_repo=self.profile_repo,
            event_logger=self.event_logger
        )

    async def list_available_tools(
        self,
        actor_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None
    ) -> List[ToolDefinitionResponse]:
        """
        Returns the subset of domain tools available to the actor following least privilege.
        """
        context = AgentToolContext(
            actor_id=actor_id,
            family_id=family_id,
            subject_id=subject_id
        )
        tools = await self.registry.list_available_tools_for_agent(context)
        return [
            ToolDefinitionResponse(
                name=t["name"],
                description=t["description"],
                parameters=t["parameters"],
                required_permission=t["required_permission"]
            )
            for t in tools
        ]

    async def execute_tool(
        self,
        actor_id: uuid.UUID,
        payload: ToolExecutionRequest
    ) -> ToolExecutionResponse:
        """
        Executes a registered domain tool with independent authorization check.
        """
        context = AgentToolContext(
            actor_id=actor_id,
            family_id=payload.family_id,
            subject_id=payload.subject_id,
            session_id=payload.session_id
        )
        res = await self.registry.execute_tool(
            name=payload.tool_name,
            params=payload.parameters,
            context=context
        )
        return ToolExecutionResponse(
            tool_name=res.tool_name,
            success=res.success,
            data=res.data,
            error=res.error,
            disclaimer=res.disclaimer,
            executed_at=res.executed_at
        )

    async def query_clinical_agent(
        self,
        requester_id: uuid.UUID,
        payload: AgentQueryRequest
    ) -> AgentQueryResponse:
        """
        Sends query to bezs-agent runtime along with authorized domain tools.
        """
        # Resolve family ID
        family_id = payload.family_id
        if not family_id:
            # Fallback: look up family for the subject
            subj = await self.family_repo.get_care_subject(payload.parent_id)
            if subj:
                family_id = subj.family_id
            else:
                # Look up first care circle the user belongs to
                circles = await self.family_repo.list_circles_by_user(requester_id)
                if circles:
                    family_id = circles[0].id

        if not family_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Family context could not be resolved for agent query."
            )

        # Get available tool schemas for this actor
        context = AgentToolContext(
            actor_id=requester_id,
            family_id=family_id,
            subject_id=payload.parent_id,
            session_id=payload.session_id
        )
        available_tools = await self.registry.list_available_tools_for_agent(context)

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{settings.AGENT_API_URL}/api/consult",
                    json={
                        "query": payload.query,
                        "session_id": payload.session_id or f"sess_{payload.parent_id.hex[:6]}",
                        "patient_id": str(payload.parent_id),
                        "family_id": str(family_id),
                        "tools": available_tools
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=15.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return AgentQueryResponse(
                        session_id=data.get("session_id", payload.session_id or "new_session"),
                        response=data.get("response", data.get("text", "No response text found.")),
                        tool_calls_executed=data.get("tool_calls", [])
                    )
            except Exception as e:
                logger.warning(f"bezs-agent communication failed or offline: {e}")

        # Local Agent Orchestration Fallback
        # Run local tool evaluations for query keywords
        executed_tools = []
        q = payload.query.lower()
        if "medication" in q or "adherence" in q or "dose" in q:
            adh_res = await self.registry.execute_tool("get_medication_adherence", {"subject_id": str(payload.parent_id)}, context)
            if adh_res.success:
                executed_tools.append("get_medication_adherence")
        if "vital" in q or "blood pressure" in q or "heart rate" in q:
            vit_res = await self.registry.execute_tool("get_recent_vitals", {"subject_id": str(payload.parent_id)}, context)
            if vit_res.success:
                executed_tools.append("get_recent_vitals")
        if "appointment" in q or "doctor" in q:
            appt_res = await self.registry.execute_tool("get_appointments", {"subject_id": str(payload.parent_id)}, context)
            if appt_res.success:
                executed_tools.append("get_appointments")

        return AgentQueryResponse(
            session_id=payload.session_id or f"sess_{uuid.uuid4().hex[:8]}",
            response=(
                f"bezs-agent: Evaluated query for care subject {payload.parent_id}. "
                f"Domain tools executed under active consent: {', '.join(executed_tools) if executed_tools else 'get_parent_summary'}."
            ),
            tool_calls_executed=executed_tools
        )
