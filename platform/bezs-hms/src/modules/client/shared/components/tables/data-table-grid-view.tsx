/**
 * @file data-table-grid-view.tsx
 * @description Grid (card) view renderer for data tables. Iterates over
 * the current page of rows and renders each one using a caller-supplied
 * `renderCard` function, laid out in a responsive CSS grid. Also handles
 * the empty state when no rows match the current filters.
 * @layer shared/tables
 */

"use client";

import type { Row, Table as TanstackTable } from "@tanstack/react-table";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableGridViewProps<TData> {
  /** The TanStack Table instance that drives the row model and pagination */
  table: TanstackTable<TData>;
  /**
   * Renders a single row as a card element.
   * Receives the full TanStack Row object so callers can access
   * `row.original` for typed field access.
   *
   * @param row - TanStack Row for this card.
   * @returns A React node representing the card UI.
   */
  renderCard: (row: Row<TData>) => React.ReactNode;
  /**
   * Tailwind grid column classes applied to the card grid container.
   * @default "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
   */
  gridClassName?: string;
  /** Additional Tailwind classes for the outer wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the current page of rows as a card grid. Respects TanStack's
 * pagination state so it always shows the same rows as the table view.
 *
 * Shows a centred "No results" message when no rows are visible.
 *
 * @param table - TanStack Table driving row visibility and pagination.
 * @param renderCard - Function to render each row as a card.
 * @param gridClassName - CSS grid column classes for the card layout.
 * @param className - Extra classes on the wrapper div.
 */
export function DataTableGridView<TData>({
  table,
  renderCard,
  gridClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  className,
}: DataTableGridViewProps<TData>) {
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border text-muted-foreground">
        No results.
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", gridClassName, className)}>
      {rows.map((row) => (
        // Key on row.id which is stable across re-renders
        <div key={row.id}>{renderCard(row)}</div>
      ))}
    </div>
  );
}
