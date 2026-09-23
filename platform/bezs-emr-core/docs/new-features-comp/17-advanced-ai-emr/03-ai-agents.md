# AI Agents — Autonomous Clinical Workflow Automation

**Tech:** Claude tool use (function calling), LangChain agent executor  
**Status:** Not implemented  
**Philosophy:** Agents suggest and execute — humans approve before anything clinical happens

---

## What Are AI Agents?

An AI agent is an LLM that can **choose which tools to call, in what order, and loop until the task is done** — rather than answering a single question. In a clinical context:

- **Without agents:** "Draft a prior auth for MRI Brain" → AI returns text → human copies it manually
- **With agents:** "Handle the prior auth for this order" → agent checks coverage, drafts the Claim, submits it, creates a Task, and notifies the provider — all autonomously

The critical difference from standard AI: agents **take actions**, not just generate text.

---

## Human-in-the-Loop Principle

Every agent action that creates, modifies, or deletes a clinical FHIR resource requires explicit provider approval. The agent can:

- **Execute without approval:** Read-only FHIR queries, external API reads, calculations
- **Requires approval:** Creating any FHIR resource, sending messages, submitting forms to payers
- **Always blocked:** Deleting resources, overriding alerts, changing medication doses

```python
class AgentActionPolicy:
    IMMEDIATE = {"read_patient", "search_guidelines", "calculate_dose", "check_interactions"}
    REQUIRES_APPROVAL = {"create_order", "send_message", "submit_prior_auth", "update_condition"}
    ALWAYS_BLOCKED = {"delete_resource", "override_allergy_alert", "change_to_controlled_substance"}
```

---

## Agent Tool Registry

Tools are FHIR operations wrapped for agent use:

```python
# app/services/agents/tools.py

from anthropic import Tool

CLINICAL_AGENT_TOOLS = [
    Tool(
        name="search_patient_history",
        description="Search a patient's FHIR history. Use to find conditions, medications, labs, allergies, or procedures.",
        input_schema={
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer"},
                "resource_type": {"type": "string", "enum": ["Condition", "MedicationRequest", "Observation", "AllergyIntolerance", "Procedure", "DiagnosticReport"]},
                "query": {"type": "string", "description": "Natural language search query or FHIR search parameter string"},
                "limit": {"type": "integer", "default": 10},
            },
            "required": ["patient_id", "resource_type"],
        },
    ),
    Tool(
        name="search_clinical_guidelines",
        description="Search clinical guidelines and drug information using semantic search (RAG).",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "specialty": {"type": "string", "description": "Filter by specialty: cardiology, endocrinology, oncology, etc."},
            },
            "required": ["query"],
        },
    ),
    Tool(
        name="check_drug_interactions",
        description="Check for drug-drug or drug-allergy interactions for a list of RxNorm codes.",
        input_schema={
            "type": "object",
            "properties": {
                "rxnorm_codes": {"type": "array", "items": {"type": "string"}},
                "patient_id": {"type": "integer"},
            },
            "required": ["rxnorm_codes"],
        },
    ),
    Tool(
        name="create_order",
        description="Create a clinical order (ServiceRequest, MedicationRequest). REQUIRES HUMAN APPROVAL before execution.",
        input_schema={
            "type": "object",
            "properties": {
                "order_type": {"type": "string", "enum": ["lab", "imaging", "medication", "referral", "procedure"]},
                "code": {"type": "string", "description": "LOINC, CPT, or RxNorm code"},
                "description": {"type": "string"},
                "patient_id": {"type": "integer"},
                "encounter_id": {"type": "integer"},
                "dosage": {"type": "string", "description": "For medications: sig (e.g., '500mg PO BID x 7 days')"},
                "urgency": {"type": "string", "enum": ["routine", "urgent", "stat"]},
            },
            "required": ["order_type", "description", "patient_id"],
        },
    ),
    Tool(
        name="submit_prior_auth",
        description="Submit a prior authorization request to the patient's insurer. REQUIRES HUMAN APPROVAL.",
        input_schema={
            "type": "object",
            "properties": {
                "service_request_id": {"type": "integer"},
                "diagnosis_codes": {"type": "array", "items": {"type": "string"}},
                "clinical_notes": {"type": "string"},
            },
            "required": ["service_request_id"],
        },
    ),
    Tool(
        name="send_secure_message",
        description="Send a secure message to a patient or provider. REQUIRES HUMAN APPROVAL.",
        input_schema={
            "type": "object",
            "properties": {
                "recipient_ref": {"type": "string", "description": "FHIR reference: Patient/10001 or Practitioner/30001"},
                "subject_patient_id": {"type": "integer"},
                "message": {"type": "string"},
                "priority": {"type": "string", "enum": ["routine", "urgent"]},
            },
            "required": ["recipient_ref", "message"],
        },
    ),
    Tool(
        name="calculate_risk_score",
        description="Calculate a clinical risk score (HEART, qSOFA, CHA2DS2, Wells, FRS).",
        input_schema={
            "type": "object",
            "properties": {
                "score_type": {"type": "string", "enum": ["qsofa", "heart", "cha2ds2", "wells_pe", "wells_dvt", "framingham"]},
                "patient_id": {"type": "integer"},
                "encounter_id": {"type": "integer"},
            },
            "required": ["score_type", "patient_id"],
        },
    ),
]
```

