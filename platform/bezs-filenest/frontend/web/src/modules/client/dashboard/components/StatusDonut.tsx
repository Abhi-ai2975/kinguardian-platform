/**
 * StatusDonut — file status distribution donut chart.
 *
 * Uses a Recharts PieChart with innerRadius to create a donut style.
 * Shows ready / processing / failed / quarantined counts with a legend.
 *
 * @module
 */
"use client";

import * as React from "react";
import { Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TStatusCount } from "@/modules/entities/schemas/dashboard";

const STATUS_COLORS: Record<string, string> = {
  ready: "var(--chart-1)",
  processing: "var(--chart-2)",
  failed: "var(--chart-3)",
  quarantined: "var(--chart-4)",
  pending: "var(--chart-5)",
};

function buildConfig(data: TStatusCount[]): ChartConfig {
  const config: ChartConfig = {};
  for (const item of data) {
    config[item.status] = {
      label: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      color: STATUS_COLORS[item.status] ?? "hsl(var(--muted-foreground))",
    };
  }
  return config;
}

interface StatusDonutProps {
  data: TStatusCount[];
}

export function StatusDonut({ data }: StatusDonutProps) {
  const chartConfig = React.useMemo(() => buildConfig(data), [data]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">File status</CardTitle>
          <CardDescription>Distribution by lifecycle status</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-52 text-sm text-muted-foreground">
          No files yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">File status</CardTitle>
        <CardDescription>Distribution by lifecycle status</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] ?? "hsl(var(--muted-foreground))"}
                />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="status" />}
              verticalAlign="bottom"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
