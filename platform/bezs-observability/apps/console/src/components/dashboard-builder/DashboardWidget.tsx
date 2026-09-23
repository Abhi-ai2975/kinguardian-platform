// DashboardWidget — renders the correct chart component for a given LayoutItem.
// Each widget type is its own sub-component so useQuery is always called
// unconditionally (React Rules of Hooks). The parent just selects which
// sub-component to mount based on widgetType.
"use client";

import { useQuery } from "@tanstack/react-query";
import type { LayoutItem } from "@/lib/dashboards-api";
import { resolveTimeRange, DEFAULT_RANGE } from "@/lib/time-range";
import { EventsTrendChart } from "@/components/dashboard/EventsTrendChart";
import { EventTypeBreakdownChart } from "@/components/dashboard/EventTypeBreakdownChart";
import { ErrorRateGauge } from "@/components/dashboard/ErrorRateGauge";
import { GlobalUsersMap } from "@/components/dashboard/GlobalUsersMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { formatDate, severityVariant } from "@/lib/utils";
import type { EventRow, HourlyBucket, OverviewStats, GeoCountBucket, AITokenBucket, AICostByModel, AILatencyByModel, AIWorkflowCost } from "@/lib/clickhouse";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, CartesianGrid,
} from "recharts";

// ── Shared types ────────────────────────────────────────────────────────────

interface WidgetProps {
  item: LayoutItem;
  orgId: string;
  from: string;
  to: string;
}

