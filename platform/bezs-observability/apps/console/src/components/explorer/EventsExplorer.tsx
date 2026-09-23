// EventsExplorer — client-side filterable table used by all explorer pages.
// Clicking any row opens EventDetailSheet with the full event payload.
// For trace events that carry a trace_id the sheet offers a "View full trace" link.
"use client";

import { useState } from "react";
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
import type { EventRow } from "@/lib/clickhouse";
import { Eye, RefreshCw, Search } from "lucide-react";

const SEVERITY_OPTIONS = [
  "all",
  "debug",
  "info",
  "warn",
  "error",
  "critical",
] as const;

const SOURCE_OPTIONS = ["all", "client", "server"] as const;

interface EventsExplorerProps {
  orgId: string;
  eventType: string;
  searchParams: Record<string, string>;
  apiPath: string;
  appId?: string | null;
}

const PRESET_KEYS = ["15m", "1h", "4h", "24h", "7d", "30d"] as TimeRangeKey[];

export function EventsExplorer({
  orgId,
  eventType,
  apiPath,
  appId,
}: EventsExplorerProps) {
  const [search, setSearch]               = useState("");
  const [severity, setSeverity]           = useState("all");
  const [source, setSource]               = useState("all");
  const [serviceName, setServiceName]     = useState("");
  const [pagination, setPagination]       = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

  // Range is shared with the overview page via URL so navigating back preserves it.
  const [range] = useQueryState(
    "range",
    parseAsStringLiteral(PRESET_KEYS).withDefault(DEFAULT_RANGE),
  );
  const { from, to } = resolveTimeRange(range);

  const { data, isFetching, refetch } = useQuery<EventRow[]>({
    queryKey: [apiPath, orgId, eventType, appId, search, severity, source, serviceName, pagination, range],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId,
        limit: String(pagination.pageSize),
        offset: String(pagination.pageIndex * pagination.pageSize),
        from,
        to,
      });
      if (appId) params.set("appId", appId);
      if (search) params.set("search", search);
      if (severity !== "all") params.set("severity", severity);
      if (source !== "all") params.set("source", source);
      if (serviceName) params.set("serviceName", serviceName);
      const res = await fetch(`${apiPath}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  // Columns are defined inside the component so the actions cell can close
  // over setSelectedEvent without prop drilling through ColumnDef.
  const columns: ColumnDef<EventRow, unknown>[] = [
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
      header: "Severity",
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
      accessorKey: "message",
      header: "Message",
      cell: ({ getValue }) => (
        <span className="text-sm max-w-xs block truncate">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ getValue }) => {
        const s = getValue<string>();
        if (!s) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <Badge
            variant="outline"
            className={`text-[10px] uppercase ${
              s === "client"
                ? "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950/30"
                : "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-900/30"
            }`}
          >
            {s}
          </Badge>
        );
      },
    },
    {
      accessorKey: "service_name",
      header: "Service",
      cell: ({ getValue }) => {
        const s = getValue<string>();
        if (!s) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <Badge variant="outline" className="text-[10px] font-mono">
            {s}
          </Badge>
        );
      },
    },
    {
      accessorKey: "application_id",
      header: "App",
      cell: ({ getValue }) => (
        <span className="text-xs font-mono text-muted-foreground">
          {getValue<string>() || "—"}
        </span>
      ),
    },
    {
      accessorKey: "environment",
      header: "Env",
      cell: ({ getValue }) => (
        <span className="text-xs">{getValue<string>() || "—"}</span>
      ),
    },
    {
      accessorKey: "user_id",
      header: "User",
      cell: ({ getValue }) => {
        const uid = getValue<string>();
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {uid ? uid.slice(0, 8) + "…" : "—"}
          </span>
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
        // Reset to page 0 whenever page size changes.
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
          <div className="flex-1 min-w-48 space-y-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder='Search… or use severity:error service:api "exact phrase"'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                className="pl-8 h-9 font-mono text-sm"
              />
            </div>
            {search && (
              <p className="text-[11px] text-muted-foreground px-1">
                Tip: <code className="bg-muted rounded px-1">severity:error</code>{" "}
                <code className="bg-muted rounded px-1">service:api*</code>{" "}
                <code className="bg-muted rounded px-1">env:production</code>{" "}
                <code className="bg-muted rounded px-1">user:uid123</code>{" "}
                <code className="bg-muted rounded px-1">"exact phrase"</code>
              </p>
            )}
          </div>
          <Select
            value={severity}
            onValueChange={(v) => {
              setSeverity(v);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
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
          <Select
            value={source}
            onValueChange={(v) => {
              setSource(v);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All sources" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Service name…"
            value={serviceName}
            onChange={(e) => {
              setServiceName(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            className="w-40 h-9"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Table — onRowClick wires up full-row click; Eye button is the visible affordance */}
        <DataTable
          table={table}
          onRowClick={(row) => setSelectedEvent(row)}
        />
      </div>

      {/* Detail sheet — rendered outside the table div to avoid stacking context issues */}
      <EventDetailSheet
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      />
    </>
  );
}
