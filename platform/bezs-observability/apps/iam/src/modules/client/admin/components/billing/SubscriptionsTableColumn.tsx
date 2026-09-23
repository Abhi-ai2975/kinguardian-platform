"use client";

import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, XCircle } from "lucide-react";
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
import type { TSubscriptionRow } from "../../types/billing.type";

const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400",
  trialing:
    "bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 hover:text-blue-600 dark:text-blue-400",
  canceled:
    "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
  past_due:
    "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 hover:text-amber-600 dark:text-amber-400",
  incomplete:
    "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
  unpaid:
    "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 hover:text-rose-600 dark:text-rose-400",
};

export const subscriptionsTableColumn = (): ColumnDef<TSubscriptionRow>[] => [
  {
    header: ({ column }) => (
      <TanstackTableColumnSorting label="User" column={column} isSorted={column.getIsSorted()} />
    ),
    accessorKey: "userEmail",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{row.original.userName ?? "—"}</span>
        <span className="text-xs text-muted-foreground">{row.original.userEmail ?? row.original.referenceId}</span>
      </div>
    ),
  },
  {
    header: ({ column }) => (
      <TanstackTableColumnSorting label="Plan" column={column} isSorted={column.getIsSorted()} />
    ),
    accessorKey: "plan",
    cell: ({ row }) => (
      <Badge
        className={cn(
          buttonVariants({ size: "sm", variant: "default" }),
          "cursor-default h-6 rounded-lg bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary capitalize",
        )}
      >
        {row.original.plan}
      </Badge>
    ),
  },
  {
    header: ({ column }) => (
      <TanstackTableColumnSorting label="Status" column={column} isSorted={column.getIsSorted()} />
    ),
    accessorKey: "status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg capitalize",
            STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
          )}
        >
          {status.replace(/_/g, " ")}
          {row.original.cancelAtPeriodEnd && " (ends at period)"}
        </Badge>
      );
    },
  },
  {
    header: "Interval",
    accessorKey: "billingInterval",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground capitalize">
        {row.original.billingInterval ?? "—"}
      </span>
    ),
  },
  {
    header: "Period End",
    accessorKey: "periodEnd",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.periodEnd ? formatSmartDate(row.original.periodEnd) : "—"}
      </span>
    ),
  },
  {
    header: "Stripe Sub ID",
    accessorKey: "stripeSubscriptionId",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.stripeSubscriptionId ?? "—"}
      </span>
    ),
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatSmartDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    header: "ACTIONS",
    id: "actions",
    cell: ({ row }) => {
      const sub = row.original;
      const openModal = adminStore((state) => state.onOpen);

      const canCancel =
        sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";

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
              {sub.userEmail ?? sub.referenceId}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500 dark:hover:!text-rose-500"
              disabled={!canCancel}
              onClick={() =>
                openModal({
                  type: "cancelSubscription",
                  data: {
                    subscriptionId: sub.id,
                    subscriptionPlan: sub.plan,
                    subscriptionUserEmail: sub.userEmail ?? sub.referenceId,
                  },
                })
              }
            >
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Cancel subscription
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
