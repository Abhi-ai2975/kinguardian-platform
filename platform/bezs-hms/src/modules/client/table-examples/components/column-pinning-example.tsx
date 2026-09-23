/**
 * @file column-pinning-example.tsx
 * @description Example demonstrating column pinning (sticky left/right columns)
 * combined with column resizing (drag the right edge of any header to resize).
 *
 * The table is intentionally wide (12 columns) so horizontal scrolling is
 * required, making both features visually meaningful.
 * - "Participant" is pinned left, "Actions" is pinned right by default.
 * - Hover any header to reveal the resize handle (right edge); drag to resize.
 * - Use the "View" toolbar button to interactively pin/unpin columns.
 * - "Actions" has enableResizing: false — it stays at its fixed width.
 *
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableExportButton,
  DataTableRowActions,
  DataTableViewOptions,
  useDataTable,
  type RowAction,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/** Represents a clinical-trial participant record */
interface TrialParticipant {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  trialArm: "Treatment A" | "Treatment B" | "Control";
  startDate: string;
  endDate: string;
  dosage: string;
  primaryEndpoint: "Met" | "Not Met" | "Pending";
  adverseEvents: number;
  status: "active" | "completed" | "withdrawn" | "screening";
}

// ---------------------------------------------------------------------------
// Demo data — 20 participants
// ---------------------------------------------------------------------------

const DEMO_PARTICIPANTS: TrialParticipant[] = [
  {
    id: "TR001",
    name: "Alice Monroe",
    age: 42,
    gender: "Female",
    bloodType: "A+",
    trialArm: "Treatment A",
    startDate: "2024-01-15",
    endDate: "2024-07-15",
    dosage: "50mg",
    primaryEndpoint: "Met",
    adverseEvents: 1,
    status: "completed",
  },
  {
    id: "TR002",
    name: "Bernard Osei",
    age: 58,
    gender: "Male",
    bloodType: "O+",
    trialArm: "Control",
    startDate: "2024-01-20",
    endDate: "2024-07-20",
    dosage: "—",
    primaryEndpoint: "Not Met",
    adverseEvents: 0,
    status: "completed",
  },
  {
    id: "TR003",
    name: "Clara Nguyen",
    age: 35,
    gender: "Female",
    bloodType: "B+",
    trialArm: "Treatment B",
    startDate: "2024-02-01",
    endDate: "2024-08-01",
    dosage: "100mg",
    primaryEndpoint: "Met",
    adverseEvents: 2,
    status: "completed",
  },
  {
    id: "TR004",
    name: "Daniel Fischer",
    age: 61,
    gender: "Male",
    bloodType: "AB+",
    trialArm: "Treatment A",
    startDate: "2024-02-10",
    endDate: "2024-08-10",
    dosage: "50mg",
    primaryEndpoint: "Pending",
    adverseEvents: 3,
    status: "active",
  },
  {
    id: "TR005",
    name: "Elena Vasquez",
    age: 29,
    gender: "Female",
    bloodType: "O-",
    trialArm: "Treatment B",
    startDate: "2024-02-15",
    endDate: "2024-08-15",
    dosage: "100mg",
    primaryEndpoint: "Pending",
    adverseEvents: 0,
    status: "active",
  },
  {
    id: "TR006",
    name: "Felix Andersen",
    age: 47,
    gender: "Male",
    bloodType: "A-",
    trialArm: "Control",
    startDate: "2024-03-01",
    endDate: "2024-09-01",
    dosage: "—",
    primaryEndpoint: "Not Met",
    adverseEvents: 1,
    status: "active",
  },
  {
    id: "TR007",
    name: "Grace Okafor",
    age: 53,
    gender: "Female",
    bloodType: "B-",
    trialArm: "Treatment A",
    startDate: "2024-03-10",
    endDate: "2024-09-10",
    dosage: "50mg",
    primaryEndpoint: "Met",
    adverseEvents: 0,
    status: "completed",
  },
  {
    id: "TR008",
    name: "Hamid Rezaei",
    age: 44,
    gender: "Male",
    bloodType: "O+",
    trialArm: "Treatment B",
    startDate: "2024-03-20",
    endDate: "2024-09-20",
    dosage: "100mg",
    primaryEndpoint: "Pending",
    adverseEvents: 4,
    status: "withdrawn",
  },
  {
    id: "TR009",
    name: "Irene Petrov",
    age: 38,
    gender: "Female",
    bloodType: "AB-",
    trialArm: "Control",
    startDate: "2024-04-01",
    endDate: "2024-10-01",
    dosage: "—",
    primaryEndpoint: "Pending",
    adverseEvents: 0,
    status: "active",
  },
  {
    id: "TR010",
    name: "James Lim",
    age: 66,
    gender: "Male",
    bloodType: "A+",
    trialArm: "Treatment A",
    startDate: "2024-04-10",
    endDate: "2024-10-10",
    dosage: "50mg",
    primaryEndpoint: "Not Met",
    adverseEvents: 2,
    status: "active",
  },
  {
    id: "TR011",
    name: "Kira Johansson",
    age: 31,
    gender: "Female",
    bloodType: "O+",
    trialArm: "Treatment B",
    startDate: "2024-04-15",
    endDate: "2024-10-15",
    dosage: "100mg",
    primaryEndpoint: "Pending",
    adverseEvents: 1,
    status: "screening",
  },
  {
    id: "TR012",
    name: "Leo Castillo",
    age: 55,
    gender: "Male",
    bloodType: "B+",
    trialArm: "Control",
    startDate: "2024-05-01",
    endDate: "2024-11-01",
    dosage: "—",
    primaryEndpoint: "Pending",
    adverseEvents: 0,
    status: "screening",
  },
  {
    id: "TR013",
    name: "Maya Patel",
    age: 40,
    gender: "Female",
    bloodType: "AB+",
    trialArm: "Treatment A",
    startDate: "2024-05-10",
    endDate: "2024-11-10",
    dosage: "50mg",
    primaryEndpoint: "Met",
    adverseEvents: 0,
    status: "active",
  },
  {
    id: "TR014",
    name: "Nils Bergström",
    age: 72,
    gender: "Male",
    bloodType: "O-",
    trialArm: "Treatment B",
    startDate: "2024-05-15",
    endDate: "2024-11-15",
    dosage: "100mg",
    primaryEndpoint: "Not Met",
    adverseEvents: 5,
    status: "withdrawn",
  },
  {
    id: "TR015",
    name: "Olivia Ferreira",
    age: 26,
    gender: "Female",
    bloodType: "A-",
    trialArm: "Control",
    startDate: "2024-06-01",
    endDate: "2024-12-01",
    dosage: "—",
    primaryEndpoint: "Pending",
    adverseEvents: 0,
    status: "active",
  },
  {
    id: "TR016",
    name: "Patrick Onyeka",
    age: 49,
    gender: "Male",
    bloodType: "B+",
    trialArm: "Treatment A",
    startDate: "2024-06-10",
    endDate: "2024-12-10",
    dosage: "50mg",
    primaryEndpoint: "Pending",
    adverseEvents: 1,
    status: "active",
  },
  {
    id: "TR017",
    name: "Rina Kawamoto",
    age: 37,
    gender: "Female",
    bloodType: "AB+",
    trialArm: "Treatment B",
    startDate: "2024-06-15",
    endDate: "2024-12-15",
    dosage: "100mg",
    primaryEndpoint: "Pending",
    adverseEvents: 2,
    status: "screening",
  },
  {
    id: "TR018",
    name: "Stefan Müller",
    age: 63,
    gender: "Male",
    bloodType: "O+",
    trialArm: "Control",
    startDate: "2024-07-01",
    endDate: "2025-01-01",
    dosage: "—",
    primaryEndpoint: "Pending",
    adverseEvents: 0,
    status: "active",
  },
  {
    id: "TR019",
    name: "Talia Abramowitz",
    age: 45,
    gender: "Female",
    bloodType: "A+",
    trialArm: "Treatment A",
    startDate: "2024-07-10",
    endDate: "2025-01-10",
    dosage: "50mg",
    primaryEndpoint: "Pending",
    adverseEvents: 3,
    status: "active",
  },
  {
    id: "TR020",
    name: "Ugo Eze",
    age: 57,
    gender: "Male",
    bloodType: "B-",
    trialArm: "Treatment B",
    startDate: "2024-07-15",
    endDate: "2025-01-15",
    dosage: "100mg",
    primaryEndpoint: "Met",
    adverseEvents: 1,
    status: "completed",
  },
];

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<
  TrialParticipant["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  completed: "secondary",
  withdrawn: "destructive",
  screening: "outline",
};

