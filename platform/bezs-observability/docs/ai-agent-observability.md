# AI Agent Observability — Watcher24

## Why This Is a Selling Point

AI agents and LLM-powered applications are fundamentally different from traditional software. They are **non-deterministic**, **expensive per call**, **opaque by default**, and **prone to silent failure**. Standard observability tools built for REST APIs and databases cannot answer the questions AI teams need most:

- Why did the agent take a wrong turn on step 4?
- Which prompt version performs best in production?
- How much did this agent workflow cost in tokens this week?
- Which tool calls are failing silently?
- Why is this agent 3x slower than yesterday?
- What did the agent actually say to the user, and was it safe?

**Watcher24 is positioned to be the first observability platform that treats AI agents as first-class citizens** — not an afterthought. This document defines what that means architecturally, what is already implemented, what must be built, and how to present it to customers.

---

## Competitive Landscape

| Tool | Focus | Weakness vs Watcher24 |
|------|-------|----------------------|
| **Langfuse** | LLM tracing only | No general application observability — siloed |
| **Helicone** | OpenAI proxy + analytics | Proxy-based (adds latency), no agent workflow tracing |
| **Arize Phoenix** | ML model monitoring | Heavy ML focus, poor developer experience |
| **Datadog LLM Obs** | LLM calls via APM | Enterprise-only pricing, no agent-native model |
| **LangSmith** | LangChain-specific | Lock-in to LangChain ecosystem |
| **Braintrust** | Eval and prompt testing | Evaluation-focused, not production observability |

**Watcher24's differentiation**: unified observability across the entire stack — one platform for backend logs, API traces, audit events, AND AI agent observability. No proxy required. No ecosystem lock-in. Works with any LLM provider and any agent framework.

---

## What Is Already Implemented

### Gateway — `EventTypeAI` exists

`apps/gateway-go/internal/domain/event.go` already defines:

```go
EventTypeAI EventType = "ai"
```

This means the ingestion pipeline, Redis Streams, ClickHouse storage, and console explorer **already accept and store AI events** via `POST /v1/events` with `event_type: "ai"`. No gateway changes required for basic AI observability.

### IAM — Agent Authentication (`AgentAuth`)

`apps/iam/` has a full `AgentAuth` plugin with:
- `AgentHost` model — registers agents as first-class entities
- `Agent` model — individual agent instances with identity
- `AgentCapabilityGrant` — permission grants per capability
- `ApprovalRequest` — human-in-the-loop approval workflows
- JWT-based agent authentication

This means **Watcher24 already has infrastructure to authenticate AI agents as distinct principals** — not just "which org sent this?" but "which specific agent sent this, with what capabilities?"

### SDKs — `EventTypeAI` constant in all SDKs

All four SDKs (JS, Python, Go, Rust) expose `EventType.AI` / `EventTypeAI` / `"ai"`. Developers can already send AI events today with:

```python
client.event("ai", "info", "llm.call.completed", payload={
    "model": "gpt-4o",
    "tokens_used": 1240,
    "latency_ms": 820,
})
```

---

## The AI Observability Data Model

### Standard AI event payload schema

All AI events use `event_type: "ai"` and carry a structured `payload`. The payload schema is standardised by sub-type using a `kind` field:

```json
{
  "event_type": "ai",
  "severity": "info",
  "message": "llm.call.completed",
  "trace_id": "wf-abc123",
  "span_id": "llm-call-001",
  "parent_span_id": "agent-step-003",
  "payload": {
    "kind": "llm_call",
    "provider": "openai",
    "model": "gpt-4o",
    "prompt_tokens": 840,
    "completion_tokens": 400,
    "total_tokens": 1240,
    "latency_ms": 820,
    "finish_reason": "stop",
    "cost_usd": 0.0037,
    "temperature": 0.7,
    "prompt_version": "v2.3",
    "cached": false
  }
}
```

### AI event kinds

