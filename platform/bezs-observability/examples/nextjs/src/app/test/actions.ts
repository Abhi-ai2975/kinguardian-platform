"use server";
// Server Actions for the SDK test page.
// Each action fires a real event through the server-side Watcher client
// and returns a serializable result so the client can update its event log.

import { watcher } from "@/lib/watcher";
import { bookmarkController } from "./bookmark-controller";

export interface ActionResult {
  ok: true;
  type: "audit" | "log" | "trace" | "metric";
  eventType: string;
  severity?: string;
  sentAt: string;
}

export async function serverAudit(eventType: string): Promise<ActionResult> {
  watcher.audit(eventType, {
    userId: "test-user",
    payload: { source: "test-page", triggeredAt: new Date().toISOString() },
  });
  return { ok: true, type: "audit", eventType, sentAt: new Date().toISOString() };
}

export async function serverLog(severity: string, eventType: string): Promise<ActionResult> {
  watcher.log(severity, eventType, {
    payload: { source: "test-page", triggeredAt: new Date().toISOString() },
  });
  return { ok: true, type: "log", eventType, severity, sentAt: new Date().toISOString() };
}

export async function serverTrace(eventType: string): Promise<ActionResult> {
  const traceId = crypto.randomUUID();
  const spanId = crypto.randomUUID();
  watcher.trace(eventType, {
    userId: "test-user",
    traceId,
    spanId,
    payload: { source: "test-page", traceId, spanId, triggeredAt: new Date().toISOString() },
  });
  return { ok: true, type: "trace", eventType, sentAt: new Date().toISOString() };
}

export async function serverMetric(eventType: string, value: number): Promise<ActionResult> {
  watcher.metric(eventType, {
    payload: { value, source: "test-page", triggeredAt: new Date().toISOString() },
  });
  return { ok: true, type: "metric", eventType, sentAt: new Date().toISOString() };
}

// ── Advanced Trace ─────────────────────────────────────────────────────────────

export interface TraceSpan {
  spanId: string;
  parentSpanId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface AdvancedTraceResult {
  ok: true;
  type: "trace";
  traceId: string;
  spans: TraceSpan[];
  sentAt: string;
}

// serverAdvancedTrace fires a realistic 4-span parent-child trace:
// http.request (root) → db.query + cache.lookup (children) → db.connection.acquire (grandchild).
export async function serverAdvancedTrace(): Promise<AdvancedTraceResult> {
  const traceId = crypto.randomUUID();
  const rootId = crypto.randomUUID();
  const dbId = crypto.randomUUID();
  const cacheId = crypto.randomUUID();
  const connId = crypto.randomUUID();

  const spans: TraceSpan[] = [
    { spanId: rootId, parentSpanId: "", eventType: "http.request", payload: { method: "GET", path: "/api/bookmarks", status: 200, duration_ms: 142 } },
    { spanId: dbId, parentSpanId: rootId, eventType: "db.query", payload: { table: "bookmarks", operation: "SELECT", rows: 12, duration_ms: 38 } },
    { spanId: cacheId, parentSpanId: rootId, eventType: "cache.lookup", payload: { key: "bookmarks:user-123", hit: false, duration_ms: 2 } },
    { spanId: connId, parentSpanId: dbId, eventType: "db.connection.acquire", payload: { pool: "primary", wait_ms: 1, duration_ms: 0 } },
  ];

  for (const span of spans) {
    watcher.trace(span.eventType, {
      userId: "test-user",
      traceId,
      spanId: span.spanId,
      ...(span.parentSpanId ? { parentSpanId: span.parentSpanId } : {}),
      payload: { ...span.payload, traceId, source: "test-page" },
    });
  }

  return { ok: true, type: "trace", traceId, spans, sentAt: new Date().toISOString() };
}

// ── Real-time Error Trace ──────────────────────────────────────────────────────
// Follows the layered architecture: server action → controller → use case → repo.
// The error originates in the repo (a real throw), bubbles up through every layer,
// and each layer fires its own trace span with severity "error" before rethrowing.
// All spans share one traceId so they appear as a single error trace in the console.

export interface ErrorTraceSpan {
  spanId: string;
  parentSpanId: string;
  eventType: string;
  error: string;
  depth: number;
}

export interface ErrorTraceResult {
  ok: true;
  type: "trace";
  traceId: string;
  spans: ErrorTraceSpan[];
  sentAt: string;
}

export async function runErrorTrace(): Promise<ErrorTraceResult> {
  const traceId = crypto.randomUUID();
  const actionSpanId = crypto.randomUUID();
  const collected: ErrorTraceSpan[] = [];

  try {
    await bookmarkController("user-123", {
      traceId,
      callerSpanId: actionSpanId, // controller's parent is this action span
      collected,
    });
  } catch (err) {
    const actionError = `action.getBookmarks: ${(err as Error).message}`;

    // Server action span — the outermost / root span. Fired last as the error
    // bubbles up from repo → use case → controller → here.
    watcher.event("trace", "error", "action.getBookmarks", {
      traceId,
      spanId: actionSpanId,
      payload: {
        error: actionError,
        layer: "server-action",
        source: "test-page",
      },
    });
    collected.push({
      spanId: actionSpanId,
      parentSpanId: "",
      eventType: "action.getBookmarks",
      error: actionError,
      depth: 0,
    });
  }

  // Sort depth-ascending so the UI shows root → leaf (action → controller → usecase → repo).
  collected.sort((a, b) => a.depth - b.depth);

  return { ok: true, type: "trace", traceId, spans: collected, sentAt: new Date().toISOString() };
}
