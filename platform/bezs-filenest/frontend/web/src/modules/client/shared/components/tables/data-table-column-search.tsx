/**
 * @file data-table-column-search.tsx
 * @description Scoped search control that lets users choose which columns to
 * search across before typing a query. Renders a compact trigger showing the
 * active column selection alongside a debounced text input.
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

export interface SearchableColumn {
  id: string;
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
 * @param getColumnIds - A stable getter that returns the current Set of column ids to search.
 * @returns A globalFilterFn compatible with TanStack Table.
 *
 * @example
 * ```tsx
 * const searchColumnsRef = React.useRef<Set<string>>(
 *   new Set(["name", "status"]),
 * );
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
    if (columnIds.size === 0) return true;
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
  table: Table<TData>;
  searchableColumns: SearchableColumn[];
  onColumnIdsChange: (ids: string[]) => void;
  debounceMs?: number;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Scoped global search with a column-selector dropdown.
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

  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    () => searchableColumns.map((c) => c.id),
  );

  const [term, setTerm] = React.useState(
    (table.getState().globalFilter as string) ?? "",
  );

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

  const onToggleColumn = React.useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          if (prev.length === 1) return prev;
          const next = prev.filter((c) => c !== id);
          onColumnIdsChange(next);
          return next;
        }
        const next = [...prev, id];
        onColumnIdsChange(next);
        return next;
      });
      table.setGlobalFilter(term || undefined);
    },
    [onColumnIdsChange, table, term],
  );

  const onSelectAll = React.useCallback(() => {
    const all = searchableColumns.map((c) => c.id);
    setSelectedIds(all);
    onColumnIdsChange(all);
    table.setGlobalFilter(term || undefined);
  }, [searchableColumns, onColumnIdsChange, table, term]);

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
      {/* Column scope selector */}
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

          <div className="flex flex-col gap-1.5">
            {searchableColumns.map((col) => {
              const checked = selectedIds.includes(col.id);
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

      {/* Search input */}
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