| `kind` | Description | Key payload fields |
|--------|-------------|-------------------|
| `llm_call` | Single LLM API call | `provider`, `model`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `cost_usd`, `finish_reason`, `cached` |
| `tool_call` | Agent calling an external tool | `tool_name`, `tool_version`, `input_summary`, `output_summary`, `latency_ms`, `success`, `error` |
| `agent_step` | One step in an agent reasoning loop | `step_number`, `thought`, `action`, `action_input`, `observation` |
| `workflow_start` | Agent workflow begins | `workflow_name`, `workflow_version`, `trigger`, `input_summary` |
| `workflow_end` | Agent workflow completes | `workflow_name`, `duration_ms`, `total_tokens`, `total_cost_usd`, `steps_taken`, `outcome` |
| `retrieval` | RAG retrieval — vector, BM25, wiki, or hybrid | `query_summary`, `source`, `retrieval_method`, `chunks_retrieved`, `top_score`, `retrieved_tokens`, `latency_ms`, `empty_result` |
| `memory_read` | Agent reads from memory store | `memory_type`, `query_summary`, `items_retrieved`, `latency_ms` |
| `memory_write` | Agent writes to memory store | `memory_type`, `content_summary`, `latency_ms` |
| `safety_check` | Content moderation / guardrail | `guardrail`, `input_flagged`, `output_flagged`, `action_taken` |
| `human_handoff` | Agent escalates to human | `reason`, `escalation_type`, `urgency` |
| `eval_result` | Production evaluation score | `evaluator`, `metric`, `score`, `passed`, `sample_input`, `sample_output` |
| `eval_run` | Offline batch evaluation run | `run_id`, `dataset_id`, `prompt_version`, `model`, `pass_rate`, `avg_score`, `samples_evaluated`, `duration_ms` |
| `human_feedback` | Human label on an AI output | `trace_id`, `span_id`, `label`, `score`, `comment`, `labeller_id`, `feedback_source` |

### Trace correlation for agent workflows

Every AI event in a workflow shares the same `trace_id`. The span hierarchy represents the workflow structure:

```
trace_id: "wf-abc123"
│
├── span: "workflow_start"       (span_id: "wf-001")
│   ├── span: "retrieval"        (span_id: "ret-001", parent: "wf-001")
│   ├── span: "llm_call"         (span_id: "llm-001", parent: "wf-001")
│   │   └── span: "safety_check" (span_id: "safe-001", parent: "llm-001")
│   ├── span: "tool_call"        (span_id: "tool-001", parent: "wf-001")
│   └── span: "agent_step"       (span_id: "step-001", parent: "wf-001")
│
└── span: "workflow_end"         (span_id: "wf-002", parent: "wf-001")
```

This maps directly onto Watcher24's existing trace explorer — no new infrastructure needed.

---

## SDK Integration Examples

### Python SDK — OpenAI direct

```python
import time
from openai import OpenAI
from watcher_sdk import Client

watcher = Client(api_key=os.environ["WATCHER_API_KEY"], service_name="ai-agent")
openai_client = OpenAI()

def tracked_llm_call(prompt: str, trace_id: str, parent_span_id: str) -> str:
    span_id = f"llm-{int(time.time() * 1000)}"
    start = time.perf_counter()

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )

    latency_ms = round((time.perf_counter() - start) * 1000)
    usage = response.usage

    watcher.event("ai", "info", "llm.call.completed",
        trace_id=trace_id,
        span_id=span_id,
        parent_span_id=parent_span_id,
        payload={
            "kind":              "llm_call",
            "provider":          "openai",
            "model":             "gpt-4o",
            "prompt_tokens":     usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "total_tokens":      usage.total_tokens,
            "latency_ms":        latency_ms,
            "finish_reason":     response.choices[0].finish_reason,
            # Cost based on current GPT-4o pricing
            "cost_usd":          round((usage.prompt_tokens * 0.0000025) + (usage.completion_tokens * 0.000010), 6),
        }
    )
    return response.choices[0].message.content
```

### Python SDK — LangChain callback handler

