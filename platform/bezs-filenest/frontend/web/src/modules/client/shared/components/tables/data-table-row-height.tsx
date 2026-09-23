/**
 * @file data-table-row-height.tsx
 * @description Row density selector for data tables. Renders a Select dropdown
 * offering four row height presets: Short, Medium (default), Tall, and
 * Extra Tall. Designed to be placed in the toolbar's right-side slot alongside
 * the view-options toggle.
 * @layer shared/tables
 */

"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RowHeightValue } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROW_HEIGHT_LABELS: Record<RowHeightValue, string> = {
  "short":      "Short",
  "medium":     "Medium",
  "tall":       "Tall",
  "extra-tall": "Extra Tall",
};

const ROW_HEIGHT_OPTIONS: RowHeightValue[] = [
  "short",
  "medium",
  "tall",
  "extra-tall",
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableRowHeightProps {
  value: RowHeightValue;
  onValueChange: (value: RowHeightValue) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Select dropdown that lets users choose the vertical density of table rows.
 * The selected value should be forwarded to `DataTable`'s `rowHeight` prop.
 *
 * @param value - Currently active row height.
 * @param onValueChange - Called with the new height when the user changes it.
 *
 * @example
 * ```tsx
 * const [rowHeight, setRowHeight] = useState<RowHeightValue>("medium");
 * <DataTableRowHeight value={rowHeight} onValueChange={setRowHeight} />
 * <DataTable table={table} rowHeight={rowHeight} />
 * ```
 */
export function DataTableRowHeight({
  value,
  onValueChange,
}: DataTableRowHeightProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as RowHeightValue)}
    >
      <SelectTrigger
        aria-label="Select row height"
        className="h-8 w-32 font-normal text-sm"
      >
        <SelectValue placeholder="Row height" />
      </SelectTrigger>
      <SelectContent>
        {ROW_HEIGHT_OPTIONS.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {ROW_HEIGHT_LABELS[opt]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
