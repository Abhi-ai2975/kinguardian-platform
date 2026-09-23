
from __future__ import annotations
import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel

from tools.base import Tool, ToolResult, ToolInvocation, ToolKind, ToolConfirmation

class SavePatientInfoSchema(BaseModel):
    name: str
    age: int
    gender: str

class SavePatientInfoTool(Tool):
    name = "save_patient_info"
    description = "Store patient basic information and generate a unique clinical Patient ID"
    kind = ToolKind.WRITE
    
    # Injection point for the session
    session = None 

    @property
    def schema(self):
        return SavePatientInfoSchema

    async def get_confirmation(self, invocation: ToolInvocation) -> ToolConfirmation | None:

        params = invocation.params
        name = params.get("name", "unknown")

        base_cwd = Path(str(self.config.cwd))
        patients_dir = base_cwd / "patients"

        return ToolConfirmation(
            tool_name=self.name,
            params=invocation.params,
            description=f"Register new patient '{name}' and create patient records",
            affected_paths=[patients_dir],
            is_dangerous=False,
        )

    async def execute(self, invocation: ToolInvocation) -> ToolResult:
        try:
            # 1. Validation: Ensure session is linked
            if not self.session:
                return ToolResult.error_result("Tool Error: Session not linked.")

            params = invocation.params
            name = params.get("name")
            age = params.get("age")
            gender = params.get("gender")

            # 2. Generate unique patient ID
            # Using a prefix like 'PAT-' makes it look more professional in the PDF
            timestamp = datetime.now().strftime('%Y%m%d')
            unique_suffix = str(uuid.uuid4())[:6].upper()
            patient_id = f"PAT-{timestamp}-{unique_suffix}"
            
            patient_data = {
                "patient_id": patient_id,
                "name": name,
                "age": age,
                "gender": gender,
                "created_at": datetime.now().isoformat()
            }

            # 3. Path Handling (WSL Safe)
            # Use Path(str(...)) to avoid the TypeError we saw earlier
            base_cwd = Path(str(self.config.cwd))
            patients_dir = base_cwd / "patients"
            patients_dir.mkdir(exist_ok=True)
            
            # Create a dedicated folder for this specific patient's files
            patient_folder = patients_dir / patient_id
            patient_folder.mkdir(parents=True, exist_ok=True)
            
            # Save the JSON record
            info_file = patients_dir / f"{patient_id}_info.json"
            info_file.write_text(json.dumps(patient_data, indent=2))

            # 4. STORE IN SESSION (Crucial for the other tools!)
            # This makes session.patient_info accessible to SOAP, Summary, and Assessment tools
            self.session.patient_info = patient_data

            return ToolResult.success_result(
                f"Successfully registered patient {name} (ID: {patient_id}). "
                f"Folders created in {patients_dir}."
            )

        except Exception as e:
            return ToolResult.error_result(f"Failed to save patient info: {str(e)}")