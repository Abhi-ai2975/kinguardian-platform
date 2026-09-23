import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.agent.mcp.server import (
    KinGuardianEMRMCPBridge,
    MCPToolInfo,
    MCPToolCallRequest,
    MCPToolCallResponse
)

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol (MCP)"])


def get_mcp_bridge(session: AsyncSession) -> KinGuardianEMRMCPBridge:
    user_repo = SQLAlchemyAppProfileRepository(session)
    family_repo = SQLAlchemyFamilyRepository(session)
    consent_repo = SQLAlchemyConsentRepository(session)
    event_logger = EventService(session)
    return KinGuardianEMRMCPBridge(
        family_repo=family_repo,
        consent_repo=consent_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )


@router.post("/tools/list", response_model=List[MCPToolInfo])
async def list_mcp_tools(
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    MCP Protocol:
    Lists all business-safe EMR MCP tools exposed by KinGuardian.
    Raw DB operations (e.g. execute_sql) are strictly excluded and blocked.
    """
    bridge = get_mcp_bridge(db_session)
    return bridge.get_tool_definitions()


@router.post("/tools/call", response_model=MCPToolCallResponse)
async def call_mcp_tool(
    request: MCPToolCallRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    MCP Protocol:
    Executes a business-safe MCP tool call with independent authorization.
    Rejects any attempted raw SQL or direct DB queries with a Security Policy Violation.
    """
    bridge = get_mcp_bridge(db_session)
    return await bridge.execute_mcp_tool(
        actor_id=current_user.id,
        request=request
    )
