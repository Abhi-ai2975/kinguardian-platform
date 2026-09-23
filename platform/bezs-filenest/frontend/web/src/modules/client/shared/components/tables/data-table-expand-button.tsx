/**
 * @file data-table-expand-button.tsx
 * @description Chevron toggle button for expanding and collapsing a TanStack
 * Table row. Works for both the detail-panel pattern and the sub-rows / tree
 * pattern. When the row cannot be expanded, the button is invisible so column
 * alignment is preserved across all rows.
 * @layer shared/tables
 */

"use client";

import type { Row } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableExpandButtonProps<TData> {
  row: Row<TData>;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a ghost icon button that toggles a row's expanded state.
 * When `row.getCanExpand()` is false the button is invisible (not removed)
 * so that the layout stays consistent with expandable sibling rows.
 *
 * @param row - TanStack Row instance.
 * @param className - Extra Tailwind classes on the button.
 */
export function DataTableExpandButton<TData>({
  row,
  className,
}: DataTableExpandButtonProps<TData>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-7 shrink-0 text-muted-foreground hover:text-foreground",
        !row.getCanExpand() && "invisible",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        row.toggleExpanded();
      }}
      disabled={!row.getCanExpand()}
      aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
      aria-expanded={row.getIsExpanded()}
    >
      {row.getIsExpanded() ? (
        <ChevronDown className="size-4 transition-transform duration-150" />
      ) : (
        <ChevronRight className="size-4 transition-transform duration-150" />
      )}
    </Button>
  );
}