```python
from langchain.callbacks.base import BaseCallbackHandler
from watcher_sdk import Client
import time

class WatcherCallbackHandler(BaseCallbackHandler):
    """LangChain callback that sends all LLM and tool events to Watcher24."""

    def __init__(self, client: Client, trace_id: str):
        self.client = client
        self.trace_id = trace_id
        self._starts: dict[str, float] = {}

    def on_llm_start(self, serialized, prompts, **kwargs):
        run_id = str(kwargs.get("run_id", ""))
        self._starts[run_id] = time.perf_counter()

    def on_llm_end(self, response, **kwargs):
        run_id = str(kwargs.get("run_id", ""))
        latency_ms = round((time.perf_counter() - self._starts.pop(run_id, 0)) * 1000)
        usage = response.llm_output.get("token_usage", {})

        self.client.event("ai", "info", "llm.call.completed",
            trace_id=self.trace_id,
            payload={
                "kind":              "llm_call",
                "provider":          "openai",
                "model":             response.llm_output.get("model_name", "unknown"),
                "prompt_tokens":     usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens":      usage.get("total_tokens", 0),
                "latency_ms":        latency_ms,
            }
        )

    def on_tool_start(self, serialized, input_str, **kwargs):
        run_id = str(kwargs.get("run_id", ""))
        self._starts[run_id] = time.perf_counter()

    def on_tool_end(self, output, **kwargs):
        run_id = str(kwargs.get("run_id", ""))
        latency_ms = round((time.perf_counter() - self._starts.pop(run_id, 0)) * 1000)

        self.client.event("ai", "info", "tool.call.completed",
            trace_id=self.trace_id,
            payload={
                "kind":           "tool_call",
                "tool_name":      kwargs.get("name", "unknown"),
                "latency_ms":     latency_ms,
                "success":        True,
                "output_summary": str(output)[:500],
            }
        )

    def on_tool_error(self, error, **kwargs):
        self.client.event("ai", "error", "tool.call.failed",
            trace_id=self.trace_id,
            payload={
                "kind":      "tool_call",
                "tool_name": kwargs.get("name", "unknown"),
                "success":   False,
                "error":     str(error)[:500],
            }
        )

# Usage
handler = WatcherCallbackHandler(watcher, trace_id="wf-abc123")
chain.invoke({"input": "..."}, config={"callbacks": [handler]})
```

### Go SDK — custom agent loop

```go
func RunAgentStep(ctx context.Context, step int, thought, action string, traceID string) {
    spanID := fmt.Sprintf("step-%d-%d", step, time.Now().UnixMilli())

    client.Event(watcher.EventTypeAI, watcher.SeverityInfo, "agent.step",
        watcher.WithTraceID(traceID),
        watcher.WithSpanID(spanID),
        watcher.WithPayload(map[string]any{
            "kind":        "agent_step",
            "step_number": step,
            "thought":     thought,
            "action":      action,
        }),
    ).Send()
}
```

### React Native — client-side AI interaction tracking

```typescript
const audit = useAudit();

// Track when user interacts with an AI feature
function onAIResponse(sessionId: string, responseTime: number) {
  audit("ai.response.received", {
    sessionId,
    payload: {
      kind:           "user_interaction",
      feature:        "chat_assistant",
      latency_ms:     responseTime,
      response_shown: true,
    },
  });
}
```

---

## What Needs to Be Built

### Priority 1 — Foundation (no schema changes needed)

#### 1.1 AI Event Explorer tab in console

A dedicated explorer view filtered to `event_type = "ai"`. Columns:
- Timestamp
- `payload.kind` (LLM call, tool call, workflow, etc.)
- Message
- `payload.model`
- `payload.total_tokens`
- `payload.latency_ms`
- `payload.cost_usd`
- Trace link

This is a filter + column configuration on the existing log explorer — no new backend required.

#### 1.2 Agent Workflow Trace view

Extend the existing trace explorer to render AI span hierarchies as a **workflow waterfall**:

```
[workflow_start]  ─────────────────────────────── 2,340ms
  [retrieval]     ──── 180ms
  [llm_call]           ────────────── 820ms
    [safety_check]                 ─ 40ms
  [tool_call]                           ──── 380ms
  [llm_call]                                 ──────── 920ms
[workflow_end]
```

Uses existing `trace_id` + `span_id` + `parent_span_id` fields — no schema changes.

#### 1.3 Token usage & cost dashboard widgets

