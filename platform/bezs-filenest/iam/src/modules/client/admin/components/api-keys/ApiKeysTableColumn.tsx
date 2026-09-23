"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { TApiKey } from "../../types/apikeys.type";
import { adminStore } from "../../stores/admin.store";

export const apiKeysTableColumns: ColumnDef<TApiKey>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">
          {row.original.name ?? <span className="text-muted-foreground italic">Unnamed</span>}
        </span>
        <code className="text-xs text-muted-foreground">
          {row.original.prefix ?? ""}
          {row.original.start ?? ""}…
        </code>
      </div>
    ),
  },
  {
    accessorKey: "referenceId",
    header: "Owner (ref)",
    cell: ({ row }) => (
      <code className="text-xs">{row.original.referenceId}</code>
    ),
  },
  {
    accessorKey: "enabled",
    header: "Status",
    cell: ({ row }) =>
      row.original.enabled ? (
        <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>
      ) : (
        <Badge variant="outline" className="border-muted text-muted-foreground">Disabled</Badge>
      ),
  },
  {
    accessorKey: "expiresAt",
    header: "Expires",
    cell: ({ row }) =>
      row.original.expiresAt
        ? format(row.original.expiresAt, "MMM d, yyyy")
        : <span className="text-muted-foreground text-sm">Never</span>,
  },
  {
    accessorKey: "remaining",
    header: "Remaining",
    cell: ({ row }) => {
      const { remaining, refillAmount } = row.original;
      if (remaining == null) return <span className="text-muted-foreground text-sm">∞</span>;
      return (
        <span>
          {remaining}
          {refillAmount ? ` / refills ${refillAmount}` : ""}
        </span>
      );
    },
  },
  {
    accessorKey: "rateLimitMax",
    header: "Rate Limit",
    cell: ({ row }) => {
      if (!row.original.rateLimitEnabled) {
        return <span className="text-muted-foreground text-sm">Off</span>;
      }
      return (
        <span className="text-sm">
          {row.original.rateLimitMax} / {((row.original.rateLimitTimeWindow ?? 86400000) / 1000 / 60).toFixed(0)}m
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(row.original.createdAt, "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const key = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                adminStore.getState().onOpen({
                  type: "editApiKey",
                  data: {
                    apiKeyId: key.id,
                    apiKeyName: key.name,
                    apiKeyStart: key.start,
                    apiKeyPrefix: key.prefix,
                    apiKeyEnabled: key.enabled ?? true,
                  },
                })
              }
            >
              <Pencil className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-500 focus:text-rose-500"
              onClick={() =>
                adminStore.getState().onOpen({
                  type: "deleteApiKey",
                  data: {
                    apiKeyId: key.id,
                    apiKeyName: key.name,
                    apiKeyStart: key.start,
                    apiKeyPrefix: key.prefix,
                  },
                })
              }
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
