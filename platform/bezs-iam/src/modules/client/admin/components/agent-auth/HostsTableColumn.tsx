import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Pencil, Server, ShieldOff } from "lucide-react";
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
import { THost } from "../../types/agentauth.type";

const statusColors: Record<string, string> = {
  active:
    "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400",
  pending:
    "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400",
  pending_enrollment:
    "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400",
  revoked:
    "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 hover:text-rose-600 dark:text-rose-400",
  rejected:
    "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
};

export const hostsTableColumn = (): ColumnDef<THost>[] => [
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
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {row.original.id.slice(0, 12)}…
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg capitalize",
            statusColors[status] ??
              "bg-muted text-muted-foreground hover:bg-muted",
          )}
        >
          {status.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "default_capabilities",
    header: "Default Capabilities",
    cell: ({ row }) => {
      const caps = row.original.default_capabilities;
      if (!caps.length)
        return <span className="text-sm text-muted-foreground">None</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {caps.slice(0, 3).map((cap) => (
            <Badge
              key={cap}
              className={cn(
                buttonVariants({ size: "sm", variant: "default" }),
                "cursor-default h-5 rounded text-xs bg-muted text-muted-foreground hover:bg-muted",
              )}
            >
              {cap}
            </Badge>
          ))}
          {caps.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{caps.length - 3}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.created_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const host = row.original;
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
              {host.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "updateHost",
                  data: {
                    hostId: host.id,
                    hostName: host.name,
                    hostStatus: host.status,
                    hostDefaultCapabilities: host.default_capabilities,
                  },
                })
              }
            >
              <Pencil className="h-4 w-4" />
              Edit Host
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500 dark:hover:!text-rose-500"
              onClick={() =>
                openModal({
                  type: "revokeHost",
                  data: {
                    hostId: host.id,
                    hostName: host.name,
                    hostStatus: host.status,
                  },
                })
              }
            >
              <ShieldOff className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Revoke Host
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
