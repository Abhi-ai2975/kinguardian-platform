import { ColumnDef } from "@tanstack/react-table";
import { Edit } from "lucide-react";
import { TanstackTableColumnSorting } from "@/modules/client/shared/components/table/tanstack-table-column-sorting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminStore } from "../../stores/admin.store";
import { TUserContextListItem } from "../../types/user-context.type";

export const userContextTableColumn = (): ColumnDef<TUserContextListItem>[] => [
  {
    accessorKey: "userName",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Name"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => {
      const { userName, userEmail, userImage } = row.original;
      return (
        <div className="flex items-center gap-2.5">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="h-7 w-7 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "activeOrganizationName",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Active Organization"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => {
      const { activeOrganizationName } = row.original;
      if (!activeOrganizationName) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return <span className="text-sm">{activeOrganizationName}</span>;
    },
  },
  {
    accessorKey: "activeRoleId",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Active Role"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => {
      const { activeRoleName } = row.original;
      if (!activeRoleName) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <Badge variant="outline" className="text-xs capitalize">
          {activeRoleName}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              adminStore.getState().onOpen({
                type: "setUserContext",
                data: {
                  userContextUserId: item.userId,
                  userContextUserName: item.userName,
                  userContextUserEmail: item.userEmail,
                  userContextActiveOrganizationId: item.activeOrganizationId ?? null,
                  userContextActiveRoleId: item.activeRoleId ?? null,
                },
              })
            }
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Set context</span>
          </Button>
        </div>
      );
    },
  },
];
