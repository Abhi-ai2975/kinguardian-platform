"use client";

// EventTypeBreakdownChart — horizontal bar chart showing event-type distribution.
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OverviewStats } from "@/lib/clickhouse";

interface EventTypeBreakdownChartProps {
  stats: OverviewStats;
}

export function EventTypeBreakdownChart({ stats }: EventTypeBreakdownChartProps) {
  const chartData = [
    { name: "Logs",    count: stats.log_count },
    { name: "Audit",   count: stats.audit_count },
    { name: "Traces",  count: stats.trace_count },
    { name: "Metrics", count: stats.metric_count },
  ];

  const hasData = chartData.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">By event type</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)" }}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar dataKey="count" name="Events" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
