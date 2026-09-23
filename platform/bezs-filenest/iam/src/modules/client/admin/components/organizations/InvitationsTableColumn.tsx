import { ColumnDef } from "@tanstack/react-table";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminStore } from "../../stores/admin.store";
import { formatSmartDate } from "@/modules/shared/helper";
import { TOrgInvitation } from "../../types/organizations.type";
import { Button } from "@/components/ui/button";

const statusBadgeClass: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 hover:text-amber-600 dark:text-amber-400",
  accepted: "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400",
  rejected: "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
};

export const invitationsTableColumn = (organizationId: string): ColumnDef<TOrgInvitation>[] => [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground capitalize">{row.original.role ?? "member"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const cls = statusBadgeClass[status] ?? statusBadgeClass.pending;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg capitalize",
            cls,
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "expiresAt",
    header: "Expires",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatSmartDate(row.original.expiresAt)}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Sent",
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
      const invitation = row.original;
      const openModal = adminStore((state) => state.onOpen);

      if (invitation.status !== "pending") return null;

      return (
        <Button
          size="sm"
          variant="ghost"
          className="text-rose-600 hover:text-rose-600 dark:text-rose-500 gap-1"
          onClick={() =>
            openModal({
              type: "cancelInvitation",
              data: {
                invitationId: invitation.id,
                invitationEmail: invitation.email,
                organizationId,
              },
            })
          }
        >
          <XCircle className="h-4 w-4" />
          Cancel
        </Button>
      );
    },
  },
];
