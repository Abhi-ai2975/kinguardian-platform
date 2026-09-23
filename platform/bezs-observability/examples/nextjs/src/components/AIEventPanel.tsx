"use client";
// AIEventPanel.tsx — interactive panel for the /ai-event page.
// Calls Server Actions which fire real watcher.ai() events server-side.
// Events appear in the console under AI Events (event_type = "ai").
import { useState } from "react";
import {
  serverAILLMCall,
  serverAIToolCall,
  serverAIRetrieval,
  serverAIEval,
  serverAIWorkflow,
} from "@/app/ai-event/actions";
import type { AIActionResult } from "@/app/ai-event/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  result: AIActionResult;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const AI_CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "18px 16px",
};

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ margin: "14px 0 7px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#9ca3af" }}>
      {text}
    </p>
  );
}

interface BtnProps {
  label: string;
  loading: boolean;
  strong?: boolean;
  onClick: () => void;
}
function Btn({ label, loading, strong, onClick }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "block", width: "100%", padding: "7px 10px", marginBottom: 5,
        fontSize: 11, fontFamily: "'Menlo','Monaco',monospace", textAlign: "left",
        borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
        color: strong ? "#5b21b6" : "#7c3aed",
        background: strong ? "#ede9fe" : "#f5f3ff",
        border: `1px solid ${strong ? "#c4b5fd" : "#ddd6fe"}`,
        fontWeight: strong ? 700 : 400,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "⏳ sending…" : label}
    </button>
  );
}

function KindChip({ kind }: { kind: string }) {
  return (
    <span style={{
      padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
      color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe",
    }}>
      {kind.replace(/_/g, " ")}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIEventPanel() {
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<LogEntry[]>([]);

  function setBtn(id: string, on: boolean) {
    setLoading((prev) => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });
  }

  function push(result: AIActionResult) {
    setEntries((prev) => [{ id: crypto.randomUUID(), result }, ...prev].slice(0, 50));
  }

  async function run(id: string, action: () => Promise<AIActionResult>) {
    setBtn(id, true);
    try {
      const result = await action();
      push(result);
    } catch (e) {
      push({ ok: false, kind: id, traceId: "", sentAt: new Date().toISOString() });
    } finally {
      setBtn(id, false);
    }
  }

  const L = (id: string) => loading.has(id);
  const MODELS = ["gpt-4o", "gpt-4o-mini", "claude-sonnet-4-6", "gemini-1.5-pro"];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>🤖 AI Events</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Fire real AI agent events through the Watcher24 Next.js SDK (server-side).
          Check the <strong>AI Events</strong> section in your dashboard to see them arrive.
        </p>
      </div>

      <div style={AI_CARD}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Server Actions</h2>
            <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>watcher.ai() — event_type: "ai"</p>
          </div>
        </div>

        <SectionLabel text="Single Events" />
        {MODELS.map((m) => (
          <Btn key={m} label={`ai  llm_call — LLM API call (${m})`}
            loading={L(`llm-${m}`)} onClick={() => run(`llm-${m}`, () => serverAILLMCall(m))} />
        ))}
        <Btn label="ai  tool_call — agent calls external tool (random)"
          loading={L("tool")} onClick={() => run("tool", serverAIToolCall)} />
        <Btn label="ai  retrieval — RAG document fetch (random method)"
          loading={L("ret")} onClick={() => run("ret", serverAIRetrieval)} />
        <Btn label="ai  eval_result — LLM-as-judge quality score"
          loading={L("eval")} onClick={() => run("eval", serverAIEval)} />

        <SectionLabel text="Full Workflow (7 spans, 1 trace_id)" />
        <Btn strong
          label="ai  workflow — start → retrieval → llm → safety → tool → llm → end"
          loading={L("wf")} onClick={() => run("wf", serverAIWorkflow)} />
      </div>

      {/* Event log */}
      <div style={{ marginTop: 20, background: "#fff", border: "1px solid #e5e7eb",
                    borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", background: "#faf5ff",
                      borderBottom: "1px solid #e5e7eb",
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
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {entries.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13,
                        padding: "32px 0", margin: 0 }}>
              No events fired yet — click a button above.
            </p>
          ) : (
            entries.map(({ id, result }) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 7,
                                     padding: "8px 16px", borderBottom: "1px solid #f3f4f6" }}>
                <KindChip kind={result.kind} />
                {result.spans && (
                  <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600 }}>
                    {result.spans} spans
                  </span>
                )}
                {result.model && (
                  <code style={{ fontSize: 10, color: "#6b7280" }}>{result.model}</code>
                )}
                {result.totalTokens && (
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>
                    {result.totalTokens.toLocaleString()} tokens
                  </span>
                )}
                {result.traceId && (
                  <code style={{ fontSize: 10, color: "#9ca3af" }}>
                    trace:{result.traceId.slice(0, 8)}…
                  </code>
                )}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>
                  {new Date(result.sentAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
