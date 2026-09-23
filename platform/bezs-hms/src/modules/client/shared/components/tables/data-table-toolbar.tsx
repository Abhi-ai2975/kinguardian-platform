/**
 * @file data-table-toolbar.tsx
 * @description Smart filter toolbar for data tables. Automatically renders
 * the appropriate filter control for each filterable column based on the
 * `variant` property in column meta. Includes a global "Reset" button when
 * any filter is active. Supports slotting in extra children (e.g. an "Add"
 * button) alongside the column-visibility toggle.
 *
 * Filter variant → control mapping:
 * - "text"        → plain text Input
 * - "number"      → numeric Input (with optional unit suffix)
 * - "range"       → DataTableSliderFilter
 * - "date"        → DataTableDateFilter (single)
 * - "dateRange"   → DataTableDateFilter (range)
 * - "select"      → DataTableFacetedFilter (single)
 * - "multiSelect" → DataTableFacetedFilter (multi)
 *
 * @layer shared/tables
 */

"use client";

import type { Column, Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { DataTableDateFilter } from "./data-table-date-filter";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableSliderFilter } from "./data-table-slider-filter";
import { DataTableViewOptions } from "./data-table-view-options";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  /** TanStack Table instance used to read column filters and all columns */
  table: Table<TData>;
  /**
   * When false, the built-in DataTableViewOptions (column visibility / pin)
   * button is omitted from the right slot. Useful when you want to suppress
   * the "View" popover for a specific table.
   * @default true
   */
  showViewOptions?: boolean;
}

// ---------------------------------------------------------------------------
// Main toolbar
// ---------------------------------------------------------------------------

/**
 * Toolbar component that auto-renders filter controls for every filterable
 * column (columns with `enableColumnFilter: true` and a `meta.variant`).
 * Extra children are rendered to the right, before the view-options toggle.
 *
 * @param table - TanStack Table instance.
 * @param children - Optional extra controls (e.g. an "Add" button or search).
 * @param className - Additional Tailwind classes.
 */
export function DataTableToolbar<TData>({
  table,
  children,
  showViewOptions = true,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Only show columns that can be filtered and have a meta variant defined
  const filterableColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((col) => col.getCanFilter() && col.columnDef.meta?.variant),
    [table],
  );

  const onReset = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full items-start justify-between gap-2 p-1",
        className,
      )}
      {...props}
    >
      {/* Left side: filter controls */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {filterableColumns.map((column) => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}

        {/* Reset all filters */}
        {isFiltered && (
          <Button
            aria-label="Reset all filters"
            variant="outline"
            size="sm"
            className="border-dashed"
            onClick={onReset}
          >
            <X />
            Reset
          </Button>
        )}
      </div>

      {/* Right side: extra children + column visibility */}
      <div className="flex items-center gap-2">
        {children}
        {showViewOptions && <DataTableViewOptions table={table} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-column filter renderer
// ---------------------------------------------------------------------------

interface DataTableToolbarFilterProps<TData> {
  /** Column whose meta.variant determines which filter control to render */
  column: Column<TData>;
}

/**
 * Renders the appropriate filter control for a single column based on its
 * `meta.variant`. Returns null for unsupported or missing variants.
 *
 * @param column - TanStack column with a variant defined in its meta.
 */
function DataTableToolbarFilter<TData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  const meta = column.columnDef.meta;

  if (!meta?.variant) return null;

  switch (meta.variant) {
    // Plain text input — case-insensitive substring match
    case "text":
      return (
        <Input
          placeholder={meta.placeholder ?? meta.label ?? column.id}
          value={(column.getFilterValue() as string) ?? ""}
          onChange={(e) => column.setFilterValue(e.target.value || undefined)}
          className="h-8 w-40 lg:w-56"
        />
      );

    // Numeric input — optionally with a unit suffix (e.g. "kg")
    case "number":
      return (
        <div className="relative">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={meta.placeholder ?? meta.label ?? column.id}
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className={cn("h-8 w-[120px]", meta.unit && "pr-8")}
          />
          {meta.unit && (
            <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
              {meta.unit}
            </span>
          )}
        </div>
      );

    // Dual-thumb slider + min/max inputs
    case "range":
      return (
        <DataTableSliderFilter
          column={column}
          title={meta.label ?? column.id}
        />
      );

    // Single date picker
    case "date":
      return (
        <DataTableDateFilter
          column={column}
          title={meta.label ?? column.id}
          multiple={false}
        />
      );

    // Date-range (from/to) picker
    case "dateRange":
      return (
        <DataTableDateFilter
          column={column}
          title={meta.label ?? column.id}
          multiple
        />
      );

    // Single-select faceted command filter
    case "select":
      return (
        <DataTableFacetedFilter
          column={column}
          title={meta.label ?? column.id}
          options={meta.options ?? []}
          multiple={false}
        />
      );

    // Multi-select faceted command filter
    case "multiSelect":
      return (
        <DataTableFacetedFilter
          column={column}
          title={meta.label ?? column.id}
          options={meta.options ?? []}
          multiple
        />
      );

    default:
      return null;
  }
}
