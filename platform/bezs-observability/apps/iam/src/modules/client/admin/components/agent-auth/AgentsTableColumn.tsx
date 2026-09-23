import { ColumnDef } from "@tanstack/react-table";
import {
  Bot,
  EllipsisVertical,
  ShieldOff,
  RefreshCw,
  Zap,
  Pencil,
} from "lucide-react";
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
import { TAgent } from "../../types/agentauth.type";

const statusColors: Record<string, string> = {
  active:
    "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400",
  pending:
    "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400",
  revoked:
    "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 hover:text-rose-600 dark:text-rose-400",
  expired:
    "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
  rejected:
    "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
  claimed:
    "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
};

export const agentsTableColumn = (): ColumnDef<TAgent>[] => [
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
        <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {row.original.agent_id.slice(0, 12)}…
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
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "mode",
    header: "Mode",
    cell: ({ row }) => (
      <Badge
        className={cn(
          buttonVariants({ size: "sm", variant: "default" }),
          "cursor-default h-6 rounded-lg capitalize",
          row.original.mode === "autonomous"
            ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
            : "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
        )}
      >
        {row.original.mode}
      </Badge>
    ),
  },
  {
    accessorKey: "host_name",
    header: "Host",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.host_name || row.original.host_id.slice(0, 8) + "…"}
      </span>
    ),
  },
  {
    accessorKey: "agent_capability_grants",
    header: "Capabilities",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.agent_capability_grants.length}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const agent = row.original;
      const openModal = adminStore((state) => state.onOpen);
      const isRevocable =
        agent.status !== "revoked" &&
        agent.status !== "expired" &&
        agent.status !== "rejected";

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
              {agent.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "updateAgent",
                  data: { agentId: agent.agent_id, agentName: agent.name },
                })
              }
            >
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "grantAgentCapability",
                  data: {
                    agentId: agent.agent_id,
                    agentName: agent.name,
                    agentCapabilityGrants: agent.agent_capability_grants,
                  },
                })
              }
            >
              <Zap className="h-4 w-4" />
              Grant Capability
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {isRevocable ? (
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500"
                onClick={() =>
                  openModal({
                    type: "revokeAgent",
                    data: {
                      agentId: agent.agent_id,
                      agentName: agent.name,
                      agentStatus: agent.status,
                    },
                  })
                }
              >
                <ShieldOff className="h-4 w-4 text-rose-600 dark:text-rose-500" />
                Revoke
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-emerald-600 hover:!text-emerald-600 dark:text-emerald-500"
                onClick={() =>
                  openModal({
                    type: "reactivateAgent",
                    data: { agentId: agent.agent_id, agentName: agent.name },
                  })
                }
              >
                <RefreshCw className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                Reactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