---

## Agent Executor

```python
# app/services/agents/executor.py

import anthropic

class ClinicalAgentExecutor:
    MAX_ITERATIONS = 10     # prevent infinite loops
    TIMEOUT_SECONDS = 60    # hard timeout per agent run

    def __init__(self, tool_registry: ToolRegistry, approval_store: ApprovalStore):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.tools = tool_registry
        self.approval_store = approval_store

    async def run(
        self,
        task: str,
        patient_id: int,
        encounter_id: int | None,
        user_id: str,
        org_id: str,
    ) -> dict:
        """
        Run an AI agent to complete a clinical task.
        Returns: { status, actions_taken, pending_approvals, final_response }
        """
        context = await self._build_context(patient_id, encounter_id, user_id, org_id)
        messages = [{"role": "user", "content": f"{context}\n\nTask: {task}"}]
        actions_taken = []
        pending_approvals = []

        for iteration in range(self.MAX_ITERATIONS):
            response = await self.client.messages.create(
                model="claude-opus-4-8",
                max_tokens=4096,
                system=CLINICAL_AGENT_SYSTEM_PROMPT,
                tools=CLINICAL_AGENT_TOOLS,
                messages=messages,
            )

            # If no tool use, agent is done
            if response.stop_reason == "end_turn":
                final_text = next((b.text for b in response.content if hasattr(b, "text")), "")
                return {
                    "status": "completed",
                    "actions_taken": actions_taken,
                    "pending_approvals": pending_approvals,
                    "final_response": final_text,
                }

            # Process tool calls
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                tool_name = block.name
                tool_input = block.input

                if tool_name in AgentActionPolicy.ALWAYS_BLOCKED:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": "ERROR: This action is not permitted.",
                    })
                    continue

                if tool_name in AgentActionPolicy.REQUIRES_APPROVAL:
                    # Queue for human approval instead of executing
                    approval_id = await self.approval_store.create({
                        "tool": tool_name,
                        "input": tool_input,
                        "patient_id": patient_id,
                        "user_id": user_id,
                        "status": "pending",
                    })
                    pending_approvals.append({
                        "approval_id": approval_id,
                        "tool": tool_name,
                        "input": tool_input,
                        "description": self._describe_action(tool_name, tool_input),
                    })
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": f"Action queued for approval (approval_id: {approval_id}). The clinician must approve before this executes.",
                    })
                else:
                    # Execute immediately (read-only)
                    result = await self.tools.execute(tool_name, tool_input, user_id, org_id)
                    actions_taken.append({"tool": tool_name, "input": tool_input, "result": result})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

        return {
            "status": "max_iterations_reached",
            "actions_taken": actions_taken,
            "pending_approvals": pending_approvals,
        }
```

---

## Example Agent Sessions

### Agent: "Handle the Prior Auth for this MRI Order"

