/**
 * @file data-table-with-views.tsx
 * @description Convenience wrapper that combines DataTable, DataTableGridView,
 * and DataTableViewToggle into a single component. Manages view-mode state
 * internally (table vs grid) and renders either the HTML table or the card
 * grid depending on the active mode.
 *
 * Use this component when you want both views without manually wiring the
 * toggle. Use the individual DataTable / DataTableGridView components when
 * you need more control.
 *
 * @layer shared/tables
 */

"use client";

import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import * as React from "react";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableGridView } from "./data-table-grid-view";
import { DataTable } from "./data-table";
import { DataTableViewToggle } from "./data-table-view-toggle";
import type { TableViewMode } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableWithViewsProps<TData> {
  table: TanstackTable<TData>;
  renderCard?: (row: Row<TData>) => React.ReactNode;
  defaultView?: TableViewMode;
  gridClassName?: string;
  actionBar?: React.ReactNode;
  pageSizeOptions?: number[];
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingRowCount?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * All-in-one component that renders a filterable, paginated table with an
 * optional card-grid view toggle. Handles view-mode switching internally.
 *
 * @param table - TanStack Table instance (from useDataTable).
 * @param renderCard - Optional card renderer; hides the grid toggle when absent.
 * @param defaultView - Starting view mode.
 * @param gridClassName - Grid column classes for card layout.
 * @param actionBar - Bulk-action bar shown when rows are selected.
 * @param pageSizeOptions - Page size choices.
 * @param toolbar - Toolbar content (filters, search, add button, etc.).
 */
export function DataTableWithViews<TData>({
  table,
  renderCard,
  defaultView = "table",
  gridClassName,
  actionBar,
  pageSizeOptions,
  toolbar,
  emptyState,
  loading,
  loadingRowCount,
}: DataTableWithViewsProps<TData>) {
  const [view, setView] = React.useState<TableViewMode>(defaultView);

  const hasGrid = !!renderCard;

  return (
    <div className="flex w-full flex-col gap-2.5">
      {(toolbar || hasGrid) && (
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {toolbar}
          </div>
          {hasGrid && (
            <DataTableViewToggle view={view} onViewChange={setView} />
          )}
        </div>
      )}

      {view === "table" ? (
        <DataTable
          table={table}
          actionBar={actionBar}
          pageSizeOptions={pageSizeOptions}
          emptyState={emptyState}
          loading={loading}
          loadingRowCount={loadingRowCount}
        />
      ) : (
        <>
          <DataTableGridView
            table={table}
            renderCard={renderCard!}
            gridClassName={gridClassName}
          />
          <div className="flex flex-col gap-2.5">
            <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
            {actionBar &&
              table.getFilteredSelectedRowModel().rows.length > 0 &&
              actionBar}
          </div>
        </>
      )}
    </div>
  );
}
