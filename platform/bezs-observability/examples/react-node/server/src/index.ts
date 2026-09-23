// Express server for the react-node example.
// Demonstrates @watcher/node usage: request tracing, audit events,
// log events for errors, and metric events for domain counters.
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createNodeClient } from "@watcher/node";

// ── Watcher24 client ──────────────────────────────────────────────────────────
// Create one client per process. The background flusher batches events and
// sends them every 500ms — no need to await individual calls.
const watcher = createNodeClient({
  apiKey: process.env.W24_API_KEY ?? "",
  // appId is optional when using an app-scoped key — the gateway resolves it.
  ...(process.env.W24_APP_ID ? { appId: process.env.W24_APP_ID } : {}),
  // serviceName labels this component in the dashboard — filter by "express-api"
  // to isolate server events from browser events sent by the React client.
  serviceName: "express-api",
  // gatewayUrl defaults to https://ingest.watcher24.io — only set for local dev or self-hosted.
  gatewayUrl: process.env.W24_GATEWAY_URL,
  environment: process.env.NODE_ENV ?? "development",
});

// ── In-memory store (replace with a real DB in production) ───────────────────
interface Task {
  id: string;
  title: string;
  done: boolean;
  userId: string;
  createdAt: string;
}

const tasks = new Map<string, Task>();
let nextId = 1;

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ── Request tracing middleware ───────────────────────────────────────────────
// Every request gets a trace event with method, path, status, and duration.
// The trace ID is either forwarded from the client or generated fresh here.
app.use((req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers["x-trace-id"] as string) ?? crypto.randomUUID();
  const spanId = crypto.randomUUID();
  const start = Date.now();

  // Attach to request so route handlers can add child spans.
  (req as any).traceId = traceId;
  (req as any).spanId = spanId;

  res.on("finish", () => {
    watcher.trace("http.request", {
      traceId,
      spanId,
      payload: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
        userAgent: req.headers["user-agent"] ?? "",
      },
    });
  });

  next();
});

// ── Auth routes ──────────────────────────────────────────────────────────────

// POST /api/auth/login — simulated login; issues a fake userId token.
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    watcher.log("warn", "login.attempt.invalid", {
      payload: { reason: "missing credentials" },
    });
    return res.status(400).json({ error: "email and password are required" });
  }

  // Fake auth — any non-empty credentials succeed.
  const userId = `user_${Buffer.from(email).toString("base64url").slice(0, 8)}`;

  // Audit every login — creates a compliance trail.
  watcher.audit("user.login", {
    userId,
    traceId: (req as any).traceId,
    payload: { email, ip: req.ip ?? "unknown" },
  });

  watcher.log("info", "auth.login.success", {
    traceId: (req as any).traceId,
    payload: { userId },
  });

  res.json({ userId, email });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req: Request, res: Response) => {
  const { userId } = req.body as { userId: string };

  watcher.audit("user.logout", {
    userId,
    traceId: (req as any).traceId,
    payload: { ip: req.ip ?? "unknown" },
  });

  res.json({ ok: true });
});

// ── Task routes ───────────────────────────────────────────────────────────────

// GET /api/tasks — list tasks for a user.
app.get("/api/tasks", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const userTasks = [...tasks.values()].filter((t) => t.userId === userId);

  // Track how many tasks the user has — useful for capacity planning.
  watcher.metric("tasks.list.count", {
    payload: { value: userTasks.length, userId },
  });

  res.json(userTasks);
});

// POST /api/tasks — create a task.
app.post("/api/tasks", (req: Request, res: Response) => {
  const { title, userId } = req.body as { title: string; userId: string };

  if (!title || !userId) {
    return res.status(400).json({ error: "title and userId are required" });
  }

  const task: Task = {
    id: String(nextId++),
    title,
    done: false,
    userId,
    createdAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);

  // Audit the creation — who created what and when.
  watcher.audit("task.created", {
    userId,
    traceId: (req as any).traceId,
    payload: { taskId: task.id, title },
  });

  // Metric: total tasks across all users.
  watcher.metric("tasks.total", {
    payload: { value: tasks.size },
  });

  res.status(201).json(task);
});

// PATCH /api/tasks/:id — toggle done.
app.patch("/api/tasks/:id", (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: "task not found" });

  const { userId } = req.body as { userId: string };
  task.done = !task.done;

  watcher.audit("task.toggled", {
    userId,
    traceId: (req as any).traceId,
    payload: { taskId: task.id, done: task.done },
  });

  res.json(task);
});

// DELETE /api/tasks/:id — delete a task.
app.delete("/api/tasks/:id", (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: "task not found" });

  const { userId } = req.query as { userId: string };
  tasks.delete(req.params.id);

  // Audit deletions so they appear in the compliance trail.
  watcher.audit("task.deleted", {
    userId,
    traceId: (req as any).traceId,
    payload: { taskId: req.params.id, title: task.title },
  });

  watcher.metric("tasks.total", {
    payload: { value: tasks.size },
  });

  res.json({ ok: true });
});

