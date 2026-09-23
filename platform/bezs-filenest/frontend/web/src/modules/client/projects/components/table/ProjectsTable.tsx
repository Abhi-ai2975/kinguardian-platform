/**
 * ProjectsTable — server-side paginated projects table with optional card grid view.
 *
 * Accepts an SSR-fetched first page as `initialData` to avoid a loading flash
 * on first render. All subsequent navigation (pagination, sort, filter, search)
 * is driven by useServerActionQuery(listProjectsAction) via the ZSA React Query
 * integration — no manual fetcher needed.
 *
 * State flow:
 *   useServerDataTable → state (pagination, sorting, columnFilters, globalFilter)
 *   useServerActionQuery → refetches on every state change via queryKey
 *   useEffect → syncs new pages into rows + pageCount
 *   projectStore.trigger → invalidates projectKeys.lists() after create / delete
 *
 * The view toggle (table ↔ grid) is internal to DataTableWithViews and does not
 * affect the server-side state — both views read the same TanStack Table instance.
 *
 * Row selection is shared between views. The floating DataTableSelectionBar
 * appears whenever at least one row is selected.
 *
 * @module
 */
"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  DataTableWithViews,
  DataTableToolbar,
  DataTableGlobalSearch,
  DataTableSelectionBar,
  useServerDataTable,
} from "@/modules/client/shared/components/tables";
import { useServerActionQuery } from "@/lib/hooks/server-action-hooks";
import { listProjectsAction } from "@/modules/server/presentation/actions/project.actions";
import { useProjectStore } from "@/modules/client/projects/stores/project.store";
import { projectKeys } from "@/modules/client/projects/queries/project.queries";
import { projectsTableColumns } from "./ProjectsTableColumn";
import { ProjectsCard } from "./ProjectsCard";
import type {
  TProject,
  TProjectList,
} from "@/modules/entities/schemas/project";

const INITIAL_PAGE_SIZE = 20;

interface ProjectsTableProps {
  /** SSR-fetched first page — seeds the table to avoid a loading flash. */
  initialData: TProjectList;
}

export function ProjectsTable({ initialData }: ProjectsTableProps) {
  const { onOpen, trigger } = useProjectStore();
  const queryClient = useQueryClient();

  const [rows, setRows] = React.useState<TProject[]>(initialData.items ?? []);
  const [pageCount, setPageCount] = React.useState(
    initialData.total_pages ?? 1,
  );

  const columns = React.useMemo(() => projectsTableColumns(), []);

  const { table, state, resetPage } = useServerDataTable({
    columns,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
    initialSorting: [{ id: "created_at", desc: true }],
  });

  // ── Derive API params from table state ─────────────────────────────────────

  const providerFilter = (
    state.columnFilters.find((f) => f.id === "storage_provider")?.value as
      | string[]
      | undefined
  )?.[0];
  const modeFilter = (
    state.columnFilters.find((f) => f.id === "storage_mode")?.value as
      | string[]
      | undefined
  )?.[0];

  const queryParams = React.useMemo(
    () => ({
      page: state.pagination.pageIndex + 1,
      page_size: state.pagination.pageSize,
      sort_by: (state.sorting[0]?.id ?? "created_at") as
        | "name"
        | "created_at"
        | "storage_provider"
        | "storage_mode",
      sort_dir: (state.sorting[0]?.desc === false ? "asc" : "desc") as
        | "asc"
        | "desc",
      search: state.globalFilter || undefined,
      storage_provider: providerFilter,
      storage_mode: modeFilter as "managed" | "byob" | undefined,
    }),
    [state, providerFilter, modeFilter],
  );

  // Reset to page 0 when filters or search change
  const prevFiltersRef = React.useRef({
    search: state.globalFilter,
    filters: state.columnFilters,
  });
  React.useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      state.globalFilter !== prev.search ||
      state.columnFilters !== prev.filters
    ) {
      prevFiltersRef.current = {
        search: state.globalFilter,
        filters: state.columnFilters,
      };
      resetPage();
    }
  }, [state.globalFilter, state.columnFilters, resetPage]);

  // ── ZSA React Query ────────────────────────────────────────────────────────

  const isInitialQuery =
    state.pagination.pageIndex === 0 &&
    !state.globalFilter &&
    state.columnFilters.length === 0;

  const { data, isPending: isFetching } = useServerActionQuery(
    listProjectsAction,
    {
      input: { payload: queryParams },
      queryKey: projectKeys.list(queryParams),
      initialData: isInitialQuery ? initialData : undefined,
      staleTime: 30_000,
      placeholderData: (prev: TProjectList | undefined) => prev,
    },
  );

  React.useEffect(() => {
    if (data) {
      setRows(data.items ?? []);
      setPageCount(data.total_pages ?? 1);
    }
  }, [data]);

  // Invalidate list cache after create / delete (trigger increments in store)
  React.useEffect(() => {
    if (trigger > 0) {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }
  }, [trigger, queryClient]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  function deleteSelected() {
    // Open the delete modal for the first selected project — a proper bulk
    // delete modal can be added when the backend supports batch delete.
    if (selectedRows.length === 1) {
      onOpen("deleteProject", selectedRows[0].original);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const emptyState = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>
          Create your first project to start uploading files.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" onClick={() => onOpen("createProject")}>
          <Plus className="h-4 w-4 mr-1.5" />
          New project
        </Button>
      </EmptyContent>
    </Empty>
  );

  const toolbar = (
    <DataTableToolbar table={table}>
      <DataTableGlobalSearch table={table} placeholder="Search projects…" />
      <Button size="default" onClick={() => onOpen("createProject")}>
        <Plus className="h-4 w-4 mr-1.5" />
        New project
      </Button>
    </DataTableToolbar>
  );

  return (
    <>
      <DataTableWithViews
        table={table}
        toolbar={toolbar}
        renderCard={(row) => <ProjectsCard row={row} />}
        defaultView="table"
        gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        loading={isFetching}
        emptyState={emptyState}
      />

      <DataTableSelectionBar table={table} filename="projects">
        {selectedRows.length === 1 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={deleteSelected}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </DataTableSelectionBar>
    </>
  );
}
