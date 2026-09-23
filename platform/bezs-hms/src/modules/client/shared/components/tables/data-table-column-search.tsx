/**
 * @file data-table-column-search.tsx
 * @description Scoped search control that lets users choose which columns to
 * search across before typing a query. Renders a compact trigger showing the
 * active column selection alongside a debounced text input. Clicking the
 * trigger opens a popover with checkboxes — one per searchable column.
 *
 * Usage requires a custom globalFilterFn on the table that reads the selected
 * column ids from a mutable ref (see `createColumnSearchFilterFn` below).
 * The component calls `onColumnIdsChange` whenever the selection changes so
 * the parent can keep the ref in sync.
 *
 * @layer shared/tables
 */

"use client";

import type { Table } from "@tanstack/react-table";
import { Check, ChevronDown, Search, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "./hooks/use-debounced-callback";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Describes a single column option in the scope selector */
export interface SearchableColumn {
  /** Column id used in TanStack Table */
  id: string;
  /** Human-readable label shown in the dropdown */
  label: string;
}

// ---------------------------------------------------------------------------
// createColumnSearchFilterFn
// ---------------------------------------------------------------------------

/**
 * Factory that returns a stable TanStack `globalFilterFn` whose column scope
 * is driven by a getter function. Pass this to `useDataTable` or
 * `useReactTable` as `globalFilterFn`, and keep the underlying Set in sync via
 * `onColumnIdsChange`.
 *
 * Accepts a getter `() => Set<string>` rather than a React ref so that React's
 * compiler does not flag ref access during render (the getter is only invoked
 * inside TanStack's filter pass, never during the React render phase).
 *
 * Because the function closes over the getter (not the Set directly), it is
 * stable across renders and never needs to be recreated — the getter reads the
 * to the next filter pass automatically.
 *
 * @param getColumnIds - A stable getter that returns the current Set of column ids to search.
 * @returns A globalFilterFn compatible with TanStack Table.
 *
 * @example
 * ```tsx
 * const searchColumnsRef = React.useRef<Set<string>>(
 *   new Set(["name", "role", "department"]),
 * );
 * // Wrap in useCallback so the getter is stable and can be passed without
 * // triggering React's "ref access during render" compiler check.
 * const getSearchColumns = React.useCallback(() => searchColumnsRef.current, []);
 * const columnSearchFn = React.useMemo(
 *   () => createColumnSearchFilterFn(getSearchColumns),
 *   [getSearchColumns],
 * );
 * const { table } = useDataTable({ columns, data, globalFilterFn: columnSearchFn });
 * ```
 */
export function createColumnSearchFilterFn<TData>(
  getColumnIds: () => Set<string>,
) {
  return function columnSearchFilterFn(
    row: import("@tanstack/react-table").Row<TData>,
    columnId: string,
    filterValue: string,
  ): boolean {
    const columnIds = getColumnIds();
    // If no columns are selected, show all rows (no restriction)
    if (columnIds.size === 0) return true;
    // Only apply to columns in the current selection
    if (!columnIds.has(columnId)) return false;
    const value = row.getValue(columnId);
    return String(value ?? "")
      .toLowerCase()
      .includes(String(filterValue).toLowerCase());
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableColumnSearchProps<TData>
  extends React.ComponentProps<"div"> {
  /** TanStack Table instance — globalFilter is set on this */
  table: Table<TData>;
  /**
   * The list of columns available in the scope selector.
   * Each entry should have an `id` matching the column's TanStack id and a
   * human-readable `label`.
   */
  searchableColumns: SearchableColumn[];
  /**
   * Called whenever the selected column ids change so the parent can update
   * the `columnIdsRef` used by `createColumnSearchFilterFn`.
   *
   * @param ids - The new set of selected column ids.
   */
  onColumnIdsChange: (ids: string[]) => void;
  /**
   * Debounce delay before applying the search term to the table.
   * @default 200
   */
  debounceMs?: number;
  /** Placeholder for the text input */
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Scoped global search with a column-selector dropdown.
 *
 * The left portion is a compact trigger button that shows which columns are
 * currently in scope ("All", or a comma-joined list up to 2, or "N fields").
 * Clicking it opens a popover with a checkbox per searchable column.
 * The right portion is a standard debounced text input.
 *
 * @param table - TanStack Table instance.
 * @param searchableColumns - Columns to expose in the scope dropdown.
 * @param onColumnIdsChange - Parent callback to keep the filter-fn ref in sync.
 * @param debounceMs - Input debounce delay in milliseconds.
 * @param placeholder - Search input placeholder.
 * @param className - Extra classes on the outer wrapper.
 */
export function DataTableColumnSearch<TData>({
  table,
  searchableColumns,
  onColumnIdsChange,
  debounceMs = 200,
  placeholder = "Search...",
  className,
  ...props
}: DataTableColumnSearchProps<TData>) {
  const [open, setOpen] = React.useState(false);

  // By default every column is selected
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    () => searchableColumns.map((c) => c.id),
  );

  // Local controlled search term (stays responsive while debounce fires)
  const [term, setTerm] = React.useState(
    (table.getState().globalFilter as string) ?? "",
  );

  // Debounced setter — only updates TanStack after the user pauses typing
  const applySearch = useDebouncedCallback(
    (value: string) => table.setGlobalFilter(value || undefined),
    debounceMs,
  );

  const onTermChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTerm(e.target.value);
      applySearch(e.target.value);
    },
    [applySearch],
  );

  const onClear = React.useCallback(() => {
    setTerm("");
    table.setGlobalFilter(undefined);
  }, [table]);

  /**
   * Toggles a column in/out of the selected set.
   * Always ensures at least one column remains selected.
   *
   * NOTE: `table.setGlobalFilter` must be called outside the `setSelectedIds`
   * updater function. Calling a sibling component's state setter from inside a
   * state updater triggers React's "setState during render" warning because
   * updaters may run during the reconciliation phase.
   *
   * @param id - The column id to toggle.
   */
  const onToggleColumn = React.useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          // Prevent deselecting the last column
          if (prev.length === 1) return prev;
          const next = prev.filter((c) => c !== id);
          onColumnIdsChange(next); // safe — only mutates a ref
          return next;
        }
        const next = [...prev, id];
        onColumnIdsChange(next); // safe — only mutates a ref
        return next;
      });
      // Nudge TanStack to re-run global filtering with the updated column scope.
      // Called outside the state updater so it runs as a normal event-handler side effect.
      table.setGlobalFilter(term || undefined);
    },
    [onColumnIdsChange, table, term],
  );

  /** Selects all available columns */
  const onSelectAll = React.useCallback(() => {
    const all = searchableColumns.map((c) => c.id);
    setSelectedIds(all);
    onColumnIdsChange(all);
    table.setGlobalFilter(term || undefined);
  }, [searchableColumns, onColumnIdsChange, table, term]);

  // ── Trigger label ──────────────────────────────────────────────────────────

  /** Human-readable summary of the current column selection for the trigger */
  const triggerLabel = React.useMemo(() => {
    if (selectedIds.length === searchableColumns.length) return "All fields";
    if (selectedIds.length <= 2) {
      return selectedIds
        .map((id) => searchableColumns.find((c) => c.id === id)?.label ?? id)
        .join(", ");
    }
    return `${selectedIds.length} fields`;
  }, [selectedIds, searchableColumns]);

  const allSelected = selectedIds.length === searchableColumns.length;

  return (
    <div className={cn("flex items-center", className)} {...props}>
      {/* ── Column scope selector ─────────────────────────────────────────── */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5 rounded-r-none border-r-0 font-normal text-xs pr-2.5",
              "bg-muted/50 hover:bg-muted",
            )}
            aria-label="Select search columns"
          >
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <span className="max-w-[100px] truncate text-foreground">
              {triggerLabel}
            </span>
            {!allSelected && (
              <Badge
                variant="secondary"
                className="h-4 rounded px-1 font-mono text-[10px] font-normal"
              >
                {selectedIds.length}
              </Badge>
            )}
            <ChevronDown className="size-3 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-56 p-3" align="start">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Search in fields</span>
            {!allSelected && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onSelectAll}
              >
                Select all
              </Button>
            )}
          </div>

          <Separator className="mb-2" />

          {/* Column checkboxes */}
          <div className="flex flex-col gap-1.5">
            {searchableColumns.map((col) => {
              const checked = selectedIds.includes(col.id);
              // Disable unchecking the last remaining column
              const isLastSelected = checked && selectedIds.length === 1;

              return (
                <div
                  key={col.id}
                  className="flex items-center gap-2 rounded-sm px-1 py-0.5 hover:bg-accent cursor-pointer"
                  onClick={() => !isLastSelected && onToggleColumn(col.id)}
                >
                  <Checkbox
                    id={`search-col-${col.id}`}
                    checked={checked}
                    disabled={isLastSelected}
                    onCheckedChange={() => !isLastSelected && onToggleColumn(col.id)}
                    aria-label={`Search in ${col.label}`}
                  />
                  <Label
                    htmlFor={`search-col-${col.id}`}
                    className={cn(
                      "text-xs cursor-pointer flex-1",
                      isLastSelected && "opacity-50",
                    )}
                  >
                    {col.label}
                  </Label>
                  {checked && (
                    <Check className="size-3 text-primary shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* ── Search input ──────────────────────────────────────────────────── */}
      <div className="relative">
        <Input
          value={term}
          onChange={onTermChange}
          placeholder={placeholder}
          className="h-8 w-44 rounded-l-none pl-2.5 pr-7 lg:w-52"
          aria-label={`Search in ${triggerLabel}`}
        />
        {term && (
          <Button
            aria-label="Clear search"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 size-8 opacity-60 hover:opacity-100"
            onClick={onClear}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
