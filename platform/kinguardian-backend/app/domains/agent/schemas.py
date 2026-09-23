import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    session_id: Optional[str] = None
    query: str
    parent_id: uuid.UUID
    family_id: Optional[uuid.UUID] = None


class AgentQueryResponse(BaseModel):
    session_id: str
    response: str
    tool_calls_executed: List[str] = Field(default_factory=list)


class ToolExecutionRequest(BaseModel):
    tool_name: str
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


class ToolExecutionResponse(BaseModel):
    tool_name: str
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    disclaimer: Optional[str] = None
    executed_at: datetime = Field(default_factory=datetime.now)


class ToolDefinitionResponse(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]
    required_permission: str
