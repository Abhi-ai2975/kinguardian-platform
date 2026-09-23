/**
 * @file custom-toolbar-example.tsx
 * @description Example demonstrating the full advanced toolbar:
 * - Scoped search with column-selector dropdown (Name / Role / Department)
 * - Custom sort builder (multi-column, per-column direction)
 * - Dynamic filter builder (add/remove rules per column with operators)
 * - Row height/density selector (short, medium, tall, extra-tall)
 * - Column visibility toggle
 *
 * The search input shows a dropdown trigger on its left side listing which
 * columns are currently in scope. Clicking it opens a popover with checkboxes
 * so the user can restrict the search to specific columns (e.g., Name only).
 *
 * Uses a fictional clinical-staff dataset covering a mix of text, number,
 * date, and select columns so every filter variant is represented.
 *
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, SearchX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableColumnSearch,
  DataTableExportButton,
  DataTableFilterList,
  DataTableRowActions,
  DataTableRowHeight,
  DataTableSortList,
  DataTableViewOptions,
  createColumnSearchFilterFn,
  dynamicFilterFn,
  useDataTable,
  type RowAction,
  type RowHeightValue,
  type SearchableColumn,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/** Represents one clinical staff member in the demo dataset */
interface StaffMember {
  id: string;
  name: string;
  role: "Doctor" | "Nurse" | "Technician" | "Admin" | "Pharmacist";
  department: string;
  yearsExp: number;
  salary: number;
  joinDate: number; // Unix timestamp (ms)
  status: "active" | "on-leave" | "terminated";
  rating: number; // 1–5
}

// ---------------------------------------------------------------------------
// Demo data — 20 fictional staff members
// ---------------------------------------------------------------------------

const DEMO_STAFF: StaffMember[] = [
  { id: "S001", name: "Dr. Amelia Torres",   role: "Doctor",     department: "Cardiology",    yearsExp: 12, salary: 180000, joinDate: new Date("2012-03-15").getTime(), status: "active",     rating: 4.8 },
  { id: "S002", name: "Ben Hayes",           role: "Nurse",      department: "ICU",           yearsExp: 6,  salary: 72000,  joinDate: new Date("2018-07-01").getTime(), status: "active",     rating: 4.5 },
  { id: "S003", name: "Clara Nguyen",        role: "Technician", department: "Radiology",     yearsExp: 9,  salary: 68000,  joinDate: new Date("2015-11-20").getTime(), status: "on-leave",   rating: 4.2 },
  { id: "S004", name: "Dr. Darius Klein",    role: "Doctor",     department: "Neurology",     yearsExp: 17, salary: 210000, joinDate: new Date("2007-01-10").getTime(), status: "active",     rating: 4.9 },
  { id: "S005", name: "Elena Ford",          role: "Admin",      department: "Administration",yearsExp: 4,  salary: 52000,  joinDate: new Date("2020-05-12").getTime(), status: "active",     rating: 4.0 },
  { id: "S006", name: "Frank Osei",          role: "Pharmacist", department: "Pharmacy",      yearsExp: 8,  salary: 95000,  joinDate: new Date("2016-09-03").getTime(), status: "active",     rating: 4.6 },
  { id: "S007", name: "Grace Yamamoto",      role: "Nurse",      department: "Cardiology",    yearsExp: 3,  salary: 67000,  joinDate: new Date("2021-02-28").getTime(), status: "active",     rating: 4.3 },
  { id: "S008", name: "Dr. Hiro Tanaka",     role: "Doctor",     department: "Oncology",      yearsExp: 14, salary: 195000, joinDate: new Date("2010-08-17").getTime(), status: "active",     rating: 4.7 },
  { id: "S009", name: "Isabella Russo",      role: "Technician", department: "Pathology",     yearsExp: 5,  salary: 61000,  joinDate: new Date("2019-04-22").getTime(), status: "on-leave",   rating: 3.9 },
  { id: "S010", name: "Jake Morrison",       role: "Admin",      department: "HR",            yearsExp: 7,  salary: 58000,  joinDate: new Date("2017-12-01").getTime(), status: "terminated", rating: 3.5 },
  { id: "S011", name: "Dr. Kaia Svensson",   role: "Doctor",     department: "Pediatrics",    yearsExp: 10, salary: 175000, joinDate: new Date("2014-06-30").getTime(), status: "active",     rating: 4.8 },
  { id: "S012", name: "Leo Okafor",          role: "Pharmacist", department: "Pharmacy",      yearsExp: 2,  salary: 78000,  joinDate: new Date("2022-01-15").getTime(), status: "active",     rating: 4.1 },
  { id: "S013", name: "Mina Park",           role: "Nurse",      department: "ICU",           yearsExp: 11, salary: 81000,  joinDate: new Date("2013-10-08").getTime(), status: "active",     rating: 4.6 },
  { id: "S014", name: "Dr. Nathan Gupta",    role: "Doctor",     department: "Orthopedics",   yearsExp: 8,  salary: 185000, joinDate: new Date("2016-03-25").getTime(), status: "active",     rating: 4.4 },
  { id: "S015", name: "Olivia Brennan",      role: "Technician", department: "Radiology",     yearsExp: 6,  salary: 64000,  joinDate: new Date("2018-11-14").getTime(), status: "active",     rating: 4.0 },
  { id: "S016", name: "Pedro Lima",          role: "Admin",      department: "Finance",       yearsExp: 9,  salary: 63000,  joinDate: new Date("2015-07-19").getTime(), status: "active",     rating: 4.2 },
  { id: "S017", name: "Quinn Foster",        role: "Nurse",      department: "Pediatrics",    yearsExp: 4,  salary: 70000,  joinDate: new Date("2020-09-05").getTime(), status: "on-leave",   rating: 4.3 },
  { id: "S018", name: "Dr. Rhea Sharma",     role: "Doctor",     department: "Cardiology",    yearsExp: 20, salary: 225000, joinDate: new Date("2004-02-11").getTime(), status: "active",     rating: 5.0 },
  { id: "S019", name: "Sam Wickham",         role: "Technician", department: "Pathology",     yearsExp: 1,  salary: 55000,  joinDate: new Date("2023-06-20").getTime(), status: "active",     rating: 3.8 },
  { id: "S020", name: "Tanya Ivanova",       role: "Pharmacist", department: "Pharmacy",      yearsExp: 13, salary: 105000, joinDate: new Date("2011-04-30").getTime(), status: "terminated", rating: 4.0 },
];

