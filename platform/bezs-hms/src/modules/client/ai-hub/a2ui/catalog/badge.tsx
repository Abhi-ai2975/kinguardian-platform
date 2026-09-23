"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { BadgeNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Badge as ShadCNBadge } from "@/components/ui/badge";

interface BadgeProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: BadgeNode;
  weight?: string | number;
}

export function Badge({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: BadgeProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const text = useMemo(
    () => resolvePrimitive(component.properties.text),
    [resolvePrimitive, component.properties.text],
  );

  const variant = component.properties.variant || "default";

  return (
    <ShadCNBadge variant={variant} style={{ flex: weight }}>
      {text}
    </ShadCNBadge>
  );
}
