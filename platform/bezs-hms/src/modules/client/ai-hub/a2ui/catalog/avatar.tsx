"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { AvatarNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import {
  Avatar as ShadCNAvatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

interface AvatarProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: AvatarNode;
  weight?: string | number;
}

export function Avatar({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: AvatarProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const url = useMemo(
    () => resolvePrimitive(component.properties.url),
    [resolvePrimitive, component.properties.url],
  );
  const fallback = useMemo(
    () => resolvePrimitive(component.properties.fallback) || "?",
    [resolvePrimitive, component.properties.fallback],
  );
  const altText = useMemo(
    () => resolvePrimitive(component.properties.altText) || "Avatar",
    [resolvePrimitive, component.properties.altText],
  );
  const size = component.properties.size || "default";

  return (
    <ShadCNAvatar size={size} style={{ flex: weight }}>
      {url && <AvatarImage src={url} alt={altText} />}
      <AvatarFallback>{fallback}</AvatarFallback>
    </ShadCNAvatar>
  );
}
