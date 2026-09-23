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
 *         { label: "View",   icon: Eye,   onClick: (r) => router.push(`/patients/${r.original.id}`) },
 *         { label: "Edit",   icon: Pencil, onClick: (r) => openEdit(r.original) },
 *         { separator: true, label: "Delete", icon: Trash2,
 *           onClick: (r) => handleDelete(r.original), destructive: true },
 *       ]}
 *     />
 *   ),
 *   enableSorting: false,
 *   enableHiding: false,
 *   meta: { exportable: false },  // exclude from export
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
  /**
   * Optional Lucide icon component rendered left of the label.
   * Pass the component itself, not a JSX element: `icon: Trash2`
   */
  icon?: React.ElementType;
  /**
   * Click handler. Receives the full TanStack Row so you can access
   * `row.original` for the typed data object.
   *
   * @param row - The TanStack Row that was acted on.
   */
  onClick: (row: Row<TData>) => void;
  /**
   * When true, the item renders in destructive (red) text.
   * Use for irreversible actions like Delete.
   * @default false
   */
  destructive?: boolean;
  /**
   * Disables the menu item. Pass a boolean or a function that receives the
   * row and returns a boolean for per-row conditional disabling.
   *
   * @example
   * ```ts
   * disabled: (row) => row.original.status === "locked"
   * ```
   */
  disabled?: boolean | ((row: Row<TData>) => boolean);
  /**
   * When true, renders a visual separator above this item.
   * Useful for grouping destructive actions at the bottom.
   * @default false
   */
  separator?: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableRowActionsProps<TData> {
  /** The TanStack Row this button belongs to */
  row: Row<TData>;
  /**
   * Ordered list of actions to render in the dropdown.
   * Items with `separator: true` get a divider above them.
   */
  actions: RowAction<TData>[];
  /**
   * Accessible label for the trigger button.
   * @default "Open row actions"
   */
  triggerLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Per-row "..." actions dropdown.
 *
 * Renders a ghost icon button that opens a dropdown menu populated from the
 * `actions` array. Place it in a column definition with `enableSorting: false`,
 * `enableHiding: false`, and `meta: { exportable: false }`.
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
              {/* Separator above the item (not before the very first item) */}
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
