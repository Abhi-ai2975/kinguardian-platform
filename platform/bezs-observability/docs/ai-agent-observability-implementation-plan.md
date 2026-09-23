# AI Agent Observability — Implementation Plan

> Grounded in the actual codebase as of 2026-05-31.
> Implement phases in order. Each step references exact file paths and patterns.

---

## Codebase Baseline (what already exists)

| What | Where | Status |
|------|-------|--------|
| `event_type = 'ai'` reserved in ClickHouse | `infrastructure/clickhouse/migrations/001_init.sql` | ✅ Done |
| `client.event("ai", ...)` works in all SDKs | All SDKs accept any `event_type` string | ✅ Done |
| `ai()` typed method in all SDKs | JS `sdk/js/packages/core/src/client.ts`, Python `sdk/python/src/watcher_sdk/client.py`, Go `sdk/go/client.go`, Rust `sdk/rust/src/lib.rs` | ✅ Done |
| `trace_id` / `span_id` / `parent_span_id` columns | `watcher.events` table | ✅ Done |
| `AIWorker` consuming `stream:ai` → ClickHouse | `apps/analytics-python/src/workers/ai_worker.py` | ✅ Done |
| `/ai` page + `AIEventsExplorer` (kind/model/severity filters, server-side pagination) | `apps/console/src/app/(dashboard)/ai/page.tsx`, `apps/console/src/components/explorer/AIEventsExplorer.tsx` | ✅ Done |
| `/api/events/ai` route (AI-specific columns extracted from payload) | `apps/console/src/app/api/events/ai/route.ts` | ✅ Done |
| `TraceSpanTree` AI-aware span styling (kind badges, token/cost strip) | `apps/console/src/components/explorer/TraceSpanTree.tsx` | ✅ Done |
| 4 AI dashboard widget types + `/api/events/ai/stats` route | `apps/console/src/components/dashboard-builder/widgets/AI*.tsx`, `apps/console/src/app/api/events/ai/stats/route.ts` | ✅ Done |
| AI MDX docs (`/docs/ai/overview`, `/docs/ai/events`) | `apps/console/src/content/docs/ai/` | ✅ Done |
| Dashboard widget registry | `apps/console/src/components/dashboard-builder/widget-registry.tsx` | ✅ Done |
| analytics-python worker base pattern | `apps/analytics-python/src/workers/base.py` | ✅ Done |
| AgentAuth (agents, hosts, capability grants) | `apps/iam/src/modules/` | ✅ Done |
| Console MDX docs | `apps/console/src/content/docs/` | ✅ Done |

---

## Phase 1 — Foundation ✅ Complete

> Shipped in commits `3704d2e` (Phase 1) and `6b63abd` (AIWorker).
> All steps below are done and merged to `mvp`.
> No new DB tables. No new workers. Pure UI + API routes.

---

### Step 1.1 — Add `ai()` typed method to all SDKs

The SDKs already support `client.event("ai", ...)` but lack a typed convenience method. Add `ai()` alongside the existing `audit()`, `log()`, `trace()`, `metric()` methods.

#### JS SDK — `sdk/js/packages/core/src/client.ts`

Add after the `metric()` method:

```typescript
ai(severity: string, message: string, options: CaptureOptions = {}): void {
  this.captureTyped("ai", severity, message, options);
}
```

Export the `EventTypeAI` constant:

```typescript
export const EventTypeAI = "ai" as const;
```

Update `sdk/js/packages/core/src/index.ts` to re-export `EventTypeAI`.

#### Python SDK — `sdk/python/src/watcher_sdk/client.py`

Add after the `metric()` method:

```python
def ai(
    self,
    severity: str,
    message: str,
    *,
    trace_id: str = "",
    span_id: str = "",
    parent_span_id: str = "",
    payload: dict | None = None,
) -> None:
    self.event(
        "ai", severity, message,
        trace_id=trace_id,
        span_id=span_id,
        parent_span_id=parent_span_id,
        payload=payload or {},
    )

EVENT_TYPE_AI = "ai"
```

Export `EVENT_TYPE_AI` from `sdk/python/src/watcher_sdk/__init__.py`.

#### Go SDK — `sdk/go/client.go`

Add after the `Metric()` method:

```go
const EventTypeAI = "ai"

func (c *Client) AI(severity, message string, opts ...Option) {
    c.Event(EventTypeAI, severity, message, opts...)
}
```

#### Rust SDK — `sdk/rust/src/lib.rs`

