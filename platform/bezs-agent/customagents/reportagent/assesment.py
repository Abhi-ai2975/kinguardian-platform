import json
from typing import List
from agent.agent import Agent
from agent.events import AgentEventType, AgentType
from .assessmentprompt import ASSESSMENT_PROMPT
import re

class AssessmentAgent(Agent):
    def __init__(self, config, session=None):
        super().__init__(config, ASSESSMENT_PROMPT, AgentType.ASSESSMENT)
        if session:
            self.session = session

    async def generate(self, conversation: List[str]):
        
        if not self.session.context_manager:
            await self.session.initialize()

        self.session.agent_name = "AssessmentReporter"

        self.session.context_manager.clear()
        self.session.context_manager.set_system_prompt(self.system_prompt)

        full_transcript = "\n".join(conversation)
        self.session.context_manager.add_user_message(
            f"Generate a medical assessment report based on this transcript:\n{full_transcript}"
        )

        response_text = ""

        # 4. Use the internal loop (Better for tracking/pruning)
        try:
            async for event in self._agentic_loop():
                if event.type == AgentEventType.TEXT_DELTA:
                    response_text += event.data.get("content", "")
                elif event.type == AgentEventType.TEXT_COMPLETE:
                    response_text = event.data.get("content", "")

            # 5. Robust JSON Parsing
            return self._parse_report(response_text)

        except Exception as e:
            return {"error": f"Agent loop failed: {str(e)}"}

    def _parse_report(self, raw_text: str) -> dict:
        try:
            # Clean markdown formatting
            clean_content = re.sub(r"```json\s?|```", "", raw_text).strip()
            return json.loads(clean_content)
        except Exception:
            return {
                "error": "JSON Parsing Failed",
                "raw_content": raw_text[:500] # Return some text so you can debug
            }