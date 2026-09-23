"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { AccordionNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Renderer } from "../rendering/renderer";
import {
  Accordion as ShadCNAccordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AccordionProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: AccordionNode;
  weight?: string | number;
}

export function Accordion({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: AccordionProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const items = component.properties.items || [];
  const type = component.properties.type || "single";

  return (
    <ShadCNAccordion
      type={type as any}
      collapsible={type === "single"}
      className="w-full"
      style={{ flex: weight }}
    >
      {items.map((item, index) => {
        const title = resolvePrimitive(item.title);
        return (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>{title}</AccordionTrigger>
            <AccordionContent>
              {item.child && (
                <Renderer
                  processor={processor}
                  surfaceId={surfaceId}
                  component={item.child}
                />
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </ShadCNAccordion>
  );
}
