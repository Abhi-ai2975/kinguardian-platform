/**
 * UploadsChart — daily file upload count bar chart (last 30 days).
 *
 * Uses the shadcn/ui ChartContainer wrapper around a Recharts BarChart.
 * Missing days (no uploads) are filled with 0 so the X axis always shows
 * a complete 30-day timeline.
 *
 * @module
 */
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TUploadsByDay } from "@/modules/entities/schemas/dashboard";

const chartConfig = {
  count: {
    label: "Uploads",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function fillDays(data: TUploadsByDay[]): Array<{ date: string; count: number; label: string }> {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    result.push({ date: key, count: map.get(key) ?? 0, label });
  }
  return result;
}

interface UploadsChartProps {
  data: TUploadsByDay[];
}

export function UploadsChart({ data }: UploadsChartProps) {
  const chartData = React.useMemo(() => fillDays(data), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Uploads</CardTitle>
        <CardDescription>Files uploaded per day — last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval={6}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel={false} labelKey="label" />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
