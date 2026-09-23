/**
 * @file data-table-sort-list.tsx
 * @description Multi-column sort builder for data tables. Renders an "Sort"
 * button that opens a popover with an interactive list of active sorts.
 * Users can add, remove, change fields/directions, and reset all sorts.
 * Manipulates TanStack Table's sorting state directly via table.setSorting().
 *
 * This is a local-state implementation (no URL sync, no drag-to-reorder)
 * suitable for client-side tables.
 *
 * @layer shared/tables
 */

"use client";

import type { ColumnSort, Table } from "@tanstack/react-table";
import { ArrowDownUp, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableSortListProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  /** TanStack Table instance used to read/write sorting state */
  table: Table<TData>;
  /** When true, the trigger button is disabled */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Sort builder popover that allows users to build multi-column sort rules.
 * Each rule has a field (column) selector and a direction (asc/desc) selector.
 *
 * Clicking "Add sort" adds a new rule for the first available sortable column.
 * Each rule can be independently configured or removed.
 * "Reset sorting" returns to the table's initial sort state.
 *
 * @param table - TanStack Table instance.
 * @param disabled - When true, disables the trigger button.
 */
export function DataTableSortList<TData>({
  table,
  disabled,
  ...popoverProps
}: DataTableSortListProps<TData>) {
  const [open, setOpen] = React.useState(false);

  const sorting = table.getState().sorting;

  // Build a map of column-id → label for all sortable columns
  const { columnLabels, availableColumns } = React.useMemo(() => {
    const labels = new Map<string, string>();
    const usedIds = new Set(sorting.map((s) => s.id));
    const available: { id: string; label: string }[] = [];

    for (const col of table.getAllColumns()) {
      if (!col.getCanSort()) continue;
      const label = col.columnDef.meta?.label ?? col.id;
      labels.set(col.id, label);
      // Only offer columns not already in the sort list for "Add sort"
      if (!usedIds.has(col.id)) {
        available.push({ id: col.id, label });
      }
    }
    return { columnLabels: labels, availableColumns: available };
  }, [sorting, table]);

  /** Appends a new sort rule for the first available column */
  const onSortAdd = React.useCallback(() => {
    const first = availableColumns[0];
    if (!first) return;
    table.setSorting((prev) => [...prev, { id: first.id, desc: false }]);
  }, [availableColumns, table]);

  /**
   * Updates an existing sort rule identified by its column id.
   * @param sortId - Column id of the sort rule to update.
   * @param updates - Partial ColumnSort updates (id and/or desc).
   */
  const onSortUpdate = React.useCallback(
    (sortId: string, updates: Partial<ColumnSort>) => {
      table.setSorting((prev) =>
        prev.map((s) => (s.id === sortId ? { ...s, ...updates } : s)),
      );
    },
    [table],
  );

  /**
   * Removes a sort rule by its column id.
   * @param sortId - Column id of the sort rule to remove.
   */
  const onSortRemove = React.useCallback(
    (sortId: string) => {
      table.setSorting((prev) => prev.filter((s) => s.id !== sortId));
    },
    [table],
  );

  /** Clears all sorting rules */
  const onSortingReset = React.useCallback(() => {
    table.setSorting([]);
  }, [table]);

  // All sortable columns (including already-used ones, for changing field)
  const allSortableColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((c) => c.getCanSort())
        .map((c) => ({
          id: c.id,
          label: c.columnDef.meta?.label ?? c.id,
        })),
    [table],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-normal"
          disabled={disabled}
        >
          <ArrowDownUp className="text-muted-foreground" />
          Sort
          {sorting.length > 0 && (
            <Badge
              variant="secondary"
              className="h-[18px] rounded px-1.5 font-mono font-normal text-[10px]"
            >
              {sorting.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="flex w-full max-w-(--radix-popover-content-available-width) flex-col gap-3.5 p-4 sm:min-w-[380px]"
        align="start"
        {...popoverProps}
      >
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h4 className="font-medium leading-none text-sm">
            {sorting.length > 0 ? "Sort by" : "No sorting applied"}
          </h4>
          {sorting.length === 0 && (
            <p className="text-muted-foreground text-xs">
              Add sorting to organise your rows.
            </p>
          )}
        </div>

        {/* Sort rule list */}
        {sorting.length > 0 && (
          <div className="flex flex-col gap-2">
            {sorting.map((sort) => (
              <SortItem
                key={sort.id}
                sort={sort}
                allColumns={allSortableColumns}
                columnLabels={columnLabels}
                onSortUpdate={onSortUpdate}
                onSortRemove={onSortRemove}
              />
            ))}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="rounded"
            onClick={onSortAdd}
            disabled={availableColumns.length === 0}
          >
            Add sort
          </Button>
          {sorting.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded"
              onClick={onSortingReset}
            >
              Reset sorting
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Single sort rule row
// ---------------------------------------------------------------------------

interface SortItemProps {
  sort: ColumnSort;
  allColumns: { id: string; label: string }[];
  columnLabels: Map<string, string>;
  onSortUpdate: (sortId: string, updates: Partial<ColumnSort>) => void;
  onSortRemove: (sortId: string) => void;
}

/**
 * Renders a single sort rule row with a field selector, direction selector,
 * and a remove button.
 *
 * @param sort - The current ColumnSort state for this rule.
 * @param allColumns - All sortable columns available to switch to.
 * @param columnLabels - Map of column id → display label.
 * @param onSortUpdate - Updates this rule's field or direction.
 * @param onSortRemove - Removes this rule.
 */
function SortItem({
  sort,
  allColumns,
  columnLabels,
  onSortUpdate,
  onSortRemove,
}: SortItemProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Field selector */}
      <Select
        value={sort.id}
        onValueChange={(value) => onSortUpdate(sort.id, { id: value })}
      >
        <SelectTrigger className="h-8 w-44 rounded font-normal text-sm">
          <SelectValue>
            <span className="truncate">{columnLabels.get(sort.id)}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allColumns.map((col) => (
            <SelectItem key={col.id} value={col.id}>
              {col.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Direction selector */}
      <Select
        value={sort.desc ? "desc" : "asc"}
        onValueChange={(v) => onSortUpdate(sort.id, { desc: v === "desc" })}
      >
        <SelectTrigger className="h-8 w-28 rounded font-normal text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">
            <span className="flex items-center gap-1.5">
              <ChevronUp className="size-3.5 text-muted-foreground" />
              Ascending
            </span>
          </SelectItem>
          <SelectItem value="desc">
            <span className="flex items-center gap-1.5">
              <ChevronDown className="size-3.5 text-muted-foreground" />
              Descending
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Remove button */}
      <Button
        variant="outline"
        size="icon"
        className="size-8 rounded"
        aria-label="Remove sort"
        onClick={() => onSortRemove(sort.id)}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
