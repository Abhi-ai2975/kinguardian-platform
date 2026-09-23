"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { RadioGroupNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import {
  RadioGroup as ShadCNRadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface RadioGroupProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: RadioGroupNode;
  weight?: string | number;
}

export function RadioGroup({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: RadioGroupProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const items = component.properties.items || [];
  const initialValue = useMemo(
    () => resolvePrimitive(component.properties.value) || "",
    [resolvePrimitive, component.properties.value],
  );
  const [value, setValue] = useState(initialValue);
  const label = useMemo(
    () => resolvePrimitive(component.properties.label),
    [resolvePrimitive, component.properties.label],
  );
  const direction = component.properties.direction || "vertical";

  return (
    <div className="space-y-2" style={{ flex: weight }}>
      {label && <Label>{label}</Label>}
      <ShadCNRadioGroup
        value={value}
        onValueChange={setValue}
        className={direction === "horizontal" ? "flex flex-row gap-4" : ""}
      >
        {items.map((item, index) => {
          const itemLabel = resolvePrimitive(item.label);
          const itemId = `${component.id}-${item.value}`;
          return (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={item.value} id={itemId} />
              <Label htmlFor={itemId}>{itemLabel}</Label>
            </div>
          );
        })}
      </ShadCNRadioGroup>
    </div>
  );
}
