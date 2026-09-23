"use client";
// TraceSpanTree — visualises a distributed trace as an interactive span tree.
// Spans are arranged into a parent/child hierarchy via span_id / parent_span_id.
// Clicking a span row opens EventDetailSheet with the full span payload.
// When the trace contains AI spans (event_type = "ai"), an AI summary strip
// is shown above the tree with total tokens, cost, and models used.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EventDetailSheet } from "@/components/explorer/EventDetailSheet";
import { severityVariant, formatDate } from "@/lib/utils";
import type { EventRow } from "@/lib/clickhouse";

// ── AI kind badge colours (shared with AIEventsExplorer) ─────────────────────

const AI_KIND_STYLES: Record<string, string> = {
  llm_call:       "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-950/30",
  tool_call:      "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-950/30",
  retrieval:      "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950/30",
  agent_step:     "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-950/30",
  safety_check:   "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-950/30",
  workflow_start: "border-slate-300 text-slate-500 bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-900/30",
  workflow_end:   "border-slate-300 text-slate-500 bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-900/30",
  eval_result:    "border-teal-300 text-teal-700 bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:bg-teal-950/30",
  eval_run:       "border-teal-300 text-teal-700 bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:bg-teal-950/30",
  human_feedback: "border-pink-300 text-pink-700 bg-pink-50 dark:border-pink-700 dark:text-pink-300 dark:bg-pink-950/30",
  human_handoff:  "border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:bg-yellow-950/30",
};

// ─── Tree model ───────────────────────────────────────────────────────────────

interface SpanNode {
  span: EventRow;
  children: SpanNode[];
  depth: number;
  offsetMs: number;
}

