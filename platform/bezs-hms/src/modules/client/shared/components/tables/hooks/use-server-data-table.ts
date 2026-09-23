/**
 * @file use-server-data-table.ts
 * @description React hook for server-driven TanStack Table instances.
 *
 * Unlike `useDataTable` (which loads all rows and filters/sorts/paginates
 * them in the browser), this hook sets `manualPagination`, `manualSorting`,
 * and `manualFiltering` to `true`. TanStack Table becomes a pure UI layer:
 * it renders whatever rows you pass as `data` and delegates all data
 * operations to your server.
 *
 * The hook manages all table state internally and surfaces it as a plain
 * `state` object. Use that object as query-key dependencies for whichever
 * fetching strategy you prefer:
 *
 * @example React Query
 * ```tsx
 * const { table, state } = useServerDataTable({ columns, data, pageCount });
 *
 * const { data: result, isFetching } = useQuery({
 *   queryKey: ["patients", state],
 *   queryFn: () => api.getPatients(state),
 *   placeholderData: keepPreviousData,
 * });
 * // Feed result.rows and result.pageCount back into the hook on re-render.
 * ```
 *
 * @example Plain useEffect + fetch / axios
 * ```tsx
 * const [serverData, setServerData] = useState([]);
 * const [pageCount, setPageCount] = useState(0);
 * const { table, state } = useServerDataTable({ columns, data: serverData, pageCount });
 *
 * useEffect(() => {
 *   fetchPatients(state).then(({ rows, pageCount }) => {
 *     setServerData(rows);
 *     setPageCount(pageCount);
 *   });
 * }, [state.sorting, state.columnFilters, state.pagination, state.globalFilter]);
 * ```
 *
 * @layer shared/tables/hooks
 */

"use client";

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Table,
  type TableOptions,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The table state exposed by the hook.
 * Use these values as dependencies / query keys when fetching from the server.
 */
export interface ServerTableState {
  /** Active sort rules — pass to your ORDER BY / sort param */
  sorting: SortingState;
  /** Active column filter rules — pass to your WHERE / filter param */
  columnFilters: ColumnFiltersState;
  /** Current page index (0-based) and page size */
  pagination: PaginationState;
  /** Global search term — pass to your LIKE / full-text param */
  globalFilter: string;
}

interface UseServerDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "getCoreRowModel"
    | "getPaginationRowModel"
    | "getSortedRowModel"
    | "state"
    | "onSortingChange"
    | "onColumnFiltersChange"
    | "onColumnVisibilityChange"
    | "onRowSelectionChange"
    | "onPaginationChange"
    | "onGlobalFilterChange"
    | "manualPagination"
    | "manualSorting"
    | "manualFiltering"
    | "pageCount"
  > {
  /** Column definitions */
  columns: ColumnDef<TData, unknown>[];
  /**
   * The current page of rows returned by the server.
   * Update this prop whenever a new fetch completes.
   */
  data: TData[];
  /**
   * Total number of pages. Pass `-1` if the total is unknown
   * (infinite scroll / cursor-based pagination).
   *
   * Calculated as: `Math.ceil(totalRowCount / pageSize)`
   */
  pageCount: number;
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
   * Initial rows per page.
   * @default 10
   */
  initialPageSize?: number;
  /**
   * Initial global search term.
   * @default ""
   */
  initialGlobalFilter?: string;
  /**
   * Initial column pinning state.
   * @example { left: ["name"], right: ["actions"] }
   * @default {}
   */
  initialColumnPinning?: ColumnPinningState;
}

interface UseServerDataTableReturn<TData> {
  /** Fully configured TanStack Table instance — pass to `<DataTable>` */
  table: Table<TData>;
  /**
   * Current table state. Use as query-key dependency so your fetcher
   * re-runs whenever the user changes page, sort, filters, or search.
   */
  state: ServerTableState;
  /**
   * Programmatically reset pagination to page 0.
   * Call this inside your filter/search handlers so the user is always
   * returned to the first page after changing a filter.
   *
   * @example
   * ```ts
   * const handleSearch = (term: string) => {
   *   resetPage();
   *   setGlobalFilter(term);
   * };
   * ```
   */
  resetPage: () => void;
  // ── Individual setters (for programmatic control) ─────────────────────────
  /** @see SortingState */
  setSorting: OnChangeFn<SortingState>;
  /** @see ColumnFiltersState */
  setColumnFilters: OnChangeFn<ColumnFiltersState>;
  /** @see PaginationState */
  setPagination: OnChangeFn<PaginationState>;
  /** Set the global search term */
  setGlobalFilter: React.Dispatch<React.SetStateAction<string>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Creates a server-driven TanStack Table instance.
 *
 * All filtering, sorting, and pagination are marked as manual so TanStack
 * does not attempt to process rows client-side. The hook surfaces `state`
 * which should be forwarded to your data-fetching layer as query parameters.
 *
 * Faceted row models (getFacetedUniqueValues, getFacetedMinMaxValues) are
 * intentionally omitted — they have no meaning when only a single page of
 * rows is loaded. If your API returns facet metadata alongside rows, map it
 * to filter option arrays yourself and pass them via column `meta.options`.
 *
 * @param props - Table configuration including the current page of `data`
 *   and the total `pageCount` from the server.
 * @returns `{ table, state, resetPage, setSorting, setColumnFilters,
 *   setPagination, setGlobalFilter }`
 */
export function useServerDataTable<TData>({
  columns,
  data,
  pageCount,
  initialSorting = [],
  initialColumnFilters = [],
  initialColumnVisibility = {},
  initialPageSize = 10,
  initialGlobalFilter = "",
  initialColumnPinning = {},
  ...tableProps
}: UseServerDataTableProps<TData>): UseServerDataTableReturn<TData> {
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
  const [globalFilter, setGlobalFilter] =
    React.useState<string>(initialGlobalFilter);
  // Column pinning state — left/right sticky columns
  const [columnPinning, setColumnPinning] =
    React.useState<ColumnPinningState>(initialColumnPinning);

  /** Resets the page index to 0 without touching any other state */
  const resetPage = React.useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    ...tableProps,
    // ── Manual mode ─────────────────────────────────────────────────────────
    // These three flags tell TanStack "the server owns this operation".
    // TanStack will NOT filter, sort, or paginate rows; it just renders them.
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    // ── State ────────────────────────────────────────────────────────────────
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      globalFilter,
      columnPinning,
    },
    // ── Change handlers ──────────────────────────────────────────────────────
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    // ── Row models ───────────────────────────────────────────────────────────
    // Only the core model is strictly required in server mode.
    // `getPaginationRowModel` is included so the pagination UI (rows-per-page
    // select, page count display) renders correctly.
    // `getSortedRowModel` is included so column headers can show sort icons.
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  // Expose state as a stable-ish object for use as query-key dependencies.
  // Each field is a primitive or a referentially stable array from useState,
  // so spreading into a queryKey works correctly.
  const state = React.useMemo<ServerTableState>(
    () => ({ sorting, columnFilters, pagination, globalFilter }),
    [sorting, columnFilters, pagination, globalFilter],
  );

  return React.useMemo(
    () => ({
      table,
      state,
      resetPage,
      setSorting,
      setColumnFilters,
      setPagination,
      setGlobalFilter,
    }),
    [table, state, resetPage],
  );
}