New dashboard widgets (using the existing widget registry):
- **Token spend over time** — `SUM(payload.total_tokens)` grouped by hour
- **Cost per model** — `SUM(payload.cost_usd)` grouped by `payload.model`
- **Top workflows by cost** — grouped by `trace_id` prefix
- **Latency percentiles** — `QUANTILE(0.95)(payload.latency_ms)` by model

All widgets query the existing `watcher.events` table using ClickHouse's `JSONExtract` functions on the `payload` column.

---

### Priority 2 — AI-Specific Features

#### 2.1 Prompt library & version tracking

Store prompt templates in PostgreSQL with versioning. Every `llm_call` event references a `prompt_version` field. The console shows:
- Prompt version history
- A/B comparison of response quality by version
- Which version is currently live

**Schema** (new table in IAM or console):

```sql
CREATE TABLE prompt_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  version     TEXT NOT NULL,             -- semver or hash
  content     TEXT NOT NULL,             -- the actual prompt
  variables   JSONB DEFAULT '[]',        -- [{name, description, default}]
  model       TEXT,                      -- target model
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  is_active   BOOLEAN DEFAULT false
);
```

#### 2.2 Token cost alerting

Alert rule type: `ai_cost_threshold`. Evaluates `SUM(payload.cost_usd)` over a rolling window.

Examples:
- "Alert when total AI spend exceeds $50 in any 1-hour window"
- "Alert when a single workflow costs more than $0.50"
- "Alert when `gpt-4o` token usage increases >200% week-over-week"

#### 2.3 Safety & guardrail event tracking

`safety_check` events from guardrail systems (Llama Guard, custom classifiers, etc.) are stored and aggregated:
- Flagged input rate over time
- Flagged output rate over time
- Action taken (blocked, warned, passed)
- Per-category breakdown (violence, PII, off-topic, etc.)

This is a **compliance and trust** feature — critical for regulated industries and enterprise sales.

#### 2.4 Hallucination / quality scoring

Allow teams to attach evaluation scores to AI events:

```python
watcher.event("ai", "info", "eval.result",
    trace_id=trace_id,
    payload={
        "kind":    "eval_result",
        "evaluator": "llm-as-judge",
        "metric":    "factual_accuracy",
        "score":     0.82,
        "passed":    True,
    }
)
```

Dashboard shows quality trends over time, correlated with model version and prompt version.

#### 2.5 Offline eval, datasets & regression testing

Online eval scoring (section 2.4) only covers production calls. A complete eval story also needs:

**Eval datasets** — curated test cases stored in PostgreSQL, used to run a prompt/model version against a known set of inputs before shipping.

