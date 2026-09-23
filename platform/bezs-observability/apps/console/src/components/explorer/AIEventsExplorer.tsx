"use client";
// AIEventsExplorer — filterable table for AI agent events.
// Wraps the same query/pagination pattern as EventsExplorer but with
// AI-specific columns (kind, model, tokens, cost, latency, trace link)
// and AI-specific filter controls (kind dropdown, model input).
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { resolveTimeRange, DEFAULT_RANGE, type TimeRangeKey } from "@/lib/time-range";
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { EventDetailSheet } from "@/components/explorer/EventDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, severityVariant } from "@/lib/utils";
import type { AIEventRow } from "@/lib/clickhouse";
import { Eye, GitBranch, RefreshCw } from "lucide-react";

// ── AI kind badge colours ─────────────────────────────────────────────────────

const KIND_STYLES: Record<string, string> = {
  llm_call:       "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-950/30",
  tool_call:      "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-950/30",
  retrieval:      "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950/30",
  agent_step:     "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-950/30",
  safety_check:   "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-950/30",
  workflow_start: "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-900/30",
  workflow_end:   "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-900/30",
  eval_result:    "border-teal-300 text-teal-700 bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:bg-teal-950/30",
  eval_run:       "border-teal-300 text-teal-700 bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:bg-teal-950/30",
  human_feedback: "border-pink-300 text-pink-700 bg-pink-50 dark:border-pink-700 dark:text-pink-300 dark:bg-pink-950/30",
  memory_read:    "border-indigo-300 text-indigo-700 bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/30",
  memory_write:   "border-indigo-300 text-indigo-700 bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/30",
  human_handoff:  "border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:bg-yellow-950/30",
};

const KIND_OPTIONS = [
  "all",
  "llm_call",
  "tool_call",
  "agent_step",
  "retrieval",
  "workflow_start",
  "workflow_end",
  "safety_check",
  "eval_result",
  "eval_run",
  "human_feedback",
  "memory_read",
  "memory_write",
  "human_handoff",
] as const;

const SEVERITY_OPTIONS = ["all", "debug", "info", "warn", "error", "critical"] as const;
const PRESET_KEYS = ["15m", "1h", "4h", "24h", "7d", "30d"] as TimeRangeKey[];

interface AIEventsExplorerProps {
  orgId: string;
  appId?: string | null;
}

export function AIEventsExplorer({ orgId, appId }: AIEventsExplorerProps) {
  const [kind, setKind]               = useState("all");
  const [model, setModel]             = useState("");
  const [severity, setSeverity]       = useState("all");
  const [pagination, setPagination]   = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [selectedEvent, setSelectedEvent] = useState<AIEventRow | null>(null);

  const [range] = useQueryState(
    "range",
    parseAsStringLiteral(PRESET_KEYS).withDefault(DEFAULT_RANGE),
  );
  const { from, to } = resolveTimeRange(range);

  const { data, isFetching, refetch } = useQuery<AIEventRow[]>({
    queryKey: ["/api/events/ai", orgId, appId, kind, model, severity, pagination, range],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId,
        limit: String(pagination.pageSize),
        offset: String(pagination.pageIndex * pagination.pageSize),
        from,
        to,
      });
      if (appId)            params.set("appId", appId);
      if (kind !== "all")   params.set("kind", kind);
      if (model)            params.set("model", model);
      if (severity !== "all") params.set("severity", severity);
      const res = await fetch(`/api/events/ai?${params}`);
      if (!res.ok) throw new Error("Failed to fetch AI events");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const columns: ColumnDef<AIEventRow, unknown>[] = [
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          {formatDate(getValue<string>())}
        </span>
      ),
    },
    {
      accessorKey: "severity",
      header: "Sev",
      cell: ({ getValue }) => {
        const s = getValue<string>();
        return (
          <Badge variant={severityVariant(s)} className="text-[10px] uppercase">
            {s}
          </Badge>
        );
      },
    },
    {
      accessorKey: "ai_kind",
      header: "Kind",
      cell: ({ getValue }) => {
        const k = getValue<string>();
        if (!k) return <span className="text-xs text-muted-foreground">—</span>;
        const style = KIND_STYLES[k] ?? "border-slate-300 text-slate-600 bg-slate-50";
        return (
          <Badge variant="outline" className={`text-[10px] font-mono ${style}`}>
            {k.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ getValue }) => (
        <span className="text-sm max-w-[200px] block truncate">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "ai_model",
      header: "Model",
      cell: ({ getValue }) => {
        const m = getValue<string>();
        if (!m) return <span className="text-xs text-muted-foreground">—</span>;
        return <span className="text-xs font-mono">{m}</span>;
      },
    },
    {
      accessorKey: "ai_total_tokens",
      header: "Tokens",
      cell: ({ getValue }) => {
        const v = getValue<number>();
        if (!v) return <span className="text-xs text-muted-foreground">—</span>;
        return <span className="text-xs tabular-nums">{v.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: "ai_cost_usd",
      header: "Cost",
      cell: ({ getValue }) => {
        const v = getValue<number>();
        if (!v) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="text-xs tabular-nums">${v.toFixed(4)}</span>
        );
      },
    },
    {
      accessorKey: "ai_latency_ms",
      header: "Latency",
      cell: ({ getValue }) => {
        const v = getValue<number>();
        if (!v) return <span className="text-xs text-muted-foreground">—</span>;
        return <span className="text-xs tabular-nums">{Math.round(v)}ms</span>;
      },
    },
    {
      accessorKey: "trace_id",
      header: "Trace",
      cell: ({ getValue }) => {
        const tid = getValue<string>();
        if (!tid) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <Link
            href={`/ai/traces/${tid}`}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <GitBranch className="h-3 w-3" />
            <span className="font-mono">{tid.slice(0, 8)}…</span>
          </Link>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEvent(row.original);
          }}
          aria-label="View event details"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  const hasNextPage = (data?.length ?? 0) >= pagination.pageSize;
  const pageCount = pagination.pageIndex + (hasNextPage ? 2 : 1);

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: { pagination },
    onPaginationChange: (updater) => {
      setPagination((old) => {
        const next = typeof updater === "function" ? updater(old) : updater;
        return next.pageSize !== old.pageSize ? { ...next, pageIndex: 0 } : next;
      });
    },
  });

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <DateRangePicker />
          <Select
            value={kind}
            onValueChange={(v) => { setKind(v); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Kind" />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k === "all" ? "All kinds" : k.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Model (e.g. gpt-4o)…"
            value={model}
            onChange={(e) => { setModel(e.target.value); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
            className="w-44 h-9"
          />
          <Select
            value={severity}
            onValueChange={(v) => { setSeverity(v); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
          >
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All severities" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <DataTable
          table={table}
          onRowClick={(row) => setSelectedEvent(row)}
        />
      </div>

      <EventDetailSheet
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}
        traceBasePath="/ai/traces"
      />
    </>
  );
}
