"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { SpinnerNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: SpinnerNode;
  weight?: string | number;
}

const sizeMap: Record<string, string> = {
  small: "h-4 w-4",
  medium: "h-8 w-8",
  large: "h-12 w-12",
};

export function Spinner({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: SpinnerProps) {
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
  const size = component.properties.size || "medium";

  return (
    <div
      className="flex items-center justify-center gap-2"
      style={{ flex: weight }}
    >
      <Loader2 className={`animate-spin text-muted-foreground ${sizeMap[size]}`} />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
