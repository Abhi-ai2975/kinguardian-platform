import { ColumnDef } from "@tanstack/react-table";
import { Edit, EllipsisVertical, MenuSquare, Trash2 } from "lucide-react";
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
import { TApp } from "../../types/apps.type";
import Link from "next/link";

export const appsTableColumn = (): ColumnDef<TApp>[] => [
  {
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <TanstackTableColumnSorting label="Name" column={column} isSorted={isSorted} />
      );
    },
    accessorKey: "name",
    cell({ row }) {
      return (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.original.slug}</p>
        </div>
      );
    },
  },
  {
    header: "Status",
    accessorKey: "isActive",
    cell({ row }) {
      const isActive = row.original.isActive;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            isActive
              ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
          )}
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    header: "Created At",
    accessorKey: "createdAt",
    cell({ row }) {
      return (
        <span className="text-sm text-muted-foreground">
          {formatSmartDate(row.original.createdAt)}
        </span>
      );
    },
  },
  {
    header: "ACTIONS",
    id: "actions",
    cell({ row }) {
      const app = row.original;
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
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {app.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer gap-2" asChild>
              <Link href={`/admin/apps/${app.id}/menus`}>
                <MenuSquare className="h-4 w-4" />
                Manage Menus
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "editApp",
                  data: {
                    appId: app.id,
                    appName: app.name,
                    appSlug: app.slug,
                    appDescription: app.description ?? null,
                    appIsActive: app.isActive,
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
                  type: "deleteApp",
                  data: { appId: app.id, appName: app.name },
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