const ENDPOINT_VARIANT: Record<
  TrialParticipant["primaryEndpoint"],
  "default" | "secondary" | "outline"
> = {
  Met: "default",
  "Not Met": "secondary",
  Pending: "outline",
};

const ARM_COLORS: Record<TrialParticipant["trialArm"], string> = {
  "Treatment A": "text-blue-600 dark:text-blue-400",
  "Treatment B": "text-purple-600 dark:text-purple-400",
  Control: "text-muted-foreground",
};

// ---------------------------------------------------------------------------
// Column definitions
// Twelve columns so the table requires horizontal scroll, making pinning
// visually meaningful. "name" is pinned left and "actions" is pinned right
// by default via initialColumnPinning in the component below.
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDef<TrialParticipant>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("id")}
      </span>
    ),
    enableSorting: false,
    enableColumnFilter: false,
    meta: { label: "Trial ID" },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Participant" />
    ),
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {row.getValue("name")}
      </span>
    ),
    enableSorting: true,
    meta: { label: "Participant" },
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Age" />
    ),
    enableSorting: true,
    meta: { label: "Age" },
  },
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Gender" />
    ),
    enableSorting: true,
    meta: { label: "Gender" },
  },
  {
    accessorKey: "bloodType",
    header: "Blood",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold">
        {row.getValue("bloodType")}
      </span>
    ),
    enableSorting: false,
    meta: { label: "Blood Type" },
  },
  {
    accessorKey: "trialArm",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Trial Arm" />
    ),
    cell: ({ row }) => {
      const arm = row.getValue("trialArm") as TrialParticipant["trialArm"];
      return (
        <span
          className={`text-sm font-medium whitespace-nowrap ${ARM_COLORS[arm]}`}
        >
          {arm}
        </span>
      );
    },
    enableSorting: true,
    meta: { label: "Trial Arm" },
  },
  {
    accessorKey: "dosage",
    header: "Dosage",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("dosage")}</span>
    ),
    enableSorting: false,
    meta: { label: "Dosage" },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Start" />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm text-muted-foreground">
        {row.getValue("startDate")}
      </span>
    ),
    enableSorting: true,
    meta: { label: "Start Date" },
  },
  {
    accessorKey: "endDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="End" />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm text-muted-foreground">
        {row.getValue("endDate")}
      </span>
    ),
    enableSorting: true,
    meta: { label: "End Date" },
  },
  {
    accessorKey: "primaryEndpoint",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Endpoint" />
    ),
    cell: ({ row }) => {
      const ep = row.getValue(
        "primaryEndpoint",
      ) as TrialParticipant["primaryEndpoint"];
      return <Badge variant={ENDPOINT_VARIANT[ep]}>{ep}</Badge>;
    },
    enableSorting: true,
    meta: { label: "Primary Endpoint" },
  },
  {
    accessorKey: "adverseEvents",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="AE Count" />
    ),
    cell: ({ row }) => {
      const count = row.getValue("adverseEvents") as number;
      return (
        <span
          className={count > 2 ? "font-semibold text-destructive" : "text-sm"}
        >
          {count}
        </span>
      );
    },
    enableSorting: true,
    meta: { label: "Adverse Events" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const s = row.getValue("status") as TrialParticipant["status"];
      return (
        <Badge variant={STATUS_VARIANT[s]} className="capitalize">
          {s}
        </Badge>
      );
    },
    enableSorting: true,
    meta: { label: "Status" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const actions: RowAction<TrialParticipant>[] = [
        {
          label: "View",
          icon: Eye,
          onClick: (r) => toast.info(`Viewing ${r.original.name}`),
        },
        {
          label: "Edit",
          icon: Pencil,
          onClick: (r) => toast(`Editing ${r.original.name}`),
          disabled: (r) =>
            r.original.status === "withdrawn" ||
            r.original.status === "completed",
        },
        {
          label: "Withdraw",
          icon: Trash2,
          onClick: (r) =>
            toast.warning(`Withdrawing ${r.original.name} from trial`),
          destructive: true,
          separator: true,
          disabled: (r) =>
            r.original.status === "withdrawn" ||
            r.original.status === "completed",
        },
      ];
      return <DataTableRowActions row={row} actions={actions} />;
    },
    enableSorting: false,
    enableHiding: false,
    enableResizing: false, // actions column stays at fixed width
    size: 60,
    meta: { exportable: false },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Demonstrates column pinning + column resizing on a wide 12-column table.
 *
 * - "Participant" pinned left, "Actions" pinned right by default.
 * - Hover any resizable header to reveal the drag handle on its right edge.
 * - "Actions" column is not resizable (fixed at 60 px).
 * - Use the "View" button to interactively pin/unpin columns.
 */
