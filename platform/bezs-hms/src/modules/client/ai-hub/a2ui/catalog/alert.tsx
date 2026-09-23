"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { AlertNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import {
  Alert as ShadCNAlert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import {
  InfoIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";

interface AlertProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: AlertNode;
  weight?: string | number;
}

const iconMap: Record<string, React.ElementType> = {
  default: InfoIcon,
  info: InfoIcon,
  warning: AlertTriangleIcon,
  destructive: AlertCircleIcon,
  success: CheckCircleIcon,
};

export function Alert({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: AlertProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const title = useMemo(
    () => resolvePrimitive(component.properties.title),
    [resolvePrimitive, component.properties.title],
  );
  const description = useMemo(
    () => resolvePrimitive(component.properties.description),
    [resolvePrimitive, component.properties.description],
  );

  const variant = component.properties.variant || "default";
  const shadcnVariant =
    variant === "destructive" ? "destructive" : "default";
  const IconComponent = iconMap[variant] || InfoIcon;

  return (
    <ShadCNAlert variant={shadcnVariant} style={{ flex: weight }}>
      <IconComponent className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
    </ShadCNAlert>
  );
}
