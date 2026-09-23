/**
 * ApiKeysTableColumn — TanStack Table column definitions for the API keys table.
 *
 * @module
 */
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DataTableColumnHeader,
  DataTableRowActions,
  formatDate,
} from "@/modules/client/shared/components/tables";
import { apiKeyStore } from "../stores/api-key.store";
import type { TApiKey } from "@/modules/entities/schemas/api-key";

function ScopesBadges({ scopes }: { scopes?: string[] }) {
  if (!scopes?.length) return <span className="text-muted-foreground text-xs">—</span>;
  const shown = scopes.slice(0, 3);
  const rest = scopes.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((s) => (
        <Badge key={s} variant="secondary" className="font-mono text-xs px-1.5 py-0">
          {s}
        </Badge>
      ))}
      {rest > 0 && (
        <Badge variant="outline" className="text-xs px-1.5 py-0">+{rest}</Badge>
      )}
    </div>
  );
}

export function apiKeysTableColumns(): ColumnDef<TApiKey>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Name" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{row.original.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.original.start}…</span>
        </div>
      ),
      meta: { label: "Name", variant: "text" as const },
      enableColumnFilter: true,
    },
    {
      accessorKey: "enabled",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? "default" : "secondary"}>
          {row.original.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
      meta: { label: "Status", variant: "select" as const, options: [
        { value: "true", label: "Active" },
        { value: "false", label: "Disabled" },
      ]},
      enableColumnFilter: true,
    },
    {
      id: "scopes",
      header: "Scopes",
      cell: ({ row }) => (
        <ScopesBadges scopes={row.original.metadata?.scopes} />
      ),
      enableSorting: false,
      meta: { label: "Scopes", exportable: false },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Created" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
      meta: { label: "Created", variant: "date" as const },
    },
    {
      accessorKey: "expiresAt",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Expires" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.expiresAt ? formatDate(row.original.expiresAt) : "Never"}
        </span>
      ),
      meta: { label: "Expires" },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: "View",
              icon: Eye,
              onClick: (r) =>
                apiKeyStore.getState().onOpen("viewApiKey", r.original),
            },
            {
              label: "Revoke key",
              icon: Trash2,
              destructive: true,
              separator: true,
              onClick: (r) =>
                apiKeyStore.getState().onOpen("revokeApiKey", r.original),
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
