import { ColumnDef } from "@tanstack/react-table";
import { Edit, EllipsisVertical, RefreshCw, Trash2 } from "lucide-react";
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
import { TOAuthClient } from "../../types/oauthclient.type";

export const oauthClientsTableColumn = (): ColumnDef<TOAuthClient>[] => [
  {
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return (
        <TanstackTableColumnSorting
          label="Client Name"
          column={column}
          isSorted={isSorted}
        />
      );
    },
    accessorKey: "client_name",
  },
  {
    header: "Client ID",
    accessorKey: "client_id",
    cell({ row }) {
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.client_id}
        </span>
      );
    },
  },
  {
    header: "Type",
    accessorKey: "public",
    cell({ row }) {
      return (
        <Badge
          className={cn(
            buttonVariants({
              size: "sm",
              variant: "default",
              className:
                "cursor-default h-6 rounded-lg bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
            }),
          )}
        >
          {row.original.public ? "Public" : "Confidential"}
        </Badge>
      );
    },
  },
  {
    header: "Grant Types",
    accessorKey: "grant_types",
    cell({ row }) {
      const grantTypes = row.original.grant_types;
      if (!grantTypes || grantTypes.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {grantTypes.map((gt) => (
            <Badge
              key={gt}
              className={cn(
                buttonVariants({
                  size: "sm",
                  variant: "default",
                  className:
                    "cursor-default h-6 rounded-lg bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary font-mono text-xs",
                }),
              )}
            >
              {gt}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    header: "Scopes",
    accessorKey: "scope",
    cell({ row }) {
      const scopes = row.original.scope?.split(" ") || [];

      return row.original.scope ? (
        <div className="flex items-center gap-2 flex-wrap w-70">
          {scopes.map((scope, i) => (
            <Badge
              key={i}
              className={cn(
                buttonVariants({
                  size: "sm",
                  variant: "default",
                  className:
                    "cursor-default h-6 rounded-lg bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
                }),
              )}
            >
              {scope}
            </Badge>
          ))}
        </div>
      ) : (
        "-"
      );
    },
  },
  {
    header: "Status",
    accessorKey: "disabled",
    cell: ({ row }) => {
      const disabled: boolean = row.getValue("disabled");
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            disabled
              ? "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400",
          )}
        >
          {disabled ? "Disabled" : "Active"}
        </Badge>
      );
    },
  },
  {
    header: "Created At",
    accessorKey: "client_id_issued_at",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatSmartDate(row.original.client_id_issued_at)}
      </span>
    ),
  },
  {
    header: "ACTIONS",
    id: "actions",
    cell: ({ row }) => {
      const oauthClientData = row.original;
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
              {oauthClientData.client_name ?? oauthClientData.client_id}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "editOAuthClient",
                  data: {
                    clientId: oauthClientData.client_id,
                    clientName: oauthClientData.client_name ?? undefined,
                    oauthClient: oauthClientData,
                  },
                })
              }
            >
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "rotateClientSecret",
                  data: {
                    clientId: oauthClientData.client_id,
                    clientName: oauthClientData.client_name ?? undefined,
                  },
                })
              }
            >
              <RefreshCw className="h-4 w-4" />
              Rotate Secret
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500 dark:hover:!text-rose-500"
              onClick={() =>
                openModal({
                  type: "deleteOAuthClient",
                  data: {
                    clientId: oauthClientData.client_id,
                    clientName: oauthClientData.client_name ?? undefined,
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
