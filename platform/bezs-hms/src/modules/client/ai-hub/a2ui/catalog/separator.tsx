"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { SeparatorNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Separator as ShadCNSeparator } from "@/components/ui/separator";

interface SeparatorProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: SeparatorNode;
  weight?: string | number;
}

export function Separator({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: SeparatorProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const label = useMemo(
    () => resolvePrimitive(component.properties.label),
    [resolvePrimitive, component.properties.label],
  );
  const orientation = component.properties.orientation || "horizontal";

  if (label) {
    return (
      <div
        className={`flex items-center gap-3 ${orientation === "vertical" ? "flex-col" : "flex-row"}`}
        style={{ flex: weight }}
      >
        <ShadCNSeparator
          orientation={orientation}
          className={orientation === "horizontal" ? "flex-1" : "flex-1"}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {label}
        </span>
        <ShadCNSeparator
          orientation={orientation}
          className={orientation === "horizontal" ? "flex-1" : "flex-1"}
        />
      </div>
    );
  }

  return (
    <ShadCNSeparator orientation={orientation} style={{ flex: weight }} />
  );
}
