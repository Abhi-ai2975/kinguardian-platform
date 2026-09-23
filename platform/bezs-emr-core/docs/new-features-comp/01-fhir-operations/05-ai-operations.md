# $ai — AI Model Integration Operation

**Medplum reference:** `packages/server/src/fhir/operations/agentpush.ts`, `packages/server/src/fhir/realtimecommunication.ts`

---

## What This Is

Medplum exposes an `$ai` operation that acts as an authenticated, audited proxy to AI language  
models. Instead of each client app embedding API keys for OpenAI/Anthropic/etc., they call  
the FHIR server which:

1. Authenticates the call via FHIR auth
2. Injects patient context from FHIR resources
3. Forwards to the AI provider
4. Streams the response back
5. Writes an AuditEvent recording the AI interaction
6. Optionally saves the AI output as a DocumentReference

This is the architectural foundation of an **AI-enabled EMR**.

---

## Why Proxy Through FHIR?

| Without FHIR Proxy | With FHIR Proxy |
|---|---|
| API keys in every client app | Keys only on server |
| No audit trail of AI use | Every AI call creates AuditEvent |
| Client must fetch FHIR data then call AI | Server fetches and injects FHIR context |
| No role-based control of AI access | AccessPolicy controls who can use AI |
| AI output is ephemeral | Output can be stored as DocumentReference |

---

## API

### Non-Streaming

```
POST /Patient/10001/$ai
Content-Type: application/fhir+json

{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "model", "valueString": "claude-sonnet-4-6" },
    { "name": "prompt", "valueString": "Summarize this patient's recent clinical history" },
    { "name": "include", "valueCode": "Condition,MedicationRequest,Observation" }
  ]
}
```

**Response:**
```json
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "content", "valueString": "Patient John Smith (DOB 1985-03-15) has..." },
    { "name": "model", "valueString": "claude-sonnet-4-6" },
    { "name": "usage", "part": [
      { "name": "inputTokens", "valueInteger": 1240 },
      { "name": "outputTokens", "valueInteger": 387 }
    ]}
  ]
}
```

### Streaming (SSE)

```
POST /Patient/10001/$ai
Accept: text/event-stream

→ event: message
   data: {"content": "Patient John Smith"}

→ event: message
   data: {"content": " has been diagnosed with"}

→ event: done
   data: {"usage": {"input_tokens": 1240, "output_tokens": 387}}
```

---

## System-Level AI Operations

### `/$ai` — No patient context

```
POST /$ai
{
  "parameter": [
    { "name": "model", "valueString": "claude-sonnet-4-6" },
    { "name": "system", "valueString": "You are a medical coding assistant." },
    { "name": "prompt", "valueString": "What ICD-10 code corresponds to Type 2 Diabetes?" }
  ]
}
```

### `/$ai-embed` — Generate embeddings

```
POST /$ai-embed
{
  "parameter": [
    { "name": "model", "valueString": "text-embedding-3-small" },
    { "name": "input", "valueString": "chest pain on exertion" }
  ]
}
→ { "parameter": [{ "name": "embedding", "valueBase64Binary": "..." }] }
```

---

## FHIR Context Injection

When called as `Patient/{id}/$ai`, the server:

1. Fetches the patient record
2. Fetches linked resources matching the `include` parameter
3. Serializes them as FHIR JSON
4. Injects them into the system prompt:

```
You are a clinical AI assistant. Here is the relevant patient context:

[PATIENT]
{"resourceType":"Patient","id":"10001","name":[{"family":"Smith","given":["John"]}],"birthDate":"1985-03-15",...}

[CONDITIONS]
{"resourceType":"Condition","code":{"coding":[{"system":"http://snomed.info/sct","code":"44054006","display":"Diabetes mellitus type 2"}]},...}

[MEDICATIONS]
{"resourceType":"MedicationRequest","medicationCodeableConcept":{"coding":[{"code":"860975","display":"metformin 500mg tablet"}]},...}

User question: Summarize this patient's recent clinical history
```

---

## Implementation Plan

