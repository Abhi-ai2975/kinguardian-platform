/**
 * @file basic-table-example.tsx
 * @description Example showcasing the basic DataTable with text search,
 * single-select faceted filter, and sortable columns. Uses a static dataset
 * of fictional patients to demonstrate core table functionality without
 * any server-side data fetching.
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
  DataTableExportButton,
  DataTableRowActions,
  DataTableToolbar,
  useDataTable,
  type RowAction,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/** Represents a single patient record used in the demo */
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  status: "active" | "inactive" | "pending";
  department: string;
  lastVisit: string;
}

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

/** 20 fictional patient records for demonstration purposes */
const DEMO_PATIENTS: Patient[] = [
  {
    id: "P001",
    name: "Alice Johnson",
    age: 34,
    gender: "female",
    status: "active",
    department: "Cardiology",
    lastVisit: "2024-05-10",
  },
  {
    id: "P002",
    name: "Bob Smith",
    age: 52,
    gender: "male",
    status: "active",
    department: "Neurology",
    lastVisit: "2024-06-01",
  },
  {
    id: "P003",
    name: "Carol White",
    age: 28,
    gender: "female",
    status: "pending",
    department: "Orthopedics",
    lastVisit: "2024-04-15",
  },
  {
    id: "P004",
    name: "David Brown",
    age: 67,
    gender: "male",
    status: "inactive",
    department: "Oncology",
    lastVisit: "2023-12-20",
  },
  {
    id: "P005",
    name: "Eva Martinez",
    age: 41,
    gender: "female",
    status: "active",
    department: "Cardiology",
    lastVisit: "2024-06-05",
  },
  {
    id: "P006",
    name: "Frank Lee",
    age: 58,
    gender: "male",
    status: "active",
    department: "Dermatology",
    lastVisit: "2024-05-28",
  },
  {
    id: "P007",
    name: "Grace Kim",
    age: 23,
    gender: "female",
    status: "active",
    department: "General",
    lastVisit: "2024-06-03",
  },
  {
    id: "P008",
    name: "Henry Chen",
    age: 45,
    gender: "male",
    status: "pending",
    department: "Orthopedics",
    lastVisit: "2024-05-20",
  },
  {
    id: "P009",
    name: "Isabel Davis",
    age: 37,
    gender: "female",
    status: "inactive",
    department: "Neurology",
    lastVisit: "2024-01-10",
  },
  {
    id: "P010",
    name: "James Wilson",
    age: 61,
    gender: "male",
    status: "active",
    department: "Cardiology",
    lastVisit: "2024-06-02",
  },
  {
    id: "P011",
    name: "Karen Taylor",
    age: 49,
    gender: "female",
    status: "active",
    department: "Oncology",
    lastVisit: "2024-05-30",
  },
  {
    id: "P012",
    name: "Liam Anderson",
    age: 31,
    gender: "male",
    status: "active",
    department: "General",
    lastVisit: "2024-06-04",
  },
  {
    id: "P013",
    name: "Maya Patel",
    age: 27,
    gender: "female",
    status: "pending",
    department: "Dermatology",
    lastVisit: "2024-05-25",
  },
  {
    id: "P014",
    name: "Noah Garcia",
    age: 55,
    gender: "male",
    status: "active",
    department: "Neurology",
    lastVisit: "2024-06-01",
  },
  {
    id: "P015",
    name: "Olivia Roberts",
    age: 43,
    gender: "female",
    status: "inactive",
    department: "Cardiology",
    lastVisit: "2024-02-14",
  },
  {
    id: "P016",
    name: "Paul Thompson",
    age: 38,
    gender: "male",
    status: "active",
    department: "Orthopedics",
    lastVisit: "2024-05-18",
  },
  {
    id: "P017",
    name: "Quinn Evans",
    age: 29,
    gender: "other",
    status: "active",
    department: "General",
    lastVisit: "2024-06-06",
  },
  {
    id: "P018",
    name: "Rachel Clark",
    age: 64,
    gender: "female",
    status: "active",
    department: "Oncology",
    lastVisit: "2024-05-22",
  },
  {
    id: "P019",
    name: "Samuel Lewis",
    age: 46,
    gender: "male",
    status: "pending",
    department: "Neurology",
    lastVisit: "2024-05-14",
  },
  {
    id: "P020",
    name: "Tina Walker",
    age: 33,
    gender: "female",
    status: "active",
    department: "Dermatology",
    lastVisit: "2024-06-07",
  },
];

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

