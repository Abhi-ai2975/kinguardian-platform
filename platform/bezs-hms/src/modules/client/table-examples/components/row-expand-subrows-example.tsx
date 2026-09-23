/**
 * @file row-expand-subrows-example.tsx
 * @description Example 10 — Sub-rows / tree data pattern.
 *
 * Parent rows are hospital departments; child rows are individual staff members.
 * Clicking the chevron on a department row expands it to reveal its staff.
 * TanStack Table's expanded row model handles the show/hide automatically —
 * no `renderSubComponent` needed; child rows appear inline in the normal row list.
 *
 * Key implementation notes:
 * - Data uses a `subRows?: OrgNode[]` field for the hierarchy.
 * - `getSubRows: (row) => row.subRows ?? []` passed to `useDataTable`.
 * - The expand column shows DataTableExpandButton; leaf rows get an invisible
 *   spacer so the Name column aligns across all depths.
 * - `row.depth` drives left padding so children are visually indented.
 * - `row.getCanExpand()` is false for leaf nodes — the spacer keeps alignment.
 *
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableExpandButton,
  useDataTable,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/**
 * Unified node for both department (parent) and staff member (leaf) rows.
 * Department rows have a `subRows` array; staff rows do not.
 */
interface OrgNode {
  id: string;
  name: string;
  /** "Department" for parent rows, job title for staff */
  role: string;
  status: "active" | "on-leave" | "busy" | "terminated";
  /** Staff count — departments only */
  headCount?: number;
  /** Annual budget — departments only */
  budget?: number;
  /** Years of experience — staff only */
  experience?: number;
  /** Annual salary — staff only */
  salary?: number;
  /** Child rows — departments only */
  subRows?: OrgNode[];
}

// ---------------------------------------------------------------------------
// Tree data — 4 departments, each with 3-4 staff
// ---------------------------------------------------------------------------

