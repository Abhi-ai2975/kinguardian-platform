"use client";

import { useRef, useState } from "react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
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
import type { PieChartNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

const PALETTE = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#6366f1", "#ef4444", "#14b8a6",
];

interface Props {
  processor: IMessageProcessor;
  surfaceId: string;
  component: PieChartNode;
  weight?: string | number;
}

export function PieChart({ processor, surfaceId, component, weight = "initial" }: Props) {
  const { resolvePrimitive } = useDynamicComponent(processor, surfaceId, component, weight);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const data: Array<{ label: string; value: number; color?: string }> =
    resolvePrimitive(component.properties.data) ?? [];
  const innerRadius = component.properties.innerRadius ?? 0;
  const height = component.properties.height ?? 260;
  const showLegend = component.properties.showLegend ?? true;
  const exportable = component.properties.exportable !== false;

  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.label,
      { label: d.label, color: d.color ?? PALETTE[i % PALETTE.length] },
    ]),
  );

  // Recharts Pie uses "name" + "value" keys by default
  const pieData = data.map((d) => ({ name: d.label, value: d.value, fill: d.color }));

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
          <RechartsPie>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="70%"
              paddingAngle={2}
            >
              {pieData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.fill ?? PALETTE[i % PALETTE.length]}
                />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            {showLegend && <ChartLegend content={<ChartLegendContent nameKey="name" />} />}
          </RechartsPie>
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
