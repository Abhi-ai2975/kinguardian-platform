/**
 * @file utils.ts
 * @description Pure utility functions shared across all data-table components.
 * Handles column pinning CSS, date formatting, and client-side filter helpers.
 * @layer shared/tables
 */

import type { Column } from "@tanstack/react-table";

// ---------------------------------------------------------------------------
// Column pinning — sticky positioning helpers
// ---------------------------------------------------------------------------

/**
 * Computes the inline CSS required to pin a TanStack Table column to the
 * left or right edge of the table viewport.
 *
 * @param column - The TanStack column instance to inspect for pin state.
 * @param withBorder - When true, adds an inset box-shadow that acts as a
 *   visual separator between pinned and scrolling columns.
 * @returns React-compatible CSSProperties object to spread onto a <th>/<td>.
 */
export function getColumnPinningStyle<TData>({
  column,
  withBorder = false,
}: {
  column: Column<TData>;
  withBorder?: boolean;
}): React.CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeft = isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRight = isPinned === "right" && column.getIsFirstColumn("right");

  return {
    boxShadow: withBorder
      ? isLastLeft
        ? "-4px 0 4px -4px var(--border) inset"
        : isFirstRight
          ? "4px 0 4px -4px var(--border) inset"
          : undefined
      : undefined,
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    opacity: isPinned ? 0.97 : 1,
    position: isPinned ? "sticky" : "relative",
    background: "var(--background)",
    width: column.getSize(),
    zIndex: isPinned ? 1 : undefined,
  };
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Formats a date value into a human-readable string using the browser locale.
 *
 * @param date - Date object, ISO string, or numeric timestamp.
 * @param opts - Optional Intl.DateTimeFormatOptions overrides.
 * @returns Formatted date string, or empty string if the value is invalid.
 */
export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: opts.month ?? "short",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }).format(new Date(date));
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

/**
 * Client-side filter function for the "text" variant.
 * Performs a case-insensitive substring match against the cell value.
 *
 * @param value - Raw cell value (will be coerced to string).
 * @param filterValue - The string the user typed in the filter input.
 * @returns true when the cell value contains the filter string.
 */
export function textFilterFn(value: unknown, filterValue: string): boolean {
  if (!filterValue) return true;
  return String(value ?? "")
    .toLowerCase()
    .includes(filterValue.toLowerCase());
}

/**
 * Client-side filter function for "select" and "multiSelect" variants.
 * Checks whether the cell value is included in the selected option array.
 *
 * @param value - Raw cell value.
 * @param filterValue - Array of selected option values.
 * @returns true when the cell value matches at least one selected option.
 */
export function facetedFilterFn(
  value: unknown,
  filterValue: string[],
): boolean {
  if (!filterValue || filterValue.length === 0) return true;
  return filterValue.includes(String(value ?? ""));
}

/**
 * Client-side filter function for numeric "range" variant.
 * Checks whether the cell value falls within [min, max].
 *
 * @param value - Numeric cell value.
 * @param filterValue - Tuple of [min, max].
 * @returns true when value is within the range.
 */
export function rangeFilterFn(
  value: unknown,
  filterValue: [number, number],
): boolean {
  if (!filterValue) return true;
  const num = Number(value);
  if (Number.isNaN(num)) return false;
  const [min, max] = filterValue;
  return num >= min && num <= max;
}

/**
 * Client-side filter function for "date" variant.
 * Matches cells whose date equals the selected date (same calendar day).
 *
 * @param value - Date value (Date, string, or timestamp).
 * @param filterValue - Timestamp of the selected date, or null/undefined.
 * @returns true when the cell date matches the filter date.
 */
export function dateFilterFn(
  value: unknown,
  filterValue: number | undefined,
): boolean {
  if (!filterValue) return true;
  const cellDate = new Date(value as string | number | Date);
  const filterDate = new Date(filterValue);
  return (
    cellDate.getFullYear() === filterDate.getFullYear() &&
    cellDate.getMonth() === filterDate.getMonth() &&
    cellDate.getDate() === filterDate.getDate()
  );
}

/**
 * Client-side filter function for "dateRange" variant.
 * Matches cells whose date falls within [from, to].
 *
 * @param value - Date value (Date, string, or timestamp).
 * @param filterValue - Tuple of [from timestamp, to timestamp].
 * @returns true when the cell date is within the range.
 */
export function dateRangeFilterFn(
  value: unknown,
  filterValue: [number | undefined, number | undefined],
): boolean {
  if (!filterValue) return true;
  const cellDate = new Date(value as string | number | Date).getTime();
  const [from, to] = filterValue;
  if (from && cellDate < from) return false;
  if (to && cellDate > to) return false;
  return true;
}
