"use client";

import { DEFAULT_CATALOG } from "./catalog";
import type { AnyComponentNode } from "../types";
import type { IMessageProcessor } from "./processor";

interface RendererProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: AnyComponentNode;
  weight?: string | number;
}

export function Renderer({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: RendererProps) {
  const config = DEFAULT_CATALOG[component.type];

  if (!config) {
    console.warn(`Unknown component type: ${component.type}`);
    return null;
  }

  const Component = config.component;

  return (
    <Component
      processor={processor}
      surfaceId={surfaceId}
      component={component}
      weight={weight}
    />
  );
}
