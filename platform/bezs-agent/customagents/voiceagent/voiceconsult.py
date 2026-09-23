from __future__ import annotations
import re
import base64
from typing import TYPE_CHECKING, AsyncGenerator
from agent.agent import Agent
from agent.events import AgentEvent, AgentEventType, AgentType
from client.response import StreamEventType
from prompts.system import get_system_prompt
from .voiceconsultprompt import VOICE_CONSULT_PROMPT

class VoiceConsultAgent(Agent):
    def __init__(self, config, session=None):
        super().__init__(config, VOICE_CONSULT_PROMPT, AgentType.VOICE_CONSULT)
        if session:
            self.session = session

    async def run(self, transcript: str) -> AsyncGenerator[AgentEvent, None]:
        if not self.session.context_manager:
            await self.session.initialize()

        self.session.agent_name = self.__class__.__name__

        full_system_prompt = get_system_prompt(
            config=self.config,
            role_prompt=self.system_prompt,
        )
        self.session.context_manager.set_system_prompt(full_system_prompt)
        self.session.context_manager.add_user_message(transcript)

        self.session.start_mlflow_run(transcript)

        try:
            async for event in self._agentic_loop():
                if hasattr(event, 'data') and event.data.get("agent") is None:
                    event.data["agent"] = self.agent_type
                yield event
        finally:
            self.session.end_mlflow_run()

    async def __aenter__(self):
        if not self.session.context_manager:
            await self.session.initialize()
        return self
