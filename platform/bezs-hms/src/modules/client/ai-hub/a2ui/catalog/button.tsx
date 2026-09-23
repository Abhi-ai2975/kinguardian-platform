import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { ButtonNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Renderer } from "../rendering/renderer";
import { Button as ShadCNButton } from "@/components/ui/button";

interface ButtonProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: ButtonNode;
  weight?: string | number;
}

export function Button({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: ButtonProps) {
  const { sendAction } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const handleClick = async () => {
    if (component.properties.action) {
      await sendAction(component.properties.action);
    }
  };

  const variant = component.properties?.primary ? "default" : "secondary";

  return (
    <ShadCNButton
      variant={variant}
      onClick={handleClick}
      className="flex items-center justify-center"
      style={{ flex: weight }}
    >
      {component.properties.child && (
        <Renderer
          processor={processor}
          surfaceId={surfaceId}
          component={component.properties.child}
        />
      )}
    </ShadCNButton>
  );
}
