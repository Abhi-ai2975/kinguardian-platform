/**
 * Column catalog component.
 *
 * Layer: client / ai-hub / a2ui / catalog
 *
 * Lays out its children vertically (flex-col). Inherently responsive.
 *
 * Supports a classNames slot object for per-instance class overrides:
 *   classNames.root  — the outer flex container
 *   classNames.item  — every direct child wrapper div
 */

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { ColumnNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Renderer } from "../rendering/renderer";
import { cn } from "@/lib/utils";

interface ColumnProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: ColumnNode;
  weight?: string | number;
}

export function Column({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: ColumnProps) {
  const { theme } = useDynamicComponent(processor, surfaceId, component, weight);

  const alignment = component.properties?.alignment || "stretch";
  const distribution = component.properties?.distribution || "start";
  const gap = component.properties?.gap || "medium";
  const classNames = component.properties?.classNames;

  const styles = useMemo(() => {
    const alignMap: Record<string, string> = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    };

    const distributeMap: Record<string, string> = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      spaceBetween: "justify-between",
      spaceAround: "justify-around",
      spaceEvenly: "justify-evenly",
    };

    const gapMap: Record<string, string> = {
      none: "gap-0",
      small: "gap-2",
      medium: "gap-4",
      large: "gap-8",
    };

    return `${alignMap[alignment]} ${distributeMap[distribution]} ${gapMap[gap] ?? "gap-4"}`;
  }, [alignment, distribution, gap]);

  return (
    <div
      className={cn("flex min-h-full w-full flex-col", styles, classNames?.root)}
      style={{ flex: weight }}
    >
      {component.properties.children?.map((child) =>
        classNames?.item ? (
          <div key={child.id} className={classNames.item} style={{ flex: child.weight || "initial" }}>
            <Renderer
              processor={processor}
              surfaceId={surfaceId}
              component={child}
            />
          </div>
        ) : (
          <Renderer
            key={child.id}
            processor={processor}
            surfaceId={surfaceId}
            component={child}
            weight={child.weight || "initial"}
          />
        )
      )}
    </div>
  );
}
