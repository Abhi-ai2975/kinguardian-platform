/**
 * LocationsTable — data table for the Locations admin screen.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Location
 *
 * Features:
 *  - TanStack Query for server-side pagination with cache + background refetch
 *  - placeholderData: keepPreviousData keeps the current page visible while
 *    the next page loads (no flash of empty state between pages)
 *  - Row selection via DataTableSelectionBar (bulk delete not yet wired —
 *    row-level delete uses the individual row action, matching Organization)
 *  - Row actions: Edit, Delete — opened via Zustand admin store (no local state)
 *  - No default column pinning (users may pin manually) — table stays in
 *    auto-layout so it fills the container width; resizing intentionally disabled
 *  - Export (CSV / Excel / JSON)
 *  - "New Location" button opens the create Sheet via the admin store
 *  - Row expand → LocationDetailPanel (mirrors Organization's detail panel)
 *
 * Grid view is intentionally omitted for Location — optional per the
 * client-module scaffold, not needed now that the detail panel covers the
 * "see everything about this record" use case.
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
  DataTableSelectionBar,
  DataTableToolbar,
  useServerDataTable,
} from "@/modules/client/shared/components/tables";
import { TLocationResponse } from "@/modules/entities/schemas/location";
import { useAdminStore } from "../../stores/admin.store";
import { LOCATIONS_COLUMNS } from "./LocationsTableColumn";
import { LocationDetailPanel } from "./LocationDetailPanel";
import { ILocationsTableProps } from "../../types/locations.type";
import { fetchLocations, locationKeys } from "../../queries/location.queries";

/** Default page size kept in sync with `initialPageSize` below. */
const INITIAL_PAGE_SIZE = 20;

/**
 * Server-driven locations table.
 * Uses TanStack Query for caching and background refetch after mutations.
 *
 * @param initialData - Server-fetched first page to hydrate the cache on mount.
 * @param orgId       - Active org ID from the session; scopes every list fetch to the current tenant.
 * @param userId      - Authenticated user ID; forwarded to create/edit modals.
 */
export function LocationsTable({
  initialData,
  orgId,
  userId,
}: ILocationsTableProps) {
  /**
   * Separate state for rows and pageCount breaks the circular dependency:
   *   useServerDataTable needs rows/pageCount → useQuery needs state.pagination
   * Both are seeded from initialData (SSR) and synced from the query result.
   */
  const [rows, setRows] = useState<TLocationResponse[]>(initialData.data);
  const [pageCount, setPageCount] = useState(
    Math.ceil(initialData.total / INITIAL_PAGE_SIZE),
  );

  /** Admin store — used only to open the create Sheet from the toolbar. */
  const openModal = useAdminStore((s) => s.onOpen);

  // ── Table instance ────────────────────────────────────────────────────────
  const { table, state } = useServerDataTable<TLocationResponse>({
    columns: LOCATIONS_COLUMNS,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    /** Disable drag-resize handles — TanStack defaults columnResizeMode to 'onEnd' internally. */
    enableColumnResizing: false,
    // No default column pinning — see OrganizationsTable for why: pinning
    // forces a fixed table width equal to the sum of column sizes, which
    // left a gap when narrower than the container. Users can still pin
    // columns manually via the column menu if they want to.
    getRowCanExpand: () => true,
  });

  // ── TanStack Query ────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: locationKeys.list({ ...state.pagination, orgId }),
    queryFn: () => fetchLocations({ ...state.pagination, orgId }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearFilters = useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = (
    <DataTableToolbar table={table}>
      <DataTableExportButton
        table={table}
        filename="locations"
        title="Locations Export"
      />
      <Button
        size="default"
        onClick={() =>
          openModal({
            type: "createLocation",
            data: {
              userId: userId ?? undefined,
              orgId: orgId ?? undefined,
            },
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        New Location
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
          toast.info("Use the row action menu to delete individual locations.");
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
      <p className="text-sm font-medium">No locations found</p>
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-2.5">
      {toolbar}
      <DataTable
        table={table}
        emptyState={emptyState}
        loading={isFetching}
        loadingRowCount={state.pagination.pageSize}
        rowHeight="medium"
        pageSizeOptions={[10, 20, 50, 100]}
        actionBar={actionBar}
        renderSubComponent={(row) => <LocationDetailPanel row={row} />}
      />
    </div>
  );
}
