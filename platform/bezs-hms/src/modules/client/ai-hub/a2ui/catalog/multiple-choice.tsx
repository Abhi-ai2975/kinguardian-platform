"use client";

import { useState, useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { MultipleChoiceNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface MultipleChoiceProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: MultipleChoiceNode;
  weight?: string | number;
}

export function MultipleChoice({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: MultipleChoiceProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const options =
    component.properties.options || component.properties.items || [];
  const initialValue = useMemo(
    () =>
      resolvePrimitive(component.properties.value) ||
      resolvePrimitive(component.properties.selections) ||
      "",
    [
      resolvePrimitive,
      component.properties.value,
      component.properties.selections,
    ],
  );
  const [selectedValue, setSelectedValue] = useState(initialValue);

  const label = useMemo(
    () => resolvePrimitive(component.properties.label),
    [resolvePrimitive, component.properties.label],
  );

  const placeholder = useMemo(
    () => resolvePrimitive(component.properties.placeholder) || "Select an option",
    [resolvePrimitive, component.properties.placeholder],
  );

  const handleChange = (value: string) => {
    setSelectedValue(value);
  };

  return (
    <div className="space-y-2" style={{ flex: weight }}>
      {label && <Label>{label}</Label>}
      <Select value={selectedValue} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder ?? "Select an option"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => {
            const optionLabel = resolvePrimitive(option.label);
            const value = option.value;
            return (
              <SelectItem key={index} value={value}>
                {optionLabel}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <input id={component.id} type="hidden" value={selectedValue} />
    </div>
  );
}

