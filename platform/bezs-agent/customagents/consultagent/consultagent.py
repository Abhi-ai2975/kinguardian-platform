# from agent.agent import Agent
# from agent.events import AgentEventType
# from .consultprompt import CONSULT_PROMPT
# from prompts.system import get_system_prompt


# class ConsultingAgent(Agent):
#     def __init__(self, config):
#         super().__init__(config, CONSULT_PROMPT)

#     async def chat(self, message: str):
#         """Chat interface that preserves conversation context"""
#         # Ensure session is initialized
#         if not self.session.context_manager:
#             await self.session.initialize()
        
#         # Set agent name
#         self.session.agent_name = self.__class__.__name__
        
#         # Set system prompt only once per session
#         if not hasattr(self, '_session_initialized') or not self._session_initialized:
#             common_prompt = get_system_prompt(self.config, user_memory=None)
#             combined_prompt = f"{self.system_prompt}\n\n---\n\n{common_prompt}"
#             self.session.context_manager.set_system_prompt(combined_prompt)
#             self._session_initialized = True
        
#         # Add user message to preserve conversation history
#         self.session.context_manager.add_user_message(message)
        
#         response_text = ""

#         # Direct LLM call to avoid context clearing
#         async for event in self.session.client.chat_completion(
#             self.session.context_manager.get_messages(),
#             tools=None,
#             temperature=0.2
#         ):
#             if hasattr(event, "text_delta") and event.text_delta:
#                 chunk = event.text_delta.content
#                 response_text += chunk
#                 yield {
#                     "type": "text_delta",
#                     "data": chunk
#                 }

#         # Save assistant response to maintain conversation memory
#         self.session.context_manager.add_assistant_message(response_text)

#         if not response_text:
#             response_text = "I'm here to help. Could you tell me more about your symptoms?"

#         yield {
#             "type": "text_complete",
#             "data": response_text
#         }

from __future__ import annotations
from typing import AsyncGenerator
from agent.agent import Agent
from agent.events import AgentEvent, AgentType
from prompts.system import get_system_prompt
from .consultprompt import CONSULT_PROMPT

class ConsultingAgent(Agent):
    def __init__(self, config, session=None):
        """
        Initialize with a specific prompt. 
        Pass an existing session to keep history across agents.
        """
        super().__init__(config, CONSULT_PROMPT, AgentType.CONSULT)
        if session:
            self.session = session

    async def run(self, message: str) -> AsyncGenerator[AgentEvent, None]:
        """
        The main entry point for the medical consultation.
        Uses the base Agentic Loop to support tracking and future tools.
        """
        # 1. Ensure the session is ready
        if not self.session.context_manager:
            await self.session.initialize()

        # 2. Setup metadata for tracking
        self.session.agent_name = "DoctorAI"

        full_system_prompt = get_system_prompt(
            config=self.config,
            role_prompt=self.system_prompt, # This is your CONSULT_PROMPT
            user_memory=getattr(self, 'memory', None) # Pass memory if available
        )
        # Set it in the context manager
        self.session.context_manager.set_system_prompt(full_system_prompt)
        
        # 4. Add the patient's message
        self.session.context_manager.add_user_message(message)

        # 5. MLflow Tracking (Start after system prompt is set for better logging)
        self.session.start_mlflow_run(message)
        

        try:
            # 6. Run the core loop
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