Add after the `metric()` method:

```rust
pub const EVENT_TYPE_AI: &str = "ai";

pub fn ai(&self, severity: &str, message: &str, options: EventOptions) -> Result<()> {
    self.event(EVENT_TYPE_AI, severity, message, options)
}
```

#### After SDK changes

- Bump the version comment at the top of each client file.
- Update SDK docs: `sdk/js/docs/api.md`, `sdk/python/docs/api.md`, `sdk/go/docs/api.md`, `sdk/rust/docs/api.md`.
- Update console MDX SDK docs: `apps/console/src/content/docs/sdks/javascript.mdx`, `python.mdx`, `go.mdx`, `rust.mdx`.
- Add `ai()` usage to example apps: `examples/nextjs/`, `examples/fastapi/`, `examples/go/`, `examples/rust/`.

---

### Step 1.2 — Add `/api/events/ai` API route in console

Pattern: copy `apps/console/src/app/api/events/logs/route.ts` → create `apps/console/src/app/api/events/ai/route.ts`.

The only difference from the logs route: fix `event_type = 'ai'` in the ClickHouse query and add AI-specific columns to the SELECT.

**Query additions** (on top of the base logs query):

```sql
SELECT
    timestamp,
    severity,
    message,
    trace_id,
    span_id,
    parent_span_id,
    application_id,
    JSONExtractString(payload, 'kind')          AS ai_kind,
    JSONExtractString(payload, 'model')         AS ai_model,
    JSONExtractInt(payload, 'total_tokens')     AS ai_total_tokens,
    JSONExtractFloat(payload, 'cost_usd')       AS ai_cost_usd,
    JSONExtractFloat(payload, 'latency_ms')     AS ai_latency_ms,
    payload
FROM watcher.events
WHERE organization_id = {org_id:String}
  AND event_type = 'ai'
  AND timestamp BETWEEN {from:DateTime64} AND {to:DateTime64}
ORDER BY timestamp DESC
LIMIT {limit:UInt32} OFFSET {offset:UInt32}
```

Support the same query params as the logs route: `from`, `to`, `limit`, `offset`, `severity`, `search`.
Add AI-specific filter params: `kind` (llm_call, tool_call, agent_step, etc.), `model`.

---

### Step 1.3 — Add AI Events page to console

**Create route:** `apps/console/src/app/(dashboard)/ai/page.tsx`

Follow the pattern of `apps/console/src/app/(dashboard)/logs/page.tsx`.

```typescript
// apps/console/src/app/(dashboard)/ai/page.tsx
import { AIEventsExplorer } from "@/components/explorer/AIEventsExplorer";

export default function AIPage() {
  return <AIEventsExplorer />;
}
```

**Create component:** `apps/console/src/components/explorer/AIEventsExplorer.tsx`

Wrap `EventsExplorer` (or build a thin variant) with:
- Fixed `eventType="ai"` filter passed to the API
- Additional filter controls: `kind` dropdown (All, LLM Call, Tool Call, Agent Step, Workflow, Retrieval, Safety Check, Eval)
- Additional filter controls: `model` text input
- Additional columns in the table: Kind, Model, Tokens, Cost (USD), Latency (ms)
- Trace link column: if `trace_id` is set, render a link to `/traces/[traceId]`

The `EventDetailSheet` is reusable as-is — it already renders the full `payload` JSON.

---

### Step 1.4 — Add AI to the sidebar navigation

**File:** `apps/console/src/components/layout/AppSidebar.tsx`

Add to `NAV_ITEMS` after Traces:

```typescript
{ href: "/ai", label: "AI", icon: Bot },  // import Bot from "lucide-react"
```

---

### Step 1.5 — Agent Workflow Trace view

The existing `TraceSpanTree` at `apps/console/src/components/explorer/TraceSpanTree.tsx` already renders parent/child span hierarchies. It needs two enhancements for AI workflows:

**Enhancement A — AI-aware span row styling**

In `SpanRow`, detect `payload.kind` on the span and render a coloured badge:

| `payload.kind` | Badge colour |
|----------------|-------------|
| `llm_call` | Purple |
| `tool_call` | Orange |
| `retrieval` | Blue |
| `agent_step` | Green |
| `safety_check` | Red |
| `workflow_start` / `workflow_end` | Grey |
| `eval_result` | Teal |

**Enhancement B — AI metadata strip**