```sql
CREATE TABLE eval_datasets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  created_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE eval_dataset_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id   UUID REFERENCES eval_datasets(id) ON DELETE CASCADE,
  input        JSONB NOT NULL,           -- the prompt / user message
  expected     JSONB,                    -- expected output or criteria
  metadata     JSONB DEFAULT '{}',       -- tags, source trace_id, etc.
  source       TEXT DEFAULT 'manual',    -- 'manual' | 'sampled' | 'imported'
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

**Automated sampling** — capture a fraction of production LLM calls into a dataset automatically. Add a `sample_rate` field to `prompt_templates` (0.0–1.0). When a production `llm_call` event fires and the call is sampled, write the input/output pair as an `eval_dataset_item` with `source: 'sampled'`. This gives teams a continuously growing eval set without manual curation.

```python
watcher.event("ai", "info", "eval.run.completed",
    payload={
        "kind":               "eval_run",
        "run_id":             "run-abc123",
        "dataset_id":         "ds-xyz",
        "prompt_version":     "v2.4",
        "model":              "gpt-4o",
        "samples_evaluated":  120,
        "pass_rate":          0.91,
        "avg_score":          0.87,
        "duration_ms":        14200,
    }
)
```

**Human feedback** — allow labellers to rate production outputs. A `human_feedback` event links back to a specific `trace_id` + `span_id` so scores can be correlated with the exact LLM call that produced the output.

```python
watcher.event("ai", "info", "human.feedback",
    trace_id=trace_id,
    span_id=llm_span_id,
    payload={
        "kind":            "human_feedback",
        "label":           "bad",          # 'good' | 'bad' | 'neutral'
        "score":           0.2,            # 0.0–1.0
        "comment":         "Hallucinated the product name",
        "labeller_id":     "user-001",
        "feedback_source": "thumbs_down",  # 'thumbs_down' | 'labelling_ui' | 'survey'
    }
)
```

**Regression detection** — the console compares `pass_rate` and `avg_score` across `eval_run` events for the same dataset. If a new prompt version scores more than 5 pp below the previous run, surface a regression alert before the version goes live.

**Dashboard widgets:**
- Pass rate trend by prompt version (line chart)
- Score distribution per model / evaluator (histogram)
- Human feedback rate over time (thumbs up/down ratio)
- Sampled dataset growth (items collected per day)
- Regression diff table: current vs. previous run side-by-side

#### 2.6 RAG pipeline observability

Watcher24 tracks all retrieval strategies under the same `retrieval` event kind. The `retrieval_method` field distinguishes how documents were fetched:

| `retrieval_method` | Description |
|--------------------|-------------|
| `vector` | Dense embedding similarity search (Pinecone, Weaviate, pgvector, etc.) |
| `bm25` | Keyword / full-text search (Elasticsearch, Typesense, Postgres FTS) |
| `hybrid` | Combined vector + BM25 with re-ranking |
| `wiki` | Structured wiki or knowledge base lookup by title / page ID |
| `sql` | Structured database query used as a retrieval step |
| `api` | External API call that fetches grounding context (e.g. search engine, docs API) |

**Example — vector retrieval (Pinecone / pgvector / Weaviate):**

```python
watcher.event("ai", "info", "retrieval.completed",
    trace_id=trace_id,
    payload={
        "kind":              "retrieval",
        "retrieval_method":  "vector",
        "source":            "pinecone/product-docs",   # index name or store identifier
        "query_summary":     "refund policy Q3",        # truncated query for privacy
        "chunks_retrieved":  5,
        "retrieved_tokens":  1240,                      # token count of returned chunks
        "top_score":         0.91,                      # cosine similarity of best match (0.0–1.0)
        "empty_result":      False,
        "latency_ms":        62,
    }
)
```

For hybrid (vector + BM25 with re-ranking), use `retrieval_method: "hybrid"` and set `top_score` to the re-ranked top score. The field is still meaningful because re-ranking produces a relevance score.

**Example — vectorless wiki retrieval:**

```python
watcher.event("ai", "info", "retrieval.completed",
    trace_id=trace_id,
    payload={
        "kind":              "retrieval",
        "retrieval_method":  "wiki",           # no vectors involved
        "source":            "internal-wiki",
        "query_summary":     "refund policy Q3",
        "chunks_retrieved":  3,
        "retrieved_tokens":  840,              # token count of returned chunks
        "top_score":         None,             # not applicable — no similarity scoring
        "empty_result":      False,
        "latency_ms":        45,
    }
)
```

`top_score` is only meaningful for `vector` and `hybrid` methods — omit or set to `null` for `bm25`, `wiki`, `sql`, and `api` retrievals. The console suppresses the similarity score column for non-vector rows automatically.

`retrieved_tokens` should always be included when known — it is the total token count of all retrieved chunks, used to calculate context window usage (`retrieved_tokens / model_context_limit`).

**Dashboard widgets (all retrieval methods):**
- **Retrieval quality**: `top_score` distribution over time (vector/hybrid only)
- **Empty retrieval rate**: queries that returned no results, broken down by `retrieval_method`
- **Source attribution**: which sources (`wiki`, `sql`, `api`, document store name) are retrieved most frequently
- **Context window usage**: `retrieved_tokens / context_limit` per call
- **Method mix**: pie / stacked bar of `retrieval_method` values — useful for teams running hybrid pipelines to see which strategy fires most often and at what latency

---

### Priority 3 — Enterprise AI Features

#### 3.1 AI audit trail (compliance)

For regulated industries (healthcare, finance, legal), every AI-generated output must be logged immutably. The existing audit log infrastructure is already built for this — it just needs:
- A UI section labelled "AI Audit Trail"
- Export in PDF/CSV for compliance reports
- Immutability guarantee (existing append-only ClickHouse table)
- Chain-of-custody: who approved this AI output, what guardrail passed it

#### 3.2 Agent identity via AgentAuth

The IAM app already has a complete `AgentAuth` system. Connecting it to observability means:
- Every AI event can carry an **agent identity** (not just an org API key)
- Capability grants are audited: "Agent X was granted `read:patient_records` at 14:32"
- Human-in-the-loop approvals are logged with full context
- Agent performance tracked per registered agent identity

API key scoping: agents use their own JWT (from AgentAuth) rather than sharing the org's secret key. This enables per-agent event filtering in the console.

#### 3.3 Multi-agent workflow tracing

When multiple agents collaborate (orchestrator → sub-agents → tools), the full workflow is visible as a single trace:

```
trace_id: "orchestration-xyz"
│
├── orchestrator_agent (agent_id: "orch-001")
│   ├── research_agent (agent_id: "res-001")
│   │   ├── web_search tool
│   │   └── llm_call (gpt-4o)
│   ├── writer_agent (agent_id: "writ-001")
│   │   ├── retrieval (vector DB)
│   │   └── llm_call (gpt-4o)
│   └── review_agent (agent_id: "rev-001")
│       └── llm_call (gpt-4o-mini)
└── workflow_end
```

Requires: agents tag events with their `agent_id` in the payload. The console renders the multi-agent waterfall.

#### 3.4 Anomaly detection on AI events

Extend the existing analytics-python worker to detect:
- **Latency spikes**: `llm_call` p99 latency exceeds 3× rolling average
- **Cost explosions**: hourly spend exceeds 2× daily average
- **Error rate increase**: `tool_call.failed` rate rises above baseline
- **Token runaway**: single workflow exceeds token budget threshold
- **Prompt injection attempts**: safety_check flagging rate spikes

---

## Data Storage Architecture

Different parts of the AI observability feature write to different stores. Choosing the wrong store causes either poor query performance (raw files in Postgres) or unmaintainable schema fragmentation (structured rows in S3).

### Two databases

| Database | Managed by | Used for |
|----------|-----------|---------|
| **IAM DB** | Prisma inside `apps/iam` | Identity tables: `user`, `session`, `apikey`, `organization`, `member`, `subscription` — never touch with raw SQL |
| **`watcher24` DB** | Raw SQL migrations in `infrastructure/postgres/migrations/` applied via `just migrate-pg` | All non-IAM feature tables: `prompt_templates`, `eval_datasets`, `eval_dataset_items`, `applications`, `notification_channels`, `alert_rules`, etc. |

### Storage decision table

| Data | Store | Database / Location | Reason |
|------|-------|---------------------|--------|
| All AI events (llm_call, tool_call, retrieval, …) | **ClickHouse** `watcher.events` | ClickHouse | Append-only, time-series queries, massive scale |
| Prompt template content and version history | **PostgreSQL** `prompt_templates` | `watcher24` DB — `infrastructure/postgres/migrations/` | Needs versioning, CRUD, relational joins; content is small (<100KB per version) |
| Eval dataset item inputs and expected outputs | **PostgreSQL** `eval_dataset_items` | `watcher24` DB — `infrastructure/postgres/migrations/` | Must be queryable — filter by source, join to dataset, paginate |
| Eval run results | **ClickHouse** `watcher.events` (as `eval_run` AI events) | ClickHouse | Same pipeline as all other AI events; no new table needed |
| Human feedback labels | **ClickHouse** `watcher.events` (as `human_feedback` AI events) | ClickHouse | Same pipeline; feedback correlates to llm_call spans by trace_id/span_id |
| Bulk eval dataset file imports (CSV/JSON uploads) | **S3-compatible store** (MinIO / AWS S3) | MinIO (local) / AWS S3 (prod) | Files can be megabytes; blob storage is cheaper than DB rows; a background worker processes the file and inserts rows into `eval_dataset_items` |
| Agent metadata (identity, capabilities) | **PostgreSQL** (IAM-owned via Prisma) | IAM DB — never touch directly | Read via IAM internal API (Rule 9) |

### When S3 is needed

S3 (or MinIO for self-hosted) is only needed if you add **bulk eval dataset import**: a user uploads a CSV or JSON file of test cases rather than adding items one-by-one.

The flow is:
```
User uploads file
  → console uploads to S3 (pre-signed PUT URL via /api/ai/datasets/upload-url)
  → console inserts a pending import record in PostgreSQL
  → analytics-python ai_import_worker picks up the record
  → worker streams file from S3, parses rows, inserts into eval_dataset_items
  → worker marks import as complete