// buildTree converts a flat span list into a parent/child tree.
// Spans without a recognised parent_span_id become roots.
function buildTree(spans: EventRow[]): SpanNode[] {
  const sorted = [...spans].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const rootTime =
    sorted.length > 0 ? new Date(sorted[0].timestamp).getTime() : 0;

  // Index by span_id. Fall back to a synthetic key for spans with no ID.
  const byKey = new Map<string, SpanNode>();
  sorted.forEach((span, i) => {
    const key = span.span_id || `__span_${i}`;
    byKey.set(key, {
      span,
      children: [],
      depth: 0,
      offsetMs: new Date(span.timestamp).getTime() - rootTime,
    });
  });

  const spanKeys = new Set(byKey.keys());
  const roots: SpanNode[] = [];

  for (const node of byKey.values()) {
    const parentKey = node.span.parent_span_id;
    if (parentKey && spanKeys.has(parentKey)) {
      byKey.get(parentKey)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Assign depths with a depth-first walk.
  function setDepth(node: SpanNode, depth: number) {
    node.depth = depth;
    for (const child of node.children) setDepth(child, depth + 1);
  }
  for (const root of roots) setDepth(root, 0);

  return roots;
}

// flattenTree returns nodes in depth-first order for sequential rendering.
function flattenTree(nodes: SpanNode[]): SpanNode[] {
  const out: SpanNode[] = [];
  function visit(node: SpanNode) {
    out.push(node);
    for (const child of node.children) visit(child);
  }
  for (const root of nodes) visit(root);
  return out;
}

// ─── Span row ─────────────────────────────────────────────────────────────────

function SpanRow({
  node,
  onClick,
}: {
  node: SpanNode;
  onClick: () => void;
}) {
  const indentRem = node.depth * 1.25;
  const offsetLabel = node.offsetMs === 0 ? "root" : `+${node.offsetMs}ms`;

  // Parse AI kind from payload when this is an AI event.
  let aiKind: string | null = null;
  if (node.span.event_type === "ai" && node.span.payload) {
    try {
      const p = JSON.parse(node.span.payload);
      aiKind = p.kind ?? null;
    } catch {
      // malformed payload — ignore
    }
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 group/row"
    >
      {/* Indent spacer */}
      <span style={{ width: `${indentRem}rem`, flexShrink: 0 }} />

      {/* Connector dot */}
      <span className="h-1.5 w-1.5 rounded-full bg-border shrink-0 group-hover/row:bg-primary/60 transition-colors" />

      {/* Time offset */}
      <span className="text-[11px] font-mono text-muted-foreground w-16 text-right shrink-0">
        {offsetLabel}
      </span>

      {/* Severity badge */}
      <Badge
        variant={severityVariant(node.span.severity)}
        className="text-[10px] uppercase shrink-0"
      >
        {node.span.severity}
      </Badge>

      {/* AI kind badge — only shown for ai event_type spans */}
      {aiKind && (
        <Badge
          variant="outline"
          className={`text-[10px] font-mono shrink-0 ${AI_KIND_STYLES[aiKind] ?? ""}`}
        >
          {aiKind.replace(/_/g, " ")}
        </Badge>
      )}

      {/* Message */}
      <span className="text-sm truncate flex-1 min-w-0">
        {node.span.message}
      </span>

      {/* App ID */}
      {node.span.application_id && (
        <span className="text-xs font-mono text-muted-foreground shrink-0 truncate max-w-[10rem] hidden sm:block">
          {node.span.application_id}
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TraceSpanTreeProps {
  spans: EventRow[];
}

export function TraceSpanTree({ spans }: TraceSpanTreeProps) {
  const [selectedSpan, setSelectedSpan] = useState<EventRow | null>(null);

  const roots     = buildTree(spans);
  const flatSpans = flattenTree(roots);
  const totalMs   = flatSpans.at(-1)?.offsetMs ?? 0;
  const firstSpan = spans[0];

  // Compute AI summary from all ai-typed spans in this trace.
  const aiSpans = spans.filter((s) => s.event_type === "ai");
  const aiSummary = aiSpans.length > 0
    ? aiSpans.reduce(
        (acc, s) => {
          try {
            const p = JSON.parse(s.payload ?? "{}");
            acc.totalTokens += Number(p.total_tokens ?? 0);
            acc.totalCost   += Number(p.cost_usd ?? 0);
            if (p.model) acc.models.add(p.model as string);
          } catch { /* ignore malformed */ }
          return acc;
        },
        { totalTokens: 0, totalCost: 0, models: new Set<string>() },
      )
    : null;

  return (
    <>
      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground mb-6">
        <span>
          <span className="text-foreground font-semibold">{spans.length}</span>{" "}
          {spans.length === 1 ? "span" : "spans"}
        </span>
        {totalMs > 0 && (
          <span>
            <span className="text-foreground font-semibold">{totalMs}ms</span>{" "}
            total
          </span>
        )}
        {firstSpan && (
          <span>{formatDate(firstSpan.timestamp)}</span>
        )}
      </div>

      {/* AI summary strip — only shown when the trace contains AI spans */}
      {aiSummary && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground mb-4 px-3 py-2 rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">AI</span>
          {aiSummary.totalTokens > 0 && (
            <span>
              <span className="text-foreground font-semibold">{aiSummary.totalTokens.toLocaleString()}</span>{" "}tokens
            </span>
          )}
          {aiSummary.totalCost > 0 && (
            <span>
              <span className="text-foreground font-semibold">${aiSummary.totalCost.toFixed(4)}</span>{" "}cost
            </span>
          )}
          {aiSummary.models.size > 0 && (
            <span className="font-mono text-xs">{[...aiSummary.models].join(", ")}</span>
          )}
        </div>
      )}

      {/* Span tree table */}
      <div className="rounded-lg border overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs font-medium text-muted-foreground">
          <span className="w-16 text-right shrink-0">Offset</span>
          <span className="w-14 shrink-0">Severity</span>
          <span className="flex-1">Span</span>
          <span className="hidden sm:block w-[10rem] shrink-0">App</span>
        </div>

        {flatSpans.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
            No spans found for this trace.
          </div>
        ) : (
          flatSpans.map((node, i) => (
            <SpanRow
              key={`${node.span.span_id}-${i}`}
              node={node}
              onClick={() => setSelectedSpan(node.span)}
            />
          ))
        )}
      </div>

      <EventDetailSheet
        event={selectedSpan}
        open={selectedSpan !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSpan(null);
        }}
      />
    </>
  );
}
