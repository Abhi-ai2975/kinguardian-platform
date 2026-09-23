/**
 * @file hooks/use-server-data-table.ts
 * @description Server-driven TanStack Table hook. Enables
 * manualPagination, manualSorting, and manualFiltering so that
 * state changes are reflected back to the server on each request
 * rather than being applied client-side.
 *
 * Expose `state` to your data-fetching layer (TanStack Query, SWR, etc.)
 * so it can re-fetch when sorting/filtering/pagination changes.
 *
 * @layer shared/tables/hooks
 */

"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type FilterFn,
  type PaginationState,
  type SortingState,
  type TableOptions,
  type VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServerTableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
  globalFilter: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UseServerDataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  initialSorting?: SortingState;
  initialColumnFilters?: ColumnFiltersState;
  initialColumnVisibility?: VisibilityState;
  initialPageSize?: number;
  initialGlobalFilter?: string;
  initialColumnPinning?: ColumnPinningState;
  globalFilterFn?: FilterFn<TData>;
  tableOptions?: Partial<TableOptions<TData>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Server-driven data table hook.
 *
 * Returns both the table instance and the current `state` object so that the
 * consuming page can wire it to a data-fetching hook (TanStack Query, etc.).
 * `resetPage()` resets pagination to page 0 — useful to call before applying
 * new filters so you don't land on a non-existent page.
 *
 * @param columns - Column definitions.
 * @param data - Current page of rows from the server.
 * @param pageCount - Total number of pages (derived from server total count).
 * @param initialSorting - Default sorting.
 * @param initialColumnFilters - Default column filters.
 * @param initialColumnVisibility - Default column visibility.
 * @param initialPageSize - Default rows per page.
 * @param initialGlobalFilter - Default global search string.
 * @param initialColumnPinning - Default column pinning.
 * @param globalFilterFn - Custom global filter fn.
 * @param tableOptions - Extra options forwarded to useReactTable.
 * @returns `{ table, state, resetPage, setSorting, setColumnFilters, setPagination, setGlobalFilter }`
 */
export function useServerDataTable<TData, TValue = unknown>({
  columns,
  data,
  pageCount,
  initialSorting = [],
  initialColumnFilters = [],
  initialColumnVisibility = {},
  initialPageSize = 10,
  initialGlobalFilter = "",
  initialColumnPinning = {},
  globalFilterFn,
  tableOptions = {},
}: UseServerDataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialColumnVisibility,
  );
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialColumnFilters,
  );
  const [globalFilter, setGlobalFilter] = React.useState<string>(initialGlobalFilter);
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialColumnPinning,
  );
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const resetPage = React.useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const state: ServerTableState = React.useMemo(
    () => ({ sorting, columnFilters, pagination, globalFilter }),
    [sorting, columnFilters, pagination, globalFilter],
  );

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      rowSelection,
      columnVisibility,
      sorting,
      columnFilters,
      globalFilter,
      columnPinning,
      pagination,
    },
    enableRowSelection: true,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    ...(globalFilterFn ? { globalFilterFn } : {}),
    ...tableOptions,
  });

  return {
    table,
    state,
    resetPage,
    setSorting,
    setColumnFilters,
    setPagination,
    setGlobalFilter,
  };
}
