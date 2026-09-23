"use client";

import { useRef, useMemo, useCallback } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { FormNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Renderer } from "../rendering/renderer";
import { Button as ShadCNButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: FormNode;
  weight?: string | number;
}

export function Form({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: FormProps) {
  const { resolvePrimitive, sendAction } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const formRef = useRef<HTMLFormElement>(null);

  const submitLabel = useMemo(
    () => resolvePrimitive(component.properties.submitLabel) || "Submit",
    [resolvePrimitive, component.properties.submitLabel],
  );

  const alignment = component.properties?.alignment || "stretch";
  const gap = component.properties?.gap || "medium";
  const classNames = component.properties?.classNames;

  const styles = useMemo(() => {
    const alignMap: Record<string, string> = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    };

    const gapMap: Record<string, string> = {
      none: "gap-0",
      small: "gap-2",
      medium: "gap-4",
      large: "gap-8",
    };

    return `${alignMap[alignment]} ${gapMap[gap]}`;
  }, [alignment, gap]);

  const collectFormData = useCallback((): Record<string, unknown> => {
    const formData: Record<string, unknown> = {};
    if (!formRef.current) return formData;

    // Collect all input/textarea/select values
    const inputs = formRef.current.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select");

    inputs.forEach((el) => {
      const id = el.id;
      if (!id) return;

      if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox") {
          formData[id] = el.checked;
        } else if (el.type === "number" || el.type === "range") {
          formData[id] = el.valueAsNumber;
        } else if (el.type === "hidden" && el.dataset.json === "true") {
          try {
            formData[id] = JSON.parse(el.value);
          } catch {
            formData[id] = el.value;
          }
        } else {
          formData[id] = el.value;
        }
      } else {
        formData[id] = el.value;
      }
    });

    // Collect checkbox components (shadcn uses button[role=checkbox])
    const checkboxes = formRef.current.querySelectorAll<HTMLButtonElement>(
      'button[role="checkbox"]',
    );
    checkboxes.forEach((el) => {
      const id = el.id;
      if (!id) return;
      formData[id] = el.getAttribute("data-state") === "checked";
    });

    return formData;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = collectFormData();

    if (component.properties.action) {
      // Merge form data into the action context
      const actionWithFormData = {
        ...component.properties.action,
        context: [
          ...(component.properties.action.context || []),
          {
            key: "formData",
            value: {
              literalString: JSON.stringify(formData),
            },
          },
        ],
      };
      await sendAction(actionWithFormData);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn("flex w-full flex-col", styles, classNames?.root)}
      style={{ flex: weight }}
    >
      {component.properties.children?.map((child) => (
        <Renderer
          key={child.id}
          processor={processor}
          surfaceId={surfaceId}
          component={child}
          weight={child.weight || "initial"}
        />
      ))}
      <div className={cn("mt-2", classNames?.footer)}>
        <ShadCNButton type="submit" className="w-full sm:w-auto">
          {submitLabel}
        </ShadCNButton>
      </div>
    </form>
  );
}
