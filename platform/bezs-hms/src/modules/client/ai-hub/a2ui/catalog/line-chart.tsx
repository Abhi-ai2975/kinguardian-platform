"use client";

import { useRef, useState } from "react";
import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportDialog } from "../components/export-dialog";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { LineChartNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

const PALETTE = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#6366f1", "#ef4444", "#14b8a6",
];

interface Props {
  processor: IMessageProcessor;
  surfaceId: string;
  component: LineChartNode;
  weight?: string | number;
}

export function LineChart({ processor, surfaceId, component, weight = "initial" }: Props) {
  const { resolvePrimitive } = useDynamicComponent(processor, surfaceId, component, weight);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const data = resolvePrimitive(component.properties.data) ?? [];
  const series = resolvePrimitive(component.properties.series) ?? [];
  const xKey = component.properties.xKey ?? "label";
  const height = component.properties.height ?? 260;
  const showGrid = component.properties.showGrid ?? true;
  const showLegend = component.properties.showLegend ?? false;
  const exportable = component.properties.exportable !== false;

  const chartConfig: ChartConfig = Object.fromEntries(
    series.map((s: any, i: number) => [
      s.key,
      { label: s.name ?? s.key, color: s.color ?? PALETTE[i % PALETTE.length] },
    ]),
  );

  return (
    <div
      className={cn("relative group", component.className)}
      style={{ flex: weight }}
      ref={containerRef}
    >
      {exportable && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 z-10 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-3 w-3" />
        </Button>
      )}

      <div style={{ width: "100%", height }}>
        <ChartContainer config={chartConfig} className="h-full w-full !aspect-auto">
          <RechartsLine data={data}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            )}
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {series.map((s: any, i: number) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </RechartsLine>
        </ChartContainer>
      </div>

      {exportable && (
        <ExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          mode="chart"
          options={{ containerRef, title: component.properties.title }}
        />
      )}
    </div>
  );
}
