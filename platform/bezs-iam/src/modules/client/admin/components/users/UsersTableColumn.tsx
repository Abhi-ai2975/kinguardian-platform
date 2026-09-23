import { ColumnDef } from "@tanstack/react-table";
import {
  Edit,
  EllipsisVertical,
  KeyRound,
  ShieldBan,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
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
import { formatSmartDate } from "@/modules/shared/helper";
import { TUser } from "../../types/users.type";

const roleBadgeClass: Record<string, string> = {
  superadmin:
    "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 hover:text-rose-600 dark:text-rose-400",
  admin: "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
  guest:
    "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
};

export const usersTableColumn = (): ColumnDef<TUser>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Name"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => {
      const { name, image } = row.original;
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
          <span className="font-medium">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <TanstackTableColumnSorting
        label="Email"
        column={column}
        isSorted={column.getIsSorted()}
      />
    ),
    cell: ({ row }) => {
      const { email, username } = row.original;
      return (
        <div>
          <p className="text-sm">{email}</p>
          {username && (
            <p className="text-xs text-muted-foreground">@{username}</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.role ?? "guest";
      const cls = roleBadgeClass[role] ?? roleBadgeClass.guest;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            cls,
          )}
        >
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "emailVerified",
    header: "Verified",
    cell: ({ row }) => {
      const verified = row.original.emailVerified;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            verified
              ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
          )}
        >
          {verified ? "Verified" : "Unverified"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "twoFactorEnabled",
    header: "2FA",
    cell: ({ row }) => {
      const enabled = row.original.twoFactorEnabled;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            enabled
              ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
              : "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
          )}
        >
          {enabled ? "Enabled" : "Disabled"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "banned",
    header: "Status",
    cell: ({ row }) => {
      const banned = row.original.banned;
      return (
        <Badge
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "cursor-default h-6 rounded-lg",
            banned
              ? "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 hover:text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:text-emerald-400",
          )}
        >
          {banned ? "Banned" : "Active"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
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
      const user = row.original;
      const openModal = adminStore((state) => state.onOpen);
      const modalData = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userUsername: user.username ?? null,
        userImage: user.image ?? null,
        currentRole: user.role,
        isBanned: user.banned ?? false,
      };

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
              {user.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => openModal({ type: "updateUser", data: modalData })}
            >
              <Edit className="h-4 w-4" />
              Edit User
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => openModal({ type: "setRole", data: modalData })}
            >
              <ShieldCheck className="h-4 w-4" />
              Set Role
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({ type: "setUserPassword", data: modalData })
              }
            >
              <KeyRound className="h-4 w-4" />
              Set Password
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({ type: "revokeUserSessions", data: modalData })
              }
            >
              <UserX className="h-4 w-4" />
              Revoke Sessions
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                openModal({ type: "impersonateUser", data: modalData })
              }
            >
              <UserCheck className="h-4 w-4" />
              Impersonate
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {user.banned ? (
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() =>
                  openModal({
                    type: "banUser",
                    data: modalData,
                  })
                }
              >
                <ShieldCheck className="h-4 w-4" />
                Unban User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-amber-600 hover:!text-amber-600 dark:text-amber-500"
                onClick={() => openModal({ type: "banUser", data: modalData })}
              >
                <ShieldBan className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                Ban User
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500"
              onClick={() => openModal({ type: "removeUser", data: modalData })}
            >
              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
