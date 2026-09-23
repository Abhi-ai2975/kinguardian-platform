import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { IconNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import DynamicLucideIcon from "@/modules/client/shared/components/DynamicLucideIcon";

interface IconProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: IconNode;
  weight?: string | number;
}

export function Icon({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: IconProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );
  console.log(component);

  const name = useMemo(
    () => resolvePrimitive(component.properties.name),
    [resolvePrimitive, component.properties.name],
  );

  const size = component.properties.size || "medium";

  console.log(size);

  const sizeClass = useMemo(() => {
    switch (size) {
      case "small":
        return "w-4 h-4";
      case "medium":
        return "w-6 h-6";
      case "large":
        return "w-8 h-8";
      default:
        return "w-6 h-6";
    }
  }, [size]);

  if (!name) {
    return null;
  }

  // For simplicity, we'll use emoji as fallback for missing icons
  const iconMap: Record<string, string> = {
    flight: "✈️",
    check_circle: "✅",
    check: "✓",
    close: "✕",
    menu: "☰",
    search: "🔍",
    home: "🏠",
    settings: "⚙️",
    person: "👤",
    email: "📧",
    phone: "📱",
    map: "🗺️",
  };

  return (
    <span
      className={`${sizeClass} text-muted-foreground`}
      style={{ flex: weight }}
    >
      {name ? (
        <DynamicLucideIcon name={name} className="w-full h-full" />
      ) : (
        iconMap[name] || "❓"
      )}
    </span>
  );
}
