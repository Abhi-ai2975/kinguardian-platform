"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { SwitchNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Switch as ShadCNSwitch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SwitchProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: SwitchNode;
  weight?: string | number;
}

export function Switch({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: SwitchProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const initialValue = useMemo(
    () => Boolean(resolvePrimitive(component.properties.value)),
    [resolvePrimitive, component.properties.value],
  );
  const [checked, setChecked] = useState(initialValue);
  const label = useMemo(
    () => resolvePrimitive(component.properties.label),
    [resolvePrimitive, component.properties.label],
  );

  return (
    <div className="flex items-center space-x-2" style={{ flex: weight }}>
      <ShadCNSwitch
        id={component.id}
        checked={checked}
        onCheckedChange={setChecked}
      />
      {label && <Label htmlFor={component.id}>{label}</Label>}
    </div>
  );
}
