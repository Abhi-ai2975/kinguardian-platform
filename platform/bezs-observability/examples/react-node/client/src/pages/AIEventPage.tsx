// AIEventPage.tsx — interactive panel for firing AI agent events.
// All buttons call Express /api/ai/* routes which fire real client.ai() events
// through the Watcher24 Node.js SDK. Events appear in the console under AI Events.
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AILogEntry {
  id: string;
  kind: string;
  label: string;
  traceId?: string;
  spans?: number;
  sentAt: string;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const AI: React.CSSProperties = { color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe" };
const AI_STRONG: React.CSSProperties = { color: "#5b21b6", background: "#ede9fe", border: "1px solid #c4b5fd", fontWeight: 700 };

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ margin: "14px 0 7px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#9ca3af" }}>
      {text}
    </p>
  );
}

interface BtnProps { label: string; style?: React.CSSProperties; loading: boolean; onClick: () => void }
function Btn({ label, style, loading, onClick }: BtnProps) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      display: "block", width: "100%", padding: "7px 10px", marginBottom: 5,
      fontSize: 11, fontFamily: "'Menlo','Monaco',monospace", textAlign: "left",
      borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
      opacity: loading ? 0.6 : 1,
      ...(style ?? AI),
    }}>
      {loading ? "⏳ sending…" : label}
    </button>
  );
}

function KindChip({ kind }: { kind: string }) {
  return (
    <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700,
                   letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
                   color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
      {kind.replace(/_/g, " ")}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SERVER_BASE = import.meta.env.VITE_W24_SERVER_URL ?? "http://localhost:3001";

export default function AIEventPage() {
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<AILogEntry[]>([]);

  function setBtn(id: string, on: boolean) {
    setLoading((prev) => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });
  }

  function push(entry: Omit<AILogEntry, "id">) {
    setEntries((prev) => [{ ...entry, id: crypto.randomUUID() }, ...prev].slice(0, 50));
  }

  const L = (id: string) => loading.has(id);

  async function fire(id: string, path: string, kind: string, label: string) {
    setBtn(id, true);
    try {
      const res  = await fetch(`${SERVER_BASE}${path}`, { method: "POST",
        headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      push({ kind, label, traceId: data.traceId, spans: data.spans, sentAt: data.sentAt });
    } catch {
      push({ kind, label, sentAt: new Date().toISOString() });
    } finally {
      setBtn(id, false);
    }
  }

  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "18px 16px",
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>🤖 AI Events</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Fire real AI agent events through the Watcher24 Node.js SDK.
          Check the <strong>AI Events</strong> section in your dashboard to see them arrive.
        </p>
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Server-side AI Events</h2>
            <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>watcher.ai() — event_type: "ai"</p>
          </div>
        </div>

        <SectionLabel text="Single Events" />
        <Btn id="llm" label="ai  llm_call — single LLM API call (gpt-4o)"
          loading={L("llm")} onClick={() => fire("llm", "/api/ai/llm-call", "llm_call", "LLM call")} />
        <Btn id="tool" label="ai  tool_call — agent calls external tool (random)"
          loading={L("tool")} onClick={() => fire("tool", "/api/ai/tool-call", "tool_call", "Tool call")} />
        <Btn id="ret" label="ai  retrieval — RAG document fetch (random method)"
          loading={L("ret")} onClick={() => fire("ret", "/api/ai/retrieval", "retrieval", "Retrieval")} />
        <Btn id="eval" label="ai  eval_result — LLM-as-judge quality score"
          loading={L("eval")} onClick={() => fire("eval", "/api/ai/eval", "eval_result", "Eval result")} />

        <SectionLabel text="Full Workflow (7 spans, 1 trace_id)" />
        <Btn id="wf" style={AI_STRONG}
          label="ai  workflow — start → retrieval → llm → safety → tool → llm → end"
          loading={L("wf")} onClick={() => fire("wf", "/api/ai/workflow", "workflow", "Full workflow")} />
      </div>

      {/* Event log */}
      <div style={{ marginTop: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", background: "#faf5ff", borderBottom: "1px solid #e5e7eb",
                      display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            AI Event Log
            {entries.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
                {entries.length} fired this session
              </span>
            )}
          </span>
          {entries.length > 0 && (
            <button onClick={() => setEntries([])}
              style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {entries.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, padding: "32px 0", margin: 0 }}>
              No events fired yet — click a button above.
            </p>
          ) : (
            entries.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 7,
                                       padding: "8px 16px", borderBottom: "1px solid #f3f4f6" }}>
                <KindChip kind={e.kind} />
                {e.spans && (
                  <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600 }}>
                    {e.spans} spans
                  </span>
                )}
                {e.traceId && (
                  <code style={{ fontSize: 10, color: "#9ca3af" }}>
                    trace:{e.traceId.slice(0, 8)}…
                  </code>
                )}
                <span style={{ flex: 1 }} />
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
