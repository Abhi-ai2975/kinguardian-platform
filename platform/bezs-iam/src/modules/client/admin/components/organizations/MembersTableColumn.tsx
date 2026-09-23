import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Shield, Trash2 } from "lucide-react";
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
import { TOrgMember } from "../../types/organizations.type";

const roleBadgeClass: Record<string, string> = {
  owner: "bg-rose-500/15 text-rose-600 hover:bg-rose-500/20 hover:text-rose-600 dark:text-rose-400",
  admin: "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
  member: "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
};

export const membersTableColumn = (organizationId: string): ColumnDef<TOrgMember>[] => [
  {
    accessorKey: "user",
    header: "Member",
    cell: ({ row }) => {
      const { user } = row.original;
      return (
        <div className="flex items-center gap-2.5">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="h-7 w-7 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const roles = (row.original.role ?? "member")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => {
            const cls = roleBadgeClass[role] ?? roleBadgeClass.member;
            return (
              <Badge
                key={role}
                className={cn(
                  buttonVariants({ size: "sm", variant: "default" }),
                  "cursor-default h-6 rounded-lg",
                  cls,
                )}
              >
                {role}
              </Badge>
            );
          })}
        </div>
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
      const member = row.original;
      const openModal = adminStore((state) => state.onOpen);
      const modalData = {
        memberId: member.id,
        memberUserId: member.userId,
        memberName: member.user.name,
        memberRoles: (member.role ?? "member")
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
        organizationId,
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ size: "icon", variant: "ghost" }), "rounded-full")}
          >
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="left">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {member.user.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => openModal({ type: "updateMemberRole", data: modalData })}
            >
              <Shield className="h-4 w-4" />
              Change Role
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500"
              onClick={() => openModal({ type: "removeMember", data: modalData })}
            >
              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-500" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
