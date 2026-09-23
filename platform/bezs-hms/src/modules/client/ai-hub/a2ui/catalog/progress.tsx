"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { ProgressNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Progress as ShadCNProgress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

interface ProgressProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: ProgressNode;
  weight?: string | number;
}

export function Progress({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: ProgressProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const value = useMemo(
    () => Number(resolvePrimitive(component.properties.value)) || 0,
    [resolvePrimitive, component.properties.value],
  );
  const max = useMemo(
    () => Number(resolvePrimitive(component.properties.max)) || 100,
    [resolvePrimitive, component.properties.max],
  );
  const label = useMemo(
    () => resolvePrimitive(component.properties.label),
    [resolvePrimitive, component.properties.label],
  );

  const percentage = Math.round((value / max) * 100);

  return (
    <div className="space-y-2 w-full" style={{ flex: weight }}>
      {label && (
        <div className="flex justify-between items-center">
          <Label>{label}</Label>
          <span className="text-sm text-muted-foreground">{percentage}%</span>
        </div>
      )}
      <ShadCNProgress value={percentage} />
    </div>
  );
}
