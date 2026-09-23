/**
 * FilesTable — file list table with status filtering and row actions.
 *
 * Initial data is SSR-fetched by the RSC page and seeded into
 * useServerActionQuery via initialData — no loading flash on first render.
 * staleTime prevents an immediate background refetch that would trigger the
 * React 19 "state update before mount" error. Post-mutation refresh is driven
 * by queryClient.invalidateQueries when the file store trigger increments.
 *
 * @module
 */
"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  DataTableWithViews,
  DataTableToolbar,
  DataTableGlobalSearch,
  DataTableSelectionBar,
  useDataTable,
} from "@/modules/client/shared/components/tables";
import { useServerActionQuery } from "@/lib/hooks/server-action-hooks";
import { listFilesAction } from "@/modules/server/presentation/actions/file.actions";
import { useFileStore } from "@/modules/client/files/stores/file.store";
import { fileKeys } from "@/modules/client/files/queries/file.queries";
import { filesTableColumns } from "./FilesTableColumn";
import type { TFileList } from "@/modules/entities/schemas/file";

interface FilesTableProps {
  projectId: string;
  /** When set, only files inside this folder are shown. Driven by URL `?folder_id=`. */
  folderId?: string | null;
  /** SSR-fetched first page — seeds the query to avoid a loading flash. */
  initialData: TFileList;
}

export function FilesTable({ projectId, folderId, initialData }: FilesTableProps) {
  const { onOpen, trigger } = useFileStore();
  const queryClient = useQueryClient();

  const columns = React.useMemo(() => filesTableColumns(), []);

  const queryParams = React.useMemo(
    () => ({
      projectId,
      limit: 200,
      ...(folderId ? { folder_id: folderId } : {}),
    }),
    [projectId, folderId],
  );

  const { data, isFetching } = useServerActionQuery(listFilesAction, {
    input: { payload: queryParams },
    queryKey: fileKeys.list(queryParams),
    initialData,
    staleTime: 30_000,
    placeholderData: (prev: TFileList | undefined) => prev,
  });

  const rows = data?.items ?? [];

  const { table } = useDataTable({
    columns,
    data: rows,
    initialSorting: [{ id: "created_at", desc: true }],
    initialPageSize: 50,
  });

  // Invalidate the list cache after any mutation — trigger increments in the
  // file store after a successful delete, which causes TanStack Query to
  // refetch and update the table automatically.
  React.useEffect(() => {
    if (trigger > 0) {
      void queryClient.invalidateQueries({ queryKey: fileKeys.lists(projectId) });
    }
  }, [trigger, projectId, queryClient]);

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const emptyState = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <FileX className="h-8 w-8 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>No files yet</EmptyTitle>
        <EmptyDescription>
          Upload files using the FileNest SDK or API to see them here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  const toolbar = (
    <DataTableToolbar table={table}>
      <DataTableGlobalSearch table={table} placeholder="Search files…" />
      <Button
        size="default"
        variant="outline"
        onClick={() => onOpen("uploadFile")}
      >
        <Upload className="h-4 w-4 mr-1.5" />
        Upload
      </Button>
    </DataTableToolbar>
  );

  return (
    <>
      <DataTableWithViews
        table={table}
        toolbar={toolbar}
        defaultView="table"
        loading={isFetching}
        emptyState={emptyState}
      />

      <DataTableSelectionBar table={table} filename="files">
        {selectedRows.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              if (selectedRows.length === 1) {
                onOpen("deleteFile", selectedRows[0].original);
              }
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </DataTableSelectionBar>
    </>
  );
}
