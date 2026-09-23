"use client";
// ErrorTracePanel.tsx — Real-time Error Trace section for the /test page.
// Fires a real error through the layered architecture:
//   server action → controller → use case → repository
// Each layer catches, fires its own error trace span to Watcher24, and rethrows.
// The full error chain appears in the console in real time with severity "error".

import { useState } from "react";
import { runErrorTrace } from "@/app/test/actions";
import type { ErrorTraceSpan } from "@/app/test/actions";

// ─── Style tokens ─────────────────────────────────────────────────────────────

const ERR = { color: "#991b1b", bg: "#fef2f2", border: "#fecaca" };
const ERR_ROW = "#fee2e2";
const LAYER_LABELS: Record<string, string> = {
  "action.getBookmarks":    "Server Action",
  "controller.getBookmarks": "Controller",
  "usecase.fetchBookmarks": "Use Case",
  "repo.query":             "Repository",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function LayerBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        background: "#fecaca",
        color: "#991b1b",
        border: "1px solid #fca5a5",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function SpanRow({ span, isLast }: { span: ErrorTraceSpan; isLast: boolean }) {
  const indent = span.depth * 12;
  const isRoot = span.depth === 0;
  const icon = isRoot ? "⚡" : "↳";

  return (
    <div
      style={{
        padding: "6px 12px",
        paddingLeft: 12 + indent,
        borderBottom: isLast ? "none" : `1px solid ${ERR_ROW}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#f87171", flexShrink: 0 }}>{icon}</span>
        <LayerBadge label={LAYER_LABELS[span.eventType] ?? span.eventType} />
        <code style={{ fontSize: 9, color: "#7f1d1d", opacity: 0.7 }}>
          {span.eventType}
        </code>
        <code style={{ fontSize: 8, color: "#9ca3af", marginLeft: "auto", flexShrink: 0 }}>
          {span.spanId.slice(0, 8)}…
        </code>
      </div>
      <p
        style={{
          margin: "3px 0 0",
          marginLeft: 16 + indent,
          fontSize: 9,
          color: "#b91c1c",
          lineHeight: 1.5,
          wordBreak: "break-word",
          fontFamily: "monospace",
        }}
      >
        {span.error.length > 120 ? span.error.slice(0, 120) + "…" : span.error}
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ErrorTracePanel() {
  const [loading, setLoading] = useState(false);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [spans, setSpans] = useState<ErrorTraceSpan[]>([]);
  const [copied, setCopied] = useState(false);

  async function fire() {
    setLoading(true);
    try {
      const result = await runErrorTrace();
      setTraceId(result.traceId);
      setSpans(result.spans);
    } finally {
      setLoading(false);
    }
  }

  function copyJson() {
    if (!traceId) return;
    navigator.clipboard.writeText(
      JSON.stringify(
        spans.map((s) => ({
          traceId,
          spanId: s.spanId,
          parentSpanId: s.parentSpanId || null,
          eventType: s.eventType,
          severity: "error",
          layer: LAYER_LABELS[s.eventType] ?? s.eventType,
          error: s.error,
        })),
        null,
        2,
      ),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      style={{
        margin: "24px 0",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 16px",
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>
            Real-time Error Trace
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>
            server action → controller → use case → repository — each layer fires its own span
          </p>
        </div>
        <button
          onClick={fire}
          disabled={loading}
          style={{
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Menlo', 'Monaco', monospace",
            borderRadius: 6,
            border: `1px solid ${loading ? "#e5e7eb" : ERR.border}`,
            background: loading ? "#f9fafb" : ERR.bg,
            color: loading ? "#9ca3af" : ERR.color,
            cursor: loading ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          {loading ? "⏳ firing…" : "⚡ Fire Error Chain"}
        </button>
      </div>

      {/* ── Architecture legend ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {["Server Action", "Controller", "Use Case", "Repository"].map((label, i, arr) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 3,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                background: i === arr.length - 1 ? "#fef2f2" : "#f3f4f6",
                color: i === arr.length - 1 ? "#991b1b" : "#6b7280",
                border: `1px solid ${i === arr.length - 1 ? "#fecaca" : "#e5e7eb"}`,
              }}
            >
              {label}
            </span>
            {i < arr.length - 1 && (
              <span style={{ fontSize: 10, color: "#d1d5db" }}>→</span>
            )}
          </span>
        ))}
        <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 4 }}>
          ← real throw here
        </span>
      </div>

      {/* ── Trace result ──────────────────────────────────────────────────── */}
      {spans.length > 0 && traceId ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              background: "#fef2f2",
              borderBottom: `1px solid ${ERR.border}`,
            }}
          >
            <code style={{ fontSize: 9, color: ERR.color }}>
              traceId: {traceId}
            </code>
            <button
              onClick={copyJson}
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: copied ? "#15803d" : ERR.color,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
                flexShrink: 0,
              }}
            >
              {copied ? "✓ Copied!" : "Copy JSON"}
            </button>
          </div>
          <div>
            {spans.map((span, i) => (
              <SpanRow key={span.spanId} span={span} isLast={i === spans.length - 1} />
            ))}
          </div>
        </>
      ) : (
        <p
          style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 12,
            padding: "28px 0",
            margin: 0,
          }}
        >
          Click &ldquo;Fire Error Chain&rdquo; — a real error propagates through all 4 layers and appears in the console.
        </p>
      )}
    </div>
  );
}
