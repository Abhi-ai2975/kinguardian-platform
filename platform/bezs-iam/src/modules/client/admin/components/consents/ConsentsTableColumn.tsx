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
import { TConsent } from "../../types/consents.type";

export const consentsTableColumn = (): ColumnDef<TConsent>[] => [
  {
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="User ID"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    accessorKey: "userId",
    cell({ row }) {
      return (
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.userId ?? "—"}
        </span>
      );
    },
  },
  {
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Client ID"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    accessorKey: "clientId",
    cell({ row }) {
      return (
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.clientId}
        </span>
      );
    },
  },
  {
    header: "Scopes",
    accessorKey: "scopes",
    cell({ row }) {
      const scopes = row.original.scopes;
      if (!scopes || scopes.length === 0)
        return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {scopes.map((scope) => (
            <Badge
              key={scope}
              className={cn(
                buttonVariants({
                  size: "sm",
                  variant: "default",
                  className:
                    "cursor-default h-6 rounded-lg bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary font-mono text-xs",
                }),
              )}
            >
              {scope}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    header: "Reference",
    accessorKey: "referenceId",
    cell({ row }) {
      return row.original.referenceId ? (
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.referenceId}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Granted"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    accessorKey: "createdAt",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.createdAt
          ? formatSmartDate(row.original.createdAt)
          : "—"}
      </span>
    ),
  },
  {
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Updated"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    accessorKey: "updatedAt",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.updatedAt
          ? formatSmartDate(row.original.updatedAt)
          : "—"}
      </span>
    ),
  },
  {
    header: "ACTIONS",
    id: "actions",
    cell: ({ row }) => {
      const consent = row.original;
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
              {consent.id}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({
                  type: "updateConsentScopes",
                  data: {
                    consentId: consent.id,
                    consentScopes: consent.scopes,
                    consentClientId: consent.clientId,
                    consentUserId: consent.userId,
                  },
                })
              }
            >
              <Edit className="h-4 w-4" />
              Edit Scopes
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500 dark:hover:!text-rose-500"
              onClick={() =>
                openModal({
                  type: "deleteConsent",
                  data: {
                    consentId: consent.id,
                    consentClientId: consent.clientId,
                    consentUserId: consent.userId,
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Revoke
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
