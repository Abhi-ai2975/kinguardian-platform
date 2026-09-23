"use client";
// TestPanel.tsx — interactive SDK event-firing panel for the /test page.
// Left column fires events via React hooks (browser transport).
// Right column invokes Server Actions which use the Node.js transport.
// A live event log at the bottom records every event fired in this session.

import { useState } from "react";
import { useAudit, useLog, useTrace, useMetric } from "@watcher/nextjs/client";
import {
  serverAudit,
  serverLog,
  serverTrace,
  serverMetric,
  serverAdvancedTrace,
} from "@/app/test/actions";
import type { ActionResult, TraceSpan } from "@/app/test/actions";
import { ErrorTracePanel } from "./ErrorTracePanel";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventKind = "audit" | "log" | "trace" | "metric";

interface LogEntry {
  id: string;
  side: "client" | "server";
  kind: EventKind;
  eventType: string;
  severity?: string;
  sentAt: string;
}

interface AdvancedTrace {
  side: "client" | "server";
  traceId: string;
  spans: TraceSpan[];
  sentAt: string;
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

type Swatch = { color: string; bg: string; border: string };

const KIND: Record<EventKind, Swatch> = {
  audit: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  log: { color: "#0e7490", bg: "#ecfeff", border: "#a5f3fc" },
  trace: { color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
  metric: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
};

const SEV: Record<string, Swatch> = {
  debug: { color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb" },
  info: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  warn: { color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  error: { color: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
};

const SIDE_SWATCH = {
  client: { color: "#854d0e", bg: "#fefce8", border: "#fde68a" },
  server: { color: "#1e3a5f", bg: "#eff6ff", border: "#bfdbfe" },
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <p
      style={{
        margin: "14px 0 7px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#9ca3af",
      }}
    >
      {text}
    </p>
  );
}

function EventButton({
  label,
  s,
  loading,
  onClick,
}: {
  label: string;
  s: Swatch;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "block",
        width: "100%",
        padding: "7px 10px",
        marginBottom: 5,
        fontSize: 11,
        fontFamily: "'Menlo', 'Monaco', monospace",
        textAlign: "left",
        borderRadius: 6,
        border: `1px solid ${loading ? "#e5e7eb" : s.border}`,
        background: loading ? "#f9fafb" : s.bg,
        color: loading ? "#9ca3af" : s.color,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "⏳ sending…" : label}
    </button>
  );
}

function Chip({ label, s }: { label: string; s: Swatch }) {
  return (
    <span
      style={{
        padding: "1px 5px",
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TestPanel() {
  const audit = useAudit();
  const log = useLog();
  const trace = useTrace();
  const metric = useMetric();

  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [clientTrace, setClientTrace] = useState<AdvancedTrace | null>(null);
  const [serverTrace2, setServerTrace2] = useState<AdvancedTrace | null>(null);
  const [copied, setCopied] = useState<"client" | "server" | null>(null);

  function setBtn(id: string, on: boolean) {
    setLoading((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function push(entry: Omit<LogEntry, "id">) {
    setEntries((prev) =>
      [{ ...entry, id: crypto.randomUUID() }, ...prev].slice(0, 50),
    );
  }

  const L = (id: string) => loading.has(id);

  // ── Client-side helpers ────────────────────────────────────────────────────

  function fireAudit(eventType: string, id: string) {
    setBtn(id, true);
    audit(eventType, { userId: "test-user", payload: { source: "test-page" } });
    push({ side: "client", kind: "audit", eventType, sentAt: new Date().toISOString() });
    setTimeout(() => setBtn(id, false), 600);
  }

  function fireLog(severity: string, id: string) {
    setBtn(id, true);
    const eventType = `test.client.log.${severity}`;
    log(severity, eventType, { payload: { source: "test-page" } });
    push({ side: "client", kind: "log", eventType, severity, sentAt: new Date().toISOString() });
    setTimeout(() => setBtn(id, false), 600);
  }

  function fireTrace(eventType: string, id: string) {
    setBtn(id, true);
    const traceId = crypto.randomUUID();
    const spanId = crypto.randomUUID();
    trace(eventType, { userId: "test-user", traceId, spanId, payload: { source: "test-page", traceId, spanId } });
    push({ side: "client", kind: "trace", eventType, sentAt: new Date().toISOString() });
    setTimeout(() => setBtn(id, false), 600);
  }

  function fireMetric(eventType: string, value: number, id: string) {
    setBtn(id, true);
    metric(eventType, { payload: { value, source: "test-page" } });
    push({ side: "client", kind: "metric", eventType, sentAt: new Date().toISOString() });
    setTimeout(() => setBtn(id, false), 600);
  }

  function fireAdvancedTrace(id: string) {
    setBtn(id, true);
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
      trace(span.eventType, {
        userId: "test-user",
        traceId,
        spanId: span.spanId,
        ...(span.parentSpanId ? { parentSpanId: span.parentSpanId } : {}),
        payload: { ...span.payload, traceId, source: "test-page" },
      });
    }

    const sentAt = new Date().toISOString();
    setClientTrace({ side: "client", traceId, spans, sentAt });
    push({ side: "client", kind: "trace", eventType: `multi-span trace · 4 spans · ${traceId.slice(0, 8)}…`, sentAt });
    setTimeout(() => setBtn(id, false), 600);
  }

  function copyTrace(t: AdvancedTrace, side: "client" | "server") {
    const json = JSON.stringify(
      t.spans.map((s) => ({
        traceId: t.traceId,
        spanId: s.spanId,
        parentSpanId: s.parentSpanId || null,
        eventType: s.eventType,
        payload: s.payload,
      })),
      null,
      2,
    );
    navigator.clipboard.writeText(json);
    setCopied(side);
    setTimeout(() => setCopied(null), 1500);
  }

  // ── Server-side helpers ────────────────────────────────────────────────────

  async function doServer(id: string, fn: () => Promise<ActionResult>) {
    setBtn(id, true);
    try {
      const r = await fn();
      push({ side: "server", kind: r.type, eventType: r.eventType, severity: r.severity, sentAt: r.sentAt });
    } finally {
      setBtn(id, false);
    }
  }

  async function doServerAdvancedTrace(id: string) {
    setBtn(id, true);
    try {
      const r = await serverAdvancedTrace();
      setServerTrace2({ side: "server", traceId: r.traceId, spans: r.spans, sentAt: r.sentAt });
      push({ side: "server", kind: "trace", eventType: `multi-span trace · 4 spans · ${r.traceId.slice(0, 8)}…`, sentAt: r.sentAt });
    } finally {
      setBtn(id, false);
    }
  }

  // ── Span tree widget (shared by both advanced trace columns) ───────────────

  function SpanTree({ t, side }: { t: AdvancedTrace; side: "client" | "server" }) {
    return (
      <div style={{ marginTop: 6, borderRadius: 6, border: "1px solid #ddd6fe", background: "#faf5ff", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", borderBottom: "1px solid #ddd6fe" }}>
          <code style={{ fontSize: 9, color: "#6d28d9" }}>traceId: {t.traceId.slice(0, 16)}…</code>
          <button
            onClick={() => copyTrace(t, side)}
            style={{ fontSize: 9, fontWeight: 700, color: copied === side ? "#15803d" : "#6d28d9", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
          >
            {copied === side ? "✓ Copied!" : "Copy JSON"}
          </button>
        </div>
        {t.spans.map((s, i) => (
          <div key={s.spanId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderBottom: i < t.spans.length - 1 ? "1px solid #ede9fe" : undefined }}>
            <span style={{ fontSize: 9, color: "#a78bfa", width: 10, flexShrink: 0 }}>{s.parentSpanId ? "└" : "┌"}</span>
            <code style={{ fontSize: 9, color: "#5b21b6", flex: 1 }}>{s.eventType}</code>
            <code style={{ fontSize: 8, color: "#9ca3af" }}>{s.spanId.slice(0, 8)}…</code>
          </div>
        ))}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Two-column grid ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* CLIENT COLUMN */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🖥</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Client-side</h2>
              <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>useAudit · useLog · useTrace · useMetric</p>
            </div>
          </div>

          <SectionLabel text="Audit Events" />
          <EventButton label="audit  test.client.user.action" s={KIND.audit} loading={L("c-a-action")} onClick={() => fireAudit("test.client.user.action", "c-a-action")} />
          <EventButton label="audit  test.client.page.view" s={KIND.audit} loading={L("c-a-page")} onClick={() => fireAudit("test.client.page.view", "c-a-page")} />
          <EventButton label="audit  test.client.feature.clicked" s={KIND.audit} loading={L("c-a-feat")} onClick={() => fireAudit("test.client.feature.clicked", "c-a-feat")} />

          <SectionLabel text="Log Events" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {(["debug", "info", "warn", "error"] as const).map((sev) => (
              <EventButton key={sev} label={`log  ${sev}`} s={SEV[sev]} loading={L(`c-l-${sev}`)} onClick={() => fireLog(sev, `c-l-${sev}`)} />
            ))}
          </div>

          <SectionLabel text="Trace Events" />
          <EventButton label="trace  test.client.component.render" s={KIND.trace} loading={L("c-t-render")} onClick={() => fireTrace("test.client.component.render", "c-t-render")} />
          <EventButton label="trace  test.client.api.call" s={KIND.trace} loading={L("c-t-api")} onClick={() => fireTrace("test.client.api.call", "c-t-api")} />

          <SectionLabel text="Advanced Trace" />
          <EventButton label="trace  multi-span · http → db + cache → conn (4 spans)" s={KIND.trace} loading={L("c-t-adv")} onClick={() => fireAdvancedTrace("c-t-adv")} />
          {clientTrace && <SpanTree t={clientTrace} side="client" />}

          <SectionLabel text="Metric Events" />
          <EventButton label="metric  test.client.button.clicks" s={KIND.metric} loading={L("c-m-clicks")} onClick={() => fireMetric("test.client.button.clicks", 1, "c-m-clicks")} />
          <EventButton label="metric  test.client.page.load.ms" s={KIND.metric} loading={L("c-m-load")} onClick={() => fireMetric("test.client.page.load.ms", Math.round(Math.random() * 2000), "c-m-load")} />
        </div>

        {/* SERVER COLUMN */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Server-side</h2>
              <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>watcher.audit · .log · .trace · .metric</p>
            </div>
          </div>

          <SectionLabel text="Audit Events" />
          <EventButton label="audit  test.server.user.action" s={KIND.audit} loading={L("s-a-action")} onClick={() => doServer("s-a-action", () => serverAudit("test.server.user.action"))} />
          <EventButton label="audit  test.server.data.accessed" s={KIND.audit} loading={L("s-a-data")} onClick={() => doServer("s-a-data", () => serverAudit("test.server.data.accessed"))} />
          <EventButton label="audit  test.server.auth.attempt" s={KIND.audit} loading={L("s-a-auth")} onClick={() => doServer("s-a-auth", () => serverAudit("test.server.auth.attempt"))} />

          <SectionLabel text="Log Events" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {(["debug", "info", "warn", "error"] as const).map((sev) => (
              <EventButton key={sev} label={`log  ${sev}`} s={SEV[sev]} loading={L(`s-l-${sev}`)} onClick={() => doServer(`s-l-${sev}`, () => serverLog(sev, `test.server.log.${sev}`))} />
            ))}
          </div>

          <SectionLabel text="Trace Events" />
          <EventButton label="trace  test.server.db.query" s={KIND.trace} loading={L("s-t-db")} onClick={() => doServer("s-t-db", () => serverTrace("test.server.db.query"))} />
          <EventButton label="trace  test.server.outbound.http" s={KIND.trace} loading={L("s-t-http")} onClick={() => doServer("s-t-http", () => serverTrace("test.server.outbound.http"))} />

          <SectionLabel text="Advanced Trace" />
          <EventButton label="trace  multi-span · http → db + cache → conn (4 spans)" s={KIND.trace} loading={L("s-t-adv")} onClick={() => doServerAdvancedTrace("s-t-adv")} />
          {serverTrace2 && <SpanTree t={serverTrace2} side="server" />}

          <SectionLabel text="Metric Events" />
          <EventButton label="metric  test.server.request.count" s={KIND.metric} loading={L("s-m-req")} onClick={() => doServer("s-m-req", () => serverMetric("test.server.request.count", 1))} />
          <EventButton label="metric  test.server.response.time.ms" s={KIND.metric} loading={L("s-m-time")} onClick={() => doServer("s-m-time", () => serverMetric("test.server.response.time.ms", Math.round(Math.random() * 500)))} />
        </div>
      </div>

      {/* ── Real-time Error Trace (separate component) ───────────────────── */}
      <ErrorTracePanel />

      {/* ── Event Log ────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Event Log
            {entries.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>{entries.length} fired this session</span>}
          </span>
          {entries.length > 0 && (
            <button onClick={() => setEntries([])} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {entries.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, padding: "32px 0", margin: 0 }}>
              No events fired yet — click a button above.
            </p>
          ) : (
            entries.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderBottom: "1px solid #f3f4f6" }}>
                <Chip label={e.side} s={SIDE_SWATCH[e.side]} />
                <Chip label={e.kind} s={KIND[e.kind]} />
                {e.severity && <Chip label={e.severity} s={SEV[e.severity] ?? SEV.info} />}
                <code style={{ flex: 1, fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.eventType}</code>
                <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{new Date(e.sentAt).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
