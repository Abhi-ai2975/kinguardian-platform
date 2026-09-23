"use client";

import { useState } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { ModalNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Renderer } from "../rendering/renderer";

interface ModalProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: ModalNode;
  weight?: string | number;
}

export function Modal({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: ModalProps) {
  const { theme } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );
  const [open, setOpen] = useState(false);

  return (
    <div style={{ flex: weight }}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {typeof component.properties.entryPointChild === "string" ? (
            <p>Component not found: {component.properties.entryPointChild}</p>
          ) : (
            component.properties.entryPointChild && (
              <Renderer
                processor={processor}
                surfaceId={surfaceId}
                component={component.properties.entryPointChild}
              />
            )
          )}
        </DialogTrigger>
        <DialogContent>
          {typeof component.properties.contentChild === "string" ? (
            <p>Component not found: {component.properties.contentChild}</p>
          ) : (
            component.properties.contentChild && (
              <Renderer
                processor={processor}
                surfaceId={surfaceId}
                component={component.properties.contentChild}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
