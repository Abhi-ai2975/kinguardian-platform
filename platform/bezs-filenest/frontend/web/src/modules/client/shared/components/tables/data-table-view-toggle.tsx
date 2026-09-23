/**
 * @file data-table-view-toggle.tsx
 * @description Toggle buttons to switch between table view and grid (card)
 * view. Renders two icon buttons side by side — the active mode is highlighted.
 * Designed to be placed inside the DataTableToolbar's right-side children slot.
 * @layer shared/tables
 */

"use client";

import { LayoutGrid, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TableViewMode } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableViewToggleProps {
  /** Currently active view mode */
  view: TableViewMode;
  /**
   * Callback fired when the user clicks a view mode button.
   * @param mode - The newly selected mode ("table" or "grid").
   */
  onViewChange: (mode: TableViewMode) => void;
  /** Additional Tailwind classes for the outer wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders Table and Grid toggle buttons. The active button is filled/secondary
 * while the inactive one uses a ghost style.
 *
 * @param view - Currently active view mode.
 * @param onViewChange - Called when the user switches views.
 * @param className - Extra classes on the wrapper div.
 */
export function DataTableViewToggle({
  view,
  onViewChange,
  className,
}: DataTableViewToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-md border border-input p-0.5 gap-0.5",
        className,
      )}
    >
      <Button
        aria-label="Table view"
        aria-pressed={view === "table"}
        variant={view === "table" ? "secondary" : "ghost"}
        size="icon"
        className="size-7"
        onClick={() => onViewChange("table")}
      >
        <Table2 className="size-4" />
      </Button>

      <Button
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        variant={view === "grid" ? "secondary" : "ghost"}
        size="icon"
        className="size-7"
        onClick={() => onViewChange("grid")}
      >
        <LayoutGrid className="size-4" />
      </Button>
    </div>
  );
}