```
User: Handle the prior auth for ServiceRequest/80001 (MRI Brain with contrast, Patient 10001)

[iteration 1]
Agent → search_patient_history(patient_id=10001, resource_type="Condition")
  Result: Active conditions: Stroke (I63.9), Hypertension (I10), Type 2 DM (E11.9)

Agent → search_patient_history(patient_id=10001, resource_type="DiagnosticReport")
  Result: Last MRI Brain 18 months ago, normal

Agent → search_clinical_guidelines(query="MRI brain with contrast prior auth criteria stroke")
  Result: [BCBS Coverage Policy] MRI Brain with contrast approved if: prior CVA, new focal neuro symptoms, or headache with red flags

Agent → submit_prior_auth(service_request_id=80001, diagnosis_codes=["I63.9", "G89.29"], clinical_notes="Patient with prior stroke presenting with new focal deficit...")
  → QUEUED FOR APPROVAL (approval_id: pa-001)

Agent response: "I've prepared a prior authorization request for the MRI Brain with contrast (CPT 70553). 
  - Diagnosis: Stroke (I63.9) + Headache NOS (R51)
  - Clinical justification: Prior stroke with new neurological symptoms, per BCBS coverage policy criteria
  - Supporting evidence: Patient has documented prior CVA from 2022
  
  The PA request is queued for your review. Click Approve to submit to Blue Cross."

Clinician: [Reviews + Approves]
Agent executes: POST /Claim/$submit → PA submitted → Task created
```

### Agent: "Close Care Gaps for My Panel"

```
User: Which patients in my panel have overdue diabetes screenings? Send them reminders.

Agent → search_patient_history(resource_type="Observation", query="HbA1c last 12 months")
  → identifies 12 patients with DM + no A1c in 12 months

Agent → send_secure_message x12 → ALL QUEUED FOR APPROVAL

Agent response: "Found 12 patients with Type 2 DM and no HbA1c in the past 12 months:
  1. John Smith (10001) — last A1c: 14 months ago
  2. Jane Doe (10002) — last A1c: 16 months ago
  ...
  
  I've drafted reminder messages for all 12. Click Approve All to send, or review individually."
```

---

## Approval API

```python
GET  /agents/approvals?status=pending&user_id={user}
POST /agents/approvals/{id}/$approve
POST /agents/approvals/{id}/$reject
POST /agents/approvals/$approve-all?batch_id={batch}
```

### Approval schema

```sql
CREATE TABLE agent_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_run_id    UUID NOT NULL,
    tool            VARCHAR(100) NOT NULL,
    tool_input      JSONB NOT NULL,
    patient_id      BIGINT REFERENCES patient(id),
    user_id         VARCHAR NOT NULL,
    org_id          UUID NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
    approved_by     VARCHAR,
    approved_at     TIMESTAMPTZ,
    executed_at     TIMESTAMPTZ,
    execution_result JSONB,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Agent Router

```python
@agent_router.post(
    "/Patient/{patient_id}/$agent",
    operation_id="run_clinical_agent",
    summary="Run an AI agent to complete a clinical task",
    description="Runs an autonomous AI agent with access to FHIR tools. Actions requiring clinical judgment are queued for provider approval before execution.",
)
async def run_agent(
    patient_id: int,
    body: AgentTaskSchema,
    request: Request,
    executor: ClinicalAgentExecutor = Depends(get_agent_executor),
    patient: Patient = Depends(resolve_patient),
):
    user = request.state.user
    result = await executor.run(
        task=body.task,
        patient_id=patient.id,
        encounter_id=body.encounter_id,
        user_id=user["sub"],
        org_id=user["activeOrganizationId"],
    )
    return JSONResponse(result)
```

---

## Estimated Effort

| Component | Days |
|---|---|
| Tool registry + FHIR tool implementations | 3 |
| Agent executor with approval gating | 3 |
| Approval store + API | 2 |
| Agent router + schema | 1 |
| Prior auth agent scenario | 2 |
| Care gap closure agent scenario | 2 |
| Approval UI WebSocket updates | 1 |
| Rate limiting + safety guardrails | 1 |
| **Total** | **15 days** |
