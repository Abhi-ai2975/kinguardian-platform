/**
 * FilesTableColumn — TanStack Table column definitions for the files list.
 *
 * Uses fileStore.getState() (not the hook) because column definitions are not
 * React components and cannot call hooks.
 *
 * @module
 */
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Info, Pencil, FolderInput, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableRowActions,
  formatDate,
} from "@/modules/client/shared/components/tables";
import { fileStore } from "@/modules/client/files/stores/file.store";
import { getFileDownloadUrlAction } from "@/modules/server/presentation/actions/file.actions";
import type { TFile, TFileStatus } from "@/modules/entities/schemas/file";

const STATUS_VARIANT: Record<
  TFileStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ready: "default",
  processing: "secondary",
  pending: "outline",
  failed: "destructive",
  quarantined: "destructive",
};

const STATUS_LABEL: Record<TFileStatus, string> = {
  ready: "Ready",
  processing: "Processing",
  pending: "Pending",
  failed: "Failed",
  quarantined: "Quarantined",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function openDownload(projectId: string, fileId: string) {
  const [data] = await getFileDownloadUrlAction({
    payload: { projectId, fileId },
  });
  if (data?.url) {
    window.open(data.url, "_blank", "noopener,noreferrer");
  }
}

export function filesTableColumns(): ColumnDef<TFile>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { exportable: false },
    },
    {
      accessorKey: "filename",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Name" />
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm leading-tight truncate max-w-[280px]">
            {row.original.filename}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {row.original.content_type}
          </p>
        </div>
      ),
      meta: { label: "Name", variant: "text" },
      enableColumnFilter: true,
    },
    {
      accessorKey: "size_bytes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Size" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatBytes(row.original.size_bytes)}
        </span>
      ),
      meta: { label: "Size", variant: "number" },
      enableColumnFilter: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]} className="text-xs">
          {STATUS_LABEL[row.original.status]}
        </Badge>
      ),
      meta: {
        label: "Status",
        variant: "select",
        options: Object.entries(STATUS_LABEL).map(([value, label]) => ({
          value,
          label,
        })),
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Uploaded" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
      meta: { label: "Uploaded", variant: "date" },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: "View details",
              icon: Info,
              onClick: (r) => {
                fileStore.getState().onOpen("fileDetails", r.original);
              },
            },
            {
              label: "Download",
              icon: Download,
              onClick: (r) => {
                void openDownload(r.original.project_id, r.original.id);
              },
            },
            {
              label: "Rename",
              icon: Pencil,
              onClick: (r) => {
                fileStore.getState().onOpen("renameFile", r.original);
              },
            },
            {
              label: "Move to folder",
              icon: FolderInput,
              onClick: (r) => {
                fileStore.getState().onOpen("moveFile", r.original);
              },
            },
            {
              label: "Delete",
              icon: Trash2,
              destructive: true,
              separator: true,
              onClick: (r) => {
                fileStore.getState().onOpen("deleteFile", r.original);
              },
            },
          ]}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { exportable: false },
    },
  ];
}
