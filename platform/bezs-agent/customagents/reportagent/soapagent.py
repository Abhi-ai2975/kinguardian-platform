import json
import re
from typing import List
from agent.agent import Agent
from agent.events import AgentEvent, AgentEventType, AgentType
from .soapprompt import SOAP_PROMPT


class SOAPAgent(Agent):
    def __init__(self, config, session=None):
        super().__init__(config, SOAP_PROMPT, AgentType.SOAP)
        if session:
            self.session = session

    async def generate(self, conversation: List[str]):

        if not self.session.context_manager:
            await self.session.initialize()
        
        # 2. Set identifier for tracking
        self.session.agent_name = "SOAPScribeAgent"
        
        # Reset context
        self.session.context_manager.clear()

        # Set only this agent prompt
        self.session.context_manager.set_system_prompt(self.system_prompt)

        # Add conversation
        transcript = "\n".join(conversation)
        self.session.context_manager.add_user_message(
            f"Please generate a structured SOAP note from the following conversation:\n{transcript}"
        )

        # 4. Start MLflow tracking (Integrated with your Base Agent infrastructure)
        self.session.start_mlflow_run("Generate SOAP Note")

        response_text = ""

        try:
            # 5. Use the internal agentic loop for consistency
            async for event in self._agentic_loop():
                if event.type == AgentEventType.TEXT_DELTA:
                    response_text += event.data.get("content", "")
                elif event.type == AgentEventType.TEXT_COMPLETE:
                    response_text = event.data.get("content", "")

            # 6. Clean and Parse JSON
            return self._parse_soap_json(response_text)

        except Exception as e:
            return {"error": f"SOAP generation failed: {str(e)}"}
        finally:
            self.session.end_mlflow_run()

    def _parse_soap_json(self, raw_text: str) -> dict:
        """
        Handles potential markdown formatting and returns clean JSON.
        """
        try:
            # Remove markdown JSON blocks if present
            clean_content = re.sub(r"```json\s?|```", "", raw_text).strip()
            return json.loads(clean_content)
        except Exception:
            # Fallback structure
            return {
                "error": "JSON_PARSING_FAILED",
                "raw_output": raw_text[:500]
            }