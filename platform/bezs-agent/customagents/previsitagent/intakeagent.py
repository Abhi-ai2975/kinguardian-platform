from __future__ import annotations
from typing import AsyncGenerator
from agent.agent import Agent
from agent.events import AgentEvent, AgentType, AgentEventType
from .intakeprompt import INTAKE_PROMPT
from prompts.system import get_system_prompt


class IntakeAgent(Agent):
    def __init__(self, config, session=None):
        """
        Follows the Consult Agent pattern: 
        Base Agent handles the heavy lifting, we handle the clinical intake logic.
        """
        super().__init__(config, INTAKE_PROMPT, AgentType.INTAKE)
        if session:
            self.session = session

    async def run(self, message: str = "") -> AsyncGenerator[AgentEvent, None]:
        """
        This is the main entry point, matching your Consult Agent's signature.
        It yields AgentEvents directly for the most flexible integration.
        """
        # 1. Standard Consult-Style Initialization
        if not self.session.context_manager:
            await self.session.initialize()

        self.session.agent_name = "IntakeAssistant"

        # 2. Add the user message to the session context
        # This merges INTAKE_PROMPT with your global clinical rules and memory
        full_system_prompt = get_system_prompt(
            config=self.config,
            role_prompt=self.system_prompt, # This is your INTAKE_PROMPT
            user_memory=getattr(self, 'memory', None)
        )

        self.session.context_manager.set_system_prompt(full_system_prompt)

        # 4. Handle user input
        if message:
            self.session.context_manager.add_user_message(message)

        # 3. Start MLflow tracking for this turn
        self.session.start_mlflow_run("Intake Conversation Turn")

        try:
            # 4. Use the inherited _agentic_loop
            # This handles your tools, RAG (if added), and the LLM call
            async for event in self._agentic_loop():
                
                # Tagging for the UI/Frontend
                if hasattr(event, "data") and "agent" in event.data:
                    event.data["agent"] = self.agent_type
                
                yield event

        except Exception as e:
            yield AgentEvent.agent_error(error=f"Intake Loop Error: {str(e)}")
        
        finally:
            # 5. Ensure tracking ends even if the connection drops
            self.session.end_mlflow_run()

    
    async def __aenter__(self):
        if not self.session.context_manager:
            await self.session.initialize()
        return self