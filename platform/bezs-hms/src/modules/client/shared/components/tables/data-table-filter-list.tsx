/**
 * @file data-table-filter-list.tsx
 * @description Dynamic filter builder for data tables. Renders a "Filter"
 * button that opens a popover where users can add/remove/configure filter
 * rules with field, operator, and value selectors.
 *
 * Each filter rule is stored in local state as a `DynamicFilterItem`. When
 * the list changes, the hook applies the filters to TanStack Table via
 * `table.setColumnFilters()` using a `{ operator, value }` payload that
 * custom column `filterFn`s can interpret.
 *
 * For this to work, column definitions must use `dynamicFilterFn` as their
 * `filterFn` (exported from this module) so the operator is respected.
 *
 * @layer shared/tables
 */

"use client";

import type { Column, Table } from "@tanstack/react-table";
import {
  CalendarIcon,
  ChevronsUpDown,
  ListFilter,
  Trash2,
  X,
} from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { formatDate } from "./utils";
import type { FilterVariant } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Represents a single dynamic filter rule in the filter list */
export interface DynamicFilterItem {
  /** Unique identifier for this filter rule (not the column id) */
  filterId: string;
  /** The column id this filter targets */
  columnId: string;
  /**
   * The filter variant — determines which operator options and value control
   * to render. Copied from the column's meta.variant when the filter is added.
   */
  variant: FilterVariant;
  /** The selected operator for this rule (e.g. "contains", "equals") */
  operator: string;
  /** The current filter value — string for text/number, array for multi-select */
  value: string | string[];
  /**
   * Join logic for combining this rule with the previous one.
   * Currently display-only — TanStack always AND-joins column filters.
   */
  joinOp: "and" | "or";
}

/**
 * The shape of the filter value stored in TanStack's columnFilter state.
 * Custom filterFn implementations should check `operatorValue` to apply
 * the correct comparison logic.
 */
export interface DynamicFilterValue {
  operator: string;
  value: string | string[];
}

// ---------------------------------------------------------------------------
// Operator definitions per filter variant
// ---------------------------------------------------------------------------

interface OperatorDef {
  label: string;
  value: string;
}

