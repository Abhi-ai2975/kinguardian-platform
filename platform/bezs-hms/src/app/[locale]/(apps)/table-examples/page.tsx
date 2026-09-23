/**
 * @file page.tsx
 * @description Table examples showcase page. Demonstrates all available
 * data-table variants in a single scrollable page, grouped by feature:
 * basic usage, advanced filters, row selection, and grid view toggle.
 *
 * This route lives under (apps) and therefore requires authentication
 * (enforced by the parent layout.tsx).
 *
 * @route /[locale]/table-examples
 * @layer app/table-examples
 */

import { Separator } from "@/components/ui/separator";
import {
  BasicTableExample,
  AdvancedFiltersExample,
  SelectionTableExample,
  GridViewExample,
  CustomToolbarExample,
  ServerTableExample,
  RowActionsExample,
  ColumnPinningExample,
  RowExpandDetailExample,
  RowExpandSubrowsExample,
} from "@/modules/client/table-examples";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Renders the table showcase page containing all example data-table variants.
 * All example components are client components that manage their own state.
 */
export default function TableExamplesPage() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Table Examples</h1>
        <p className="mt-1 text-muted-foreground">
          Reusable data-table components with advanced filters, sorting,
          pagination, row selection, bulk actions, and grid view.
        </p>
      </div>

      <Separator />

      {/* Example 1: Basic table with text + select filters */}
      <BasicTableExample />

      <Separator />

      {/* Example 2: All filter variants (text, range, date, select, multiSelect) */}
      <AdvancedFiltersExample />

      <Separator />

      {/* Example 3: Row selection with bulk-action bar */}
      <SelectionTableExample />

      <Separator />

      {/* Example 4: Dual table/grid view toggle */}
      <GridViewExample />

      <Separator />

      {/* Example 5: Custom toolbar — global search, sort builder, filter builder, row height */}
      <CustomToolbarExample />

      <Separator />

      {/* Example 6: Server-side table — pagination, sorting, search on the server */}
      <ServerTableExample />

      <Separator />

      {/* Example 7: Row actions, custom empty state, loading prop */}
      <RowActionsExample />

      <Separator />

      {/* Example 8: Column pinning — sticky left/right columns on a wide table */}
      <ColumnPinningExample />

      <Separator />

      {/* Example 9: Row expand — full-width detail panel beneath each row */}
      <RowExpandDetailExample />

      <Separator />

      {/* Example 10: Row expand — sub-rows / tree (department → staff) */}
      <RowExpandSubrowsExample />
    </div>
  );
}