```

For Phase 2 (manual item entry + automated production sampling), S3 is **not needed** — all writes go directly to PostgreSQL.

### What never goes in S3

- AI events → always ClickHouse
- Prompt content → always PostgreSQL TEXT (grep-able, diffable, version-comparable)
- Eval item inputs/outputs → always PostgreSQL JSONB (must be queryable)

---

## ClickHouse Queries — AI Analytics

Since all AI events are in the existing `watcher.events` table, these ClickHouse queries work today (using JSON extraction from the `payload` column):

### Token usage by model (last 24h)
```sql
SELECT
    JSONExtractString(payload, 'model')      AS model,
    SUM(JSONExtractInt(payload, 'total_tokens')) AS total_tokens,
    SUM(JSONExtractFloat(payload, 'cost_usd'))   AS total_cost_usd,
    COUNT()                                       AS calls
FROM watcher.events
WHERE org_id = {org_id}
  AND event_type = 'ai'
  AND message = 'llm.call.completed'
  AND timestamp > now() - INTERVAL 24 HOUR
GROUP BY model
ORDER BY total_cost_usd DESC;
```

### Agent workflow duration percentiles
```sql
SELECT
    JSONExtractString(payload, 'workflow_name')              AS workflow,
    QUANTILE(0.50)(JSONExtractFloat(payload, 'duration_ms')) AS p50_ms,
    QUANTILE(0.95)(JSONExtractFloat(payload, 'duration_ms')) AS p95_ms,
    QUANTILE(0.99)(JSONExtractFloat(payload, 'duration_ms')) AS p99_ms,
    COUNT()                                                   AS runs
