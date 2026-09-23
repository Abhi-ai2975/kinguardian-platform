# Core AI Integration

---

## Model Routing

Different clinical tasks need different models:

| Task | Model | Reason |
|---|---|---|
| Clinical note summarization | claude-sonnet-4-6 | Long context, nuanced |
| SNOMED/ICD code extraction | claude-haiku-4-5 | Fast, structured output |
| Differential diagnosis | claude-opus-4-8 | Complex reasoning |
| Patient portal messaging | claude-haiku-4-5 | Fast, low-cost |
| Image analysis (radiology) | gpt-4o (vision) | Best imaging model |
| Drug interaction check | claude-haiku-4-5 | Fast lookup tasks |
| Risk stratification | Fine-tuned model | Domain-specific |
| Ambient note transcription | Whisper + claude-sonnet-4-6 | Audio → text → FHIR |

---

## AI Model Registry

```python
# app/core/ai_registry.py

AI_MODELS = {
    "claude-sonnet-4-6": {
        "provider": "anthropic",
        "context_window": 200000,
        "cost_per_1m_input": 3.0,
        "cost_per_1m_output": 15.0,
        "supports_vision": False,
        "capabilities": ["summarization", "extraction", "generation", "reasoning"],
    },
    "claude-haiku-4-5": {
        "provider": "anthropic",
        "context_window": 200000,
        "cost_per_1m_input": 0.25,
        "cost_per_1m_output": 1.25,
        "supports_vision": False,
        "capabilities": ["extraction", "classification", "quick-qa"],
    },
    "claude-opus-4-8": {
        "provider": "anthropic",
        "context_window": 200000,
        "cost_per_1m_input": 15.0,
        "cost_per_1m_output": 75.0,
        "capabilities": ["complex-reasoning", "research", "long-form-generation"],
    },
}

def recommend_model(task: str) -> str:
    TASK_MODEL_MAP = {
        "summarize": "claude-sonnet-4-6",
        "extract_codes": "claude-haiku-4-5",
        "diagnose": "claude-opus-4-8",
        "message": "claude-haiku-4-5",
        "note_generation": "claude-sonnet-4-6",
    }
    return TASK_MODEL_MAP.get(task, "claude-sonnet-4-6")
```

---

## FHIR Context Injection Pipeline

When AI is called in the context of a patient, the server must inject relevant FHIR data:

```python
# app/ai/context_builder.py

class ClinicalContextBuilder:
    """Builds a system prompt enriched with patient FHIR data."""

    CONTEXT_RESOURCES = {
        "full": ["Patient", "Condition", "MedicationRequest", "AllergyIntolerance",
                 "Observation", "Procedure", "Encounter", "DiagnosticReport"],
        "summary": ["Patient", "Condition", "MedicationRequest", "AllergyIntolerance"],
        "recent_labs": ["Patient", "Observation"],
        "medications": ["Patient", "MedicationRequest", "AllergyIntolerance"],
    }

    async def build(
        self,
        patient_id: int,
        context_type: str,
        user_id: str,
        org_id: str,
        max_tokens: int = 50000,
    ) -> str:
        resource_types = self.CONTEXT_RESOURCES.get(context_type, self.CONTEXT_RESOURCES["summary"])
        sections = []

        for resource_type in resource_types:
            resources = await self._fetch_resources(resource_type, patient_id, user_id, org_id)
            if resources:
                section = f"[{resource_type.upper()}]\n" + "\n".join(
                    json.dumps(r, separators=(",", ":")) for r in resources
                )
                sections.append(section)

        context = "\n\n".join(sections)
        # Truncate to fit model context window
        if len(context) > max_tokens * 4:  # rough char estimate
            context = context[:max_tokens * 4] + "\n... [truncated]"

        return f"""You are a clinical AI assistant. The following is the patient's FHIR data:

{context}

Important: You are assisting with clinical care. Always recommend clinician review.
Never provide diagnoses as definitive — use language like "may suggest", "consistent with"."""
```

---

## Token Budget Management

```python
# app/ai/token_budget.py

class TokenBudgetManager:
    BUDGETS = {
        "patient_summary": 2000,       # output tokens
        "note_generation": 1000,
        "code_extraction": 500,
        "risk_assessment": 1500,
        "drug_interaction": 300,
    }

    async def check_quota(self, org_id: str, tokens_requested: int) -> bool:
        """Check if org has remaining AI token quota this month."""
        used = await self.quota_repo.get_monthly_used(org_id)
        limit = await self.quota_repo.get_monthly_limit(org_id)
        return used + tokens_requested <= limit

    async def record_usage(self, org_id: str, user_id: str, model: str, input_tokens: int, output_tokens: int):
        cost = self._calculate_cost(model, input_tokens, output_tokens)
        await self.usage_repo.record(org_id, user_id, model, input_tokens, output_tokens, cost)

    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        config = AI_MODELS.get(model, {})
        return (
            input_tokens / 1_000_000 * config.get("cost_per_1m_input", 3.0) +
            output_tokens / 1_000_000 * config.get("cost_per_1m_output", 15.0)
        )
```

---

## AI Usage Dashboard

Track AI usage per organization for cost management:

```sql
CREATE TABLE ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    patient_id INTEGER,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd DECIMAL(10, 6),
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_usage_org ON ai_usage_log(org_id, created_at DESC);
```

```
GET /admin/ai-usage?period=2024-01
→ {
    "total_input_tokens": 1_234_567,
    "total_output_tokens": 456_789,
    "total_cost_usd": 45.67,
    "by_task": { "summarization": 25.00, "note_generation": 12.00, ... },
    "by_model": { "claude-sonnet-4-6": 40.00, "claude-haiku-4-5": 5.67 }
  }
```

---

## Privacy-Safe AI Calls

Before sending patient data to external AI providers:

1. **Check BAA status** — ensure Anthropic/OpenAI BAA is signed (they support HIPAA)
2. **Minimize PHI** — only send fields needed for the task
3. **De-identify option** — for research tasks, de-identify before sending
4. **On-premise option** — use Ollama for locally-hosted models when required

```python
class PrivacySafeAIClient:
    def __init__(self, provider_baa_signed: bool, local_model_url: str | None):
        self.provider_baa_signed = provider_baa_signed
        self.local_model_url = local_model_url

    async def complete(self, model: str, system: str, prompt: str, contains_phi: bool = True) -> str:
        if contains_phi and not self.provider_baa_signed:
            if not self.local_model_url:
                raise ConfigurationError("Cannot send PHI to external AI without BAA. Configure local model.")
            return await self._local_complete(model, system, prompt)
        return await self._external_complete(model, system, prompt)
```
