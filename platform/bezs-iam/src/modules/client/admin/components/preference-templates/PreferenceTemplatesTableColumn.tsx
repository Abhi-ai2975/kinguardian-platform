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
import { TPreferenceTemplate } from "../../types/preference-template.type";
import { format } from "date-fns";

export const preferenceTemplatesTableColumn =
  (): ColumnDef<TPreferenceTemplate>[] => [
    {
      accessorKey: "scope",
      header: "Scope",
      cell: ({ row }) => {
        const scope = row.original.scope;
        return (
          <Badge
            className={cn(
              buttonVariants({ size: "sm", variant: "default" }),
              "cursor-default h-6 rounded-lg",
              scope === "GLOBAL"
                ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 hover:text-amber-600 dark:text-amber-400",
            )}
          >
            {scope}
          </Badge>
        );
      },
    },
    {
      accessorKey: "country",
      header: "Country",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.country ?? "—"}</span>
      ),
    },
    {
      accessorKey: "timezone",
      header: ({ column }) => (
        <TanstackTableColumnSorting
          label="Timezone"
          column={column}
          isSorted={column.getIsSorted()}
        />
      ),
    },
    {
      accessorKey: "dateFormat",
      header: "Date Format",
    },
    {
      accessorKey: "timeFormat",
      header: "Time Format",
    },
    {
      accessorKey: "currency",
      header: ({ column }) => (
        <TanstackTableColumnSorting
          label="Currency"
          column={column}
          isSorted={column.getIsSorted()}
        />
      ),
    },
    {
      accessorKey: "numberFormat",
      header: "Number Format",
    },
    {
      accessorKey: "weekStart",
      header: "Week Start",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.weekStart ?? "—"}</span>
      ),
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
          {format(row.original.createdAt, "dd MMM yyyy")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
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
                {item.scope === "GLOBAL" ? "Global" : item.country ?? "Template"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() =>
                  openModal({
                    type: "editPreferenceTemplate",
                    data: {
                      preferenceTemplateId: item.id,
                      preferenceTemplateScope: item.scope,
                      preferenceTemplateCountry: item.country ?? null,
                      preferenceTemplateTimezone: item.timezone ?? null,
                      preferenceTemplateDateFormat: item.dateFormat ?? null,
                      preferenceTemplateTimeFormat: item.timeFormat ?? null,
                      preferenceTemplateCurrency: item.currency ?? null,
                      preferenceTemplateNumberFormat: item.numberFormat ?? null,
                      preferenceTemplateWeekStart: item.weekStart ?? null,
                    },
                  })
                }
              >
                <Edit className="h-4 w-4" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer gap-2 text-rose-600 hover:!text-rose-600 dark:text-rose-500 dark:hover:!text-rose-500"
                onClick={() =>
                  openModal({
                    type: "deletePreferenceTemplate",
                    data: {
                      preferenceTemplateId: item.id,
                      preferenceTemplateScope: item.scope,
                      preferenceTemplateCountry: item.country ?? null,
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
