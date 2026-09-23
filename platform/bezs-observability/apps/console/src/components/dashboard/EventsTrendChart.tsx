"use client";

// EventsTrendChart — area chart showing total events vs errors over 24 hours.
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HourlyBucket } from "@/lib/clickhouse";

interface EventsTrendChartProps {
  data: HourlyBucket[];
  title?: string;
}

// formatBucketLabel converts a ClickHouse bucket string to a short axis label.
// Hourly format "2026-05-30 14:00:00" → "14:00"
// Daily  format "2026-05-30"          → "5/30"
function formatBucketLabel(v: string): string {
  if (v.includes(" ")) return v.slice(11, 16); // HH:00
  const d = new Date(v + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function EventsTrendChart({ data, title = "Events over time" }: EventsTrendChartProps) {
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.hour.localeCompare(b.hour))
        .map((b) => ({ hour: b.hour, events: b.count, errors: b.error_count })),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errorsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={formatBucketLabel} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)" }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="events" name="Events" stroke="var(--chart-1)" fill="url(#eventsGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="errors" name="Errors" stroke="var(--chart-5)" fill="url(#errorsGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
