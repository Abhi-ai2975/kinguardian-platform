"use client";

import { useMemo } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { BreadcrumbNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import {
  Breadcrumb as ShadCNBreadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: BreadcrumbNode;
  weight?: string | number;
}

export function Breadcrumb({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: BreadcrumbProps) {
  const { resolvePrimitive, sendAction } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );

  const items = component.properties.items || [];

  return (
    <ShadCNBreadcrumb style={{ flex: weight }}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const label = resolvePrimitive(item.label);
          const isLast = index === items.length - 1;

          return (
            <span key={index} className="inline-flex items-center gap-1.5">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.action) {
                        sendAction(item.action);
                      }
                    }}
                  >
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </span>
          );
        })}
      </BreadcrumbList>
    </ShadCNBreadcrumb>
  );
}
