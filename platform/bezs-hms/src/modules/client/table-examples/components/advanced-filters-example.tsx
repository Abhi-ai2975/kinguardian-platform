/**
 * @file advanced-filters-example.tsx
 * @description Example showcasing all available filter variants: text, number,
 * range (slider), date, dateRange, select, and multiSelect. Uses a fictional
 * medical products dataset to cover every filter type in a single table.
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef, FilterFnOption } from "@tanstack/react-table";
import { Eye, Pencil, SearchX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableExportButton,
  DataTableRowActions,
  DataTableToolbar,
  useDataTable,
  type RowAction,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/** Represents a medical product/supply item in the demo */
interface Product {
  id: string;
  name: string;
  category: "Equipment" | "Consumable" | "Medication" | "Diagnostic";
  price: number;
  stock: number;
  expiryDate: number; // timestamp
  tags: string[];
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

/** 18 fictional medical product records */
const DEMO_PRODUCTS: Product[] = [
  { id: "SK001", name: "Stethoscope Pro", category: "Equipment", price: 149, stock: 25, expiryDate: new Date("2026-12-31").getTime(), tags: ["diagnostic", "cardiology"], isActive: true },
  { id: "SK002", name: "Surgical Gloves (S)", category: "Consumable", price: 12, stock: 500, expiryDate: new Date("2025-08-15").getTime(), tags: ["surgical", "ppe"], isActive: true },
  { id: "SK003", name: "Amoxicillin 500mg", category: "Medication", price: 8, stock: 1000, expiryDate: new Date("2025-03-20").getTime(), tags: ["antibiotic"], isActive: true },
  { id: "SK004", name: "Blood Pressure Monitor", category: "Diagnostic", price: 89, stock: 40, expiryDate: new Date("2028-01-01").getTime(), tags: ["cardiology", "monitoring"], isActive: true },
  { id: "SK005", name: "Insulin Syringe 1ml", category: "Consumable", price: 5, stock: 2000, expiryDate: new Date("2025-11-30").getTime(), tags: ["diabetes", "injection"], isActive: true },
  { id: "SK006", name: "Paracetamol 500mg", category: "Medication", price: 3, stock: 3000, expiryDate: new Date("2026-06-30").getTime(), tags: ["analgesic", "fever"], isActive: true },
  { id: "SK007", name: "X-Ray Viewer Panel", category: "Equipment", price: 320, stock: 8, expiryDate: new Date("2030-01-01").getTime(), tags: ["radiology", "diagnostic"], isActive: false },
  { id: "SK008", name: "COVID Rapid Test Kit", category: "Diagnostic", price: 15, stock: 800, expiryDate: new Date("2024-12-01").getTime(), tags: ["infectious", "screening"], isActive: false },
  { id: "SK009", name: "N95 Respirator Mask", category: "Consumable", price: 4, stock: 1500, expiryDate: new Date("2026-05-15").getTime(), tags: ["ppe", "respiratory"], isActive: true },
  { id: "SK010", name: "Metformin 850mg", category: "Medication", price: 6, stock: 500, expiryDate: new Date("2025-09-10").getTime(), tags: ["diabetes", "oral"], isActive: true },
  { id: "SK011", name: "Defibrillator AED", category: "Equipment", price: 1500, stock: 5, expiryDate: new Date("2032-01-01").getTime(), tags: ["emergency", "cardiology"], isActive: true },
  { id: "SK012", name: "Urine Test Strips", category: "Diagnostic", price: 18, stock: 300, expiryDate: new Date("2025-07-31").getTime(), tags: ["urology", "screening"], isActive: true },
  { id: "SK013", name: "IV Cannula 20G", category: "Consumable", price: 2, stock: 5000, expiryDate: new Date("2026-04-30").getTime(), tags: ["iv", "injection"], isActive: true },
  { id: "SK014", name: "Ciprofloxacin 500mg", category: "Medication", price: 10, stock: 200, expiryDate: new Date("2025-05-01").getTime(), tags: ["antibiotic"], isActive: false },
  { id: "SK015", name: "Pulse Oximeter", category: "Diagnostic", price: 45, stock: 60, expiryDate: new Date("2029-01-01").getTime(), tags: ["monitoring", "respiratory"], isActive: true },
  { id: "SK016", name: "Surgical Scissors", category: "Equipment", price: 35, stock: 100, expiryDate: new Date("2035-01-01").getTime(), tags: ["surgical", "instrument"], isActive: true },
  { id: "SK017", name: "Wound Dressing 10x10", category: "Consumable", price: 1, stock: 10000, expiryDate: new Date("2026-11-30").getTime(), tags: ["wound", "sterile"], isActive: true },
  { id: "SK018", name: "Ibuprofen 400mg", category: "Medication", price: 4, stock: 800, expiryDate: new Date("2026-03-01").getTime(), tags: ["analgesic", "anti-inflammatory"], isActive: true },
];

// ---------------------------------------------------------------------------
// Custom filter functions
// ---------------------------------------------------------------------------

/**
 * Client-side range filter: passes rows where the cell value is within [min, max].
 * Used for the "price" and "stock" numeric range filters.
 */
const rangeFilterFn: FilterFnOption<Product> = (row, columnId, filterValue) => {
  if (!filterValue || !Array.isArray(filterValue)) return true;
  const v = Number(row.getValue(columnId));
  const [min, max] = filterValue as [number, number];
  return v >= min && v <= max;
};

/**
 * Client-side date range filter: passes rows where the date falls within the range.
 * Handles [from timestamp, to timestamp] tuple.
 */
const dateRangeFilterFn: FilterFnOption<Product> = (row, columnId, filterValue) => {
  if (!filterValue || !Array.isArray(filterValue)) return true;
  const cellTs = Number(row.getValue(columnId));
  const [from, to] = filterValue as [number | undefined, number | undefined];
  if (from && cellTs < from) return false;
  if (to && cellTs > to) return false;
  return true;
};

/**
 * Client-side faceted filter: passes rows whose value is in the filterValue array.
 */
const facetedFilterFn: FilterFnOption<Product> = (row, columnId, filterValue) => {
  if (!filterValue || !(filterValue as string[]).length) return true;
  return (filterValue as string[]).includes(String(row.getValue(columnId)));
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

/**
 * Columns demonstrate every supported filter variant:
 * text, range (price), range (stock), dateRange (expiry), select, multiSelect.
 */
const COLUMNS: ColumnDef<Product>[] = [
  {
    accessorKey: "id",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("id")}
      </span>
    ),
    enableColumnFilter: false,
    meta: { label: "SKU" },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Product" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    // Text search filter
    meta: { label: "Product", variant: "text", placeholder: "Search products..." },
    filterFn: (row, columnId, filterValue: string) =>
      String(row.getValue(columnId))
        .toLowerCase()
        .includes(filterValue.toLowerCase()),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Category" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("category")}</Badge>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    // Single-select category filter
    meta: {
      label: "Category",
      variant: "select",
      options: [
        { label: "Equipment", value: "Equipment" },
        { label: "Consumable", value: "Consumable" },
        { label: "Medication", value: "Medication" },
        { label: "Diagnostic", value: "Diagnostic" },
      ],
    },
    filterFn: facetedFilterFn,
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Price ($)" />
    ),
    cell: ({ row }) => (
      <span>${(row.getValue("price") as number).toLocaleString("en-US")}</span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    // Range slider filter with dollar unit
    meta: { label: "Price", variant: "range", unit: "$", range: [0, 1500] },
    filterFn: rangeFilterFn,
  },
  {
    accessorKey: "stock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Stock" />
    ),
    enableSorting: true,
    enableColumnFilter: true,
    // Range slider filter for stock quantity
    meta: { label: "Stock", variant: "range", range: [0, 10000] },
    filterFn: rangeFilterFn,
  },
  {
    accessorKey: "expiryDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Expiry" />
    ),
    cell: ({ row }) => {
      const ts = row.getValue("expiryDate") as number;
      return (
        <span className="text-sm">
          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(ts)}
        </span>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    // Date-range picker filter for expiry date
    meta: { label: "Expiry Date", variant: "dateRange" },
    filterFn: dateRangeFilterFn,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const active = row.getValue("isActive") as boolean;
      return (
        <Badge variant={active ? "default" : "secondary"}>
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue?.length) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const actions: RowAction<Product>[] = [
        { label: "View",  icon: Eye,    onClick: (r) => toast.info(`Viewing ${r.original.name}`) },
        { label: "Edit",  icon: Pencil, onClick: (r) => toast(`Editing ${r.original.name}`) },
      ];
      return <DataTableRowActions row={row} actions={actions} />;
    },
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
    meta: { exportable: false },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Demonstrates all seven filter variant types in a single table:
 * text, select, range × 2, dateRange, and select (boolean).
 * Also shows per-row actions, custom empty state, and export.
 */
export function AdvancedFiltersExample() {
  const { table } = useDataTable({
    columns: COLUMNS,
    data: DEMO_PRODUCTS,
    initialPageSize: 10,
  });

  const clearFilters = React.useCallback(
    () => table.resetColumnFilters(),
    [table],
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-12">
      <SearchX className="size-9 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium">No products match your filters</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Try widening the range or clearing a filter.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">Advanced Filters</h2>
        <p className="text-sm text-muted-foreground">
          Text · Select · Multi-select · Range slider · Date range — all filter
          types in one table. Plus per-row actions and export.
        </p>
      </div>
      <DataTable table={table} emptyState={emptyState}>
        <div className="flex items-center justify-between gap-2">
          <DataTableToolbar table={table} className="flex-1" />
          <DataTableExportButton table={table} filename="products" title="Medical Products" />
        </div>
      </DataTable>
    </div>
  );
}
