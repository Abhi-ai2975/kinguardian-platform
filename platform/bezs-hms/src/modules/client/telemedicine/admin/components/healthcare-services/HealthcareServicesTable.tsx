/**
 * HealthcareServicesTable — data table for the Healthcare Services admin screen.
 *
 * Layer: client / telemedicine / admin / components
 * Resource: HealthcareService
 *
 * Features:
 *  - TanStack Query for server-side pagination with cache + background refetch
 *  - placeholderData: keepPreviousData keeps the current page visible while
 *    the next page loads (no flash of empty state between pages)
 *  - Row selection via DataTableSelectionBar (bulk delete not yet wired —
 *    row-level delete uses the individual row action, matching Location)
 *  - Row actions: Edit, Delete — opened via Zustand admin store (no local state)
 *  - No default column pinning — table stays in auto-layout so it fills the
 *    container width; resizing intentionally disabled
 *  - Export (CSV / Excel / JSON)
 *  - "New Healthcare Service" button opens the create Sheet via the admin store
 *  - Row expand → HealthcareServiceDetailPanel
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
import { THealthcareServiceResponse } from "@/modules/entities/schemas/healthcare-service";
import { useAdminStore } from "../../stores/admin.store";
import { HEALTHCARE_SERVICES_COLUMNS } from "./HealthcareServicesTableColumn";
import { HealthcareServiceDetailPanel } from "./HealthcareServiceDetailPanel";
import { IHealthcareServicesTableProps } from "../../types/healthcareServices.type";
import {
  fetchHealthcareServices,
  healthcareServiceKeys,
} from "../../queries/healthcare-service.queries";

/** Default page size kept in sync with `initialPageSize` below. */
const INITIAL_PAGE_SIZE = 20;

/**
 * Server-driven healthcare services table.
 * Uses TanStack Query for caching and background refetch after mutations.
 *
 * @param initialData - Server-fetched first page to hydrate the cache on mount.
 * @param orgId       - Active org ID from the session; stamped on newly created resources.
 * @param userId      - Authenticated user ID; forwarded to create/edit modals.
 */
export function HealthcareServicesTable({
  initialData,
  orgId,
  userId,
}: IHealthcareServicesTableProps) {
  const [rows, setRows] = useState<THealthcareServiceResponse[]>(initialData.data);
  const [pageCount, setPageCount] = useState(
    Math.ceil(initialData.total / INITIAL_PAGE_SIZE),
  );

  const openModal = useAdminStore((s) => s.onOpen);

  const { table, state } = useServerDataTable<THealthcareServiceResponse>({
    columns: HEALTHCARE_SERVICES_COLUMNS,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    enableColumnResizing: false,
    getRowCanExpand: () => true,
  });

  const { data, isFetching } = useQuery({
    queryKey: healthcareServiceKeys.list({ ...state.pagination, orgId }),
    queryFn: () => fetchHealthcareServices({ ...state.pagination, orgId }),
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

  const clearFilters = useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  const toolbar = (
    <DataTableToolbar table={table}>
      <DataTableExportButton
        table={table}
        filename="healthcare-services"
        title="Healthcare Services Export"
      />
      <Button
        size="default"
        onClick={() =>
          openModal({
            type: "createHealthcareService",
            data: {
              userId: userId ?? undefined,
              orgId: orgId ?? undefined,
            },
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        New Healthcare Service
      </Button>
    </DataTableToolbar>
  );

  const actionBar = (
    <DataTableSelectionBar table={table}>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          toast.info("Use the row action menu to delete individual healthcare services.");
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete ({table.getFilteredSelectedRowModel().rows.length})
      </Button>
    </DataTableSelectionBar>
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-16">
      <SearchX className="h-9 w-9 text-muted-foreground/50" />
      <p className="text-sm font-medium">No healthcare services found</p>
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
        renderSubComponent={(row) => <HealthcareServiceDetailPanel row={row} />}
      />
    </div>
  );
}