/** Status-to-badge variant mapping for visual differentiation */
const STATUS_VARIANTS: Record<
  Patient["status"],
  "default" | "secondary" | "outline"
> = {
  active: "default",
  pending: "secondary",
  inactive: "outline",
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

/**
 * Column definitions for the patients table.
 * - Name and Department use "text" variant for filter toolbar
 * - Status uses "select" variant with predefined options
 */
const COLUMNS: ColumnDef<Patient>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("id")}
      </span>
    ),
    enableColumnFilter: false,
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
    enableColumnFilter: true,
    enableSorting: true,
    // Text filter — renders a plain input in the toolbar
    meta: {
      label: "Name",
      variant: "text",
      placeholder: "Search name...",
    },
    filterFn: (row, columnId, filterValue: string) =>
      String(row.getValue(columnId))
        .toLowerCase()
        .includes(filterValue.toLowerCase()),
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Age" />
    ),
    enableSorting: true,
    enableColumnFilter: false,
    meta: { label: "Age" },
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Department" />
    ),
    enableSorting: true,
    enableColumnFilter: true,
    // Select filter — opens a faceted command list
    meta: {
      label: "Department",
      variant: "select",
      options: [
        { label: "Cardiology", value: "Cardiology" },
        { label: "Neurology", value: "Neurology" },
        { label: "Orthopedics", value: "Orthopedics" },
        { label: "Oncology", value: "Oncology" },
        { label: "Dermatology", value: "Dermatology" },
        { label: "General", value: "General" },
      ],
    },
    // Client-side faceted filter logic
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue(columnId)),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as Patient["status"];
      return (
        <Badge variant={STATUS_VARIANTS[status]} className="capitalize">
          {status}
        </Badge>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    // MultiSelect filter for status
    meta: {
      label: "Status",
      variant: "multiSelect",
      options: [
        { label: "Active", value: "active" },
        { label: "Pending", value: "pending" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue(columnId)),
  },
  {
    accessorKey: "lastVisit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Last Visit" />
    ),
    enableSorting: true,
    enableColumnFilter: false,
    meta: { label: "Last Visit" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const actions: RowAction<Patient>[] = [
        {
          label: "View",
          icon: Eye,
          onClick: (r) => toast.info(`Viewing ${r.original.name}`),
        },
        {
          label: "Edit",
          icon: Pencil,
          onClick: (r) => toast(`Editing ${r.original.name}`),
        },
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
 * Demonstrates the basic DataTable with:
 * - Text search on the Name column
 * - Single-select department filter
 * - Multi-select status filter
 * - Sortable columns
 * - Per-row actions (View / Edit)
 * - Custom empty state with "Clear filters" button
 * - Export button (CSV / Excel / JSON / PDF)
 */
export function BasicTableExample() {
  const { table } = useDataTable({
    columns: COLUMNS,
    data: DEMO_PATIENTS,
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
        <p className="text-sm font-medium">No patients found</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Try adjusting your filters or search term.
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
        <h2 className="text-lg font-semibold">Basic Table</h2>
        <p className="text-sm text-muted-foreground">
          Text search, select / multi-select filters, sortable columns, per-row
          actions, export.
        </p>
      </div>
      <DataTable table={table} emptyState={emptyState}>
        <div className="flex items-center justify-between gap-2">
          <DataTableToolbar table={table} className="flex-1" />
          <DataTableExportButton
            table={table}
            filename="patients"
            title="Patients"
          />
        </div>
      </DataTable>
    </div>
  );
}
