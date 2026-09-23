/**
 * ProjectsTableColumn — TanStack Table column definitions for the projects list.
 *
 * Uses projectStore.getState() (not the hook) because column definitions are
 * not React components and cannot call hooks. Follows the IAM UsersTableColumn
 * pattern exactly.
 *
 * @module
 */
import type { ColumnDef } from "@tanstack/react-table";
import { Files, Settings, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTableColumnHeader,
  DataTableRowActions,
  formatDate,
} from "@/modules/client/shared/components/tables";
import { projectStore } from "@/modules/client/projects/stores/project.store";
import type { TProjectRow } from "@/modules/client/projects/types/project.type";

const PROVIDER_LABELS: Record<string, string> = {
  s3: "S3",
  azure_blob: "Azure",
  gcs: "GCS",
  minio: "MinIO",
  r2: "R2",
  rustfs: "RustFS",
};

export function projectsTableColumns(): ColumnDef<TProjectRow>[] {
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
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Name" />
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm leading-tight">{row.original.name}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {row.original.slug}
          </p>
        </div>
      ),
      meta: { label: "Name", variant: "text" },
      enableColumnFilter: true,
    },
    {
      accessorKey: "storage_provider",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Provider" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs capitalize">
          {PROVIDER_LABELS[row.original.storage_provider] ?? row.original.storage_provider}
        </Badge>
      ),
      meta: {
        label: "Provider",
        variant: "select",
        options: Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label })),
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "storage_mode",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Mode" />
      ),
      cell: ({ row }) => (
        <span className="text-sm capitalize text-muted-foreground">
          {row.original.storage_mode === "managed" ? "Managed" : "BYOB"}
        </span>
      ),
      meta: {
        label: "Mode",
        variant: "select",
        options: [
          { value: "managed", label: "Managed" },
          { value: "byob", label: "BYOB" },
        ],
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
      meta: { label: "Created", variant: "date" },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: "Open files",
              icon: Files,
              onClick: (r) => {
                window.location.href = `/projects/${r.original.id}/files`;
              },
            },
            {
              label: "Settings",
              icon: Settings,
              onClick: (r) => {
                window.location.href = `/projects/${r.original.id}/settings`;
              },
            },
            {
              label: "Delete",
              icon: Trash2,
              destructive: true,
              separator: true,
              onClick: (r) => {
                projectStore.getState().onOpen("deleteProject", r.original);
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
