/**
 * OrganizationsTable — fully-featured data table for the Organizations admin screen.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Organization
 *
 * Features:
 *  - TanStack Query for server-side pagination with cache + background refetch
 *  - placeholderData: keepPreviousData keeps the current page visible while
 *    the next page loads (no flash of empty state between pages)
 *  - Table view: row expand → OrganizationDetailPanel
 *  - Grid view: card layout via OrganizationCard
 *  - View toggle (table / grid) in the toolbar
 *  - Row selection + bulk delete via DataTableSelectionBar
 *  - Row actions: Edit, Delete — opened via Zustand admin store (no local state)
 *  - No default column pinning (users may pin manually) — table stays in
 *    auto-layout so it fills the container width; resizing intentionally disabled
 *  - Export (CSV / Excel / JSON)
 *  - "New Organization" button opens create modal via admin store
 *
 * Circular-dependency note:
 *  useServerDataTable needs `data` and `pageCount` BEFORE state.pagination is
 *  available. We break this with separate `rows` and `pageCount` state seeded
 *  from initialData, then sync them from the query result via useEffect.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableExportButton,
  DataTableGridSkeleton,
  DataTableGridView,
  DataTablePagination,
  DataTableSelectionBar,
  DataTableToolbar,
  DataTableViewToggle,
  useServerDataTable,
  type TableViewMode,
} from "@/modules/client/shared/components/tables";
import { TOrgResponse } from "@/modules/entities/schemas/organization";
import { useAdminStore } from "../../stores/admin.store";
import { ORGANIZATIONS_COLUMNS } from "./OrganizationsTableColumn";
import { OrganizationDetailPanel } from "./OrganizationDetailPanel";
import { OrganizationCard } from "./OrganizationCard";
import { IOrganizationsTableProps } from "../../types/organizations.type";
import {
  fetchOrganizations,
  organizationKeys,
} from "../../queries/organization.queries";

/** Default page size kept in sync with `initialPageSize` below. */
const INITIAL_PAGE_SIZE = 20;

/**
 * Fully-featured server-driven organizations table.
 * Uses TanStack Query for caching and background refetch after mutations.
 *
 * @param initialData - Server-fetched first page to hydrate the cache on mount.
 * @param orgId       - Active org ID from the session; scopes every list fetch to the current tenant.
 */
export function OrganizationsTable({
  initialData,
  orgId,
  userId,
}: IOrganizationsTableProps) {
  /**
   * Separate state for rows and pageCount breaks the circular dependency:
   *   useServerDataTable needs rows/pageCount → useQuery needs state.pagination
   * Both are seeded from initialData (SSR) and synced from the query result.
   */
  const [rows, setRows] = useState<TOrgResponse[]>(initialData.data);
  const [pageCount, setPageCount] = useState(
    Math.ceil(initialData.total / INITIAL_PAGE_SIZE),
  );

  /** Active view: "table" shows the expand-capable data table, "grid" shows cards. */
  const [view, setView] = useState<TableViewMode>("table");

  /** Admin store — used only to open the create modal from the toolbar. */
  const openModal = useAdminStore((s) => s.onOpen);

  // ── Table instance ────────────────────────────────────────────────────────
  const { table, state } = useServerDataTable<TOrgResponse>({
    columns: ORGANIZATIONS_COLUMNS,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    /** Disable drag-resize handles — TanStack defaults columnResizeMode to 'onEnd' internally. */
    enableColumnResizing: false,
    // No default column pinning — pinning forces table-layout:fixed with an
    // explicit width equal to the sum of column sizes (needed to keep sticky
    // offsets pixel-accurate), which left a gap when that sum was narrower
    // than the container. Leaving pinning unset keeps the table in
    // auto-layout, which fills the container width naturally. Users can
    // still pin columns manually via the column menu if they want to.
    getRowCanExpand: () => true,
  });

  // ── TanStack Query ────────────────────────────────────────────────────────
  /**
   * state.pagination drives the query key — changing page or page size
   * automatically triggers a new fetch for the correct slice.
   *
   * keepPreviousData: the current page stays visible while the next page
   * loads, so the user never sees an empty table between page transitions.
   *
   * initialData seeds the cache with the SSR-fetched page so there is no
   * duplicate network request on first mount.
   */
  const { data, isFetching } = useQuery({
    queryKey: organizationKeys.list({ ...state.pagination, orgId }),
    queryFn: () => fetchOrganizations({ ...state.pagination, orgId }),
    placeholderData: keepPreviousData,
    initialData: initialData,
    staleTime: 60_000,
  });

  /**
   * Sync the latest query result into the table-controlled state.
   * Runs whenever the query returns new data (page change, mutation invalidation,
   * or background stale refetch).
   */
  useEffect(() => {
    if (data) {
      setRows(data.data);
      setPageCount(Math.ceil(data.total / state.pagination.pageSize));
    }
    // state.pagination.pageSize changes trigger a new query → new data → this effect.
    // Depending only on `data` is sufficient to avoid stale pageCount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearFilters = useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  // ── Shared toolbar ────────────────────────────────────────────────────────
  /**
   * DataTableToolbar already renders DataTableViewOptions on its right side.
   * Extra buttons are passed as children so they land in the right slot
   * before the built-in column-visibility toggle — no duplicate needed.
   */
  const toolbar = (
    <DataTableToolbar table={table}>
      <DataTableExportButton
        table={table}
        filename="organizations"
        title="Organizations Export"
      />
      <DataTableViewToggle view={view} onViewChange={setView} />
      <Button
        size="default"
        onClick={() =>
          openModal({
            type: "createOrganization",
            data: {
              userId: userId ?? undefined,
              orgId: orgId ?? undefined,
            },
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        New Organization
      </Button>
    </DataTableToolbar>
  );

  // ── Bulk action bar ──────────────────────────────────────────────────────
  const actionBar = (
    <DataTableSelectionBar table={table}>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          toast.info(
            "Use the row action menu to delete individual organizations.",
          );
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete ({table.getFilteredSelectedRowModel().rows.length})
      </Button>
    </DataTableSelectionBar>
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-16">
      <SearchX className="h-9 w-9 text-muted-foreground/50" />
      <p className="text-sm font-medium">No organizations found</p>
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-2.5">
      {/* Shared toolbar — same in both views */}
      {toolbar}

      {view === "table" ? (
        /**
         * Table view — full features: row expand panel, column resize,
         * pinning, selection bar, row height.
         */
        <DataTable
          table={table}
          emptyState={emptyState}
          loading={isFetching}
          loadingRowCount={state.pagination.pageSize}
          rowHeight="medium"
          pageSizeOptions={[10, 20, 50, 100]}
          actionBar={actionBar}
          renderSubComponent={(row) => <OrganizationDetailPanel row={row} />}
        />
      ) : (
        /**
         * Grid view — responsive card layout.
         * Pagination and action bar are wired manually below the grid.
         */
        <>
          {isFetching ? (
            <DataTableGridSkeleton
              cardCount={state.pagination.pageSize}
              gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            />
          ) : (
            <DataTableGridView
              table={table}
              renderCard={(row) => <OrganizationCard row={row} />}
              gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            />
          )}
          <div className="flex flex-col gap-2.5">
            <DataTablePagination
              table={table}
              pageSizeOptions={[10, 20, 50, 100]}
            />
            {table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
          </div>
        </>
      )}
    </div>
  );
}