export function ColumnPinningExample() {
  const { table } = useDataTable({
    columns: COLUMNS,
    data: DEMO_PARTICIPANTS,
    initialPageSize: 10,
    // Pre-pin name left and actions right so the feature is visible on load
    initialColumnPinning: {
      left: ["name"],
      right: ["actions"],
    },
    // "onChange" resizes columns live as the user drags (Excel-like behaviour)
    columnResizeMode: "onChange",
    // Reasonable defaults so columns aren't squished below a usable width
    defaultColumn: { size: 150, minSize: 60, maxSize: 600 },
  });

  const clearFilters = React.useCallback(
    () => table.resetColumnFilters(),
    [table],
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-3 py-12">
      <SearchX className="size-9 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium">No participants found</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Try adjusting your filters.
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
        <h2 className="text-lg font-semibold">Column Pinning</h2>
        <p className="text-sm text-muted-foreground">
          Wide table (12 columns) with &quot;Participant&quot; pinned left and
          &quot;Actions&quot; pinned right by default. Hover any column header
          to reveal the resize handle on its right edge — drag to adjust width.
          Use the <span className="font-medium">View</span> button to pin or
          unpin columns with the ← / → controls.
        </p>
      </div>

      <DataTable table={table} emptyState={emptyState}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <DataTableExportButton
              table={table}
              filename="trial-participants"
              title="Trial Participants"
            />
            {/*
             * DataTableViewOptions now includes pin controls per column.
             * Each row in the popover shows ← and → buttons to pin left/right.
             * Clicking an active pin direction unpins the column.
             */}
            <DataTableViewOptions table={table} />
          </div>
        </div>
      </DataTable>
    </div>
  );
}
