import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Edit, EllipsisVertical, Trash2 } from "lucide-react";
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
import { buttonVariants, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminStore } from "../../stores/admin.store";
import { TMenuNode } from "../../types/apps.type";

interface MenuNodesColumnOptions {
  onReorder: (nodeId: string, direction: "up" | "down") => void;
}

export const menuNodesTableColumn = ({
  onReorder,
}: MenuNodesColumnOptions): ColumnDef<TMenuNode>[] => [
  {
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <TanstackTableColumnSorting label="Label" column={column} isSorted={isSorted} />
      );
    },
    accessorKey: "label",
    cell({ row }) {
      return (
        <div>
          <p className="font-medium">{row.original.label}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.original.slug}</p>
        </div>
      );
    },
  },
  {
    header: "Type",
    accessorKey: "type",
    cell({ row }) {
      const type = row.original.type;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            type === "GROUP"
              ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
              : "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground",
          )}
        >
          {type}
        </Badge>
      );
    },
  },
  {
    header: "Parent",
    accessorKey: "parentLabel",
    cell({ row }) {
      return (
        <span className="text-sm text-muted-foreground">
          {row.original.parentLabel ?? "—"}
        </span>
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
    header: "Nav",
    accessorKey: "isVisible",
    cell({ row }) {
      const isVisible = row.original.isVisible;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            isVisible
              ? "bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 hover:text-blue-600 dark:text-blue-400"
              : "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
          )}
        >
          {isVisible ? "Shown" : "Hidden"}
        </Badge>
      );
    },
  },
  {
    header: "Permissions",
    accessorKey: "permissionKeys",
    cell({ row }) {
      const keys = row.original.permissionKeys ?? [];
      if (keys.length === 0) {
        return <span className="text-xs text-muted-foreground">Public</span>;
      }
      return (
        <Badge variant="secondary" className="text-xs">
          {keys.length} key{keys.length !== 1 ? "s" : ""}
        </Badge>
      );
    },
  },
  {
    header: "Order",
    accessorKey: "order",
    cell({ row }) {
      const nodeId = row.original.id;
      return (
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground w-6">{row.original.order}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onReorder(nodeId, "up")}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onReorder(nodeId, "down")}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      );
    },
  },
  {
    header: "ACTIONS",
    id: "actions",
    cell({ row }) {
      const node = row.original;
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
              {node.label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "editMenuNode",
                  data: {
                    menuNodeId: node.id,
                    menuNodeLabel: node.label,
                    menuNodeSlug: node.slug,
                    menuNodeType: node.type,
                    menuNodeParentId: node.parentId ?? null,
                    menuNodeIcon: node.icon ?? null,
                    menuNodeHref: node.href ?? null,
                    menuNodeIsActive: node.isActive,
                    menuNodeIsVisible: node.isVisible,
                    menuNodeAppId: node.appId,
                    menuNodePermissionKeys: node.permissionKeys ?? [],
                    menuNodeOrder: node.order,
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
                  type: "deleteMenuNode",
                  data: {
                    menuNodeId: node.id,
                    menuNodeLabel: node.label,
                    menuNodeAppId: node.appId,
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
