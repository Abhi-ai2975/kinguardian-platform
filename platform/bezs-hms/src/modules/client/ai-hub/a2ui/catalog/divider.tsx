import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { DividerNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Separator } from "@/components/ui/separator";

interface DividerProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: DividerNode;
  weight?: string | number;
}

export function Divider({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: DividerProps) {
  const { theme } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );
  const axis = component.properties.axis || "horizontal";

  const orientation = useMemo(
    () => (axis === "horizontal" ? "horizontal" : "vertical"),
    [axis],
  );

  return <Separator orientation={orientation} style={{ flex: weight }} />;
}
