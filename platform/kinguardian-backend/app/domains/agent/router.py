import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.agent.schemas import (
    AgentQueryRequest,
    AgentQueryResponse,
    ToolExecutionRequest,
    ToolExecutionResponse,
    ToolDefinitionResponse
)
from app.domains.agent.services import AgentProxyService
from app.domains.family.domain.exceptions import FamilyAccessError

router = APIRouter(prefix="/agent", tags=["AI Agent Runtime & Domain Tools"])


@router.get("/tools", response_model=List[ToolDefinitionResponse])
async def list_agent_tools(
    family_id: uuid.UUID,
    subject_id: Optional[uuid.UUID] = None,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Returns the controlled list of KinGuardian domain tools available to the bezs-agent
    runtime for this actor and care circle under least-privilege scoping.
    """
    service = AgentProxyService(db_session)
    return await service.list_available_tools(
        actor_id=current_user.id,
        family_id=family_id,
        subject_id=subject_id
    )


@router.post("/tools/execute", response_model=ToolExecutionResponse)
async def execute_agent_tool(
    payload: ToolExecutionRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Executes a domain tool invoked by bezs-agent with independent authorization verification.
    """
    service = AgentProxyService(db_session)
    return await service.execute_tool(
        actor_id=current_user.id,
        payload=payload
    )


@router.post("/query", response_model=AgentQueryResponse)
async def query_agent(
    payload: AgentQueryRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Dispatches a query to the bezs-agent runtime with registered KinGuardian domain tools.
    """
    service = AgentProxyService(db_session)
    return await service.query_clinical_agent(current_user.id, payload)
