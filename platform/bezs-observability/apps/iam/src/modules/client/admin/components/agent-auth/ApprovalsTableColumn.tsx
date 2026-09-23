import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, XCircle } from "lucide-react";
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
import { EllipsisVertical } from "lucide-react";
import { adminStore } from "../../stores/admin.store";
import { TApprovalRequest } from "../../types/agentauth.type";

export const approvalsTableColumn = (): ColumnDef<TApprovalRequest>[] => [
  {
    accessorKey: "agent_name",
    header: "Agent",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.agent_name ?? "Unknown agent"}
        </p>
        {row.original.agent_id && (
          <p className="text-xs text-muted-foreground font-mono">
            {row.original.agent_id.slice(0, 12)}…
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => (
      <Badge
        className={cn(
          buttonVariants({ size: "sm", variant: "default" }),
          "cursor-default h-6 rounded-lg uppercase text-xs",
          "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
        )}
      >
        {row.original.method === "device_authorization" ? "Device" : "CIBA"}
      </Badge>
    ),
  },
  {
    accessorKey: "capabilities",
    header: "Capabilities Requested",
    cell: ({ row }) => {
      const caps = row.original.capabilities;
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {caps.map((cap) => (
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
        </div>
      );
    },
  },
  {
    accessorKey: "binding_message",
    header: "Binding Message",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.binding_message ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "expires_in",
    header: "Expires In",
    cell: ({ row }) => {
      const sec = row.original.expires_in;
      const mins = Math.floor(sec / 60);
      return (
        <span className="text-sm text-muted-foreground">
          {mins > 0 ? `${mins}m` : `${sec}s`}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const req = row.original;
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
              {req.agent_name ?? req.approval_id.slice(0, 10)}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-emerald-600 hover:!text-emerald-600 dark:text-emerald-500"
              onClick={() =>
                openModal({
                  type: "approveCapability",
                  data: {
                    approvalId: req.approval_id,
                    approvalAgentId: req.agent_id ?? undefined,
                    approvalAgentName: req.agent_name ?? undefined,
                    approvalCapabilities: req.capabilities,
                    approvalBindingMessage: req.binding_message,
                    approvalMethod: req.method,
                  },
                })
              }
            >
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              Approve
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500"
              onClick={() =>
                openModal({
                  type: "approveCapability",
                  data: {
                    approvalId: req.approval_id,
                    approvalAgentId: req.agent_id ?? undefined,
                    approvalAgentName: req.agent_name ?? undefined,
                    approvalCapabilities: req.capabilities,
                    approvalBindingMessage: req.binding_message,
                    approvalMethod: req.method,
                  },
                })
              }
            >
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Deny
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
