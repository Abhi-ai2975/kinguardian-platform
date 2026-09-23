/**
 * @file hooks/use-data-table.ts
 * @description Client-side TanStack Table hook with full row-model support:
 * filtering (global + column), sorting, pagination, column visibility,
 * column pinning, row expansion, and faceted value computation.
 *
 * Use `useDataTable` when all data is loaded client-side. For server-driven
 * pagination/sorting/filtering see `useServerDataTable`.
 *
 * @layer shared/tables/hooks
 */

"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ExpandedState,
  type FilterFn,
  type SortingState,
  type TableOptions,
  type VisibilityState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UseDataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialSorting?: SortingState;
  initialColumnFilters?: ColumnFiltersState;
  initialColumnVisibility?: VisibilityState;
  initialPageSize?: number;
  initialGlobalFilter?: string;
  initialColumnPinning?: ColumnPinningState;
  initialExpanded?: ExpandedState;
  globalFilterFn?: FilterFn<TData>;
  tableOptions?: Partial<TableOptions<TData>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Client-side data table hook.
 *
 * Initialises all TanStack row models (core, sorted, filtered, paginated,
 * faceted, expanded) so every UI feature works out of the box. Pass initial*
 * props to set the default state on mount; the user can mutate state via the
 * returned table instance.
 *
 * @param columns - Column definitions.
 * @param data - Row data array (all rows, client-side).
 * @param initialSorting - Default sorting state.
 * @param initialColumnFilters - Default column filter state.
 * @param initialColumnVisibility - Default column visibility state.
 * @param initialPageSize - Rows per page on first render.
 * @param initialGlobalFilter - Default global search value.
 * @param initialColumnPinning - Default column pinning state.
 * @param initialExpanded - Default row expansion state.
 * @param globalFilterFn - Custom global filter fn (e.g., createColumnSearchFilterFn).
 * @param tableOptions - Extra options forwarded to useReactTable.
 * @returns `{ table, globalFilter, setGlobalFilter }`
 */
export function useDataTable<TData, TValue = unknown>({
  columns,
  data,
  initialSorting = [],
  initialColumnFilters = [],
  initialColumnVisibility = {},
  initialPageSize = 10,
  initialGlobalFilter = "",
  initialColumnPinning = {},
  initialExpanded = {},
  globalFilterFn,
  tableOptions = {},
}: UseDataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialColumnVisibility,
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialColumnFilters,
  );
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = React.useState<string>(initialGlobalFilter);
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialColumnPinning,
  );
  const [expanded, setExpanded] = React.useState<ExpandedState>(initialExpanded);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      columnVisibility,
      columnFilters,
      sorting,
      globalFilter,
      columnPinning,
      expanded,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getExpandedRowModel: getExpandedRowModel(),
    ...(globalFilterFn ? { globalFilterFn } : {}),
    ...tableOptions,
  });

  return { table, globalFilter, setGlobalFilter };
}
