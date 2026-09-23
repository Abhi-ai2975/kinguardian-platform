/**
 * @file data-table-selection-bar.tsx
 * @description Floating action bar that rises from the bottom of the viewport
 * whenever one or more table rows are selected. Modeled after the tablecn
 * selection bar pattern.
 *
 * The bar shows:
 *   - A count of selected rows ("3 rows selected")
 *   - A "Clear" button to deselect all
 *   - An export dropdown (CSV / Excel / JSON for selected rows)
 *   - An optional `actions` slot for consumer-provided buttons (e.g. Delete,
 *     Assign, Archive)
 *
 * The bar animates in/out with a slide-up/slide-down transition.
 * It uses a React Portal so it is not clipped by any overflow:hidden ancestor.
 *
 * @example Basic — export only
 * ```tsx
 * <DataTableSelectionBar table={table} />
 * ```
 *
 * @example With a bulk-delete action
 * ```tsx
 * <DataTableSelectionBar table={table} filename="patients">
 *   <Button
 *     variant="destructive"
 *     size="sm"
 *     onClick={() => deleteSelected(table.getSelectedRowModel().rows)}
 *   >
 *     <Trash2 className="size-3.5" /> Delete
 *   </Button>
 * </DataTableSelectionBar>
 * ```
 *
 * @layer shared/tables
 */

"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DataTableExportButton,
  getExportColumns,
  rowsToExportData,
} from "./data-table-export-button";
import { exportTable, type ExportFormat } from "./export-utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableSelectionBarProps<TData>
  extends React.ComponentProps<"div"> {
  /** TanStack Table instance — used to read selection state */
  table: Table<TData>;
  /**
   * Base filename for exported files.
   * @default "selected-export"
   */
  filename?: string;
  /**
   * Optional async handler for "Export all" on server-side tables.
   * Forwarded directly to the internal DataTableExportButton.
   *
   * @param format - The format chosen by the user.
   */
  onExportAll?: (format: ExportFormat) => Promise<void> | void;
  /**
   * Extra action buttons rendered to the right of the export button.
   * Typical examples: Delete, Archive, Assign.
   */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Floating selection action bar.
 *
 * Rendered into `document.body` via a React Portal so it is never clipped.
 * Animates in when `selectedCount > 0` and out when selection is cleared.
 *
 * @param table - TanStack Table instance.
 * @param filename - Downloaded file base name.
 * @param onExportAll - Server-side export-all handler.
 * @param children - Additional action buttons.
 * @param className - Extra classes on the bar container.
 */
export function DataTableSelectionBar<TData>({
  table,
  filename = "selected-export",
  onExportAll,
  children,
  className,
  ...props
}: DataTableSelectionBarProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  /** Whether we are mounted in the browser (avoids SSR portal errors) */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Track whether the bar has *ever* been shown so we can play the exit anim
  const [wasVisible, setWasVisible] = React.useState(false);
  React.useEffect(() => {
    if (selectedCount > 0) setWasVisible(true);
  }, [selectedCount]);

  /** Clear all row selections */
  const onClearSelection = React.useCallback(() => {
    table.resetRowSelection();
  }, [table]);

  // Don't render anything if we're on the server or the bar has never shown
  if (!mounted || !wasVisible) return null;

  const isVisible = selectedCount > 0;

  const bar = (
    <div
      role="toolbar"
      aria-label={`${selectedCount} rows selected`}
      className={cn(
        // Positioning — fixed, centred horizontally, above the fold
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        // Transition: slide up when visible, slide down when hidden
        "transition-all duration-300 ease-in-out",
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-4 opacity-0 pointer-events-none",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          "rounded-full border bg-background/95 shadow-lg backdrop-blur-sm",
          "px-4 py-2",
        )}
      >
        {/* Row count */}
        <span className="text-sm font-medium tabular-nums">
          {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
        </span>

        <Separator orientation="vertical" className="h-4" />

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onClearSelection}
          aria-label="Clear row selection"
        >
          <X className="size-3" />
          Clear
        </Button>

        {/* Export selected */}
        <DataTableExportButton
          table={table}
          filename={filename}
          onExportAll={onExportAll}
          // Override the default to only export selected rows from the bar
          // We re-use the component but the "selected rows" group in the
          // dropdown handles this automatically when rows are checked.
        />

        {/* Consumer-provided actions (Delete, Archive, etc.) */}
        {children && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">{children}</div>
          </>
        )}
      </div>
    </div>
  );

  // Portal into body so overflow:hidden on parent containers can't clip the bar
  return createPortal(bar, document.body);
}
