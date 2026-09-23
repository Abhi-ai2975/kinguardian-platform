// TestPage.tsx — interactive SDK event-firing panel.
// Left column: fires events via React hooks (browser transport).
// Right column: calls Express /api/test/* endpoints (Node.js transport).
// A live event log at the bottom shows every event fired this session.
import { useState } from "react";
import { useAudit, useLog, useTrace, useMetric } from "@watcher/react";

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

interface TestResult {
  ok: boolean;
  type: EventKind;
  eventType: string;
  severity?: string;
  sentAt: string;
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

type Swatch = { color: string; bg: string; border: string };

const KIND: Record<EventKind, Swatch> = {
  audit:  { color: "#1d4ed8", bg: "#eff6ff",  border: "#bfdbfe" },
  log:    { color: "#0e7490", bg: "#ecfeff",  border: "#a5f3fc" },
  trace:  { color: "#6d28d9", bg: "#f5f3ff",  border: "#ddd6fe" },
  metric: { color: "#15803d", bg: "#f0fdf4",  border: "#bbf7d0" },
};

const SEV: Record<string, Swatch> = {
  debug: { color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb" },
  info:  { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  warn:  { color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  error: { color: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
};

const SIDE_SWATCH = {
  client: { color: "#854d0e", bg: "#fefce8", border: "#fde68a" },
  server: { color: "#1e3a5f", bg: "#eff6ff", border: "#bfdbfe" },
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ margin: "14px 0 7px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>
      {text}
    </p>
  );
}

function EventButton({ label, s, loading, onClick }: { label: string; s: Swatch; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "block", width: "100%", padding: "7px 10px", marginBottom: 5,
        fontSize: 11, fontFamily: "'Menlo','Monaco',monospace", textAlign: "left",
        borderRadius: 6, border: `1px solid ${loading ? "#e5e7eb" : s.border}`,
        background: loading ? "#f9fafb" : s.bg, color: loading ? "#9ca3af" : s.color,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "⏳ sending…" : label}
    </button>
  );
}

function Chip({ label, s }: { label: string; s: Swatch }) {
  return (
    <span style={{
      padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SERVER_BASE = import.meta.env.VITE_W24_SERVER_URL ?? "http://localhost:3001";

export default function TestPage() {
  const audit  = useAudit();
  const log    = useLog();
  const trace  = useTrace();
  const metric = useMetric();

  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<LogEntry[]>([]);

  function setBtn(id: string, on: boolean) {
    setLoading((prev) => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });
  }

  function push(entry: Omit<LogEntry, "id">) {
    setEntries((prev) => [{ ...entry, id: crypto.randomUUID() }, ...prev].slice(0, 50));
  }

  const L = (id: string) => loading.has(id);

  // ── Client-side ──────────────────────────────────────────────────────────────

  function fireAudit(eventType: string, id: string) {
    setBtn(id, true);
    audit(eventType, { userId: "test-user", payload: { source: "test-lab" } });
    push({ side: "client", kind: "audit", eventType, sentAt: new Date().toISOString() });
    setTimeout(() => setBtn(id, false), 600);
  }

  function fireLog(severity: string, id: string) {
    setBtn(id, true);
    const eventType = `test.client.log.${severity}`;
    log(severity, eventType, { payload: { source: "test-lab" } });
    push({ side: "client", kind: "log", eventType, severity, sentAt: new Date().toISOString() });
    setTimeout(() => setBtn(id, false), 600);
  }

  function fireTrace(eventType: string, id: string) {
    setBtn(id, true);
    const traceId = crypto.randomUUID();
    const spanId = crypto.randomUUID();
    trace(eventType, { userId: "test-user", traceId, spanId, payload: { source: "test-lab" } });
    push({ side: "client", kind: "trace", eventType, sentAt: new Date().toISOString() });
    setTimeout(() => setBtn(id, false), 600);
  }

  function fireMetric(eventType: string, value: number, id: string) {
    setBtn(id, true);
    metric(eventType, { payload: { value, source: "test-lab" } });
    push({ side: "client", kind: "metric", eventType, sentAt: new Date().toISOString() });
    setTimeout(() => setBtn(id, false), 600);
  }

  // ── Server-side ──────────────────────────────────────────────────────────────

  async function doServer(id: string, path: string, body: Record<string, unknown>) {
    setBtn(id, true);
    try {
      const res = await fetch(`${SERVER_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const r: TestResult = await res.json();
      push({ side: "server", kind: r.type, eventType: r.eventType, severity: r.severity, sentAt: r.sentAt });
    } finally {
      setBtn(id, false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 16px",
  };

  const colHeader = (emoji: string, title: string, sub: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <div>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{sub}</p>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>SDK Test Lab</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Fire real events through the Watcher24 SDK — check your dashboard to see them arrive.
        </p>
      </div>

      {/* Two-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* CLIENT COLUMN */}
        <div style={card}>
          {colHeader("🖥", "Client-side", "useAudit · useLog · useTrace · useMetric")}

          <SectionLabel text="Audit Events" />
          <EventButton label="audit  test.client.user.action"    s={KIND.audit}  loading={L("c-a-action")} onClick={() => fireAudit("test.client.user.action",   "c-a-action")} />
          <EventButton label="audit  test.client.page.view"      s={KIND.audit}  loading={L("c-a-page")}   onClick={() => fireAudit("test.client.page.view",      "c-a-page")} />
          <EventButton label="audit  test.client.feature.clicked" s={KIND.audit} loading={L("c-a-feat")}   onClick={() => fireAudit("test.client.feature.clicked","c-a-feat")} />

          <SectionLabel text="Log Events" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {(["debug","info","warn","error"] as const).map((sev) => (
              <EventButton key={sev} label={`log  ${sev}`} s={SEV[sev]} loading={L(`c-l-${sev}`)} onClick={() => fireLog(sev, `c-l-${sev}`)} />
            ))}
          </div>

          <SectionLabel text="Trace Events" />
          <EventButton label="trace  test.client.component.render" s={KIND.trace} loading={L("c-t-render")} onClick={() => fireTrace("test.client.component.render","c-t-render")} />
          <EventButton label="trace  test.client.api.call"          s={KIND.trace} loading={L("c-t-api")}    onClick={() => fireTrace("test.client.api.call",         "c-t-api")} />

          <SectionLabel text="Metric Events" />
          <EventButton label="metric  test.client.button.clicks"  s={KIND.metric} loading={L("c-m-clicks")} onClick={() => fireMetric("test.client.button.clicks", 1,                             "c-m-clicks")} />
          <EventButton label="metric  test.client.page.load.ms"   s={KIND.metric} loading={L("c-m-load")}   onClick={() => fireMetric("test.client.page.load.ms",  Math.round(Math.random()*2000), "c-m-load")} />
        </div>

        {/* SERVER COLUMN */}
        <div style={card}>
          {colHeader("⚙️", "Server-side", "watcher.audit · .log · .trace · .metric")}

          <SectionLabel text="Audit Events" />
          <EventButton label="audit  test.server.user.action"   s={KIND.audit} loading={L("s-a-action")} onClick={() => doServer("s-a-action", "/api/test/audit", { eventType: "test.server.user.action"   })} />
          <EventButton label="audit  test.server.data.accessed" s={KIND.audit} loading={L("s-a-data")}   onClick={() => doServer("s-a-data",   "/api/test/audit", { eventType: "test.server.data.accessed" })} />
          <EventButton label="audit  test.server.auth.attempt"  s={KIND.audit} loading={L("s-a-auth")}   onClick={() => doServer("s-a-auth",   "/api/test/audit", { eventType: "test.server.auth.attempt"  })} />

          <SectionLabel text="Log Events" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {(["debug","info","warn","error"] as const).map((sev) => (
              <EventButton key={sev} label={`log  ${sev}`} s={SEV[sev]} loading={L(`s-l-${sev}`)}
                onClick={() => doServer(`s-l-${sev}`, "/api/test/log", { severity: sev, eventType: `test.server.log.${sev}` })} />
            ))}
          </div>

          <SectionLabel text="Trace Events" />
          <EventButton label="trace  test.server.db.query"      s={KIND.trace} loading={L("s-t-db")}   onClick={() => doServer("s-t-db",   "/api/test/trace", { eventType: "test.server.db.query"      })} />
          <EventButton label="trace  test.server.outbound.http" s={KIND.trace} loading={L("s-t-http")} onClick={() => doServer("s-t-http", "/api/test/trace", { eventType: "test.server.outbound.http" })} />

          <SectionLabel text="Metric Events" />
          <EventButton label="metric  test.server.request.count"    s={KIND.metric} loading={L("s-m-req")}  onClick={() => doServer("s-m-req",  "/api/test/metric", { eventType: "test.server.request.count",    value: 1 })} />
          <EventButton label="metric  test.server.response.time.ms" s={KIND.metric} loading={L("s-m-time")} onClick={() => doServer("s-m-time", "/api/test/metric", { eventType: "test.server.response.time.ms", value: Math.round(Math.random()*500) })} />
        </div>
      </div>

      {/* Event log */}
      <div style={{ marginTop: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Event Log
            {entries.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>{entries.length} fired this session</span>}
          </span>
          {entries.length > 0 && (
            <button onClick={() => setEntries([])} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>
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
                <code style={{ flex: 1, fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.eventType}
                </code>
                <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>
                  {new Date(e.sentAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
