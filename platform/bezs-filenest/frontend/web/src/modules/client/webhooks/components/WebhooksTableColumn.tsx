/**
 * WebhooksTableColumn — TanStack Table column definitions for the webhooks list.
 *
 * Uses webhookStore.getState() (not the hook) because column definitions are
 * not React components and cannot call hooks.
 *
 * @module
 */
import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DataTableColumnHeader,
  DataTableRowActions,
  formatDate,
} from "@/modules/client/shared/components/tables";
import { webhookStore } from "@/modules/client/webhooks/stores/webhook.store";
import type { TWebhook } from "@/modules/entities/schemas/webhook";

export function webhooksTableColumns(): ColumnDef<TWebhook>[] {
  return [
    {
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Endpoint URL" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs truncate max-w-[320px] block">
          {row.original.url}
        </span>
      ),
      meta: { label: "URL", variant: "text" },
      enableColumnFilter: true,
    },
    {
      accessorKey: "events",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Events" />
      ),
      cell: ({ row }) => {
        const events = row.original.events;
        if (events.length === 0) {
          return (
            <Badge variant="secondary" className="text-xs">
              All events
            </Badge>
          );
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-[300px]">
            {events.slice(0, 3).map((e) => (
              <Badge key={e} variant="outline" className="text-xs font-mono">
                {e}
              </Badge>
            ))}
            {events.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{events.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
      meta: { label: "Events" },
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.is_active ? "default" : "secondary"}
          className="text-xs"
        >
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
      meta: {
        label: "Status",
        variant: "select",
        options: [
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
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
              label: "Edit",
              icon: Edit2,
              onClick: (r) => {
                webhookStore.getState().onOpen("createWebhook", r.original);
              },
            },
            {
              label: "Delete",
              icon: Trash2,
              destructive: true,
              separator: true,
              onClick: (r) => {
                webhookStore.getState().onOpen("deleteWebhook", r.original);
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
