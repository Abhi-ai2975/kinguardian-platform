/**
 * @file data-table-row-actions.tsx
 * @description Reusable per-row actions dropdown (the "..." button).
 *
 * Drop it into any column definition's `cell` renderer. Pass an array of
 * `RowAction` objects — each one becomes a menu item. Supports icons,
 * separators, destructive styling, and per-row disabled logic.
 *
 * @example
 * ```tsx
 * {
 *   id: "actions",
 *   cell: ({ row }) => (
 *     <DataTableRowActions
 *       row={row}
 *       actions={[
 *         { label: "View",   icon: Eye,    onClick: (r) => router.push(`/files/${r.original.id}`) },
 *         { label: "Edit",   icon: Pencil, onClick: (r) => openEdit(r.original) },
 *         { separator: true, label: "Delete", icon: Trash2,
 *           onClick: (r) => handleDelete(r.original), destructive: true },
 *       ]}
 *     />
 *   ),
 *   enableSorting: false,
 *   enableHiding: false,
 *   meta: { exportable: false },
 * }
 * ```
 *
 * @layer shared/tables
 */

"use client";

import type { Row } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Describes a single action item in the row actions menu.
 *
 * @template TData - The row data type from TanStack Table.
 */
export interface RowAction<TData> {
  /** Menu item label */
  label: string;
  /** Optional Lucide icon component rendered left of the label */
  icon?: React.ElementType;
  /** Click handler — receives the full TanStack Row */
  onClick: (row: Row<TData>) => void;
  /** When true, the item renders in destructive (red) text */
  destructive?: boolean;
  /** Disables the menu item. Accepts a boolean or a per-row function */
  disabled?: boolean | ((row: Row<TData>) => boolean);
  /** When true, renders a visual separator above this item */
  separator?: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  actions: RowAction<TData>[];
  triggerLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Per-row "..." actions dropdown.
 *
 * @param row - TanStack Row instance.
 * @param actions - Array of action descriptors.
 * @param triggerLabel - Screen-reader label for the trigger button.
 */
export function DataTableRowActions<TData>({
  row,
  actions,
  triggerLabel = "Open row actions",
}: DataTableRowActionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 data-[state=open]:bg-muted"
          aria-label={triggerLabel}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        {actions.map((action, i) => {
          const isDisabled =
            typeof action.disabled === "function"
              ? action.disabled(row)
              : (action.disabled ?? false);

          return (
            <React.Fragment key={i}>
              {action.separator && i > 0 && <DropdownMenuSeparator />}

              <DropdownMenuItem
                onClick={() => !isDisabled && action.onClick(row)}
                disabled={isDisabled}
                className={cn(
                  "gap-2 text-sm",
                  action.destructive &&
                    "text-destructive focus:bg-destructive/10 focus:text-destructive",
                )}
              >
                {action.icon && (
                  <action.icon
                    className={cn(
                      "size-3.5 shrink-0",
                      action.destructive
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  />
                )}
                {action.label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
