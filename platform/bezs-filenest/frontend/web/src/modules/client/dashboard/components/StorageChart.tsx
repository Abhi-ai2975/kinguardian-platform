/**
 * StorageChart — cumulative storage growth area chart (last 30 days).
 *
 * Uses the shadcn/ui ChartContainer wrapper around a Recharts AreaChart.
 * The backend pre-computes the running byte total per day so each data point
 * is already the cumulative sum — no client-side accumulation needed.
 *
 * @module
 */
"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TStorageByDay } from "@/modules/entities/schemas/dashboard";

const chartConfig = {
  bytes: {
    label: "Storage",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function formatBytesShort(bytes: number): string {
  if (bytes === 0) return "0";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fillDays(data: TStorageByDay[]): Array<{ date: string; bytes: number; label: string }> {
  const map = new Map(data.map((d) => [d.date, d.bytes]));
  const result = [];
  let lastKnown = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (map.has(key)) lastKnown = map.get(key)!;
    result.push({ date: key, bytes: lastKnown, label });
  }
  return result;
}

interface StorageChartProps {
  data: TStorageByDay[];
}

export function StorageChart({ data }: StorageChartProps) {
  const chartData = React.useMemo(() => fillDays(data), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Storage growth</CardTitle>
        <CardDescription>Cumulative storage used — last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-bytes)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-bytes)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={formatBytesShort}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel={false}
                  labelKey="label"
                  formatter={(value) =>
                    typeof value === "number" ? formatBytesShort(value) : String(value)
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="bytes"
              stroke="var(--color-bytes)"
              strokeWidth={2}
              fill="url(#storageGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
