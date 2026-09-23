"use client";

import { useState } from "react";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { TabsNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";
import {
  Tabs as ShadCNTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Renderer } from "../rendering/renderer";

interface TabsProps {
  processor: IMessageProcessor;
  surfaceId: string;
  component: TabsNode;
  weight?: string | number;
}

export function Tabs({
  processor,
  surfaceId,
  component,
  weight = "initial",
}: TabsProps) {
  const { resolvePrimitive } = useDynamicComponent(
    processor,
    surfaceId,
    component,
    weight,
  );
  const [activeTab, setActiveTab] = useState(0);

  const tabItems = component.properties.tabItems || [];

  console.log(tabItems);

  return (
    <div style={{ flex: weight }}>
      <ShadCNTabs
        value={activeTab.toString()}
        onValueChange={(value: string) => setActiveTab(parseInt(value))}
      >
        <TabsList>
          {tabItems.map((tab, index) => {
            const title = resolvePrimitive(tab.title);
            return (
              <TabsTrigger key={index} value={index.toString()}>
                {title}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {tabItems.map((tab, index) => (
          <TabsContent key={index} value={index.toString()}>
            {typeof tab.child === "string" ? (
              <p>Component not found: {tab.child}</p>
            ) : (
              tab.child && (
                <Renderer
                  processor={processor}
                  surfaceId={surfaceId}
                  component={tab.child}
                />
              )
            )}
          </TabsContent>
        ))}
      </ShadCNTabs>
    </div>
  );
}
