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
  "short":      "[&>td]:py-0.5",  // ~32px — compact/dense
  "medium":     "[&>td]:py-2",    // ~40px — default
  "tall":       "[&>td]:py-4",    // ~52px — relaxed
  "extra-tall": "[&>td]:py-6",    // ~68px — spacious
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
   *
   * @example
   * ```tsx
   * emptyState={
   *   <div className="flex flex-col items-center gap-2 py-10">
   *     <SearchX className="size-8 text-muted-foreground" />
   *     <p className="text-sm text-muted-foreground">No patients match your filters.</p>
   *     <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
   *   </div>
   * }
   * ```
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
   *
   * For sub-rows (tree data), you do NOT need this prop — TanStack's
   * expanded row model handles sub-rows automatically inside the normal
   * row list. Use `getSubRows` in `useDataTable` instead.
   *
   * @example
   * ```tsx
   * renderSubComponent={(row) => (
   *   <div className="p-4">
   *     <p>{row.original.notes}</p>
   *   </div>
   * )}
   * ```
   */
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Loading skeleton rows
// ---------------------------------------------------------------------------

/**
 * Renders N skeleton rows matching the visible column count.
 * Used when `loading` is true so the layout doesn't jump between states.
 *
 * @param colCount - Number of visible columns.
 * @param rowCount - Number of skeleton rows to render.
 * @param rowHeightClass - Tailwind height class applied to each row.
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
              {/* Vary widths slightly so it doesn't look like a single block */}
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
 * Renders a fully functional data table with:
 * - Column pinning via sticky positioning
 * - Row-selection background state
 * - Loading skeleton (set `loading` while fetching)
 * - Custom empty state (set `emptyState` for a branded no-results view)
 * - Pagination bar
 * - Conditional action bar (only shown when rows are selected)
 * - `children` slot above the table (toolbar, search, etc.)
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

  // When any column is pinned, switch to table-layout:fixed so that each cell
  // honours its explicit width. In auto-layout mode the browser recalculates
  // column widths from content, causing getStart("left") / getAfter("right")
  // offsets to be wrong and pinned columns to overlap each other.
  const pinnedLeft  = table.getState().columnPinning.left?.length  ?? 0;
  const pinnedRight = table.getState().columnPinning.right?.length ?? 0;
  const isPinned    = pinnedLeft > 0 || pinnedRight > 0;

  // Column resizing — TanStack defaults columnResizeMode to 'onEnd' internally,
  // so we cannot use !!columnResizeMode alone to gate the resize UI. We also
  // check enableColumnResizing !== false so callers can opt out without having
  // to override TanStack's built-in default.
  const isResizable   = !!table.options.columnResizeMode && table.options.enableColumnResizing !== false;
  const isResizingAny = isResizable && !!table.getState().columnSizingInfo?.isResizingColumn;
  // Fixed layout is only required when columns are pinned.
  const useFixedLayout = isPinned;

  return (
    <div
      className={cn("flex w-full flex-col gap-2.5", className)}
      {...props}
    >
      {/* Toolbar / search / filter slot */}
      {children}

      {/*
       * overflow-x-auto here (not overflow-hidden) so that:
       * 1. Wide tables scroll horizontally within the border box.
       * 2. position:sticky on pinned columns works — overflow-hidden would
       *    suppress sticky behaviour by blocking the scroll container.
       */}
      <div className={cn("overflow-x-auto rounded-md border", isResizingAny && "select-none")}>
        {/*
         * Fixed layout is active only when columns are pinned:
         *   - "table-fixed" makes every cell honour its exact getSize() pixels,
         *     which is required for getStart("left") / getAfter("right") sticky
         *     offsets to be pixel-accurate.
         *   - width = getTotalSize() gives the scroll container a concrete
         *     scrollable width so sticky columns never overlap each other.
         * Resizing alone does NOT need fixed layout — the browser respects
         * `width` hints on <th> in auto-layout and the table keeps w-full,
         * so it fills its container without the "last column expands" issue
         * that fixed layout causes when column sizes sum < container width.
         */}
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
                    /*
                     * group/resize + relative let the resize handle (absolute
                     * child) show on hover of the entire header cell.
                     * Named group variant avoids conflicts with other group usage.
                     */
                    className={cn(isResizable && "group/resize relative")}
                    style={{
                      ...getColumnPinningStyle({
                        column: header.column,
                        withBorder: true,
                      }),
                      // Explicit width is required for table-layout:fixed resize accuracy
                      ...(isResizable && { width: header.getSize() }),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {/*
                     * Resize handle — invisible by default, appears on header hover,
                     * turns primary-coloured while actively dragging.
                     * Only rendered when resizing is enabled for this table AND the
                     * column opts in (enableResizing !== false on the column def).
                     */}
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
              /* ── Loading state ───────────────────────────────────────────── */
              <SkeletonRows
                colCount={visibleCols}
                rowCount={skeletonRows}
                rowHeightClass={rowHeightClass}
              />
            ) : hasRows ? (
              /* ── Data rows ───────────────────────────────────────────────── */
              table.getRowModel().rows.map((row) => (
                /*
                 * React.Fragment lets us return two sibling <tr> elements per
                 * row (the data row + the optional expanded detail panel) while
                 * keeping a stable key on the fragment wrapper.
                 */
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
                  {/*
                   * Detail-panel row — only rendered when:
                   * 1. renderSubComponent is provided (detail-panel pattern)
                   * 2. The row is currently expanded
                   * Sub-rows don't need this; TanStack inserts them into
                   * the row model automatically.
                   */}
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
              /* ── Empty state ─────────────────────────────────────────────── */
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

      {/* Pagination + optional action bar */}
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
        {/* Action bar mounted only when rows are selected */}
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
