// DashboardGrid — the react-grid-layout canvas.
// In view mode widgets are read-only (no drag/resize).
// In edit mode drag handles and resize corners are enabled, and a save
// button appears. Layout changes are applied locally and persisted when the
// user explicitly clicks "Save layout".
// Uses react-grid-layout v2 API: drag/resize/grid settings are passed as
// gridConfig / dragConfig / resizeConfig objects, not flat props.
"use client";

import { useCallback, useState } from "react";
import GridLayout from "react-grid-layout";
import type { Layout as RGLLayout } from "react-grid-layout";
import { useWindowSize } from "@/hooks/use-window-size";
import type { LayoutItem } from "@/lib/dashboards-api";
import { saveDashboardLayout } from "@/lib/dashboards-api";
import { DashboardWidget } from "./DashboardWidget";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

import "react-grid-layout/css/styles.css";

interface DashboardGridProps {
  dashboardId: string;
  items: LayoutItem[];
  orgId: string;
  range?: string;
  editMode: boolean;
  onItemsChange: (items: LayoutItem[]) => void;
}

export function DashboardGrid({
  dashboardId,
  items,
  orgId,
  range,
  editMode,
  onItemsChange,
}: DashboardGridProps) {
  const { width } = useWindowSize();
  const [saving, setSaving] = useState(false);
  const COLS = 12;
  const ROW_HEIGHT = 60;
  const GRID_WIDTH = Math.max((width ?? 1200) - 80, 400);

  // Convert our LayoutItems to the shape react-grid-layout v2 expects.
  const rglLayout: RGLLayout = items.map((it) => ({
    i: it.i,
    x: it.x,
    y: it.y,
    w: it.w,
    h: it.h,
    minW: 2,
    minH: 2,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: RGLLayout) => {
      const merged: LayoutItem[] = items.map((item) => {
        const pos = newLayout.find((l) => l.i === item.i);
        return pos
          ? { ...item, x: pos.x, y: pos.y, w: pos.w, h: pos.h }
          : item;
      });
      onItemsChange(merged);
    },
    [items, onItemsChange],
  );

  const removeWidget = useCallback(
    (id: string) => onItemsChange(items.filter((it) => it.i !== id)),
    [items, onItemsChange],
  );

  async function handleSave() {
    setSaving(true);
    try {
      await saveDashboardLayout(dashboardId, items);
      toast.success("Dashboard saved");
    } catch {
      toast.error("Failed to save dashboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      {editMode && (
        <div className="mb-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving…" : "Save layout"}
          </Button>
        </div>
      )}

      <GridLayout
        className="layout"
        layout={rglLayout}
        width={GRID_WIDTH}
        gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: [12, 12] }}
        dragConfig={{ enabled: editMode, handle: ".drag-handle" }}
        resizeConfig={{ enabled: editMode }}
        onLayoutChange={handleLayoutChange}
      >
        {items.map((item) => (
          <div key={item.i} className="rounded-lg overflow-hidden border bg-card shadow-sm">
            {editMode && (
              <div className="drag-handle flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b cursor-grab active:cursor-grabbing">
                <span className="text-xs text-muted-foreground font-medium select-none">
                  ⠿ {(item.widgetConfig.title as string) ?? item.widgetType}
                </span>
                <button
                  onClick={() => removeWidget(item.i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove widget"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className={editMode ? "h-[calc(100%-32px)]" : "h-full"}>
              <DashboardWidget item={item} orgId={orgId} range={range} />
            </div>
          </div>
        ))}
      </GridLayout>

      {editMode && items.length === 0 && (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
          Add widgets from the panel on the right
        </div>
      )}
    </div>
  );
}