Below the existing summary strip, add an AI strip that appears when any span has `event_type = "ai"`:
- Total tokens: `SUM(payload.total_tokens)` across spans
- Total cost: `SUM(payload.cost_usd)` across spans
- Model list: unique `payload.model` values

Both enhancements are pure UI — no API or DB changes.

**Where the trace detail route is:** `apps/console/src/app/(dashboard)/traces/[traceId]/page.tsx` — this page already fetches all spans for a trace by `trace_id`. The `TraceSpanTree` is already rendered here. Only the component internals change.

---

### Step 1.6 — Token/cost dashboard widgets

**File:** `apps/console/src/components/dashboard-builder/widget-registry.tsx`

Add four new widget types to `WIDGET_REGISTRY`:

```typescript
{
  type: "ai-token-usage",
  label: "AI Token Usage",
  description: "Token spend over time by model",
  icon: Cpu,
  defaultW: 6,
  defaultH: 4,
  defaultConfig: { timeRange: "24h" },
},
{
  type: "ai-cost-by-model",
  label: "AI Cost by Model",
  description: "Total cost (USD) grouped by model",
  icon: DollarSign,
  defaultW: 4,
  defaultH: 4,
  defaultConfig: { timeRange: "24h" },
},
{
  type: "ai-latency-percentiles",
  label: "AI Latency Percentiles",
  description: "p50/p95/p99 LLM call latency by model",
  icon: Timer,
  defaultW: 6,
  defaultH: 4,
  defaultConfig: { timeRange: "24h" },
},
{
  type: "ai-workflow-cost",
  label: "Top Workflows by Cost",
  description: "Most expensive agent workflows",
  icon: Workflow,
  defaultW: 6,
  defaultH: 4,
  defaultConfig: { timeRange: "7d" },
},
```

**Create widget components:**

- `apps/console/src/components/dashboard-builder/widgets/AITokenUsageWidget.tsx` — area chart, query `/api/events/ai/stats?metric=tokens&groupBy=hour`
- `apps/console/src/components/dashboard-builder/widgets/AICostByModelWidget.tsx` — bar chart, query `/api/events/ai/stats?metric=cost&groupBy=model`
- `apps/console/src/components/dashboard-builder/widgets/AILatencyWidget.tsx` — bar chart with p50/p95/p99, query `/api/events/ai/stats?metric=latency&groupBy=model`
- `apps/console/src/components/dashboard-builder/widgets/AIWorkflowCostWidget.tsx` — table, query `/api/events/ai/stats?metric=workflow-cost`

**Add to `DashboardWidget.tsx` dispatcher:**

```typescript
case "ai-token-usage":    return <AITokenUsageWidget config={config} />;
case "ai-cost-by-model":  return <AICostByModelWidget config={config} />;
case "ai-latency-percentiles": return <AILatencyWidget config={config} />;
case "ai-workflow-cost":  return <AIWorkflowCostWidget config={config} />;
```

**Create API route:** `apps/console/src/app/api/events/ai/stats/route.ts`

Uses ClickHouse `JSONExtract` functions on the existing `watcher.events` table. All four widget queries from the doc's "ClickHouse Queries" section go here, selected by the `metric` query param.

---

### Step 1.7 — Update console MDX docs

**Update** `apps/console/src/content/docs/concepts/events.mdx` — add `ai` to the event type list with payload schema description.

**Create** `apps/console/src/content/docs/ai/overview.mdx` — introduce AI agent observability, link to SDK examples.

**Update** `apps/console/src/content/docs/api/ingestion.mdx` — add the `ai` event type with the full payload schema from the observability doc.

Add the AI docs section to the docs nav config (wherever `docs-nav.ts` or equivalent is defined).

---

## Phase 2 — AI-Specific Features

> Estimated: 8–12 days total across all steps.

---

### Step 2.1 — Prompt library & version tracking

#### 2.1.1 — Database table

**File:** `infrastructure/postgres/migrations/005_prompt_templates.sql` — targets the `watcher24` database (not IAM). Apply with `just migrate-pg`.

```sql
-- infrastructure/postgres/migrations/005_prompt_templates.sql
CREATE TABLE prompt_templates (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       TEXT NOT NULL,
    name         TEXT NOT NULL,
    version      TEXT NOT NULL,
    content      TEXT NOT NULL,
    variables    JSONB DEFAULT '[]',
    model        TEXT,
    sample_rate  REAL DEFAULT 0.0,   -- 0.0–1.0 for automated eval sampling
    created_by   TEXT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    is_active    BOOLEAN DEFAULT false,
    UNIQUE (org_id, name, version)
);

CREATE INDEX idx_prompt_templates_org ON prompt_templates (org_id);
CREATE INDEX idx_prompt_templates_name ON prompt_templates (org_id, name);
```

