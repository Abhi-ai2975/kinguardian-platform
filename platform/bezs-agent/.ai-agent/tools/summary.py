from __future__ import annotations
import os
import json
from pathlib import Path
from pydantic import BaseModel

from tools.base import Tool, ToolResult, ToolInvocation, ToolKind, ToolConfirmation
from utils.conversation import build_conversation_text
from utils.patientstorage import get_patient_folder
from utils.patientsummary import PatientSummaryReportGenerator
from client.response import StreamEventType

class SummarySchema(BaseModel):
    patient_id: str | None = None

class GeneratePatientSummaryTool(Tool):
    name = "generate_patient_summary"
    description = "Generate a concise doctor-facing patient summary PDF"
    kind = ToolKind.WRITE
    
    # Injection point for the session
    session = None 

    @property
    def schema(self):
        return SummarySchema

    async def get_confirmation(self, invocation: ToolInvocation) -> ToolConfirmation | None:

        # ensure session exists
        if not self.session:
            return None

        patient_info = getattr(self.session, "patient_info", {})
        patient_id = invocation.params.get("patient_id") or patient_info.get("patient_id", "unknown")

        base_cwd = Path(str(self.config.cwd))
        patient_dir = get_patient_folder(base_cwd, patient_id)

        output_file = patient_dir / "patientsummary.pdf"

        return ToolConfirmation(
            tool_name=self.name,
            params=invocation.params,
            description=f"Generate patient summary PDF for patient {patient_id}",
            affected_paths=[output_file],
            is_dangerous=False,
        )

    async def execute(self, invocation: ToolInvocation) -> ToolResult:
        try:
            # 1. Ensure Session is linked
            if not self.session:
                return ToolResult.error_result("Tool Error: Session not linked.")

            # 2. Get Data from Session (Source of Truth)
            patient_info = getattr(self.session, "patient_info", {})
            patient_id = invocation.params.get("patient_id") or patient_info.get("patient_id")
            
            if not patient_id:
                return ToolResult.error_result("No patient ID found. Please save patient info first.")

            # 3. Get Conversation from Context Manager
            messages = self.session.context_manager.get_messages()
            conversation = build_conversation_text(messages)

            if not conversation:
                return ToolResult.error_result("No conversation transcript found.")

            # 4. Generate Summary Text via LLM
            summary_text = await self._run_summary_generation(conversation)

            if not summary_text:
                return ToolResult.error_result("Failed to generate clinical summary.")

            # 5. Path Handling (WSL/Python 3.12 Safe)
            base_cwd = Path(str(self.config.cwd))
            patient_dir = get_patient_folder(base_cwd, patient_id)
            os.makedirs(patient_dir, exist_ok=True)
            
            output_file = patient_dir / "patientsummary.pdf"

            # 6. PDF Generation
            generator = PatientSummaryReportGenerator(patient_info)
            generator.generate(summary_text, str(output_file))

            return ToolResult.success_result(f"Patient summary saved at {output_file}")

        except Exception as e:
            return ToolResult.error_result(f"Summary Tool Error: {str(e)}")

    async def _run_summary_generation(self, conversation: str) -> str:
        """Helper to handle the LLM chat completion"""
        prompt = f"""
Create a clinical Patient Summary from the following patient conversation.
Conversation:
{conversation}

Rules:
- Doctor-facing summary, clinical tone.
- Include symptoms, duration, and severity.
- Output a single, concise paragraph.
"""
        full_response = ""
        async for event in self.session.client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        ):
            if event.type == StreamEventType.TEXT_DELTA and event.text_delta:
                full_response += event.text_delta.content
        
        return full_response.strip()
