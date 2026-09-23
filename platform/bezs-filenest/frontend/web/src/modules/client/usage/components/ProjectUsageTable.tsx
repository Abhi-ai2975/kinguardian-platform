/**
 * ProjectUsageTable — sortable per-project storage breakdown for the usage page.
 *
 * Each row shows project name, file count, storage used (formatted bytes), and
 * a Progress bar representing that project's share of total org storage.
 * Pure presentational — receives data as props from the RSC page.
 *
 * @module
 */
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Progress } from "@/components/ui/progress";
import {
  DataTable,
  DataTableColumnHeader,
  useDataTable,
} from "@/modules/client/shared/components/tables";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { FolderOpen } from "lucide-react";
import type { TProjectUsageItem } from "@/modules/entities/schemas/usage";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function buildColumns(totalBytes: number): ColumnDef<TProjectUsageItem>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Project" />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.name}</span>
      ),
      meta: { label: "Project", variant: "text" },
      enableColumnFilter: false,
    },
    {
      accessorKey: "file_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Files" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {row.original.file_count.toLocaleString()}
        </span>
      ),
      meta: { label: "Files", variant: "number" },
      enableColumnFilter: false,
    },
    {
      accessorKey: "storage_bytes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Storage used" />
      ),
      cell: ({ row }) => {
        const pct = totalBytes > 0
          ? Math.round((row.original.storage_bytes / totalBytes) * 100)
          : 0;
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            <span className="text-sm text-muted-foreground tabular-nums w-16 shrink-0 text-right">
              {formatBytes(row.original.storage_bytes)}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                {pct}%
              </span>
            </div>
          </div>
        );
      },
      meta: { label: "Storage used", variant: "number" },
      enableColumnFilter: false,
    },
  ];
}

interface ProjectUsageTableProps {
  projects: TProjectUsageItem[];
  totalStorageBytes: number;
}

export function ProjectUsageTable({ projects, totalStorageBytes }: ProjectUsageTableProps) {
  const columns = React.useMemo(
    () => buildColumns(totalStorageBytes),
    [totalStorageBytes],
  );

  const { table } = useDataTable({
    columns,
    data: projects,
    initialSorting: [{ id: "storage_bytes", desc: true }],
    initialPageSize: 20,
  });

  return (
    <DataTable
      table={table}
      emptyState={
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project and upload files to see usage here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}
