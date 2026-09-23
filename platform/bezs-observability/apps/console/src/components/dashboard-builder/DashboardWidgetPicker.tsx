// DashboardWidgetPicker — sidebar panel shown in edit mode.
// Renders one card per widget type from the registry.
// Clicking a card appends a new LayoutItem to the grid,
// placed below the current lowest widget so it never overlaps.
"use client";

import { WIDGET_REGISTRY } from "./widget-registry";
import type { LayoutItem } from "@/lib/dashboards-api";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardWidgetPickerProps {
  items: LayoutItem[];
  onAdd: (item: LayoutItem) => void;
}

export function DashboardWidgetPicker({ items, onAdd }: DashboardWidgetPickerProps) {
  function addWidget(meta: (typeof WIDGET_REGISTRY)[0]) {
    const maxY = items.reduce((acc, it) => Math.max(acc, it.y + it.h), 0);
    const newItem: LayoutItem = {
      i: crypto.randomUUID(),
      x: 0,
      y: maxY,
      w: meta.defaultW,
      h: meta.defaultH,
      widgetType: meta.type,
      widgetConfig: { ...meta.defaultConfig },
    };
    onAdd(newItem);
  }

  return (
    <div className="w-60 shrink-0 flex flex-col rounded-lg border bg-card">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-semibold">Add widget</p>
        <p className="text-xs text-muted-foreground mt-0.5">Click to add to the grid</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {WIDGET_REGISTRY.map((meta) => {
            const Icon = meta.icon;
            return (
              <button
                key={meta.type}
                onClick={() => addWidget(meta)}
                className="w-full text-left rounded-md border px-3 py-2.5 hover:bg-accent transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                  <span className="text-sm font-medium">{meta.label}</span>
                  <Plus className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
