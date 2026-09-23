import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, ShieldOff } from "lucide-react";
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
import { TSession } from "../../types/sessions.type";

export const sessionsTableColumn = (): ColumnDef<TSession>[] => [
  {
    accessorKey: "user",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="User"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => {
      const { name, email, image } = row.original.user;
      return (
        <div className="flex items-center gap-2.5">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-7 w-7 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "ipAddress",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="IP Address"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => {
      const ip = row.original.ipAddress;
      return (
        <span className="text-sm font-mono">
          {ip ?? <span className="text-muted-foreground">Unknown</span>}
        </span>
      );
    },
  },
  {
    accessorKey: "userAgent",
    header: "User Agent",
    cell: ({ row }) => {
      const ua = row.original.userAgent;
      if (!ua) return <span className="text-muted-foreground text-sm">Unknown</span>;
      return (
        <span className="text-sm max-w-[240px] truncate block" title={ua}>
          {ua}
        </span>
      );
    },
  },
  {
    accessorKey: "expiresAt",
    header: "Status",
    cell: ({ row }) => {
      const isExpired = row.original.expiresAt < new Date();
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            isExpired
              ? "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400",
          )}
        >
          {isExpired ? "Expired" : "Active"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "impersonatedBy",
    header: "Impersonated",
    cell: ({ row }) => {
      const imp = row.original.impersonatedBy;
      if (!imp) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 hover:text-amber-600 dark:text-amber-400",
          )}
        >
          Yes
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Created"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
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
      const session = row.original;
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
              {session.user.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500"
              onClick={() =>
                openModal({
                  type: "revokeSession",
                  data: {
                    sessionToken: session.token,
                    sessionIp: session.ipAddress ?? null,
                    sessionUserAgent: session.userAgent ?? null,
                  },
                })
              }
            >
              <ShieldOff className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Revoke Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
