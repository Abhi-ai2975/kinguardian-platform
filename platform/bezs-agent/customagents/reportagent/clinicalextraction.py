import json
import re
from typing import Dict, Any

from agent.agent import Agent
from agent.events import AgentEventType, AgentType
from .clinicalprompt import CLINICAL_EXTRACTION_PROMPT


class ClinicalExtractionAgent(Agent):

    def __init__(self, config, session=None):
        super().__init__(
            config,
            CLINICAL_EXTRACTION_PROMPT,
            AgentType.CLINICAL_EXTRACTION
        )

        if session:
            self.session = session

    async def generate(
        self,
        soap_note: Dict[str, Any],
        assessment_report: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:

        if not self.session.context_manager:
            await self.session.initialize()

        self.session.agent_name = "ClinicalExtractionAgent"

        self.session.context_manager.clear()

        self.session.context_manager.set_system_prompt(
            self.system_prompt
        )

        clinical_document = {
            "soap": soap_note
        }

        if assessment_report:
            clinical_document["assessment"] = assessment_report

        self.session.context_manager.add_user_message(
            json.dumps(
                clinical_document,
                indent=2,
                ensure_ascii=False
            )
        )

        self.session.start_mlflow_run(
            "Clinical Concept Extraction"
        )

        response_text = ""

        try:

            async for event in self._agentic_loop():

                if event.type == AgentEventType.TEXT_DELTA:

                    response_text += event.data.get(
                        "content",
                        ""
                    )

                elif event.type == AgentEventType.TEXT_COMPLETE:

                    response_text = event.data.get(
                        "content",
                        ""
                    )

            return self._parse_output(
                response_text
            )

        except Exception as e:

            return {
                "error": f"Clinical extraction failed: {str(e)}"
            }

        finally:
            self.session.end_mlflow_run()

    def _parse_output(
        self,
        raw_text: str
    ) -> Dict[str, Any]:

        try:

            clean_content = re.sub(
                r"```json\s*|\s*```",
                "",
                raw_text
            ).strip()

            parsed = json.loads(
                clean_content
            )

            return {
                "conditions": parsed.get(
                    "conditions" or
                    []
                ),
                "observations": parsed.get(
                    "observations" or
                    []
                ),
                "medicationRequests": parsed.get(
                    "medicationRequests" or
                    []
                ),
                "serviceRequests": parsed.get(
                    "serviceRequests" or
                    []
                )
            }

        except Exception as e:

            return {
                "error": "JSON_PARSING_FAILED",
                "details": str(e),
                "raw_output": raw_text[:1000]
            }