"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { CheckboxNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Checkbox as ShadCNCheckbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: CheckboxNode;
  weight?: string | number;
}

export function Checkbox({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: CheckboxProps) {
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

  const handleChange = (checked: boolean) => {
    setChecked(checked);
  };

  return (
    <div className="flex items-center space-x-2" style={{ flex: weight }}>
      <ShadCNCheckbox
        id={component.id}
        checked={checked}
        onCheckedChange={handleChange}
      />
      {label && <Label htmlFor={component.id}>{label}</Label>}
    </div>
  );
}