#### 2.1.2 — API routes in console

Create `apps/console/src/app/api/ai/prompts/route.ts`:
- `GET` — list prompt templates for the org, grouped by name with version history
- `POST` — create a new version

Create `apps/console/src/app/api/ai/prompts/[id]/route.ts`:
- `GET` — single template
- `PATCH` — set `is_active`, update `sample_rate`
- `DELETE` — soft delete (set a `deleted_at` column)

#### 2.1.3 — UI

Create `apps/console/src/app/(dashboard)/ai/prompts/page.tsx`.

Add a "Prompts" tab to the AI section (tab bar on the `/ai` layout):
- **All Events** (Step 1.3)
- **Prompts** (this step)
- **Evals** (Step 2.4)
- **Workflows** (Step 1.5)

Prompt list UI:
- Group by name, show version history in expandable rows
- Show active version badge
- Show `sample_rate` slider (0%–100%) for automated eval sampling
- "New Version" button opens a modal with a textarea for prompt content + variables editor

Prompt version comparison UI:
- Side-by-side diff view of two versions
- Pull `eval_result` events from ClickHouse filtered by `prompt_version` to show quality scores per version

---

### Step 2.2 — Token cost alerting

#### 2.2.1 — Alert rule type

Find where alert rules are defined in the console (look for existing alert rule types). Add a new rule type `ai_cost_threshold`.

Alert rule config shape:
```typescript
interface AICostAlertConfig {
  metric: "total_cost_usd" | "tokens" | "cost_per_workflow";
  threshold: number;
  windowMinutes: number;   // rolling window
  model?: string;          // optional: only this model
  workflowName?: string;   // optional: only this workflow
}
```

#### 2.2.2 — Evaluation logic

In `apps/analytics-python/src/workers/`, create `ai_cost_alert_worker.py`.

Pattern: extend `BaseWorker`. On each tick, run a ClickHouse query:

```sql
SELECT SUM(JSONExtractFloat(payload, 'cost_usd')) AS window_cost
FROM watcher.events
WHERE organization_id = {org_id}
  AND event_type = 'ai'
  AND message = 'llm.call.completed'
  AND timestamp > now() - INTERVAL {window_minutes} MINUTE
```

If `window_cost > threshold`, emit an alert event (follow the existing alert emission pattern in the codebase).

Register the new worker in `apps/analytics-python/main.py`.

---

### Step 2.3 — Safety & guardrail dashboard

#### 2.3.1 — API route

Create `apps/console/src/app/api/events/ai/safety/route.ts`.

Query:
```sql
SELECT
    toStartOfHour(timestamp)                             AS hour,
    COUNTIf(JSONExtractBool(payload, 'input_flagged'))   AS input_flagged,
    COUNTIf(JSONExtractBool(payload, 'output_flagged'))  AS output_flagged,
    JSONExtractString(payload, 'action_taken')           AS action_taken,
    COUNT()                                              AS total_checks
FROM watcher.events
WHERE organization_id = {org_id}
  AND event_type = 'ai'
  AND JSONExtractString(payload, 'kind') = 'safety_check'
  AND timestamp > now() - INTERVAL {days} DAY
GROUP BY hour, action_taken
ORDER BY hour;
```

#### 2.3.2 — UI

Add a "Safety" tab to the AI section tab bar.

Create `apps/console/src/app/(dashboard)/ai/safety/page.tsx`.

Charts:
- Line chart: flagged inputs + flagged outputs over time (area chart, dual series)
- Bar chart: action taken breakdown (blocked / warned / passed)
- Stat cards: total checks, flag rate (%), blocked rate (%)

---

### Step 2.4 — Hallucination / quality scoring display

No new backend needed — `eval_result` events are already stored in `watcher.events`.

#### 2.4.1 — API route

Create `apps/console/src/app/api/events/ai/quality/route.ts`.

Query: filter `event_type = 'ai'` AND `JSONExtractString(payload, 'kind') = 'eval_result'`, group by `prompt_version` and `model`, return avg score + pass rate.

#### 2.4.2 — UI

Add a "Quality" section to the AI prompts detail view (when viewing a specific prompt version):
- Line chart: average score over time
- Pass rate percentage
- Score breakdown by evaluator (`llm-as-judge`, `human`, `rule-based`)