FROM watcher.events
WHERE org_id = {org_id}
  AND event_type = 'ai'
  AND message = 'workflow.end'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY workflow
ORDER BY p95_ms DESC;
```

### Safety check flagging rate
```sql
SELECT
    toStartOfHour(timestamp) AS hour,
    COUNTIf(JSONExtractBool(payload, 'input_flagged'))  AS input_flagged,
    COUNTIf(JSONExtractBool(payload, 'output_flagged')) AS output_flagged,
    COUNT()                                              AS total_checks
FROM watcher.events
WHERE org_id = {org_id}
  AND event_type = 'ai'
  AND JSONExtractString(payload, 'kind') = 'safety_check'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY hour
ORDER BY hour;
```

---

## Selling Points by Customer Segment

### Startups building AI products
- **Zero-infrastructure cost**: no separate AI observability tool — Watcher24 handles everything in one platform
- **Immediate ROI**: catch expensive prompt bugs before they drain your OpenAI budget
- **SDK-first**: 3 lines of code to start tracking LLM calls

### Enterprises deploying AI agents
- **Compliance trail**: every AI decision logged immutably — audit-ready for regulated industries
- **Agent identity**: each agent has its own identity, permissions, and audit trail via AgentAuth
- **Human-in-the-loop**: approval workflows already built into the IAM system
- **Cost governance**: per-team, per-project, per-workflow spend tracking and budgets

### Healthcare & Finance
- **HIPAA/GDPR audit trail**: AI decisions are logged with full context, immutable, exportable
- **PII detection**: safety_check events show when AI outputs might contain sensitive data
- **Explainability**: full trace of every agent step and LLM call for any given decision

---

## Positioning Statement

> "Watcher24 is the only observability platform where your AI agents are first-class citizens — not bolted on. Every LLM call, every tool execution, every workflow step flows through the same pipeline as your backend logs and API traces. One platform. One dashboard. No proxy. No lock-in."

---

## Implementation Roadmap

| Phase | What | Effort | Status |
|---|---|---|---|
| **Phase 1** | Document AI event payload schema; add SDK code examples | 1 day | ✅ Done |
| **Phase 1** | `ai()` typed method added to all SDKs (JS, Python, Go, Rust) | 1 day | ✅ Done |
| **Phase 1** | `AIWorker` consuming `stream:ai` → ClickHouse | 0.5 days | ✅ Done |
| **Phase 1** | "AI Events" tab in console (`/ai` page + `AIEventsExplorer`) | 1–2 days | ✅ Done |
| **Phase 1** | Token/cost/latency dashboard widgets (4 widget types + stats API) | 2–3 days | ✅ Done |
| **Phase 1** | Agent workflow waterfall in trace explorer (TraceSpanTree AI styling) | 1 day | ✅ Done |
| **Phase 1** | Console MDX docs for AI observability | 0.5 days | ✅ Done |
| **Phase 2** | Prompt version tracking (new DB table + UI) | 5–7 days | Pending |
| **Phase 2** | AI cost alerting rule type | 3–5 days | Pending |
| **Phase 2** | Safety/guardrail event dashboard | 3–5 days | Pending |
| **Phase 2** | Hallucination/quality scoring display | 2–3 days | Pending |
| **Phase 2** | Eval dataset table + sampling from production calls + regression detection | 5–7 days | Pending |
| **Phase 2** | Human feedback events + labelling UI | 3–5 days | Pending |
| **Phase 2** | RAG pipeline observability widgets (method mix, empty rate, context usage) | 3–5 days | Pending |
| **Phase 3** | AgentAuth → observability linkage (per-agent event filtering) | 5–7 days | Pending |
| **Phase 3** | AI audit trail UI + CSV/PDF export | 3–5 days | Pending |
| **Phase 3** | Multi-agent workflow visualization | 3–4 weeks | Pending |
| **Phase 3** | Anomaly detection on AI events | 2–3 weeks | Pending |

---

## What Exists vs What Needs Building

### Already exists — use today
- `EventTypeAI = "ai"` in gateway and all SDKs
- `ai()` typed convenience method in all SDKs (JS, Python, Go, Rust)
- `POST /v1/events` ingestion with payload storage
- `trace_id` / `span_id` / `parent_span_id` in event schema
- `AIWorker` in analytics-python consuming `stream:ai` → ClickHouse
- Console: `/ai` page with `AIEventsExplorer` (kind, model, severity filters, pagination)
- Console: `/api/events/ai` API route with AI-specific columns (kind, model, tokens, cost, latency)
- Console: `TraceSpanTree` AI-aware span styling (kind badges, token/cost summary strip)
- Console: 4 AI dashboard widget types (token usage, cost by model, latency percentiles, workflow cost)
- Console: `/api/events/ai/stats` route (tokens, cost, latency, workflow-cost metrics)
- Console: AI observability MDX docs (`/docs/ai/overview`, `/docs/ai/events`)
- Trace explorer in console
- AgentAuth in IAM (agent identity, capability grants, approval workflows)
- Custom dashboards
- ClickHouse payload column with JSON extraction support

### Needs to be built — Phase 2
- Prompt template table (PostgreSQL), CRUD API, and version comparison UI
- AI cost alert rule type (`ai_cost_threshold` worker + rule config)
- Safety check aggregation dashboard (`/ai/safety` tab + `/api/events/ai/safety` route)
- Quality scoring display (eval_result event charts, per-prompt version trends)
- Eval dataset + dataset items tables; automated production sampling; regression detection worker
- Human feedback UI button in Event Detail Sheet + `/api/ai/feedback` route + feedback dashboard widget
- RAG pipeline widgets: method mix, empty retrieval rate, source attribution, context window usage, top-score distribution

### Needs to be built — Phase 3
- AgentAuth → event filtering linkage (per-agent filtering in AI Events explorer + agent detail page)
- AI audit trail UI + CSV/PDF export
- Multi-agent workflow visualization (agent identity badges on TraceSpanTree)
- Anomaly detection worker (latency spikes, cost explosions, token runaway, prompt injection rate)
