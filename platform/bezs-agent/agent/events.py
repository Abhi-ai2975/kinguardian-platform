from __future__ import annotations
from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Any

from client.response import TokenUsage
from tools.base import ToolResult


class AgentEventType(str, Enum):
    # Agent lifecycle
    AGENT_START = "agent_start"
    AGENT_END = "agent_end"
    AGENT_ERROR = "agent_error"

    # Tool calls
    TOOL_CALL_START = "tool_call_start"
    TOOL_CALL_COMPLETE = "tool_call_complete"

    # Text streaming
    TEXT_DELTA = "text_delta"
    TEXT_COMPLETE = "text_complete"
    
    # User input
    USER_QUESTION = "user_question"

    #approval
    APPROVAL_REQUEST = "approval_request"
    VOICE_OUTPUT = "voice_output"

class AgentType(str, Enum):
   DOC = "doc"
   SOAP = "soap"
   ASSESSMENT = "assessment"
   CONSULT = "consult"
   INTAKE = "intake"
   EHR = "ehr"
   CLINICAL_EXTRACTION="clinical_extraction"
   VOICE_INTAKE = "voice_intake"
   VOICE_CONSULT = "voice_consult"
   DIARIZE = "diarize"

@dataclass
class AgentEvent:
    type: AgentEventType
    data: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def agent_start(cls, message: str, agent: AgentType) -> AgentEvent:
        return cls(
            type=AgentEventType.AGENT_START,
            data={"message": message, "agent": agent},
        )

    @classmethod
    def agent_end(
        cls,
        response: str | None = None,
        usage: TokenUsage | None = None,
        agent: AgentType | None = None,
    ) -> AgentEvent:
        return cls(
            type=AgentEventType.AGENT_END,
            data={
                "response": response,
                "usage": usage.__dict__ if usage else None,
                "agent": agent,
            },
        )

    @classmethod
    def agent_error(
        cls,
        error: str,
        details: dict[str, Any] | None = None,
    ) -> AgentEvent:
        return cls(
            type=AgentEventType.AGENT_ERROR,
            data={"error": error, "details": details or {}},
        )

    def to_dict(self) -> dict[str, Any]:
        """
        Converts the dataclass to a JSON-serializable dictionary.
        """
        # asdict() handles nested dataclasses like TokenUsage automatically
        return asdict(self)

    @classmethod
    def text_delta(cls, content: str, agent: AgentType) -> AgentEvent:
        return cls(
            type=AgentEventType.TEXT_DELTA,
            data={"content": content, "agent": agent},
        )

    @classmethod
    def text_complete(cls, content: str, agent: AgentType) -> AgentEvent:
        return cls(
            type=AgentEventType.TEXT_COMPLETE,
            data={"content": content, "agent": agent},
        )

    @classmethod
    def voice_output(cls, audio: bytes, sample_rate: int, agent: AgentType) -> AgentEvent:
        return cls(
            type=AgentEventType.VOICE_OUTPUT,
            data={"audio": audio, "sample_rate": sample_rate, "agent": agent},
        )
    
    @classmethod
    def user_question(cls, content: str, agent: AgentType) -> AgentEvent:
        return cls(
            type=AgentEventType.USER_QUESTION,
            data={"content": content, "agent": agent},
        )

   
    @classmethod
    def tool_call_start(cls, call_id: str, name: str, arguments: dict[str, Any], agent: AgentType):
        return cls(
            type=AgentEventType.TOOL_CALL_START,
            data={
                "call_id": call_id,
                "name": name,
                "arguments": arguments,
                "agent": agent,
            },
        )

    @classmethod
    def tool_call_complete(
        cls,
        call_id: str,
        name: str,
        result: ToolResult,
        agent: AgentType,
    ):
        return cls(
            type=AgentEventType.TOOL_CALL_COMPLETE,
            data={
                "call_id": call_id,
                "name": name,
                "success": result.success,
                "output": result.output,
                "error": result.error,
                "metadata": result.metadata,
                "diff": result.diff.to_diff() if result.diff else None,
                "truncated": result.truncated,
                "exit_code": result.exit_code,
                "agent": agent,
            },
        )

    @classmethod
    def approval_request(
        cls,
        approval_id: str,
        tool_name: str,
        description: str,
        agent: AgentType,
        params: dict[str, Any] | None = None,
    ):
        return cls(
            type=AgentEventType.APPROVAL_REQUEST,
            data={
                "approval_id": approval_id,
                "tool_name": tool_name,
                "description": description,
                "params": params or {},
                "agent": agent,
            },
        )
        