### Step 1 — AI Provider Client

```python
# app/core/ai_client.py

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

class AIClient:
    def __init__(self, config: Settings):
        self.anthropic = AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY)
        self.openai = AsyncOpenAI(api_key=config.OPENAI_API_KEY)

    async def complete(
        self,
        model: str,
        system: str,
        prompt: str,
        stream: bool = False,
    ) -> AsyncIterator[str] | str:
        if "claude" in model:
            return await self._anthropic_complete(model, system, prompt, stream)
        return await self._openai_complete(model, system, prompt, stream)

    async def embed(self, model: str, text: str) -> list[float]:
        resp = await self.openai.embeddings.create(model=model, input=text)
        return resp.data[0].embedding
```

### Step 2 — AI Operation Service

```python
# app/services/ai_service.py

class AIOperationService:
    async def run(
        self,
        patient_id: int | None,
        model: str,
        prompt: str,
        include_resources: list[str],
        user_id: str,
        org_id: str,
        stream: bool = False,
    ) -> str | AsyncIterator[str]:
        system = await self._build_system_prompt(patient_id, include_resources, user_id, org_id)
        result = await self.ai_client.complete(model, system, prompt, stream)
        await self._write_audit(patient_id, model, prompt, user_id, org_id)
        return result

    async def _build_system_prompt(self, patient_id, include_resources, user_id, org_id) -> str:
        parts = ["You are a clinical AI assistant."]
        if patient_id:
            patient = await self.patient_repo.get_by_public_id(patient_id, user_id, org_id)
            parts.append(f"[PATIENT]\n{json.dumps(to_fhir_patient(patient))}")
            for res_type in include_resources:
                resources = await self._fetch_linked(res_type, patient.id, user_id, org_id)
                if resources:
                    parts.append(f"[{res_type.upper()}]\n" + "\n".join(json.dumps(r) for r in resources))
        return "\n\n".join(parts)
```

### Step 3 — Router

```python
# app/routers/operations/ai.py

@router.post("/Patient/{patient_id}/$ai", operation_id="patient_ai_operation")
async def patient_ai(
    patient_id: int,
    body: dict,
    request: Request,
    svc=Depends(get_ai_service),
):
    model = get_param(body, "model") or "claude-sonnet-4-6"
    prompt = get_param(body, "prompt")
    include = (get_param(body, "include") or "").split(",")
    accept = request.headers.get("accept", "")

    if "text/event-stream" in accept:
        return StreamingResponse(
            svc.stream(patient_id, model, prompt, include, ...),
            media_type="text/event-stream",
        )
    result = await svc.run(patient_id, model, prompt, include, ...)
    return JSONResponse({"resourceType": "Parameters", "parameter": [{"name": "content", "valueString": result}]})
```

---

## Audit Trail

Every `$ai` call MUST write an AuditEvent:

```json
{
  "resourceType": "AuditEvent",
  "type": { "system": "http://dicom.nema.org/resources/ontology/DCM", "code": "110112", "display": "Query" },
  "action": "E",
  "recorded": "2024-01-15T10:30:00Z",
  "agent": [{ "who": { "reference": "Practitioner/30001" }, "requestor": true }],
  "entity": [
    { "what": { "reference": "Patient/10001" }, "type": { "code": "1", "display": "Person" } },
    { "what": { "display": "AI model: claude-sonnet-4-6" }, "detail": [
      { "type": "prompt", "valueString": "Summarize..." },
      { "type": "input_tokens", "valueString": "1240" }
    ]}
  ]
}
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
AI_DEFAULT_MODEL=claude-sonnet-4-6
AI_MAX_CONTEXT_RESOURCES=50
AI_ENABLE_STREAMING=true
```

---

## Security Considerations

- Rate limit `$ai` endpoints separately (AI calls are expensive)
- Require explicit permission `require_permission("AIOperation", "execute")`
- Log input tokens + output tokens to AuditEvent for cost tracking
- Never log full patient FHIR data to application logs — only to AuditEvent
- Validate `include` parameter against allowed resource types before fetching