function WidgetSkeleton() {
  return (
    <div className="h-full w-full p-4 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function WidgetError({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function emptyStats(): OverviewStats {
  return {
    total_events: 0,
    error_count: 0,
    audit_count: 0,
    log_count: 0,
    trace_count: 0,
    metric_count: 0,
    unique_users: 0,
    unique_apps: 0,
  };
}

// ── Per-type sub-components (hooks always called unconditionally) ────────────

function AreaChartWidget({ item, orgId, from, to }: WidgetProps) {
  const { data, isPending, isError } = useQuery<HourlyBucket[]>({
    queryKey: ["widget-buckets", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview/buckets?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load chart data" />;
  return (
    <EventsTrendChart
      data={data ?? []}
      title={item.widgetConfig.title as string | undefined}
    />
  );
}

function BarChartWidget({ item, orgId, from, to }: WidgetProps) {
  const { data, isPending, isError } = useQuery<OverviewStats>({
    queryKey: ["widget-stats", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load chart data" />;
  return <EventTypeBreakdownChart stats={data ?? emptyStats()} />;
}

function GaugeWidget({ orgId, from, to }: WidgetProps) {
  const { data, isPending, isError } = useQuery<OverviewStats>({
    queryKey: ["widget-stats", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load gauge data" />;
  return <ErrorRateGauge stats={data ?? emptyStats()} />;
}

function StatCardWidget({ item, orgId, from, to }: WidgetProps) {
  const metric = (item.widgetConfig.metric as string | undefined) ?? "total_events";
  const title = (item.widgetConfig.title as string | undefined) ?? "Stat";

  const { data, isPending, isError } = useQuery<OverviewStats>({
    queryKey: ["widget-stats", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load stat" />;

  const stats = data ?? emptyStats();
  const value = stats[metric as keyof OverviewStats] ?? 0;

  return (
    <Card className="h-full border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{Number(value).toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function WorldMapWidget({ orgId, from, to }: WidgetProps) {
  const { data, isPending, isError } = useQuery<GeoCountBucket[]>({
    queryKey: ["widget-geo", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview/geo?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load map data" />;
  return <GlobalUsersMap data={data ?? []} />;
}

function LogFeedWidget({ item, orgId, from, to }: WidgetProps) {
  const eventType = (item.widgetConfig.eventType as string | undefined) ?? "log";
  const title = (item.widgetConfig.title as string | undefined) ?? "Recent events";

  const { data, isPending, isError } = useQuery<EventRow[]>({
    queryKey: ["widget-log-feed", orgId, eventType, from, to],
    queryFn: async () => {
      const apiPath =
        eventType === "audit"
          ? "/api/events/audit"
          : eventType === "trace"
            ? "/api/events/traces"
            : "/api/events/logs";
      const p = new URLSearchParams({ from, to, limit: "10" });
      const r = await fetch(`${apiPath}?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 15_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load events" />;

  const rows = data ?? [];

  return (
    <Card className="h-full overflow-hidden border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto" style={{ maxHeight: "calc(100% - 56px)" }}>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No events</p>
        ) : (
          <div className="divide-y">
            {rows.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 px-4 py-2">
                <Badge
                  variant={severityVariant(ev.severity)}
                  className="text-[10px] uppercase shrink-0 mt-0.5"
                >
                  {ev.severity}
                </Badge>
                <div className="min-w-0">
                  <p className="text-xs truncate">{ev.message}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(ev.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── AI widget sub-components ─────────────────────────────────────────────────

function AITokenUsageWidget({ item, orgId, from, to }: WidgetProps) {
  const title = (item.widgetConfig.title as string | undefined) ?? "AI Token Usage";
  const { data, isPending, isError } = useQuery<AITokenBucket[]>({
    queryKey: ["widget-ai-tokens", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to, metric: "tokens-over-time" });
      const r = await fetch(`/api/events/ai/stats?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError)   return <WidgetError message="Failed to load token usage" />;

  // Aggregate across models per bucket for a simple area chart.
  const byBucket = (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] ?? 0) + Number(row.total_tokens);
    return acc;
  }, {});
  const chartData = Object.entries(byBucket).map(([bucket, total_tokens]) => ({
    bucket: bucket.slice(11, 16) || bucket.slice(5, 10),
    total_tokens,
  }));

  return (
    <Card className="h-full border-0 shadow-none">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent className="h-[calc(100%-56px)] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [Number(v ?? 0).toLocaleString(), "Tokens"]} />
            <Area type="monotone" dataKey="total_tokens" stroke="#a855f7" fill="#a855f720" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function AICostByModelWidget({ item, orgId, from, to }: WidgetProps) {
  const title = (item.widgetConfig.title as string | undefined) ?? "Cost by Model";
  const { data, isPending, isError } = useQuery<AICostByModel[]>({
    queryKey: ["widget-ai-cost", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to, metric: "cost-by-model" });
      const r = await fetch(`/api/events/ai/stats?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError)   return <WidgetError message="Failed to load cost data" />;

  const chartData = (data ?? []).map((row) => ({
    model: row.model || "unknown",
    cost: Number(row.total_cost_usd).toFixed(4),
  }));

  return (
    <Card className="h-full border-0 shadow-none">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent className="h-[calc(100%-56px)] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={80} />
            <Tooltip formatter={(v) => [`$${v ?? 0}`, "Cost"]} />
            <Bar dataKey="cost" fill="#a855f7" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function AILatencyWidget({ item, orgId, from, to }: WidgetProps) {
  const title = (item.widgetConfig.title as string | undefined) ?? "AI Latency Percentiles";
  const { data, isPending, isError } = useQuery<AILatencyByModel[]>({
    queryKey: ["widget-ai-latency", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to, metric: "latency-by-model" });
      const r = await fetch(`/api/events/ai/stats?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError)   return <WidgetError message="Failed to load latency data" />;

  const chartData = (data ?? []).map((row) => ({
    model: row.model || "unknown",
    p50: Math.round(Number(row.p50)),
    p95: Math.round(Number(row.p95)),
    p99: Math.round(Number(row.p99)),
  }));

  return (
    <Card className="h-full border-0 shadow-none">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent className="h-[calc(100%-56px)] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="model" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}ms`} />
            <Tooltip formatter={(v) => [`${Number(v ?? 0)}ms`]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="p50" fill="#a855f7" name="p50" radius={[2,2,0,0]} />
            <Bar dataKey="p95" fill="#7c3aed" name="p95" radius={[2,2,0,0]} />
            <Bar dataKey="p99" fill="#4c1d95" name="p99" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function AIWorkflowCostWidget({ item, orgId, from, to }: WidgetProps) {
  const title = (item.widgetConfig.title as string | undefined) ?? "Top Workflows by Cost";
  const { data, isPending, isError } = useQuery<AIWorkflowCost[]>({
    queryKey: ["widget-ai-workflow-cost", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to, metric: "workflow-cost" });
      const r = await fetch(`/api/events/ai/stats?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError)   return <WidgetError message="Failed to load workflow data" />;

  const rows = data ?? [];

  return (
    <Card className="h-full overflow-hidden border-0 shadow-none">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-auto" style={{ maxHeight: "calc(100% - 56px)" }}>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No workflow data</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Workflow</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Cost</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Runs</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">p95</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono truncate max-w-[140px]">{row.workflow_name || "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">${Number(row.total_cost_usd).toFixed(4)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.runs}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{Math.round(Number(row.p95_ms))}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

interface DashboardWidgetProps {
  item: LayoutItem;
  orgId: string;
  range?: string;
}

export function DashboardWidget({ item, orgId, range = DEFAULT_RANGE }: DashboardWidgetProps) {
  const { from, to } = resolveTimeRange(range);
  const props: WidgetProps = { item, orgId, from, to };

  switch (item.widgetType) {
    case "area-chart":  return <AreaChartWidget {...props} />;
    case "bar-chart":   return <BarChartWidget {...props} />;
    case "gauge":       return <GaugeWidget {...props} />;
    case "stat-card":   return <StatCardWidget {...props} />;
    case "world-map":   return <WorldMapWidget {...props} />;
    case "log-feed":               return <LogFeedWidget {...props} />;
    case "ai-token-usage":         return <AITokenUsageWidget {...props} />;
    case "ai-cost-by-model":       return <AICostByModelWidget {...props} />;
    case "ai-latency-percentiles": return <AILatencyWidget {...props} />;
    case "ai-workflow-cost":       return <AIWorkflowCostWidget {...props} />;
    default:                       return null;
  }
}