// ── SDK Test Lab endpoints ───────────────────────────────────────────────────
// These routes are used by the /test page in the React client.
// Each one fires a real event through the Watcher24 SDK and returns metadata
// so the client can show it in the event log.

app.post("/api/test/audit", (req: Request, res: Response) => {
  const { eventType } = req.body as { eventType: string };
  const type = eventType || "test.server.user.action";
  watcher.audit(type, { userId: "test-user", payload: { source: "test-lab" } });
  res.json({ ok: true, type: "audit", eventType: type, sentAt: new Date().toISOString() });
});

app.post("/api/test/log", (req: Request, res: Response) => {
  const { severity, eventType } = req.body as { severity: string; eventType: string };
  const sev = severity || "info";
  const type = eventType || `test.server.log.${sev}`;
  watcher.log(sev, type, { payload: { source: "test-lab" } });
  res.json({ ok: true, type: "log", eventType: type, severity: sev, sentAt: new Date().toISOString() });
});

app.post("/api/test/trace", (req: Request, res: Response) => {
  const { eventType } = req.body as { eventType: string };
  const type = eventType || "test.server.db.query";
  const traceId = crypto.randomUUID();
  const spanId = crypto.randomUUID();
  watcher.trace(type, { traceId, spanId, payload: { source: "test-lab" } });
  res.json({ ok: true, type: "trace", eventType: type, sentAt: new Date().toISOString() });
});

app.post("/api/test/metric", (req: Request, res: Response) => {
  const { eventType, value } = req.body as { eventType: string; value: number };
  const type = eventType || "test.server.request.count";
  const val = Number(value) || 1;
  watcher.metric(type, { payload: { value: val, source: "test-lab" } });
  res.json({ ok: true, type: "metric", eventType: type, sentAt: new Date().toISOString() });
});

// ── AI agent routes ───────────────────────────────────────────────────────────
// Each route fires real ai() events through the Watcher24 SDK.
// The React frontend calls these from the /ai-events page.

function mockLLM(model = "gpt-4o") {
  const promptTokens     = Math.floor(Math.random() * 800) + 400;
  const completionTokens = Math.floor(Math.random() * 400) + 100;
  const totalTokens      = promptTokens + completionTokens;
  const latencyMs        = Math.floor(Math.random() * 1400) + 400;
  // GPT-4o pricing: $2.50/1M prompt, $10/1M completion
  const costUsd = parseFloat(
    ((promptTokens * 0.0000025) + (completionTokens * 0.000010)).toFixed(6),
  );
  return { provider: "openai", model, prompt_tokens: promptTokens,
           completion_tokens: completionTokens, total_tokens: totalTokens,
           latency_ms: latencyMs, cost_usd: costUsd, finish_reason: "stop", cached: false };
}

// POST /api/ai/llm-call — single mock LLM call
app.post("/api/ai/llm-call", (req: Request, res: Response) => {
  const model   = (req.body as any)?.model ?? "gpt-4o";
  const traceId = crypto.randomUUID();
  const spanId  = `llm-${Date.now()}`;
  const payload = { kind: "llm_call", ...mockLLM(model) };

  watcher.ai("info", "llm.call.completed", { traceId, spanId, payload });
  res.json({ ok: true, kind: "llm_call", traceId, model, payload, sentAt: new Date().toISOString() });
});

// POST /api/ai/tool-call — single mock tool call
app.post("/api/ai/tool-call", (_req: Request, res: Response) => {
  const tools   = ["web_search", "code_interpreter", "file_reader", "sql_query", "send_email"];
  const tool    = tools[Math.floor(Math.random() * tools.length)];
  const traceId = crypto.randomUUID();
  const success = Math.random() > 0.15;
  const payload = {
    kind: "tool_call", tool_name: tool,
    latency_ms: Math.floor(Math.random() * 500) + 80,
    success,
    output_summary: success ? `Tool returned ${Math.floor(Math.random() * 10) + 1} results` : undefined,
    error: success ? undefined : "ConnectionError: upstream timeout",
  };

  watcher.ai(success ? "info" : "error",
    success ? "tool.call.completed" : "tool.call.failed",
    { traceId, payload });
  res.json({ ok: true, kind: "tool_call", traceId, tool, success, sentAt: new Date().toISOString() });
});

// POST /api/ai/retrieval — mock RAG retrieval
app.post("/api/ai/retrieval", (_req: Request, res: Response) => {
  const methods  = ["vector", "bm25", "hybrid", "wiki", "sql"] as const;
  const method   = methods[Math.floor(Math.random() * methods.length)];
  const sources  = ["internal-wiki", "product-docs", "vector-db", "postgres", "confluence"];
  const source   = sources[Math.floor(Math.random() * sources.length)];
  const chunks   = Math.floor(Math.random() * 8);
  const traceId  = crypto.randomUUID();
  const payload  = {
    kind: "retrieval", retrieval_method: method, source,
    query_summary: "user query about product features",
    chunks_retrieved: chunks,
    top_score: ["vector", "hybrid"].includes(method) ? parseFloat((Math.random() * 0.38 + 0.6).toFixed(3)) : null,
    empty_result: chunks === 0,
    latency_ms: Math.floor(Math.random() * 180) + 20,
  };

  watcher.ai("info", "retrieval.completed", { traceId, payload });
  res.json({ ok: true, kind: "retrieval", traceId, method, sentAt: new Date().toISOString() });
});