---

### Step 2.5 — Offline eval datasets & regression testing

#### 2.5.1 — Database tables

**File:** `infrastructure/postgres/migrations/006_eval_datasets.sql` — targets the `watcher24` database. Apply with `just migrate-pg`.

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
    input        JSONB NOT NULL,
    expected     JSONB,
    metadata     JSONB DEFAULT '{}',
    source       TEXT DEFAULT 'manual',   -- 'manual' | 'sampled' | 'imported'
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_eval_datasets_org ON eval_datasets (org_id);
CREATE INDEX idx_eval_dataset_items_dataset ON eval_dataset_items (dataset_id);
```

#### 2.5.2 — Automated sampling

In `apps/analytics-python/src/workers/`, create `ai_sampler_worker.py`.

On each tick, query `watcher.events` for recent `llm_call` events. For each event, check if its `prompt_version` matches a `prompt_template` row that has `sample_rate > 0`. Use `random.random() < sample_rate` to decide. If sampled, insert an `eval_dataset_item` with `source = 'sampled'`.

#### 2.5.3 — API routes

Create `apps/console/src/app/api/ai/datasets/route.ts` — CRUD for `eval_datasets`.
Create `apps/console/src/app/api/ai/datasets/[id]/items/route.ts` — list/add/delete items.

#### 2.5.4 — Regression detection

Create `apps/analytics-python/src/workers/ai_regression_worker.py`.

On each new `eval_run` event ingested: query all `eval_run` events for the same `dataset_id`, ordered by timestamp. If the latest `pass_rate` is more than 0.05 below the previous run's `pass_rate`, emit a regression alert event (same alert pattern as Step 2.2.2).

#### 2.5.5 — UI

Add "Evals" tab to the AI section tab bar.

Create `apps/console/src/app/(dashboard)/ai/evals/page.tsx`:
- Dataset list with item count and last run date
- "New Dataset" button
- Per-dataset view: item list (paginated, 10/page), "Run Eval" button (triggers an eval run against a selected prompt version)
- Regression diff table: current vs previous run, pass rate delta highlighted in red if regression

**Dashboard widgets** — add these four to the widget registry alongside the existing AI widgets:
- `ai-eval-pass-rate` — line chart of `pass_rate` over time grouped by `prompt_version`; query: filter `payload.kind = 'eval_run'`, SELECT `toStartOfDay(timestamp)`, `JSONExtractString(payload, 'prompt_version')`, AVG(`payload.pass_rate`)
- `ai-eval-score-distribution` — histogram of `avg_score` values grouped by `payload.model` and `payload.evaluator`; helps compare evaluator agreement across models
- `ai-human-feedback-rate` — thumbs-up vs thumbs-down ratio as a stacked area chart over time; query: filter `payload.kind = 'human_feedback'`, COUNT split by `payload.label IN ('good', 'bad', 'neutral')`
- `ai-sampled-dataset-growth` — bar chart of `eval_dataset_items` inserted per day with `source = 'sampled'`; computed from PostgreSQL, not ClickHouse — expose via `/api/ai/datasets/stats`

Add these four widget type definitions to `apps/console/src/components/dashboard-builder/widget-registry.tsx` and their component files under `widgets/AIEval*.tsx` and `widgets/AIHumanFeedbackWidget.tsx`. Add dispatcher cases to `DashboardWidget.tsx`.

---

### Step 2.6 — Human feedback events

No new backend needed — `human_feedback` events are stored in `watcher.events` like any other AI event.

#### 2.6.1 — Feedback button in Event Detail Sheet

In `apps/console/src/components/explorer/EventDetailSheet.tsx`:

When the opened event is `event_type = "ai"` and `payload.kind = "llm_call"`, render a thumbs up / thumbs down button row.

On click, POST to `apps/console/src/app/api/ai/feedback/route.ts` which sends a `human_feedback` event back through the gateway on behalf of the org.

#### 2.6.2 — Feedback API route

Create `apps/console/src/app/api/ai/feedback/route.ts`.

This route calls the gateway `POST /v1/events` with:
```json
{
  "event_type": "ai",
  "severity": "info",
  "message": "human.feedback",
  "trace_id": "<from request>",
  "span_id": "<from request>",
  "payload": {
    "kind": "human_feedback",
    "label": "good|bad|neutral",
    "score": 1.0,
    "labeller_id": "<console user id>",
    "feedback_source": "thumbs_up|thumbs_down"
  }
}
```

#### 2.6.3 — Dashboard widget

Add `ai-human-feedback` widget type to the registry:
- Bar chart: thumbs up vs thumbs down ratio over time
- Query: `/api/events/ai/stats?metric=feedback`

---

### Step 2.7 — RAG pipeline observability widgets

No new backend needed — `retrieval` events are already stored. The key distinction is that vector and hybrid retrievals populate `top_score` and `retrieved_tokens` with meaningful values; all other methods should omit `top_score` or set it to `null`.

**Expected payload shapes for instrumented code:**

Vector (Pinecone / pgvector / Weaviate):
```python
payload={
    "kind":              "retrieval",
    "retrieval_method":  "vector",
    "source":            "pinecone/product-docs",
    "query_summary":     "refund policy Q3",
    "chunks_retrieved":  5,
    "retrieved_tokens":  1240,      # total tokens in returned chunks
    "top_score":         0.91,      # cosine similarity of best match
    "empty_result":      False,
    "latency_ms":        62,
}
```

Vectorless (wiki / BM25 / SQL / API):
```python
payload={
    "kind":              "retrieval",
    "retrieval_method":  "wiki",
    "source":            "internal-wiki",
    "query_summary":     "refund policy Q3",
    "chunks_retrieved":  3,
    "retrieved_tokens":  840,
    "top_score":         None,      # omit for non-vector methods
    "empty_result":      False,
    "latency_ms":        45,
}
```

Hybrid (vector + BM25 with re-ranking) uses `retrieval_method: "hybrid"` and includes `top_score` because re-ranking produces a relevance score.

#### 2.7.1 — API route additions

In `apps/console/src/app/api/events/ai/stats/route.ts` (created in Step 1.6), add query cases:

- `metric=retrieval-method-mix` — COUNT by `payload.retrieval_method`
- `metric=empty-retrieval-rate` — COUNTIf(`payload.empty_result = true`) / COUNT()
- `metric=top-score-distribution` — histogram of `payload.top_score` (vector/hybrid only; filter rows where `retrieval_method IN ('vector', 'hybrid')`)
- `metric=source-attribution` — COUNT by `payload.source`
- `metric=context-window-usage` — AVG and P95 of `JSONExtractInt(payload, 'retrieved_tokens')` per call, returned as a time series; the widget divides by a configurable `contextLimit` on the client side to show the % of context filled

#### 2.7.2 — Dashboard widgets

Add to widget registry:
- `ai-retrieval-method-mix` — pie chart by retrieval method
- `ai-empty-retrieval-rate` — stat card + trend line
- `ai-source-attribution` — horizontal bar chart
- `ai-retrieval-quality` — `top_score` distribution histogram (vector/hybrid only; suppress for rows where `retrieval_method` is `bm25`, `wiki`, `sql`, or `api`)
- `ai-context-window-usage` — line chart showing avg retrieved tokens over time with a configurable context-limit reference line (default 128k)

**Note on `top_score` suppression:** the `ai-retrieval-quality` widget and any table that shows `top_score` must filter to `retrieval_method IN ('vector', 'hybrid')` before rendering. For non-vector methods the field is semantically meaningless. Add this filter in both the API query and the widget's empty-state messaging ("Top score is only available for vector and hybrid retrievals").

---

## Phase 3 — Enterprise AI Features

> Estimated: 2–3 weeks total.

---

### Step 3.1 — AI audit trail

No new data — uses existing `watcher.events` with `event_type = 'ai'`.

#### 3.1.1 — UI section

Add "AI Audit" to the existing `/audit` page as a sub-tab alongside the existing audit event list.

The AI audit view shows: timestamp, agent identity (from `payload.agent_id`), action taken, guardrail result, human approval (if any), full payload.

#### 3.1.2 — Export

Add a "Export CSV" and "Export PDF" button to the AI audit view. Reuse any existing export utility in the console. The export includes: timestamp, message, model, cost, safety check result, outcome.

---

### Step 3.2 — AgentAuth → observability linkage

#### 3.2.1 — Per-agent filtering in AI Events explorer

In `AIEventsExplorer.tsx` (Step 1.3), add an `agent_id` filter input.

When set, add `AND JSONExtractString(payload, 'agent_id') = {agent_id}` to the query in `/api/events/ai/route.ts`.

#### 3.2.2 — Agent detail page in AI section

Create `apps/console/src/app/(dashboard)/ai/agents/[agentId]/page.tsx`.

This page shows:
- Agent metadata from IAM (call `apps/iam` internal API — follow existing IAM call patterns in the console)
- Event count, total token spend, avg latency — from ClickHouse filtered by `agent_id`
- Recent events list (reuse `AIEventsExplorer` with agent_id pre-set)
- Capability grants timeline from AgentAuth

#### 3.2.3 — IAM API endpoint

Add to `apps/iam/docs/api.md` and implement:
`GET /api/internal/agents/:agentId/summary` — returns agent metadata for the console to display. Protected with `X-Internal-Secret` header per Rule 9.

---

### Step 3.3 — Multi-agent workflow tracing

The existing `TraceSpanTree` (from Phase 1, Step 1.5) already handles hierarchies. Multi-agent tracing requires:

#### 3.3.1 — Agent identity on spans

Update `TraceSpanTree.tsx` to read `payload.agent_id` from each span and:
- Display an agent badge (coloured by agent_id hash) on each row
- Add a legend showing which agent_id maps to which colour
- Group spans visually by agent when multiple `agent_id` values exist in the trace

#### 3.3.2 — No backend changes

All agent identity is in `payload.agent_id` which is already stored in `watcher.events`. Pure UI.

---

### Step 3.4 — Anomaly detection on AI events

**File:** create `apps/analytics-python/src/workers/ai_anomaly_worker.py`.

Extend `BaseWorker`. On each tick (every 5 minutes):

```python
class AIAnomalyWorker(BaseWorker):
    """Detects anomalies in AI event streams and emits alert events."""

    CHECKS = [
        latency_spike_check,      # p99 llm_call latency > 3× rolling avg
        cost_explosion_check,     # hourly spend > 2× daily avg
        error_rate_check,         # tool_call.failed rate > baseline
        token_runaway_check,      # single workflow total_tokens > budget
        prompt_injection_check,   # safety_check flag rate spike
    ]

    async def _tick(self):
        for check in self.CHECKS:
            alerts = await check(self.clickhouse, self.org_ids)
            for alert in alerts:
                await self.emit_alert(alert)
