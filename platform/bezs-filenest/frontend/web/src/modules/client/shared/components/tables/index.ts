/**
 * @file index.ts
 * @description Public API barrel for the shared data-table component system.
 * Import everything your feature needs from this single entry point rather
 * than importing from individual component files.
 *
 * @example
 * ```tsx
 * import {
 *   DataTable,
 *   DataTableToolbar,
 *   DataTableWithViews,
 *   DataTableColumnHeader,
 *   useDataTable,
 * } from "@/modules/client/shared/components/tables";
 * ```
 *
 * @layer shared/tables
 */

// Core table renderer
export { DataTable } from "./data-table";

// Combined table + grid view wrapper
export { DataTableWithViews } from "./data-table-with-views";

// Grid view renderer (standalone)
export { DataTableGridView } from "./data-table-grid-view";

// Toolbar with auto-filter rendering
export { DataTableToolbar } from "./data-table-toolbar";

// Individual column / pagination / header controls
export { DataTableColumnHeader } from "./data-table-column-header";
export { DataTablePagination } from "./data-table-pagination";
export { DataTableViewOptions } from "./data-table-view-options";
export { DataTableViewToggle } from "./data-table-view-toggle";
export {
  DataTableRowActions,
  type RowAction,
} from "./data-table-row-actions";
export { DataTableExpandButton } from "./data-table-expand-button";

// Specific filter controls (for use outside the toolbar)
export { DataTableFacetedFilter } from "./data-table-faceted-filter";
export { DataTableDateFilter } from "./data-table-date-filter";
export { DataTableSliderFilter } from "./data-table-slider-filter";

// Loading skeletons
export { DataTableSkeleton, DataTableGridSkeleton } from "./data-table-skeleton";

// Hooks
export { useDataTable } from "./hooks/use-data-table";
export {
  useServerDataTable,
  type ServerTableState,
} from "./hooks/use-server-data-table";
export { useDebouncedCallback } from "./hooks/use-debounced-callback";

// Utilities
export { getColumnPinningStyle, formatDate } from "./utils";

// Export
export {
  DataTableExportButton,
  getExportColumns,
  rowsToExportData,
} from "./data-table-export-button";
export { DataTableExportDialog } from "./data-table-export-dialog";
export { DataTableSelectionBar } from "./data-table-selection-bar";
export {
  exportTable,
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportToPDF,
  type ExportFormat,
  type ExportColumn,
  type ExportRow,
} from "./export-utils";

// Advanced toolbar extras
export { DataTableRowHeight } from "./data-table-row-height";
export { DataTableGlobalSearch } from "./data-table-global-search";
export {
  DataTableColumnSearch,
  createColumnSearchFilterFn,
  type SearchableColumn,
} from "./data-table-column-search";
export { DataTableSortList } from "./data-table-sort-list";
export {
  DataTableFilterList,
  dynamicFilterFn,
  type DynamicFilterItem,
  type DynamicFilterValue,
} from "./data-table-filter-list";

// Types
export type {
  FilterVariant,
  Option,
  TableViewMode,
  RowHeightValue,
  DataTableRowAction,
} from "./types";
