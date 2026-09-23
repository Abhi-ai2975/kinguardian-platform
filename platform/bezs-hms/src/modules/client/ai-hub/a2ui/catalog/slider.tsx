"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { SliderNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Slider as ShadCNSlider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface SliderProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: SliderNode;
  weight?: string | number;
}

export function Slider({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: SliderProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const initialValue = useMemo(
    () => Number(resolvePrimitive(component.properties.value)) || 0,
    [resolvePrimitive, component.properties.value],
  );
  const [value, setValue] = useState(initialValue);
  const label = useMemo(
    () => resolvePrimitive(component.properties.label),
    [resolvePrimitive, component.properties.label],
  );
  const min = useMemo(
    () =>
      Number(resolvePrimitive(component.properties.min)) ||
      component.properties.minValue ||
      0,
    [resolvePrimitive, component.properties.min, component.properties.minValue],
  );
  const max = useMemo(
    () =>
      Number(resolvePrimitive(component.properties.max)) ||
      component.properties.maxValue ||
      100,
    [resolvePrimitive, component.properties.max, component.properties.maxValue],
  );
  const step = useMemo(
    () => Number(resolvePrimitive(component.properties.step)) || 1,
    [resolvePrimitive, component.properties.step],
  );

  const handleChange = (value: number[]) => {
    setValue(value[0]);
  };

  return (
    <div className="space-y-2" style={{ flex: weight }}>
      {label && (
        <Label>
          {label}: {value}
        </Label>
      )}
      <ShadCNSlider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleChange}
      />
    </div>
  );
}