// POST /api/ai/eval — mock eval_result
app.post("/api/ai/eval", (_req: Request, res: Response) => {
  const evaluators = ["llm-as-judge", "rule-based", "human"];
  const metrics    = ["factual_accuracy", "relevance", "helpfulness", "safety"];
  const evaluator  = evaluators[Math.floor(Math.random() * evaluators.length)];
  const metric     = metrics[Math.floor(Math.random() * metrics.length)];
  const score      = parseFloat((Math.random() * 0.5 + 0.5).toFixed(3));
  const traceId    = crypto.randomUUID();
  const payload    = {
    kind: "eval_result", evaluator, metric, score, passed: score >= 0.75,
    sample_input: "What is the refund policy?",
    sample_output: "Our refund policy allows returns within 30 days.",
  };

  watcher.ai("info", "eval.result", { traceId, payload });
  res.json({ ok: true, kind: "eval_result", traceId, metric, score, sentAt: new Date().toISOString() });
});

// POST /api/ai/workflow — full agent workflow, 7 spans sharing one trace_id
app.post("/api/ai/workflow", (_req: Request, res: Response) => {
  const traceId   = crypto.randomUUID();
  const wfSpan    = `wf-${Date.now()}`;
  const retSpan   = `ret-${Date.now()+1}`;
  const llm1Span  = `llm1-${Date.now()+2}`;
  const safeSpan  = `safe-${Date.now()+3}`;
  const toolSpan  = `tool-${Date.now()+4}`;
  const llm2Span  = `llm2-${Date.now()+5}`;
  const wfEndSpan = `wfe-${Date.now()+6}`;

  const llm1 = mockLLM("gpt-4o");
  const llm2 = mockLLM("gpt-4o-mini");
  const totalTokens  = llm1.total_tokens + llm2.total_tokens;
  const totalCostUsd = parseFloat((llm1.cost_usd + llm2.cost_usd).toFixed(6));
  const durationMs   = llm1.latency_ms + llm2.latency_ms + Math.floor(Math.random() * 400) + 200;

  watcher.ai("info", "workflow.start", { traceId, spanId: wfSpan, payload: {
    kind: "workflow_start", workflow_name: "answer-user-query",
    workflow_version: "v1.2", trigger: "user_message",
    input_summary: "User asked about pricing plans",
  }});

  watcher.ai("info", "retrieval.completed", { traceId, spanId: retSpan, parentSpanId: wfSpan, payload: {
    kind: "retrieval", retrieval_method: "wiki", source: "internal-wiki",
    query_summary: "pricing plans", chunks_retrieved: 3,
    top_score: null, empty_result: false, latency_ms: 72,
  }});

  watcher.ai("info", "llm.call.completed", { traceId, spanId: llm1Span, parentSpanId: wfSpan,
    payload: { kind: "llm_call", ...llm1 } });

  watcher.ai("info", "safety.check", { traceId, spanId: safeSpan, parentSpanId: llm1Span, payload: {
    kind: "safety_check", guardrail: "llama-guard-3",
    input_flagged: false, output_flagged: false, action_taken: "passed", latency_ms: 28,
  }});

  watcher.ai("info", "tool.call.completed", { traceId, spanId: toolSpan, parentSpanId: wfSpan, payload: {
    kind: "tool_call", tool_name: "get_pricing_table",
    latency_ms: 140, success: true, output_summary: "Returned 3 pricing tiers",
  }});

  watcher.ai("info", "llm.call.completed", { traceId, spanId: llm2Span, parentSpanId: wfSpan,
    payload: { kind: "llm_call", ...llm2 } });

  watcher.ai("info", "workflow.end", { traceId, spanId: wfEndSpan, parentSpanId: wfSpan, payload: {
    kind: "workflow_end", workflow_name: "answer-user-query",
    duration_ms: durationMs, total_tokens: totalTokens,
    total_cost_usd: totalCostUsd, steps_taken: 5, outcome: "success",
  }});

  res.json({ ok: true, traceId, spans: 7, totalTokens, totalCostUsd, durationMs,
             sentAt: new Date().toISOString() });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Catches anything thrown in route handlers and logs it before responding.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  watcher.log("error", "unhandled.server.error", {
    payload: {
      message: err.message,
      stack: err.stack ?? "",
    },
  });
  res.status(500).json({ error: "internal server error" });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);
const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  watcher.log("info", "server.started", { payload: { port: PORT } });
});

// Flush all buffered events before the process exits so nothing is lost.
process.on("SIGTERM", async () => {
  watcher.log("info", "server.shutting_down", {});
  server.close();
  await watcher.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  server.close();
  await watcher.shutdown();
  process.exit(0);
});
