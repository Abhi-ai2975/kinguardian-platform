import { ColumnDef } from "@tanstack/react-table";
import { Edit, EllipsisVertical, ExternalLink, Trash2, Users } from "lucide-react";
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
import { TOrganization } from "../../types/organizations.type";
import { Link } from "@/i18n/navigation";

export const organizationsTableColumn = (): ColumnDef<TOrganization>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <TanstackTableColumnSorting label="Name" column={column} isSorted={column.getIsSorted()} />
    ),
    cell: ({ row }) => {
      const { name, logo } = row.original;
      return (
        <div className="flex items-center gap-2.5">
          {logo ? (
            <img
              src={logo}
              alt={name}
              className="h-7 w-7 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-medium">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground font-mono">{row.original.slug}</span>
    ),
  },
  {
    accessorKey: "memberCount",
    header: "Members",
    cell: ({ row }) => (
      <Badge
        className={cn(
          buttonVariants({ size: "sm", variant: "default" }),
          "cursor-default h-6 rounded-lg bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
        )}
      >
        <Users className="h-3 w-3 mr-1" />
        {row.original.memberCount}
      </Badge>
    ),
  },
  {
    accessorKey: "teamCount",
    header: "Teams",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.teamCount}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
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
      const org = row.original;
      const openModal = adminStore((state) => state.onOpen);
      const modalData = {
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: org.slug,
        organizationLogo: org.logo ?? null,
        organizationMetadata: org.metadata ?? null,
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
              {org.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer gap-2" asChild>
              <Link href={`/admin/organizations/${org.id}`}>
                <ExternalLink className="h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => openModal({ type: "editOrganization", data: modalData })}
            >
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500"
              onClick={() => openModal({ type: "deleteOrganization", data: modalData })}
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
