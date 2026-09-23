"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, EllipsisVertical, Trash2 } from "lucide-react";
import { TanstackTableColumnSorting } from "@/modules/client/shared/components/table/tanstack-table-column-sorting";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminStore } from "../../stores/admin.store";
import { formatSmartDate } from "@/modules/shared/helper";
import { TResourceAction } from "../../types/resources.type";

export const resourceActionsTableColumn = (): ColumnDef<TResourceAction>[] => [
  {
    accessorKey: "key",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Key"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => (
      <Badge
        className={cn(
          buttonVariants({ size: "sm", variant: "default" }),
          "cursor-default h-6 rounded-lg font-mono bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
        )}
      >
        {row.original.key}
      </Badge>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Name"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "resourceName",
    header: "Resource",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.resourceName ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.description ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatSmartDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const item = row.original;
      const openModal = adminStore((state) => state.onOpen);

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ size: "icon", variant: "ghost" }),
              "rounded-full",
            )}
          >
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="left">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-mono">
              {item.key}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "editResourceAction",
                  data: {
                    resourceActionId: item.id,
                    resourceActionName: item.name,
                    resourceActionKey: item.key,
                    resourceActionDescription: item.description,
                    resourceActionResourceId: item.resourceId,
                    resourceActionResourceName: item.resourceName,
                  },
                })
              }
            >
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500 dark:hover:!text-rose-500"
              onClick={() =>
                openModal({
                  type: "deleteResourceAction",
                  data: {
                    resourceActionId: item.id,
                    resourceActionKey: item.key,
                    resourceActionName: item.name,
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
