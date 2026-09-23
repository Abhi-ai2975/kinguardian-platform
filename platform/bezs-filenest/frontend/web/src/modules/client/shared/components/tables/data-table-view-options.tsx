/**
 * @file data-table-view-options.tsx
 * @description Column visibility and pinning controls for data tables.
 * Opens a searchable popover listing every column that can be hidden or
 * pinned. Each row provides a visibility checkbox and pin-left/pin-right buttons.
 * @layer shared/tables
 */

"use client";

import type { Table } from "@tanstack/react-table";
import { ArrowLeftToLine, ArrowRightToLine, Check, Settings2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableViewOptionsProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  /** TanStack Table instance used to read/write column visibility and pinning */
  table: Table<TData>;
  /**
   * When true, the trigger button is rendered but non-interactive.
   * @default false
   */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a "View" button opening a Command popover with a searchable list
 * of all columns that support hiding or pinning.
 *
 * @param table - TanStack Table instance.
 * @param disabled - When true, the trigger button is disabled.
 */
export function DataTableViewOptions<TData>({
  table,
  disabled,
  ...props
}: DataTableViewOptionsProps<TData>) {
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (col) =>
            (typeof col.accessorFn !== "undefined" && col.getCanHide()) ||
            col.getCanPin(),
        ),
    [table],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Toggle columns"
          role="combobox"
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 font-normal lg:flex"
          disabled={disabled}
        >
          <Settings2 className="text-muted-foreground" />
          View
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-60 p-0" align="end" {...props}>
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => {
                const isPinnedLeft  = column.getIsPinned() === "left";
                const isPinnedRight = column.getIsPinned() === "right";
                const canHide       = column.getCanHide();
                const canPin        = column.getCanPin();
                const label         = column.columnDef.meta?.label ?? column.id;

                return (
                  <CommandItem
                    key={column.id}
                    className="flex items-center gap-2 pr-1"
                    onSelect={() => {
                      if (canHide) column.toggleVisibility(!column.getIsVisible());
                    }}
                  >
                    {canHide ? (
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          column.getIsVisible() ? "opacity-100" : "opacity-0",
                        )}
                      />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}

                    <span className="flex-1 truncate">{label}</span>

                    {canPin && (
                      <div
                        className="ml-auto flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "size-6",
                            isPinnedLeft && "bg-accent text-accent-foreground",
                          )}
                          onClick={() =>
                            column.pin(isPinnedLeft ? false : "left")
                          }
                          aria-label={isPinnedLeft ? "Unpin column" : "Pin left"}
                          title={isPinnedLeft ? "Unpin" : "Pin left"}
                        >
                          <ArrowLeftToLine className="size-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "size-6",
                            isPinnedRight && "bg-accent text-accent-foreground",
                          )}
                          onClick={() =>
                            column.pin(isPinnedRight ? false : "right")
                          }
                          aria-label={isPinnedRight ? "Unpin column" : "Pin right"}
                          title={isPinnedRight ? "Unpin" : "Pin right"}
                        >
                          <ArrowRightToLine className="size-3" />
                        </Button>
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