```

Each check function runs a ClickHouse query and returns a list of alert payloads if the threshold is breached.

Register in `apps/analytics-python/main.py`.

---

## Docs Sync Checklist (per Rule 10)

Every step above must be accompanied by doc updates in the same commit:

| Step | Docs to update |
|------|---------------|
| 1.1 SDK ai() method | SDK api.md files (all 4), console MDX sdk docs (all 4), example apps |
| 1.2 /api/events/ai | `apps/console/docs/api.md` |
| 1.3 AI Events page | `apps/console/src/content/docs/ai/overview.mdx` (create) |
| 1.6 Dashboard widgets | `apps/console/src/content/docs/concepts/events.mdx` |
| 2.1 Prompt library | `apps/console/src/content/docs/ai/prompts.mdx` (create) |
| 2.2 Cost alerting | `apps/console/src/content/docs/ai/alerting.mdx` (create) |
| 2.5 Eval datasets | `apps/console/src/content/docs/ai/evals.mdx` (create) |
| 3.2 AgentAuth linkage | `apps/iam/docs/api.md` (new internal endpoint) |
| 3.4 Anomaly worker | `apps/analytics-python/docs/overview.md` |

---

## Implementation Order Summary

```
Phase 1 ✅ Complete (commits 3704d2e + 6b63abd)
  1.1  SDK ai() method (all 4 SDKs)
  1.2  /api/events/ai route
  1.3  AIEventsExplorer component + /ai page
  1.4  Sidebar nav item
  1.5  TraceSpanTree AI enhancements (kind badges, token/cost strip)
  1.6  Token/cost widget types + /api/events/ai/stats route
  1.7  Console MDX docs
  +    AIWorker consuming stream:ai → ClickHouse

