"use client";

import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { DashboardCardNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Renderer } from "../rendering/renderer";
import { cn } from "@/lib/utils";

interface Props {
  processor: IMessageProcessor;
  surfaceId: string;
  component: DashboardCardNode;
  weight?: string | number;
}

export function DashboardCard({ processor, surfaceId, component, weight = "initial" }: Props) {
  useDynamicComponent(processor, surfaceId, component, weight);
  const { title, subtitle, child, classNames } = component.properties;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm",
        component.className,
        classNames?.root,
      )}
      style={{ flex: weight }}
    >
      <div className={cn("flex flex-col gap-0.5", classNames?.header)}>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {child && (
        <div className={classNames?.body}>
          <Renderer processor={processor} surfaceId={surfaceId} component={child} />
        </div>
      )}
    </div>
  );
}
