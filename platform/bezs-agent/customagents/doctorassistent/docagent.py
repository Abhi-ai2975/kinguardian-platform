from __future__ import annotations
from agent.agent import Agent
from .docprompt import DOC_PROMPT
from agent.events import AgentType, AgentEventType, AgentEvent
from prompts.system import get_system_prompt
import json
import re
from typing import List, AsyncGenerator

class DoctorAssistantAgent(Agent):
    def __init__(self, config, session=None):
        """
        Initializes the Assistant with the DOC_PROMPT.
        Reuses the base Agent infrastructure for tracking and session management.
        """
        super().__init__(config, DOC_PROMPT, AgentType.DOC)
        if session:
            self.session = session

    async def recommend_questions(self, conversation: List[str]) -> dict:
        """
        NON-STREAMING version for the 'Magic Button' router.
        Consumes the async generator internally and returns a clean dictionary.
        """
        # 1. Initialize session and context
        if not self.session.context_manager:
            await self.session.initialize()

        self.session.agent_name = "DoctorAssistant"
        
        # Clear context to ensure we only focus on the current recommendation task
        self.session.context_manager.clear()
        self.session.context_manager.set_system_prompt(self.system_prompt)
        
        # Convert the list of strings into a single block or add them individually
        history_block = "\n".join(conversation)
        self.session.context_manager.add_user_message(
            f"Review this conversation and suggest 3 questions:\n{history_block}"
        )

        self.session.start_mlflow_run("Generate Clinical Questions")

        response_text = ""
        try:
            # 2. CONSUME the stream internally
            # We use 'async for' because self._agentic_loop() is an AsyncGenerator
            async for event in self._agentic_loop():
                if event.type == AgentEventType.TEXT_DELTA:
                    response_text += event.data.get("content", "")
                elif event.type == AgentEventType.TEXT_COMPLETE:
                    response_text = event.data.get("content", "")

            # 3. Parse and return the final JSON
            return self.parse_questions(response_text)

        except Exception as e:
            return {"questions": [], "error": str(e)}
        finally:
            self.session.end_mlflow_run()

    async def run(self, message: str = "") -> AsyncGenerator[AgentEvent, None]:
        """
        STREAMING version. 
        Use this if you ever want to show the assistant 'typing' in the UI.
        """
        if not self.session.context_manager:
            await self.session.initialize()

        self.session.agent_name = "DoctorAssistant"

        if message:
            self.session.context_manager.add_user_message(message)

        self.session.start_mlflow_run("Streaming Clinical Questions")

        try:
            async for event in self._agentic_loop():
                if hasattr(event, "data") and "agent" in event.data:
                    event.data["agent"] = self.agent_type
                yield event
        except Exception as e:
            yield AgentEvent.agent_error(error=f"Assistant Loop Error: {str(e)}")
        finally:
            self.session.end_mlflow_run()

    def parse_questions(self, raw_content: str) -> dict:
        """
        Utility method to clean markdown and parse JSON.
        """
        try:
            # Strip backticks (e.g., ```json ... ```)
            clean_content = re.sub(r"```json\s?|```", "", raw_content).strip()
            return json.loads(clean_content)
        except json.JSONDecodeError:
            return {"questions": [], "error": "Invalid JSON format received", "raw": raw_content[:100]}

# class DoctorAssistentAgent(Agent):
#     def __init__(self, config):
#         super().__init__(config, DOC_PROMPT)

#     async def recommend_questions(self, conversation: List[str]):

#         # Ensure session initialized
#         if not self.session.context_manager:
#             await self.session.initialize()

#         # Set agent name AFTER session exists
#         self.session.agent_name = self.__class__.__name__
        
#         self.session.context_manager.clear()
#         common_prompt = get_system_prompt(
#             self.config,
#             user_memory=None
#         )
#         final_prompt = f"{self.system_prompt}\n\n---\n\n{common_prompt}"
#         self.session.context_manager.set_system_prompt(final_prompt)
        
#         for msg in conversation:
#             self.session.context_manager.add_user_message(msg)

#         response_text = ""

#         async for event in self.session.client.chat_completion(
#             self.session.context_manager.get_messages(),
#             tools=None,          # important: no tools
#             temperature=0.2  
#         ):
#             if hasattr(event, "text_delta") and event.text_delta:
#                 response_text += event.text_delta.content

#         try:
#             return json.loads(response_text)
#         except Exception:
#             return {
#                 "error": "Invalid JSON",
#                 "raw": response_text[:500]
#             }
