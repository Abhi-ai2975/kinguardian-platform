/**
 * @file types.ts
 * @description Shared TypeScript types and module augmentations for the
 * advanced data-table system. Extends TanStack Table's ColumnMeta with
 * filter variant metadata so the toolbar can auto-render the correct filter UI.
 * @layer shared/tables
 */

import type { RowData } from "@tanstack/react-table";

// ---------------------------------------------------------------------------
// TanStack Table module augmentation
// Adds filter-variant metadata to every column definition so the toolbar can
// automatically render the correct filter control (text, slider, date, etc.)
// ---------------------------------------------------------------------------
declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: generic params required for correct augmentation
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Human-readable column label used in filter buttons and view options */
    label?: string;
    /** Placeholder text for text/number filter inputs */
    placeholder?: string;
    /**
     * Determines which filter UI control to render in the toolbar.
     * - "text"        → plain text input
     * - "number"      → number input (optionally with a unit suffix)
     * - "range"       → dual-thumb slider + number inputs
     * - "date"        → single date calendar picker
     * - "dateRange"   → from/to date range picker
     * - "select"      → single-select faceted command filter
     * - "multiSelect" → multi-select faceted command filter
     */
    variant?: FilterVariant;
    /** Option list for "select" and "multiSelect" variants */
    options?: Option[];
    /**
     * Static [min, max] bounds for the "range" slider.
     * Falls back to faceted min/max values when omitted.
     */
    range?: [number, number];
    /** Unit suffix displayed inside number / range filter inputs (e.g. "kg", "$") */
    unit?: string;
    /** Optional icon rendered beside option labels in faceted filters */
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    /**
     * When set to `false`, this column is excluded from export dialogs.
     * Useful for display-only columns such as action menus or avatar thumbnails.
     * Defaults to `true` (included) when omitted.
     */
    exportable?: boolean;
  }
}

// ---------------------------------------------------------------------------
// Filter variant
// ---------------------------------------------------------------------------

/** All supported filter control types for column meta */
export type FilterVariant =
  | "text"
  | "number"
  | "range"
  | "date"
  | "dateRange"
  | "select"
  | "multiSelect";

// ---------------------------------------------------------------------------
// Option — used by select / multiSelect filters
// ---------------------------------------------------------------------------

/**
 * A single selectable option in a faceted filter dropdown.
 */
export interface Option {
  /** Visible display text */
  label: string;
  /** Value stored in column filter state */
  value: string;
  /** Optional match count shown on the right side of the option */
  count?: number;
  /** Optional icon component rendered to the left of the label */
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

// ---------------------------------------------------------------------------
// View mode — table vs grid (card) layout
// ---------------------------------------------------------------------------

/** Determines whether rows are rendered as a table or a card grid */
export type TableViewMode = "table" | "grid";

// ---------------------------------------------------------------------------
// Row height — controls vertical density of table rows
// ---------------------------------------------------------------------------

/**
 * Controls the vertical padding applied to each data row.
 * Maps to distinct Tailwind padding classes:
 * - "short"      → tight, compact rows (sidebar-style lists)
 * - "medium"     → standard density (default)
 * - "tall"       → relaxed rows (easier reading)
 * - "extra-tall" → spacious rows (forms, editable cells)
 */
export type RowHeightValue = "short" | "medium" | "tall" | "extra-tall";

// ---------------------------------------------------------------------------
// Row action — used to pass the selected row + action type to modals / sheets
// ---------------------------------------------------------------------------

import type { Row } from "@tanstack/react-table";

/**
 * Payload emitted when a user initiates an action on a row (e.g. edit / delete).
 */
export interface DataTableRowAction<TData> {
  /** The TanStack Row object for the affected record */
  row: Row<TData>;
  /** Which action was triggered */
  variant: "update" | "delete";
}
