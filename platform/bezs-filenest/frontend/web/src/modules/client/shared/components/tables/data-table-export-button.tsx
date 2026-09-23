/**
 * @file data-table-export-button.tsx
 * @description Export trigger button and row/column extraction helpers.
 *
 * `DataTableExportButton` renders a compact "Export" button. Clicking it
 * opens `DataTableExportDialog` where the user configures scope, columns,
 * format, and filename before downloading.
 *
 * The helper functions `getExportColumns` and `rowsToExportData` are exported
 * separately so other components (e.g. DataTableSelectionBar, custom toolbars)
 * can reuse the same extraction logic without depending on this component.
 *
 * @layer shared/tables
 */

"use client";

import type { Row, Table } from "@tanstack/react-table";
import { Download } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTableExportDialog } from "./data-table-export-dialog";
import type { ExportColumn, ExportFormat, ExportRow } from "./export-utils";

// ---------------------------------------------------------------------------
// Helpers (exported for reuse)
// ---------------------------------------------------------------------------

/**
 * Extracts exportable column descriptors from a TanStack Table instance.
 * Skips display-only columns (no accessor), hidden columns, and any column
 * whose `meta.exportable` is explicitly set to `false`.
 *
 * @param table - TanStack Table instance.
 * @returns Array of ExportColumn objects (id + label).
 */
export function getExportColumns<TData>(table: Table<TData>): ExportColumn[] {
  return table
    .getVisibleLeafColumns()
    .filter((col) => {
      if (
        (col.columnDef.meta as { exportable?: boolean } | undefined)
          ?.exportable === false
      )
        return false;
      const def = col.columnDef as unknown as Record<string, unknown>;
      return "accessorKey" in def || typeof def.accessorFn === "function";
    })
    .map((col) => ({
      id: col.id,
      label:
        (col.columnDef.meta as { label?: string } | undefined)?.label ??
        col.id,
    }));
}

/**
 * Converts a TanStack Row array into plain ExportRow objects.
 * Uses `row.getValue(colId)` — returns the raw accessor value, not JSX.
 *
 * @param rows - Array of TanStack Row objects.
 * @param columns - Export columns to include.
 * @returns Plain-object rows safe to pass to exportTable().
 */
export function rowsToExportData<TData>(
  rows: Row<TData>[],
  columns: ExportColumn[],
): ExportRow[] {
  return rows.map((row) =>
    Object.fromEntries(columns.map((col) => [col.id, row.getValue(col.id)])),
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableExportButtonProps<TData>
  extends React.ComponentProps<typeof Button> {
  table: Table<TData>;
  filename?: string;
  title?: string;
  onExportAll?: (
    format: ExportFormat,
    columns: ExportColumn[],
  ) => Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact export button that opens the export customization dialog on click.
 *
 * @param table - TanStack Table instance.
 * @param filename - Default filename in the dialog.
 * @param title - Dataset name for the dialog header and PDF title.
 * @param onExportAll - Server-side export handler (optional).
 */
export function DataTableExportButton<TData>({
  table,
  filename = "export",
  title = "Data",
  onExportAll,
  className,
  ...buttonProps
}: DataTableExportButtonProps<TData>) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn("h-8 gap-1.5 text-xs font-normal", className)}
        onClick={() => setOpen(true)}
        {...buttonProps}
      >
        <Download className="size-3.5" />
        Export
      </Button>

      <DataTableExportDialog
        table={table}
        open={open}
        onOpenChange={setOpen}
        filename={filename}
        title={title}
        onExportAll={onExportAll}
      />
    </>
  );
}
