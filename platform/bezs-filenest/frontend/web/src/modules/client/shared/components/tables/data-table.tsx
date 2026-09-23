/**
 * @file data-table.tsx
 * @description Core data table renderer. Accepts a fully-configured TanStack
 * Table instance and renders the HTML table with:
 * - Column pinning via sticky positioning
 * - Row-selection background state
 * - Row height density classes
 * - Loading skeleton overlay (via `loading` prop)
 * - Customisable empty state (via `emptyState` prop)
 * - Pagination bar
 * - Conditional action bar shown only when rows are selected
 * - `children` slot rendered above the table (toolbar, search, etc.)
 *
 * @layer shared/tables
 */

import {
  flexRender,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { DataTablePagination } from "./data-table-pagination";
import { getColumnPinningStyle } from "./utils";
import type { RowHeightValue } from "./types";

/** Tailwind classes applied to each <tr> to achieve the selected row height */
const ROW_HEIGHT_CLASSES: Record<RowHeightValue, string> = {
  "short":      "[&>td]:py-0.5",
  "medium":     "[&>td]:py-2",
  "tall":       "[&>td]:py-4",
  "extra-tall": "[&>td]:py-6",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  /** The fully-configured TanStack Table instance to render */
  table: TanstackTable<TData>;
  /**
   * When true, the table body is replaced with animated skeleton rows while
   * data is loading. The header and pagination remain visible.
   * @default false
   */
  loading?: boolean;
  /**
   * Number of skeleton rows to show when `loading` is true.
   * Defaults to the table's current page size so the layout doesn't shift.
   */
  loadingRowCount?: number;
  /**
   * Custom empty state rendered when there are no rows and `loading` is false.
   * Defaults to a centred "No results." message.
   */
  emptyState?: React.ReactNode;
  /**
   * Content rendered below the table only when at least one row is selected.
   * Typically a bulk-action bar (e.g. "Delete N selected").
   */
  actionBar?: React.ReactNode;
  /**
   * Available page-size options forwarded to DataTablePagination.
   * @default [10, 20, 30, 40, 50]
   */
  pageSizeOptions?: number[];
  /**
   * Controls vertical density of data rows.
   * When omitted rows use the default medium spacing.
   */
  rowHeight?: RowHeightValue;
  /**
   * Detail-panel expand pattern. When provided, each row that returns
   * `row.getCanExpand() === true` gets a full-width panel row rendered
   * directly beneath it when expanded.
   */
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Loading skeleton rows
// ---------------------------------------------------------------------------

/**
 * Renders N skeleton rows matching the visible column count.
 * Used when `loading` is true so the layout doesn't jump between states.
 */
function SkeletonRows({
  colCount,
  rowCount,
  rowHeightClass,
}: {
  colCount: number;
  rowCount: number;
  rowHeightClass?: string;
}) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIdx) => (
        <TableRow
          key={rowIdx}
          className={cn("animate-pulse", rowHeightClass)}
        >
          {Array.from({ length: colCount }).map((_, colIdx) => (
            <TableCell key={colIdx}>
              <Skeleton
                className={cn(
                  "h-4",
                  colIdx === 0 ? "w-16" :
                  colIdx % 3 === 0 ? "w-20" :
                  colIdx % 2 === 0 ? "w-full" : "w-3/4",
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a fully functional data table with column pinning, loading skeleton,
 * custom empty state, pagination bar, and optional bulk-action bar.
 *
 * @param table - TanStack Table instance (from useDataTable or useServerDataTable).
 * @param loading - Show skeleton rows in the table body.
 * @param loadingRowCount - How many skeleton rows to show (defaults to page size).
 * @param emptyState - Custom no-results UI.
 * @param actionBar - Bulk-action bar shown when rows are selected.
 * @param pageSizeOptions - Page size choices for the pagination select.
 * @param rowHeight - Vertical density applied to each data row.
 * @param children - Content above the table (toolbar, search, etc.).
 * @param className - Extra Tailwind classes on the outer div.
 */
export function DataTable<TData>({
  table,
  loading = false,
  loadingRowCount,
  emptyState,
  actionBar,
  pageSizeOptions,
  rowHeight,
  renderSubComponent,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const visibleCols     = table.getVisibleLeafColumns().length;
  const skeletonRows    = loadingRowCount ?? table.getState().pagination.pageSize;
  const rowHeightClass  = rowHeight ? ROW_HEIGHT_CLASSES[rowHeight] : undefined;
  const hasRows         = table.getRowModel().rows.length > 0;

  const pinnedLeft  = table.getState().columnPinning.left?.length  ?? 0;
  const pinnedRight = table.getState().columnPinning.right?.length ?? 0;
  const isPinned    = pinnedLeft > 0 || pinnedRight > 0;

  const isResizable   = !!table.options.columnResizeMode && table.options.enableColumnResizing !== false;
  const isResizingAny = isResizable && !!table.getState().columnSizingInfo?.isResizingColumn;
  const useFixedLayout = isPinned;

  return (
    <div
      className={cn("flex w-full flex-col gap-2.5", className)}
      {...props}
    >
      {children}

      <div className={cn("overflow-x-auto rounded-md border", isResizingAny && "select-none")}>
        <Table
          className={useFixedLayout ? "table-fixed" : undefined}
          style={useFixedLayout ? { width: table.getTotalSize() } : undefined}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(isResizable && "group/resize relative")}
                    style={{
                      ...getColumnPinningStyle({
                        column: header.column,
                        withBorder: true,
                      }),
                      ...(isResizable && { width: header.getSize() }),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {isResizable && header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          "absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none",
                          "bg-transparent transition-colors group-hover/resize:bg-border",
                          header.column.getIsResizing() && "bg-primary opacity-100",
                        )}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <SkeletonRows
                colCount={visibleCols}
                rowCount={skeletonRows}
                rowHeightClass={rowHeightClass}
              />
            ) : hasRows ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={rowHeightClass}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={getColumnPinningStyle({
                          column: cell.column,
                          withBorder: true,
                        })}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderSubComponent && row.getIsExpanded() && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={visibleCols} className="p-0">
                        {renderSubComponent(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleCols}
                  className="p-0"
                >
                  {emptyState ?? (
                    <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                      No results.
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