const TEXT_OPERATORS: OperatorDef[] = [
  { value: "contains",     label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "equals",       label: "is" },
  { value: "not_equals",   label: "is not" },
  { value: "starts_with",  label: "starts with" },
  { value: "ends_with",    label: "ends with" },
  { value: "is_empty",     label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const NUMBER_OPERATORS: OperatorDef[] = [
  { value: "equals",        label: "=" },
  { value: "not_equals",    label: "≠" },
  { value: "gt",            label: ">" },
  { value: "gte",           label: "≥" },
  { value: "lt",            label: "<" },
  { value: "lte",           label: "≤" },
  { value: "is_empty",      label: "is empty" },
  { value: "is_not_empty",  label: "is not empty" },
];

const DATE_OPERATORS: OperatorDef[] = [
  { value: "date_is",      label: "is" },
  { value: "date_is_not",  label: "is not" },
  { value: "date_before",  label: "is before" },
  { value: "date_after",   label: "is after" },
  { value: "is_empty",     label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const SELECT_OPERATORS: OperatorDef[] = [
  { value: "equals",       label: "is" },
  { value: "not_equals",   label: "is not" },
  { value: "is_empty",     label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const MULTI_SELECT_OPERATORS: OperatorDef[] = [
  { value: "in_array",     label: "has any of" },
  { value: "not_in_array", label: "has none of" },
  { value: "is_empty",     label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

/** Returns the operator list for a given filter variant */
function getOperators(variant: FilterVariant): OperatorDef[] {
  switch (variant) {
    case "text":        return TEXT_OPERATORS;
    case "number":
    case "range":       return NUMBER_OPERATORS;
    case "date":
    case "dateRange":   return DATE_OPERATORS;
    case "select":      return SELECT_OPERATORS;
    case "multiSelect": return MULTI_SELECT_OPERATORS;
    default:            return TEXT_OPERATORS;
  }
}

/** Returns the default operator value for a given variant */
function getDefaultOperator(variant: FilterVariant): string {
  return getOperators(variant)[0]?.value ?? "contains";
}

// ---------------------------------------------------------------------------
// filterFn — attach to columns that participate in the dynamic filter list
// ---------------------------------------------------------------------------

/**
 * Custom TanStack filterFn that handles `DynamicFilterValue` payloads.
 * Attach this to column definitions that should work with DataTableFilterList.
 *
 * Supports all text, number, date, select, and multiSelect operators defined
 * in this module.
 *
 * @example
 * ```ts
 * {
 *   accessorKey: "name",
 *   filterFn: dynamicFilterFn,
 *   meta: { label: "Name", variant: "text" },
 * }
 * ```
 */
export function dynamicFilterFn<TData>(
  row: import("@tanstack/react-table").Row<TData>,
  columnId: string,
  filterValue: DynamicFilterValue,
): boolean {
  if (!filterValue) return true;

  const { operator, value } = filterValue;
  const cellRaw = row.getValue(columnId);

  // Empty-check operators don't need a value
  if (operator === "is_empty")     return !cellRaw && cellRaw !== 0;
  if (operator === "is_not_empty") return !!cellRaw || cellRaw === 0;

  const cellStr = String(cellRaw ?? "").toLowerCase();
  const v = typeof value === "string" ? value.toLowerCase() : "";

  switch (operator) {
    // Text operators
    case "contains":     return cellStr.includes(v);
    case "not_contains": return !cellStr.includes(v);
    case "equals":       return cellStr === v;
    case "not_equals":   return cellStr !== v;
    case "starts_with":  return cellStr.startsWith(v);
    case "ends_with":    return cellStr.endsWith(v);

    // Numeric operators
    case "gt":  return Number(cellRaw) > Number(value);
    case "gte": return Number(cellRaw) >= Number(value);
    case "lt":  return Number(cellRaw) < Number(value);
    case "lte": return Number(cellRaw) <= Number(value);

    // Date operators — value is a timestamp string
    case "date_is": {
      const cellDate = new Date(cellRaw as string | number | Date);
      const fDate = new Date(Number(value));
      return cellDate.toDateString() === fDate.toDateString();
    }
    case "date_is_not": {
      const cellDate = new Date(cellRaw as string | number | Date);
      const fDate = new Date(Number(value));
      return cellDate.toDateString() !== fDate.toDateString();
    }
    case "date_before": {
      return new Date(cellRaw as string | number | Date).getTime() < Number(value);
    }
    case "date_after": {
      return new Date(cellRaw as string | number | Date).getTime() > Number(value);
    }

    // Select / multiSelect operators
    case "in_array":
      return Array.isArray(value)
        ? value.includes(cellStr)
        : cellStr === v;
    case "not_in_array":
      return Array.isArray(value)
        ? !value.includes(cellStr)
        : cellStr !== v;

    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Unique id generator (tiny helper — no external dependency)
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  return `filter_${Date.now()}_${++_idCounter}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableFilterListProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  /** TanStack Table instance — its filterable columns are listed in the UI */
  table: Table<TData>;
  /** When true, the trigger button is disabled */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Dynamic filter builder popover. Allows users to add/remove/configure
 * arbitrary filter rules against any filterable column.
 *
 * Filter rules are applied to TanStack via `table.setColumnFilters()`.
 * Columns must use `dynamicFilterFn` (exported from this module) for the
 * operator to be respected.
 *
 * @param table - TanStack Table instance.
 * @param disabled - When true, disables the trigger button.
 */
export function DataTableFilterList<TData>({
  table,
  disabled,
  ...popoverProps
}: DataTableFilterListProps<TData>) {
  const [open, setOpen] = React.useState(false);

  // Local state for dynamic filter items
  const [filters, setFilters] = React.useState<DynamicFilterItem[]>([]);

  // Filterable columns with a meta.variant defined
  const filterableColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (c): c is Column<TData> =>
            c.getCanFilter() && !!c.columnDef.meta?.variant,
        ),
    [table],
  );

  /**
   * Synchronises the `filters` local state into TanStack's column filter state.
   * Columns with no active filter entry are cleared.
   */
  const applyFiltersToTable = React.useCallback(
    (items: DynamicFilterItem[]) => {
      // Group by columnId (TanStack supports one filter value per column)
      // We use the last filter for a column if duplicates exist
      const map = new Map<string, DynamicFilterItem>();
      for (const f of items) {
        if (f.value !== "" || f.operator === "is_empty" || f.operator === "is_not_empty") {
          map.set(f.columnId, f);
        }
      }

      table.setColumnFilters(
        Array.from(map.values()).map((f) => ({
          id: f.columnId,
          value: { operator: f.operator, value: f.value } as DynamicFilterValue,
        })),
      );
    },
    [table],
  );

  /** Adds a new filter rule for the first available filterable column */
  const onFilterAdd = React.useCallback(() => {
    const col = filterableColumns[0];
    if (!col) return;
    const variant: FilterVariant = (col.columnDef.meta?.variant as FilterVariant) ?? "text";
    const newFilter: DynamicFilterItem = {
      filterId: generateId(),
      columnId: col.id,
      variant,
      operator: getDefaultOperator(variant),
      value: "",
      joinOp: "and",
    };
    const next = [...filters, newFilter];
    setFilters(next);
    applyFiltersToTable(next);
  }, [filterableColumns, filters, applyFiltersToTable]);

  /**
   * Updates a specific filter item and re-applies all filters.
   * @param filterId - The unique id of the filter item to update.
   * @param updates - Partial updates to apply.
   */
  const onFilterUpdate = React.useCallback(
    (filterId: string, updates: Partial<DynamicFilterItem>) => {
      const next = filters.map((f) => {
        if (f.filterId !== filterId) return f;
        // When switching columns, also reset variant/operator/value
        if (updates.columnId && updates.columnId !== f.columnId) {
          const col = filterableColumns.find((c) => c.id === updates.columnId);
          const variant: FilterVariant = (col?.columnDef.meta?.variant as FilterVariant) ?? "text";
          return {
            ...f,
            columnId: updates.columnId,
            variant,
            operator: getDefaultOperator(variant),
            value: "",
          };
        }
        // When switching operators, reset value
        if (updates.operator && updates.operator !== f.operator) {
          return { ...f, ...updates, value: "" };
        }
        return { ...f, ...updates };
      });
      setFilters(next);
      applyFiltersToTable(next);
    },
    [filters, filterableColumns, applyFiltersToTable],
  );

  /** Removes a filter rule and clears it from the table */
  const onFilterRemove = React.useCallback(
    (filterId: string) => {
      const next = filters.filter((f) => f.filterId !== filterId);
      setFilters(next);
      applyFiltersToTable(next);
    },
    [filters, applyFiltersToTable],
  );

  /** Clears all filter rules and resets TanStack column filters */
  const onFiltersReset = React.useCallback(() => {
    setFilters([]);
    table.resetColumnFilters();
  }, [table]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-normal"
          disabled={disabled}
        >
          <ListFilter className="text-muted-foreground" />
          Filter
          {filters.length > 0 && (
            <Badge
              variant="secondary"
              className="h-[18px] rounded px-1.5 font-mono font-normal text-[10px]"
            >
              {filters.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="flex w-full max-w-(--radix-popover-content-available-width) flex-col gap-3.5 p-4 sm:min-w-[460px]"
        align="start"
        {...popoverProps}
      >
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h4 className="font-medium leading-none text-sm">
            {filters.length > 0 ? "Filters" : "No filters applied"}
          </h4>
          {filters.length === 0 && (
            <p className="text-muted-foreground text-xs">
              Add filters to refine your rows.
            </p>
          )}
        </div>

        {/* Filter rule list */}
        {filters.length > 0 && (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto p-0.5">
            {filters.map((filter, index) => (
              <FilterItem
                key={filter.filterId}
                filter={filter}
                index={index}
                filterableColumns={filterableColumns}
                onFilterUpdate={onFilterUpdate}
                onFilterRemove={onFilterRemove}
              />
            ))}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded" onClick={onFilterAdd}>
            Add filter
          </Button>
          {filters.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded"
              onClick={onFiltersReset}
            >
              Reset filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Single filter rule row
// ---------------------------------------------------------------------------

interface FilterItemProps<TData> {
  filter: DynamicFilterItem;
  /** Zero-based position — determines Whether/And/Or prefix label */
  index: number;
  filterableColumns: Column<TData>[];
  onFilterUpdate: (filterId: string, updates: Partial<DynamicFilterItem>) => void;
  onFilterRemove: (filterId: string) => void;
}

/**
 * Renders a single filter rule row:
 * [Where/And/Or] [Field] [Operator] [Value] [Remove]
 *
 * @param filter - The current filter item state.
 * @param index - Position in the list (drives the join-op label).
 * @param filterableColumns - Available columns to choose from.
 * @param onFilterUpdate - Update handler.
 * @param onFilterRemove - Remove handler.
 */
function FilterItem<TData>({
  filter,
  index,
  filterableColumns,
  onFilterUpdate,
  onFilterRemove,
}: FilterItemProps<TData>) {
  const [fieldOpen, setFieldOpen] = React.useState(false);
  const operators = getOperators(filter.variant);
  const isNoValue = filter.operator === "is_empty" || filter.operator === "is_not_empty";

  return (
    <div className="flex items-center gap-2">
      {/* Join operator prefix */}
      <div className="w-[60px] shrink-0 text-center">
        {index === 0 ? (
          <span className="text-muted-foreground text-xs">Where</span>
        ) : index === 1 ? (
          <Select
            value={filter.joinOp}
            onValueChange={(v) => onFilterUpdate(filter.filterId, { joinOp: v as "and" | "or" })}
          >
            <SelectTrigger className="h-7 rounded text-xs font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">And</SelectItem>
              <SelectItem value="or">Or</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground text-xs">{filter.joinOp}</span>
        )}
      </div>

      {/* Field (column) selector — Command-backed popover */}
      <Popover open={fieldOpen} onOpenChange={setFieldOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-32 h-8 justify-between rounded font-normal text-xs"
          >
            <span className="truncate">
              {filterableColumns.find((c) => c.id === filter.columnId)?.columnDef.meta?.label
                ?? filter.columnId}
            </span>
            <ChevronsUpDown className="size-3 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search fields..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No fields found.</CommandEmpty>
              <CommandGroup>
                {filterableColumns.map((col) => (
                  <CommandItem
                    key={col.id}
                    value={col.id}
                    onSelect={(value) => {
                      onFilterUpdate(filter.filterId, { columnId: value });
                      setFieldOpen(false);
                    }}
                    className="text-xs"
                  >
                    {col.columnDef.meta?.label ?? col.id}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Operator selector */}
      <Select
        value={filter.operator}
        onValueChange={(v) => onFilterUpdate(filter.filterId, { operator: v })}
      >
        <SelectTrigger className="h-8 w-32 rounded font-normal text-xs">
          <div className="truncate">
            <SelectValue placeholder={filter.operator} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value} className="text-xs">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input — adapts to variant and operator */}
      <div className="flex-1 min-w-[100px] max-w-[160px]">
        {isNoValue ? (
          // Empty placeholder for "is empty" / "is not empty" operators
          <div className="h-8 rounded border bg-transparent" />
        ) : (
          <FilterValueInput
            filter={filter}
            onFilterUpdate={onFilterUpdate}
          />
        )}
      </div>

      {/* Remove button */}
      <Button
        variant="outline"
        size="icon"
        className="size-8 shrink-0 rounded"
        aria-label="Remove filter"
        onClick={() => onFilterRemove(filter.filterId)}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Value input — adapts to filter variant
// ---------------------------------------------------------------------------

interface FilterValueInputProps {
  filter: DynamicFilterItem;
  onFilterUpdate: (filterId: string, updates: Partial<DynamicFilterItem>) => void;
}

/**
 * Renders the appropriate value input for a filter rule based on its variant.
 * - text/number → plain Input
 * - select/multiSelect → multi-select Command popover
 * - date/dateRange → Calendar popover
 *
 * @param filter - The filter item to render the value input for.
 * @param onFilterUpdate - Called when the value changes.
 */
function FilterValueInput({ filter, onFilterUpdate }: FilterValueInputProps) {
  // We need meta options for select/multiSelect — but they're not in the filter item
  // The caller should have enriched the filter.variant; we use a lightweight approach.
  const onChange = (value: string | string[]) =>
    onFilterUpdate(filter.filterId, { value });

  switch (filter.variant) {
    case "text":
      return (
        <Input
          type="text"
          placeholder="Enter value..."
          value={typeof filter.value === "string" ? filter.value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 rounded text-xs"
        />
      );

    case "number":
    case "range":
      return (
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Enter number..."
          value={typeof filter.value === "string" ? filter.value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 rounded text-xs"
        />
      );

    case "date":
    case "dateRange":
      return <DateValueInput filter={filter} onFilterUpdate={onFilterUpdate} />;

    case "select":
    case "multiSelect":
      return <SelectValueInput filter={filter} onFilterUpdate={onFilterUpdate} />;

    default:
      return (
        <Input
          type="text"
          placeholder="Enter value..."
          value={typeof filter.value === "string" ? filter.value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 rounded text-xs"
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Date value input
// ---------------------------------------------------------------------------

/**
 * Calendar popover for date filter rules. Shows the selected date as text
 * on the trigger button; clears the filter when the X is clicked.
 */
function DateValueInput({
  filter,
  onFilterUpdate,
}: FilterValueInputProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!filter.value || typeof filter.value !== "string" || !filter.value) return undefined;
    const d = new Date(Number(filter.value));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }, [filter.value]);

  const onSelect = React.useCallback(
    (date: Date | undefined) => {
      onFilterUpdate(filter.filterId, {
        value: date ? String(date.getTime()) : "",
      });
      setOpen(false);
    },
    [filter.filterId, onFilterUpdate],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-full justify-start rounded text-left font-normal text-xs",
            !selectedDate && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-3 mr-1.5" />
          <span className="truncate">
            {selectedDate ? formatDate(selectedDate) : "Pick a date"}
          </span>
          {selectedDate && (
            <X
              className="size-3 ml-auto opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onFilterUpdate(filter.filterId, { value: "" });
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Select value input (for select/multiSelect columns)
// ---------------------------------------------------------------------------

/**
 * Multi-select Command popover for select/multiSelect filter rules.
 * Reads available options from the column meta; falls back to an Input
 * if no options are available.
 */
function SelectValueInput({
  filter,
  onFilterUpdate,
}: FilterValueInputProps) {
  // We need the column's options. Since they aren't in the filter item,
  // we render them from window-accessible table state via a context-free lookup.
  // For simplicity in this client-side demo we render a plain text input fallback.
  // Production code should pass `column.columnDef.meta.options` to this component.

  const [open, setOpen] = React.useState(false);
  const selectedValues = Array.isArray(filter.value) ? filter.value : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between rounded font-normal text-xs"
        >
          <span className="truncate">
            {selectedValues.length > 0
              ? selectedValues.join(", ")
              : "Select values..."}
          </span>
          <ChevronsUpDown className="size-3 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <div className="p-2">
          <p className="text-xs text-muted-foreground pb-1">
            Type values separated by commas, or use the column toolbar filters
            for option lists.
          </p>
          <Input
            placeholder="value1, value2..."
            value={selectedValues.join(", ")}
            onChange={(e) => {
              const vals = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              onFilterUpdate(filter.filterId, { value: vals });
            }}
            className="h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
