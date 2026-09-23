"use server";
// actions.ts — Server Actions for the /ai-event page.
// Each action fires real events through the Watcher24 server-side SDK
// using the new watcher.ai() method. Events appear immediately in the
// console under the AI Events section (event_type = "ai").
import crypto from "node:crypto";
import { watcher } from "@/lib/watcher";

export interface AIActionResult {
  ok: boolean;
  kind: string;
  traceId: string;
  spans?: number;
  model?: string;
  totalTokens?: number;
  totalCostUsd?: number;
  durationMs?: number;
  sentAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockLLM(model = "gpt-4o") {
  const promptTokens     = Math.floor(Math.random() * 800) + 400;
  const completionTokens = Math.floor(Math.random() * 400) + 100;
  const totalTokens      = promptTokens + completionTokens;
  const latencyMs        = Math.floor(Math.random() * 1400) + 400;
  const costUsd          = parseFloat(
    ((promptTokens * 0.0000025) + (completionTokens * 0.000010)).toFixed(6),
  );
  return { provider: "openai", model, prompt_tokens: promptTokens,
           completion_tokens: completionTokens, total_tokens: totalTokens,
           latency_ms: latencyMs, cost_usd: costUsd, finish_reason: "stop", cached: false };
}

// ── Single-event actions ──────────────────────────────────────────────────────

export async function serverAILLMCall(model = "gpt-4o"): Promise<AIActionResult> {
  const traceId = crypto.randomUUID();
  const spanId  = `llm-${Date.now()}`;
  const llm     = mockLLM(model);

  watcher.ai("info", "llm.call.completed", {
    traceId, spanId,
    payload: { kind: "llm_call", ...llm },
  });

  return { ok: true, kind: "llm_call", traceId, model,
           totalTokens: llm.total_tokens, sentAt: new Date().toISOString() };
}

export async function serverAIToolCall(): Promise<AIActionResult> {
  const tools   = ["web_search", "code_interpreter", "file_reader", "sql_query", "send_email"];
  const tool    = tools[Math.floor(Math.random() * tools.length)];
  const traceId = crypto.randomUUID();
  const success = Math.random() > 0.15;

  watcher.ai(success ? "info" : "error",
    success ? "tool.call.completed" : "tool.call.failed", {
    traceId,
    payload: {
      kind: "tool_call", tool_name: tool,
      latency_ms: Math.floor(Math.random() * 500) + 80,
      success,
      output_summary: success ? `Tool returned ${Math.floor(Math.random() * 10) + 1} results` : undefined,
      error: success ? undefined : "ConnectionError: upstream timeout",
    },
  });

  return { ok: true, kind: "tool_call", traceId, sentAt: new Date().toISOString() };
}

export async function serverAIRetrieval(): Promise<AIActionResult> {
  const methods = ["vector", "bm25", "hybrid", "wiki", "sql"] as const;
  const method  = methods[Math.floor(Math.random() * methods.length)];
  const sources = ["internal-wiki", "product-docs", "vector-db", "postgres", "confluence"];
  const source  = sources[Math.floor(Math.random() * sources.length)];
  const chunks  = Math.floor(Math.random() * 8);
  const traceId = crypto.randomUUID();

  watcher.ai("info", "retrieval.completed", {
    traceId,
    payload: {
      kind: "retrieval", retrieval_method: method, source,
      query_summary: "user query about product features",
      chunks_retrieved: chunks,
      top_score: ["vector", "hybrid"].includes(method)
        ? parseFloat((Math.random() * 0.38 + 0.6).toFixed(3))
        : null,
      empty_result: chunks === 0,
      latency_ms: Math.floor(Math.random() * 180) + 20,
    },
  });

  return { ok: true, kind: "retrieval", traceId, sentAt: new Date().toISOString() };
}

export async function serverAIEval(): Promise<AIActionResult> {
  const evaluators = ["llm-as-judge", "rule-based", "human"];
  const metrics    = ["factual_accuracy", "relevance", "helpfulness", "safety"];
  const score      = parseFloat((Math.random() * 0.5 + 0.5).toFixed(3));
  const traceId    = crypto.randomUUID();

  watcher.ai("info", "eval.result", {
    traceId,
    payload: {
      kind: "eval_result",
      evaluator: evaluators[Math.floor(Math.random() * evaluators.length)],
      metric:    metrics[Math.floor(Math.random() * metrics.length)],
      score,
      passed:    score >= 0.75,
      sample_input:  "What is the refund policy?",
      sample_output: "Our refund policy allows returns within 30 days.",
    },
  });

  return { ok: true, kind: "eval_result", traceId, sentAt: new Date().toISOString() };
}

// ── Full workflow action ───────────────────────────────────────────────────────

export async function serverAIWorkflow(): Promise<AIActionResult> {
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

  return { ok: true, kind: "workflow", traceId, spans: 7,
           totalTokens, totalCostUsd, durationMs, sentAt: new Date().toISOString() };
}
