"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { LinkNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface LinkProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: LinkNode;
  weight?: string | number;
}

export function Link({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: LinkProps) {
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
  const url = useMemo(
    () => resolvePrimitive(component.properties.url) || "#",
    [resolvePrimitive, component.properties.url],
  );
  const external = component.properties.external ?? false;

  return (
    <Button variant="link" asChild style={{ flex: weight }} className="p-0 h-auto">
      <a
        href={url}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="inline-flex items-center gap-1"
      >
        {text}
        {external && <ExternalLink className="h-3 w-3" />}
      </a>
    </Button>
  );
}
