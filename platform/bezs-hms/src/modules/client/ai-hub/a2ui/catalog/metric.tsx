"use client";

import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { MetricNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { cn } from "@/lib/utils";

interface Props {
  processor: IMessageProcessor;
  surfaceId: string;
  component: MetricNode;
  weight?: string | number;
}

const TREND_STYLES = {
  up: { text: "text-emerald-600", icon: "↑" },
  down: { text: "text-red-500", icon: "↓" },
  neutral: { text: "text-muted-foreground", icon: "→" },
} as const;

export function Metric({ processor, surfaceId, component, weight = "initial" }: Props) {
  useDynamicComponent(processor, surfaceId, component, weight);
  const { label, value, trend, trendValue } = component.properties;
  const trendStyle = trend ? TREND_STYLES[trend] : null;

  return (
    <div
      className={cn("flex flex-col gap-1", component.className)}
      style={{ flex: weight }}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </span>
        {trendStyle && trendValue && (
          <span className={cn("text-xs font-medium", trendStyle.text)}>
            {trendStyle.icon} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
