/**
 * @file use-data-table.ts
 * @description Client-side React hook that wires up a TanStack Table instance
 * with full support for sorting, column filtering (all variants), pagination,
 * row selection, and column visibility — all managed via local useState.
 *
 * This is a pure client-side implementation (no URL sync). It sets up all
 * TanStack row models so that faceted filters (unique values, min/max) work
 * correctly alongside the toolbar filter controls.
 *
 * @layer shared/tables/hooks
 */

"use client";

import {
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ExpandedState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UseDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "getCoreRowModel"
    | "getFilteredRowModel"
    | "getPaginationRowModel"
    | "getSortedRowModel"
    | "getFacetedRowModel"
    | "getFacetedUniqueValues"
    | "getFacetedMinMaxValues"
    | "getExpandedRowModel"
    | "state"
    | "onSortingChange"
    | "onColumnFiltersChange"
    | "onColumnVisibilityChange"
    | "onRowSelectionChange"
    | "onPaginationChange"
    | "onGlobalFilterChange"
    | "onExpandedChange"
  > {
  /** Column definitions — forwarded directly to TanStack Table */
  columns: ColumnDef<TData, unknown>[];
  /** Row data array */
  data: TData[];
  /**
   * Initial sort state.
   * @default []
   */
  initialSorting?: SortingState;
  /**
   * Initial column filter state.
   * @default []
   */
  initialColumnFilters?: ColumnFiltersState;
  /**
   * Initial column visibility map.
   * @default {}
   */
  initialColumnVisibility?: VisibilityState;
  /**
   * Initial page size.
   * @default 10
   */
  initialPageSize?: number;
  /**
   * Initial global filter string. When provided, enables global search
   * across all columns that have globalFilterFn support.
   * @default ""
   */
  initialGlobalFilter?: string;
  /**
   * Initial column pinning state. Pin columns to the left or right edge.
   * @example { left: ["select", "name"], right: ["actions"] }
   * @default {}
   */
  initialColumnPinning?: ColumnPinningState;
  /**
   * Initial expanded row state. Pass row IDs that should start expanded.
   * Useful for tree / sub-row tables where you want to pre-open certain nodes.
   * Use `true` to expand all rows.
   * @example { "dept-cardio": true }
   * @default {}
   */
  initialExpanded?: ExpandedState;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Creates and manages a fully-featured client-side TanStack Table instance.
 *
 * All filter variants (text, number, range, date, dateRange, select, multiSelect)
 * rely on the faceted row models being present — this hook sets them all up.
 *
 * @param props - Table configuration including columns, data, and optional
 *   initial state overrides.
 * @returns Object containing the configured `table` instance.
 *
 * @example
 * ```tsx
 * const { table } = useDataTable({ columns, data });
 * return <DataTable table={table}><DataTableToolbar table={table} /></DataTable>;
 * ```
 */
export function useDataTable<TData>({
  columns,
  data,
  initialSorting = [],
  initialColumnFilters = [],
  initialColumnVisibility = {},
  initialPageSize = 10,
  initialGlobalFilter = "",
  initialColumnPinning = {},
  initialExpanded = {},
  ...tableProps
}: UseDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialColumnFilters);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  // Global filter state — drives the table-level search across all columns
  const [globalFilter, setGlobalFilter] =
    React.useState<string>(initialGlobalFilter);
  // Column pinning state — left/right sticky columns
  const [columnPinning, setColumnPinning] =
    React.useState<ColumnPinningState>(initialColumnPinning);
  // Row expansion state — tracks which rows are expanded (detail panel or sub-rows)
  const [expanded, setExpanded] = React.useState<ExpandedState>(initialExpanded);

  const table = useReactTable({
    data,
    columns,
    ...tableProps,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      globalFilter,
      columnPinning,
      expanded,
    },
    // -----------------------------------------------------------------------
    // State updaters
    // -----------------------------------------------------------------------
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    onExpandedChange: setExpanded,
    // -----------------------------------------------------------------------
    // Row models — all enabled for client-side filtering, sorting, pagination,
    // faceted values, and row expansion (sub-rows + detail panel)
    // -----------------------------------------------------------------------
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getExpandedRowModel: getExpandedRowModel(),
    // Client-side processing — do not use manual flags here
    enableRowSelection: true,
  });

  return React.useMemo(
    () => ({ table, globalFilter, setGlobalFilter }),
    [table, globalFilter],
  );
}