const DEMO_ORG: OrgNode[] = [
  {
    id: "dept-cardio",
    name: "Cardiology",
    role: "Department",
    status: "active",
    headCount: 4,
    budget: 2_400_000,
    subRows: [
      { id: "S001", name: "Dr. Sarah Chen",      role: "Cardiologist",    status: "active",    experience: 12, salary: 195_000 },
      { id: "S002", name: "Dr. Robert Thompson", role: "Cardiologist",    status: "busy",      experience: 20, salary: 230_000 },
      { id: "S003", name: "Grace Yamamoto",       role: "Cardiac Nurse",   status: "active",    experience: 3,  salary: 72_000  },
      { id: "S004", name: "Ben Hayes",            role: "Cardiac Nurse",   status: "on-leave",  experience: 6,  salary: 76_000  },
    ],
  },
  {
    id: "dept-neuro",
    name: "Neurology",
    role: "Department",
    status: "active",
    headCount: 3,
    budget: 1_800_000,
    subRows: [
      { id: "S005", name: "Dr. Darius Klein",    role: "Neurologist",     status: "active",    experience: 17, salary: 215_000 },
      { id: "S006", name: "Dr. Kaia Svensson",   role: "Neurologist",     status: "active",    experience: 10, salary: 185_000 },
      { id: "S007", name: "Mina Park",           role: "Neuro Nurse",     status: "active",    experience: 11, salary: 81_000  },
    ],
  },
  {
    id: "dept-onco",
    name: "Oncology",
    role: "Department",
    status: "active",
    headCount: 3,
    budget: 2_100_000,
    subRows: [
      { id: "S008", name: "Dr. Hiro Tanaka",     role: "Oncologist",      status: "active",    experience: 14, salary: 205_000 },
      { id: "S009", name: "Dr. Priya Sharma",    role: "Oncologist",      status: "busy",      experience: 8,  salary: 178_000 },
      { id: "S010", name: "Karen Taylor",        role: "Oncology Nurse",  status: "active",    experience: 6,  salary: 74_000  },
    ],
  },
  {
    id: "dept-pharmacy",
    name: "Pharmacy",
    role: "Department",
    status: "active",
    headCount: 3,
    budget: 950_000,
    subRows: [
      { id: "S011", name: "Frank Osei",          role: "Senior Pharmacist",status: "active",   experience: 8,  salary: 98_000  },
      { id: "S012", name: "Leo Okafor",          role: "Pharmacist",      status: "active",    experience: 2,  salary: 78_000  },
      { id: "S013", name: "Tanya Ivanova",       role: "Pharmacist",      status: "terminated",experience: 13, salary: 105_000 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<
  OrgNode["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  active:     "default",
  busy:       "secondary",
  "on-leave": "outline",
  terminated: "destructive",
};

const STATUS_LABEL: Record<OrgNode["status"], string> = {
  active:     "Active",
  busy:       "Busy",
  "on-leave": "On Leave",
  terminated: "Terminated",
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDef<OrgNode>[] = [
  {
    id: "expand",
    header: () => null,
    cell: ({ row }) => (
      /*
       * DataTableExpandButton is invisible (not removed) for leaf rows so
       * the Name column aligns consistently across all depths.
       */
      <DataTableExpandButton row={row} />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
    meta: { exportable: false },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Name" />
    ),
    cell: ({ row }) => (
      /*
       * Indent based on depth: departments (depth 0) have no indent,
       * staff members (depth 1) are indented 24 px.
       */
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: `${row.depth * 24}px` }}
      >
        {row.depth === 0 ? (
          /* Department row — bold name with head-count chip */
          <>
            <Users className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-semibold">{row.getValue("name")}</span>
            {row.original.headCount !== undefined && (
              <Badge variant="outline" className="ml-1 text-xs font-normal">
                {row.original.headCount} staff
              </Badge>
            )}
          </>
        ) : (
          /* Staff row — normal weight, no icon */
          <span>{row.getValue("name")}</span>
        )}
      </div>
    ),
    enableSorting: true,
    meta: { label: "Name" },
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Role" />
    ),
    cell: ({ row }) => (
      <span
        className={
          row.depth === 0
            ? "text-xs font-medium uppercase tracking-wide text-muted-foreground"
            : "text-sm"
        }
      >
        {row.getValue("role")}
      </span>
    ),
    enableSorting: true,
    meta: { label: "Role" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const s = row.getValue("status") as OrgNode["status"];
      return (
        <Badge variant={STATUS_VARIANT[s]}>
          {STATUS_LABEL[s]}
        </Badge>
      );
    },
    enableSorting: true,
    meta: { label: "Status" },
  },
  {
    id: "headCount_experience",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Staff / Exp." />
    ),
    cell: ({ row }) =>
      row.depth === 0 ? (
        /* Department: show total head count */
        <span className="font-medium">
          {row.original.headCount} members
        </span>
      ) : (
        /* Staff: show years of experience */
        <span className="text-muted-foreground">
          {row.original.experience} yrs exp.
        </span>
      ),
    enableSorting: false,
    meta: { label: "Staff / Experience" },
  },
  {
    id: "budget_salary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Budget / Salary" />
    ),
    cell: ({ row }) =>
      row.depth === 0 ? (
        /* Department: annual budget */
        <span className="font-medium tabular-nums">
          ${(row.original.budget ?? 0).toLocaleString("en-US")}
        </span>
      ) : (
        /* Staff: annual salary */
        <span className="tabular-nums text-muted-foreground">
          ${(row.original.salary ?? 0).toLocaleString("en-US")}
        </span>
      ),
    enableSorting: false,
    meta: { label: "Budget / Salary" },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Demonstrates the sub-rows (tree data) expand pattern.
 * Parent rows are departments; child rows are staff members.
 * `getSubRows` tells TanStack where to find child rows — the expanded
 * row model then inserts them into the row list automatically when a
 * department is expanded.
 */
export function RowExpandSubrowsExample() {
  const { table } = useDataTable({
    columns: COLUMNS,
    data: DEMO_ORG,
    initialPageSize: 20,
    // Tell TanStack where to find children for each row
    getSubRows: (row) => row.subRows ?? [],
    // Start with Cardiology open so the tree structure is immediately visible
    initialExpanded: { "dept-cardio": true },
  });

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">Row Expand — Sub-rows / Tree</h2>
        <p className="text-sm text-muted-foreground">
          Hierarchical data: departments expand to reveal staff members.
          TanStack Table manages the row tree — no extra panel needed.
          Depth-based indentation shows the hierarchy visually.
        </p>
      </div>

      <DataTable table={table} />
    </div>
  );
}
