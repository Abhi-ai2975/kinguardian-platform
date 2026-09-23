/**
 * @file data-table-selection-bar.tsx
 * @description Floating action bar that rises from the bottom of the viewport
 * whenever one or more table rows are selected.
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
 * @example
 * ```tsx
 * <DataTableSelectionBar table={table} filename="files">
 *   <Button variant="destructive" size="sm" onClick={() => deleteSelected(...)}>
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
} from "./data-table-export-button";
import type { ExportFormat } from "./export-utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableSelectionBarProps<TData>
  extends React.ComponentProps<"div"> {
  table: Table<TData>;
  filename?: string;
  onExportAll?: (format: ExportFormat) => Promise<void> | void;
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Floating selection action bar rendered via React Portal.
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

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [wasVisible, setWasVisible] = React.useState(false);
  React.useEffect(() => {
    if (selectedCount > 0) setWasVisible(true);
  }, [selectedCount]);

  const onClearSelection = React.useCallback(() => {
    table.resetRowSelection();
  }, [table]);

  if (!mounted || !wasVisible) return null;

  const isVisible = selectedCount > 0;

  const bar = (
    <div
      role="toolbar"
      aria-label={`${selectedCount} rows selected`}
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
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
        <span className="text-sm font-medium tabular-nums">
          {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
        </span>

        <Separator orientation="vertical" className="h-4" />

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

        <DataTableExportButton
          table={table}
          filename={filename}
          onExportAll={onExportAll}
        />

        {children && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">{children}</div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
