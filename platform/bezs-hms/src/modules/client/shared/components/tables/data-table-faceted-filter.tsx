/**
 * @file data-table-faceted-filter.tsx
 * @description Command-based faceted filter for "select" and "multiSelect"
 * column variants. Renders a dashed-border popover button that opens a
 * searchable command list. Supports single selection (select) and multi-
 * selection (multiSelect). Shows selected values as badges in the trigger.
 * @layer shared/tables
 */

"use client";

import type { Column } from "@tanstack/react-table";
import { Check, PlusCircle, XCircle } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Option } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableFacetedFilterProps<TData, TValue> {
  /** The TanStack column to set filter values on */
  column?: Column<TData, TValue>;
  /** Label shown on the trigger button when no value is selected */
  title?: string;
  /** All available options to display in the command list */
  options: Option[];
  /**
   * When true, allows multiple values to be selected simultaneously.
   * When false (default), selecting a new value clears the previous one.
   */
  multiple?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a faceted filter popover backed by a Command (cmdk) interface.
 * Supports both single and multi-select modes depending on the column variant.
 *
 * @param column - TanStack column to read/write filter state.
 * @param title - Button label and command input placeholder.
 * @param options - Array of selectable options with labels, values, and counts.
 * @param multiple - When true, allows selecting multiple options at once.
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  multiple,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [open, setOpen] = React.useState(false);

  // Derive selected values from the column filter state
  const columnFilterValue = column?.getFilterValue();
  const selectedValues = new Set(
    Array.isArray(columnFilterValue) ? columnFilterValue : [],
  );

  /**
   * Handles an option being selected or deselected.
   * In single-select mode, closes the popover after selection.
   */
  const onItemSelect = React.useCallback(
    (option: Option, isSelected: boolean) => {
      if (!column) return;

      if (multiple) {
        // Toggle the item in the set without closing
        const next = new Set(selectedValues);
        if (isSelected) {
          next.delete(option.value);
        } else {
          next.add(option.value);
        }
        const arr = Array.from(next);
        column.setFilterValue(arr.length ? arr : undefined);
      } else {
        // Single select — deselect if already selected, else set exclusively
        column.setFilterValue(isSelected ? undefined : [option.value]);
        setOpen(false);
      }
    },
    [column, multiple, selectedValues],
  );

  /**
   * Clears all selected filter values for this column.
   * Stops propagation so the popover doesn't re-open on the clear icon click.
   */
  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      column?.setFilterValue(undefined);
    },
    [column],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-dashed font-normal"
        >
          {/* Show X-circle when active, plus-circle when empty */}
          {selectedValues.size > 0 ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onReset}
            >
              <XCircle />
            </div>
          ) : (
            <PlusCircle />
          )}

          {title}

          {/* Selected badges shown in trigger */}
          {selectedValues.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-[orientation=vertical]:h-4"
              />
              {/* Mobile: show count only */}
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              {/* Desktop: show individual option labels (up to 2) or count */}
              <div className="hidden items-center gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((o) => selectedValues.has(o.value))
                    .map((o) => (
                      <Badge
                        key={o.value}
                        variant="secondary"
                        className="rounded-sm px-1 font-normal"
                      >
                        {o.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${title}...`} />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => onItemSelect(option, isSelected)}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="size-3" />
                    </div>
                    {/* Optional icon */}
                    {option.icon && <option.icon className="size-4 text-muted-foreground" />}
                    <span className="truncate">{option.label}</span>
                    {/* Faceted count */}
                    {option.count !== undefined && (
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* Clear all — only shown when something is selected */}
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onReset()}
                    className="justify-center text-center text-sm"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
