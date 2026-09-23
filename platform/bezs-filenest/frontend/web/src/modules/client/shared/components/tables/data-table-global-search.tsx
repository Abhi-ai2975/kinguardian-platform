/**
 * @file data-table-global-search.tsx
 * @description Global search input for data tables. Filters all visible
 * columns using TanStack Table's globalFilter state with a debounce so
 * fast typing doesn't trigger excessive re-renders.
 * @layer shared/tables
 */

"use client";

import type { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "./hooks/use-debounced-callback";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableGlobalSearchProps<TData>
  extends React.ComponentProps<"div"> {
  table: Table<TData>;
  debounceMs?: number;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Debounced global search input that sets the table's globalFilter state.
 * A Search icon is shown on the left; an "×" clear button appears when
 * a value is present.
 *
 * For this to filter rows the column definitions need `enableGlobalFilter`
 * set to `true` (or omitted, as TanStack defaults to true), and the table
 * needs a `globalFilterFn` configured (e.g., `"auto"` or a custom function).
 *
 * @param table - TanStack Table instance.
 * @param debounceMs - How long to wait after typing before applying the filter.
 * @param placeholder - Input placeholder text.
 * @param className - Extra classes on the wrapper div.
 */
export function DataTableGlobalSearch<TData>({
  table,
  debounceMs = 200,
  placeholder = "Search all columns...",
  className,
  ...props
}: DataTableGlobalSearchProps<TData>) {
  const [value, setValue] = React.useState(
    (table.getState().globalFilter as string) ?? "",
  );

  const applyFilter = useDebouncedCallback(
    (v: string) => table.setGlobalFilter(v || undefined),
    debounceMs,
  );

  const onChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      applyFilter(e.target.value);
    },
    [applyFilter],
  );

  const onClear = React.useCallback(() => {
    setValue("");
    table.setGlobalFilter(undefined);
  }, [table]);

  return (
    <div className={cn("relative flex items-center", className)} {...props}>
      <Search className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none" />

      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-8 pl-8 pr-8 w-48 lg:w-64"
        aria-label="Search all columns"
      />

      {value && (
        <Button
          aria-label="Clear search"
          variant="ghost"
          size="icon"
          className="absolute right-0 size-8 opacity-70 hover:opacity-100"
          onClick={onClear}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
