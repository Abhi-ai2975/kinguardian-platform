/**
 * PractitionersTable — data table for the Practitioners admin screen.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: Practitioner
 *
 * Features:
 *  - TanStack Query for server-side pagination with cache + background refetch
 *  - placeholderData: keepPreviousData keeps the current page visible while
 *    the next page loads (no flash of empty state between pages)
 *  - Row selection via DataTableSelectionBar (bulk delete not yet wired —
 *    row-level delete uses the individual row action)
 *  - Row actions: Edit, Delete — opened via Zustand admin store (no local state)
 *  - No default column pinning (users may pin manually) — table stays in
 *    auto-layout so it fills the container width
 *  - Export (CSV / Excel / JSON)
 *  - "New Practitioner" button opens the create Sheet via the admin store
 *  - Row expand → PractitionerDetailPanel
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
import { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";
import { useAdminStore } from "../../stores/admin.store";
import { PRACTITIONERS_COLUMNS } from "./PractitionersTableColumn";
import { PractitionerDetailPanel } from "./PractitionerDetailPanel";
import { IPractitionersTableProps } from "../../types/practitioners.type";
import { fetchPractitioners, practitionerKeys } from "../../queries/practitioner.queries";

/** Default page size kept in sync with `initialPageSize` below. */
const INITIAL_PAGE_SIZE = 20;

/**
 * Server-driven practitioners table.
 * Uses TanStack Query for caching and background refetch after mutations.
 *
 * @param initialData - Server-fetched first page to hydrate the cache on mount.
 * @param orgId       - Active org ID from the session; scopes every list fetch to the current tenant.
 * @param userId      - Authenticated user ID; forwarded to the create modal (not stamped by default — see IPractitionersTableProps).
 */
export function PractitionersTable({
  initialData,
  orgId,
  userId,
}: IPractitionersTableProps) {
  const [rows, setRows] = useState<TPractitionerResponse[]>(initialData.data);
  const [pageCount, setPageCount] = useState(
    Math.ceil(initialData.total / INITIAL_PAGE_SIZE),
  );

  /** Admin store — used only to open the create Sheet from the toolbar. */
  const openModal = useAdminStore((s) => s.onOpen);

  // ── Table instance ────────────────────────────────────────────────────────
  const { table, state } = useServerDataTable<TPractitionerResponse>({
    columns: PRACTITIONERS_COLUMNS,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    enableColumnResizing: false,
    getRowCanExpand: () => true,
  });

  // ── TanStack Query ────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: practitionerKeys.list({ ...state.pagination, orgId }),
    queryFn: () => fetchPractitioners({ ...state.pagination, orgId }),
    placeholderData: keepPreviousData,
    initialData: initialData,
    staleTime: 60_000,
  });

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
        filename="practitioners"
        title="Practitioners Export"
      />
      <Button
        size="default"
        onClick={() =>
          openModal({
            type: "createPractitioner",
            data: {
              userId: userId ?? undefined,
              orgId: orgId ?? undefined,
            },
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        New Practitioner
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
          toast.info("Use the row action menu to delete individual practitioners.");
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
      <p className="text-sm font-medium">No practitioners found</p>
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
        renderSubComponent={(row) => <PractitionerDetailPanel row={row} />}
      />
    </div>
  );
}
