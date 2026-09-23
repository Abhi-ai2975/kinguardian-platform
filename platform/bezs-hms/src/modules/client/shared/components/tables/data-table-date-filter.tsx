/**
 * @file data-table-date-filter.tsx
 * @description Calendar-based date filter for "date" and "dateRange" column
 * variants. Single mode shows a single day picker; range mode shows a from/to
 * range calendar. Filter values are stored as numeric timestamps.
 * @layer shared/tables
 */

"use client";

import type { Column } from "@tanstack/react-table";
import { CalendarIcon, XCircle } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "./utils";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Type union for parsed selected state depending on mode */
type DateSelection = Date[] | DateRange;

/** Narrows a DateSelection to a DateRange object (not an array) */
function isDateRange(value: DateSelection): value is DateRange {
  return !Array.isArray(value);
}

/**
 * Converts a stored timestamp (number | string) back to a Date object.
 * Returns undefined for invalid/missing values.
 *
 * @param timestamp - Numeric timestamp or numeric string.
 */
function parseAsDate(
  timestamp: number | string | undefined,
): Date | undefined {
  if (timestamp === undefined || timestamp === null) return undefined;
  const ms = typeof timestamp === "string" ? Number(timestamp) : timestamp;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Normalises a raw column filter value into a flat array of timestamps.
 *
 * @param value - Raw value from column.getFilterValue().
 */
function parseColumnFilterValue(value: unknown): (number | string)[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value))
    return value.filter(
      (v) => typeof v === "number" || typeof v === "string",
    ) as (number | string)[];
  if (typeof value === "string" || typeof value === "number") return [value];
  return [];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableDateFilterProps<TData> {
  /** The TanStack column to read/write date filter state on */
  column: Column<TData, unknown>;
  /** Label shown on the trigger button */
  title?: string;
  /**
   * When true, renders a date-range calendar (from/to).
   * When false, renders a single day picker.
   * @default false
   */
  multiple?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Date filter popover backed by react-day-picker Calendar.
 * Stores timestamps in column filter state:
 * - Single mode: stores a single timestamp number
 * - Range mode: stores a [from, to] timestamp tuple
 *
 * @param column - TanStack column to write filter values to.
 * @param title - Trigger button label and aria label prefix.
 * @param multiple - When true, enables date-range mode.
 */
export function DataTableDateFilter<TData>({
  column,
  title,
  multiple,
}: DataTableDateFilterProps<TData>) {
  const columnFilterValue = column.getFilterValue();

  // Parse stored timestamps back to Date objects for the Calendar component
  const selectedDates = React.useMemo<DateSelection>(() => {
    if (!columnFilterValue) {
      return multiple ? { from: undefined, to: undefined } : [];
    }

    if (multiple) {
      const ts = parseColumnFilterValue(columnFilterValue);
      return {
        from: parseAsDate(ts[0]),
        to: parseAsDate(ts[1]),
      };
    }

    const ts = parseColumnFilterValue(columnFilterValue);
    const d = parseAsDate(ts[0]);
    return d ? [d] : [];
  }, [columnFilterValue, multiple]);

  /**
   * Updates the column filter when the calendar selection changes.
   * Stores timestamps (numbers) rather than Date objects for serialisation.
   */
  const onSelect = React.useCallback(
    (date: Date | DateRange | undefined) => {
      if (!date) {
        column.setFilterValue(undefined);
        return;
      }

      if (multiple && !("getTime" in date)) {
        // DateRange mode — store [from, to] timestamps
        const from = (date as DateRange).from?.getTime();
        const to = (date as DateRange).to?.getTime();
        column.setFilterValue(from || to ? [from, to] : undefined);
      } else if (!multiple && "getTime" in date) {
        // Single date mode — store a single timestamp
        column.setFilterValue((date as Date).getTime());
      }
    },
    [column, multiple],
  );

  /** Clears the filter; stops propagation to avoid re-opening the popover */
  const onReset = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      column.setFilterValue(undefined);
    },
    [column],
  );

  /** True when any date(s) are currently selected */
  const hasValue = React.useMemo(() => {
    if (multiple) {
      if (!isDateRange(selectedDates)) return false;
      return !!(selectedDates.from || selectedDates.to);
    }
    if (!Array.isArray(selectedDates)) return false;
    return selectedDates.length > 0;
  }, [multiple, selectedDates]);

  /** Formats a date range to "Jan 1 - Jan 31, 2024" style */
  const formatRange = React.useCallback((range: DateRange) => {
    if (!range.from && !range.to) return "";
    if (range.from && range.to)
      return `${formatDate(range.from)} – ${formatDate(range.to)}`;
    return formatDate(range.from ?? range.to);
  }, []);

  /** Builds the trigger button label showing the selected date(s) inline */
  const label = React.useMemo(() => {
    if (multiple) {
      if (!isDateRange(selectedDates)) return null;
      const text = selectedDates.from || selectedDates.to
        ? formatRange(selectedDates)
        : null;
      return (
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {text && (
            <>
              <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
              <span className="text-xs">{text}</span>
            </>
          )}
        </span>
      );
    }

    if (isDateRange(selectedDates)) return null;
    const text = selectedDates.length > 0 ? formatDate(selectedDates[0]) : null;
    return (
      <span className="flex items-center gap-2">
        <span>{title}</span>
        {text && (
          <>
            <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
            <span className="text-xs">{text}</span>
          </>
        )}
      </span>
    );
  }, [selectedDates, multiple, formatRange, title]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-dashed font-normal"
        >
          {hasValue ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              onClick={onReset}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <XCircle />
            </div>
          ) : (
            <CalendarIcon />
          )}
          {label}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        {multiple ? (
          <Calendar
            autoFocus
            captionLayout="dropdown"
            mode="range"
            selected={
              isDateRange(selectedDates)
                ? selectedDates
                : { from: undefined, to: undefined }
            }
            onSelect={onSelect as (date: DateRange | undefined) => void}
          />
        ) : (
          <Calendar
            captionLayout="dropdown"
            mode="single"
            selected={
              !isDateRange(selectedDates) ? selectedDates[0] : undefined
            }
            onSelect={onSelect as (date: Date | undefined) => void}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
