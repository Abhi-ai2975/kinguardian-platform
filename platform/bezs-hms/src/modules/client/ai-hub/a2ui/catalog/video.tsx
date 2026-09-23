import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { VideoNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

interface VideoProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: VideoNode;
  weight?: string | number;
}

export function Video({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: VideoProps) {
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

  if (!url) {
    return null;
  }

  return (
    <video
      src={url}
      controls
      className="w-full h-auto"
      style={{ flex: weight }}
    />
  );
}