// ---------------------------------------------------------------------------
// Status badge styling
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<
  StaffMember["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  "active":     "default",
  "on-leave":   "secondary",
  "terminated": "destructive",
};

// ---------------------------------------------------------------------------
// Searchable columns
// Mirrors the columns that have enableGlobalFilter: true below.
// Shown as checkboxes inside the DataTableColumnSearch dropdown.
// ---------------------------------------------------------------------------

const SEARCHABLE_COLUMNS: SearchableColumn[] = [
  { id: "name",       label: "Name" },
  { id: "role",       label: "Role" },
  { id: "department", label: "Department" },
];

// ---------------------------------------------------------------------------
// Column definitions
// All filterable columns use `dynamicFilterFn` so the filter-list operators
// are respected. enableGlobalFilter: true marks a column as searchable via
// the global search and column-scope dropdown.
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDef<StaffMember>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("id")}
      </span>
    ),
    enableColumnFilter: false,
    enableGlobalFilter: false,
    enableSorting: false,
    meta: { label: "ID" },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    // dynamicFilterFn supports text operators: contains, equals, starts_with, etc.
    filterFn: dynamicFilterFn,
    meta: { label: "Name", variant: "text", placeholder: "Search name..." },
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Role" />
    ),
    enableSorting: true,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    filterFn: dynamicFilterFn,
    meta: {
      label: "Role",
      variant: "select",
      options: [
        { label: "Doctor",     value: "Doctor" },
        { label: "Nurse",      value: "Nurse" },
        { label: "Technician", value: "Technician" },
        { label: "Admin",      value: "Admin" },
        { label: "Pharmacist", value: "Pharmacist" },
      ],
    },
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Department" />
    ),
    enableSorting: true,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    filterFn: dynamicFilterFn,
    meta: { label: "Department", variant: "text", placeholder: "Filter department..." },
  },
  {
    accessorKey: "yearsExp",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Exp (yrs)" />
    ),
    enableSorting: true,
    enableColumnFilter: true,
    enableGlobalFilter: false,
    // dynamicFilterFn supports number operators: equals, gt, gte, lt, lte
    filterFn: dynamicFilterFn,
    meta: { label: "Experience", variant: "number" },
  },
  {
    accessorKey: "salary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Salary" />
    ),
    cell: ({ row }) => (
      <span>${(row.getValue("salary") as number).toLocaleString("en-US")}</span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    enableGlobalFilter: false,
    filterFn: dynamicFilterFn,
    meta: { label: "Salary", variant: "number" },
  },
  {
    accessorKey: "joinDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Joined" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(row.getValue("joinDate") as number)}
      </span>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    enableGlobalFilter: false,
    // dynamicFilterFn supports date operators: date_is, date_before, date_after
    filterFn: dynamicFilterFn,
    meta: { label: "Join Date", variant: "date" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const s = row.getValue("status") as StaffMember["status"];
      return (
        <Badge variant={STATUS_VARIANT[s]} className="capitalize">
          {s.replace("-", " ")}
        </Badge>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    enableGlobalFilter: false,
    filterFn: dynamicFilterFn,
    meta: {
      label: "Status",
      variant: "select",
      options: [
        { label: "Active",     value: "active" },
        { label: "On Leave",   value: "on-leave" },
        { label: "Terminated", value: "terminated" },
      ],
    },
  },
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Rating" />
    ),
    cell: ({ row }) => {
      const r = row.getValue("rating") as number;
      return (
        <span className="text-amber-500 font-medium">
          {"★".repeat(Math.floor(r))}
          <span className="text-muted-foreground font-normal ml-1">{r}</span>
        </span>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    enableGlobalFilter: false,
    filterFn: dynamicFilterFn,
    meta: { label: "Rating", variant: "number" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const actions: RowAction<StaffMember>[] = [
        { label: "View",  icon: Eye,    onClick: (r) => toast.info(`Viewing ${r.original.name}`) },
        { label: "Edit",  icon: Pencil, onClick: (r) => toast(`Editing ${r.original.name}`),
          disabled: (r) => r.original.status === "terminated" },
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
 * Demonstrates the full advanced toolbar suite:
 * - Scoped search with column-selector dropdown (Name / Role / Department)
 * - Multi-column sort builder with Add/Remove/Reset
 * - Dynamic filter builder with field + operator + value per rule
 * - Row height density selector (short → extra-tall)
 * - Column visibility toggle
 *
 * The column-selector dropdown and search input work together: the dropdown
 * lets users narrow the search scope to specific columns, keeping the
 * search focused rather than matching across all text-like columns at once.
 *
 * All controls are composed from reusable shared components.
 */
export function CustomToolbarExample() {
  const [rowHeight, setRowHeight] = React.useState<RowHeightValue>("medium");

  // ── Column-scoped search setup ────────────────────────────────────────────
  // A mutable ref holds the Set of column ids that are currently in scope for
  // the global filter. The ref is kept in sync by `onColumnIdsChange` below.
  // The filter function closes over the ref — no re-creation needed on change.
  const searchColumnsRef = React.useRef<Set<string>>(
    new Set(SEARCHABLE_COLUMNS.map((c) => c.id)),
  );

  /**
   * Stable getter for the current column-scope Set. useCallback keeps the
   * reference stable so useMemo below is not re-run on every render, and avoids
   * passing a React ref directly to a function (React compiler warning).
   */
  const getSearchColumns = React.useCallback(
    () => searchColumnsRef.current,
    [],
  );

  /**
   * Stable custom globalFilterFn that only matches the columns currently
   * selected in the column-scope dropdown. Created once; reads from the getter
   * at filter time so selection changes are reflected without table rebuild.
   */
  const columnSearchFn = React.useMemo(
    () => createColumnSearchFilterFn<StaffMember>(getSearchColumns),
    [getSearchColumns],
  );

  /** Syncs the ref whenever the user changes column selection in the dropdown */
  const onColumnIdsChange = React.useCallback((ids: string[]) => {
    searchColumnsRef.current = new Set(ids);
  }, []);

  // useDataTable wires up all TanStack state including globalFilter
  const { table } = useDataTable({
    columns: COLUMNS,
    data: DEMO_STAFF,
    initialPageSize: 10,
    // Use the custom scoped filter instead of TanStack's built-in "auto"
    globalFilterFn: columnSearchFn,
  });

  const clearFilters = React.useCallback(
    () => {
      table.resetColumnFilters();
      table.setGlobalFilter(undefined);
    },
    [table],
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-12">
      <SearchX className="size-9 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium">No staff members found</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Try adjusting your search, filters, or filter rules.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear all
      </Button>
    </div>
  );

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">Custom Toolbar</h2>
        <p className="text-sm text-muted-foreground">
          Scoped search (choose columns) · multi-column sort builder ·
          dynamic filter rules · row-height density toggle.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        {/* ---------------------------------------------------------------- */}
        {/* Toolbar                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex w-full flex-wrap items-center gap-2 p-1">
          {/* Left cluster: scoped search + filter + sort */}
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/*
             * Scoped search — the column-selector dropdown on the left lets
             * users pick which fields to search in before typing.
             * onColumnIdsChange keeps searchColumnsRef in sync so the
             * globalFilterFn reads the latest selection.
             */}
            <DataTableColumnSearch
              table={table}
              searchableColumns={SEARCHABLE_COLUMNS}
              onColumnIdsChange={onColumnIdsChange}
              placeholder="Search..."
            />

            {/* Dynamic filter builder */}
            <DataTableFilterList table={table} />

            {/* Multi-column sort builder */}
            <DataTableSortList table={table} />
          </div>

          {/* Right cluster: export + row height + column visibility */}
          <div className="flex items-center gap-2">
            <DataTableExportButton table={table} filename="staff" />
            <DataTableRowHeight value={rowHeight} onValueChange={setRowHeight} />
            <DataTableViewOptions table={table} />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Table                                                             */}
        {/* ---------------------------------------------------------------- */}
        <DataTable table={table} rowHeight={rowHeight} emptyState={emptyState} />
      </div>
    </div>
  );
}