Phase 2 (next, ~10–14 days)
  2.1  Prompt library (DB migration + API + UI with version comparison)
  2.2  Cost alerting (ai_cost_alert_worker + rule type)
  2.3  Safety dashboard (/ai/safety tab + /api/events/ai/safety route)
  2.4  Quality scoring display (eval_result charts in prompt detail view)
  2.5  Eval datasets (DB migration + ai_sampler_worker + ai_regression_worker + UI + 4 dashboard widgets)
  2.6  Human feedback (EventDetailSheet thumbs UI + /api/ai/feedback route + widget)
  2.7  RAG widgets (5 stats API additions + 5 widget types incl. context-window-usage)

Phase 3 (2–3 weeks)
  3.1  AI audit trail UI + CSV/PDF export
  3.2  AgentAuth linkage (agent_id filter + agent detail page + IAM /agents/:id/summary endpoint)
  3.3  Multi-agent waterfall UI (agent identity badges on TraceSpanTree)
  3.4  Anomaly detection worker (ai_anomaly_worker, 5 checks)
```

---

## Data Storage Architecture

### Two databases

| Database | Managed by | Used for |
|----------|-----------|---------|
| **IAM DB** | Prisma inside `apps/iam` | Identity tables: `user`, `session`, `apikey`, `organization`, `member`, `subscription` — never touch with raw SQL |
| **`watcher24` DB** | Raw SQL migrations in `infrastructure/postgres/migrations/` applied via `just migrate-pg` | All non-IAM feature tables: `prompt_templates`, `eval_datasets`, `eval_dataset_items`, `applications`, `notification_channels`, `alert_rules`, etc. |

### Storage decision table

| Data | Store | Database / Location | Notes |
|------|-------|---------------------|-------|
| All AI events (llm_call, tool_call, retrieval, eval_run, human_feedback, …) | ClickHouse | `watcher.events` | Same table as all other event types; `payload` JSONB holds AI-specific fields |
| Prompt template content and version history | PostgreSQL | `watcher24` DB — `infrastructure/postgres/migrations/` | `content TEXT`, `variables JSONB`; small enough for DB; needs versioning + CRUD |
| Eval dataset items (individual inputs/expected outputs) | PostgreSQL | `watcher24` DB — `infrastructure/postgres/migrations/` | Must be queryable — filter by source, paginate, join to dataset |
| Eval run results | ClickHouse | `watcher.events` (as `eval_run` AI events) | Same pipeline; no new table |
| Human feedback labels | ClickHouse | `watcher.events` (as `human_feedback` AI events) | Correlates to llm_call spans via `trace_id` + `span_id` |
| Bulk eval dataset imports (CSV/JSON files) | S3-compatible | MinIO (self-hosted) or AWS S3 | Only needed if bulk file upload is added (Phase 2 scope does NOT include this) |
| Agent metadata | PostgreSQL (IAM Prisma) | IAM DB — never touch directly | Read via IAM internal API (Rule 9) |

### Phase 2 storage — no S3 needed

Everything in Phase 2 writes to the `watcher24` PostgreSQL database or ClickHouse directly:
- Prompt templates → `watcher24` DB, `TEXT` column (CRUD, small payloads)
- Eval dataset items added manually → `watcher24` DB, `JSONB` column (one INSERT per item)
- Eval dataset items from production sampling (`ai_sampler_worker`) → `watcher24` DB, `JSONB` (worker inserts directly)
- All eval_run, human_feedback events → ClickHouse via the standard AI event pipeline

### When S3 becomes needed (Phase 3 / future)

If you add **bulk eval dataset import** (user uploads a CSV or JSON file of test cases), the flow is:

```
User uploads file
  → console issues pre-signed S3 PUT URL via /api/ai/datasets/upload-url
  → file lands in S3
  → console inserts a pending import record in watcher24 DB
  → ai_import_worker streams file from S3, parses rows, bulk-inserts into eval_dataset_items
  → worker marks import complete
```

Until that feature is built, the S3 dependency does not exist. Do not add an S3 client to the console or analytics-python for Phase 2.

### What never goes in S3

- AI events — always ClickHouse
- Prompt content — always PostgreSQL `TEXT` (grep-able, diffable, version-comparable)
- Eval item inputs/outputs — always PostgreSQL `JSONB` (must be queryable by source, dataset_id, etc.)

---

## Key Constraints

- **No gateway changes needed at any phase.** `payload` is stored as arbitrary JSON. All new fields live inside `payload`.
- **IAM DB is never touched directly.** AgentAuth data is read via IAM internal API endpoints only (Rule 9).
- **Prompt templates and eval datasets** go in the infrastructure postgres migrations (not Prisma) because they are not IAM-owned identity tables.
- **All workers** follow the `BaseWorker` pattern in `apps/analytics-python/src/workers/base.py`.
- **All console API routes** authenticate via the existing session/org middleware — no new auth needed.
- **Use `pnpm`** for console, **`uv`** for analytics-python, **`just`** for Go SDKs (Rule 8).
