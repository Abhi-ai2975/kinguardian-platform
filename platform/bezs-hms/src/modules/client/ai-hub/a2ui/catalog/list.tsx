import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { ListNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Renderer } from "../rendering/renderer";

interface ListProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: ListNode;
  weight?: string | number;
}

export function List({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: ListProps) {
  const { theme } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const direction = component.properties.direction || "vertical";

  const containerClass =
    direction === "horizontal" ? "flex flex-row" : "flex flex-col";

  return (
    <div className={`${containerClass} gap-2`} style={{ flex: weight }}>
      {component.properties.children?.map((child) => (
        <Renderer
          key={child.id}
          processor={processor}
          surfaceId={surfaceId}
          component={child}
          weight={child.weight || "initial"}
        />
      ))}
    </div>
  );
}
