/**
 * @file row-expand-detail-example.tsx
 * @description Example 9 — Row expand / detail panel pattern.
 *
 * Each row has a chevron that expands it into a full-width panel rendered
 * directly beneath the row. The panel shows additional fields that don't fit
 * in the table columns (contact info, allergies, medications, visit notes).
 *
 * Implementation notes:
 * - The "expand" column renders DataTableExpandButton.
 * - `renderSubComponent` on DataTable is the render function for the panel.
 * - TanStack's getExpandedRowModel (wired in useDataTable) tracks state.
 * - Row.getCanExpand() returns true for all rows here (see `getRowCanExpand`).
 *
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Mail, MapPin, Phone, Pill, AlertTriangle, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableExpandButton,
  DataTableToolbar,
  useDataTable,
} from "@/modules/client/shared/components/tables";

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

/** Extended patient record — core fields shown in columns, detail fields in panel */
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  department: string;
  status: "active" | "inactive" | "pending";
  // Detail-panel only fields
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  allergies: string[];
  medications: string[];
  lastVisitDate: string;
  lastVisitNotes: string;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_PATIENTS: Patient[] = [
  {
    id: "P001", name: "Alice Johnson", age: 34, gender: "Female",
    department: "Cardiology", status: "active",
    phone: "+1 (555) 201-4832", email: "alice.johnson@email.com",
    address: "14 Maple Ave, Springfield, IL 62701",
    bloodType: "A+", allergies: ["Penicillin", "Sulfa drugs"],
    medications: ["Lisinopril 10mg", "Atorvastatin 20mg"],
    lastVisitDate: "2024-05-10",
    lastVisitNotes: "Blood pressure stable at 128/82. Continue current medication. Follow up in 3 months.",
  },
  {
    id: "P002", name: "Bob Smith", age: 52, gender: "Male",
    department: "Neurology", status: "active",
    phone: "+1 (555) 384-9201", email: "bob.smith@email.com",
    address: "89 Oak Street, Portland, OR 97201",
    bloodType: "O-", allergies: [],
    medications: ["Topiramate 50mg", "Escitalopram 10mg"],
    lastVisitDate: "2024-06-01",
    lastVisitNotes: "Migraine frequency reduced to 2x/month. Topiramate appears effective. Maintain current dosage.",
  },
  {
    id: "P003", name: "Carol White", age: 28, gender: "Female",
    department: "Orthopedics", status: "pending",
    phone: "+1 (555) 492-7731", email: "carol.white@email.com",
    address: "23 Pine Road, Austin, TX 78701",
    bloodType: "B+", allergies: ["Ibuprofen"],
    medications: ["Acetaminophen 500mg", "Calcium supplements"],
    lastVisitDate: "2024-04-15",
    lastVisitNotes: "Post-fracture healing progressing well. X-ray shows good callus formation. Weight-bearing permitted.",
  },
  {
    id: "P004", name: "David Brown", age: 67, gender: "Male",
    department: "Oncology", status: "inactive",
    phone: "+1 (555) 671-2204", email: "david.brown@email.com",
    address: "7 Willow Lane, Boston, MA 02101",
    bloodType: "AB+", allergies: ["Latex", "Codeine"],
    medications: ["Tamoxifen 20mg", "Metformin 500mg", "Amlodipine 5mg"],
    lastVisitDate: "2023-12-20",
    lastVisitNotes: "PSA levels within normal range. Annual surveillance recommended. Patient declined further chemotherapy.",
  },
  {
    id: "P005", name: "Eva Martinez", age: 41, gender: "Female",
    department: "Cardiology", status: "active",
    phone: "+1 (555) 103-5567", email: "eva.martinez@email.com",
    address: "56 Cedar Blvd, Miami, FL 33101",
    bloodType: "O+", allergies: [],
    medications: ["Metoprolol 25mg", "Aspirin 81mg"],
    lastVisitDate: "2024-06-05",
    lastVisitNotes: "Resting heart rate 68 bpm. Echocardiogram normal. Exercise tolerance improved since last visit.",
  },
  {
    id: "P006", name: "Frank Lee", age: 58, gender: "Male",
    department: "Dermatology", status: "active",
    phone: "+1 (555) 829-4410", email: "frank.lee@email.com",
    address: "33 Birch Street, Seattle, WA 98101",
    bloodType: "A-", allergies: ["Neomycin"],
    medications: ["Doxycycline 100mg", "Tretinoin 0.05% cream"],
    lastVisitDate: "2024-05-28",
    lastVisitNotes: "Rosacea responding well to oral antibiotics. Sun protection counseling provided. Reduce to maintenance dose.",
  },
  {
    id: "P007", name: "Grace Kim", age: 23, gender: "Female",
    department: "General", status: "active",
    phone: "+1 (555) 244-8803", email: "grace.kim@email.com",
    address: "102 Elm Street, Denver, CO 80201",
    bloodType: "B-", allergies: ["Amoxicillin"],
    medications: ["Montelukast 10mg"],
    lastVisitDate: "2024-06-03",
    lastVisitNotes: "Seasonal asthma well-controlled. Rescue inhaler use minimal. Annual flu vaccination administered.",
  },
  {
    id: "P008", name: "Henry Chen", age: 45, gender: "Male",
    department: "Orthopedics", status: "pending",
    phone: "+1 (555) 367-1129", email: "henry.chen@email.com",
    address: "61 Spruce Ave, Chicago, IL 60601",
    bloodType: "O+", allergies: [],
    medications: ["Celecoxib 200mg", "Vitamin D3 2000IU"],
    lastVisitDate: "2024-05-20",
    lastVisitNotes: "Knee osteoarthritis moderate. Awaiting MRI results. Discussed surgical options — patient prefers conservative management.",
  },
];

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const STATUS_VARIANTS: Record<
  Patient["status"],
  "default" | "secondary" | "outline"
> = {
  active:   "default",
  pending:  "secondary",
  inactive: "outline",
};

// ---------------------------------------------------------------------------
// Column definitions — core columns only; detail lives in the panel
// ---------------------------------------------------------------------------

const COLUMNS: ColumnDef<Patient>[] = [
  {
    id: "expand",
    header: () => null,
    cell: ({ row }) => <DataTableExpandButton row={row} />,
    enableSorting: false,
    enableHiding: false,
    size: 40,
    meta: { exportable: false },
  },
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
    enableSorting: true,
    enableColumnFilter: true,
    meta: { label: "Name", variant: "text", placeholder: "Search name..." },
    filterFn: (row, columnId, filterValue: string) =>
      String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase()),
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
    accessorKey: "department",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Department" />
    ),
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      label: "Department",
      variant: "select",
      options: [
        { label: "Cardiology",   value: "Cardiology"   },
        { label: "Neurology",    value: "Neurology"    },
        { label: "Orthopedics",  value: "Orthopedics"  },
        { label: "Oncology",     value: "Oncology"     },
        { label: "Dermatology",  value: "Dermatology"  },
        { label: "General",      value: "General"      },
      ],
    },
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue(columnId)),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const s = row.getValue("status") as Patient["status"];
      return (
        <Badge variant={STATUS_VARIANTS[s]} className="capitalize">{s}</Badge>
      );
    },
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "multiSelect",
      options: [
        { label: "Active",   value: "active"   },
        { label: "Pending",  value: "pending"  },
        { label: "Inactive", value: "inactive" },
      ],
    },
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue(columnId)),
  },
];

// ---------------------------------------------------------------------------
// Detail panel renderer
// ---------------------------------------------------------------------------

/**
 * Renders the expanded detail panel for a patient row.
 * Shown as a full-width row beneath the parent row when the chevron is clicked.
 *
 * @param row - The expanded TanStack Row.
 */
function PatientDetailPanel({ row }: { row: Row<Patient> }) {
  const p = row.original;

  return (
    <div className="grid grid-cols-1 gap-4 border-t bg-muted/30 px-6 py-4 sm:grid-cols-3">
      {/* ── Contact info ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contact
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{p.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{p.email}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="leading-snug">{p.address}</span>
          </div>
        </div>
        <div className="pt-1">
          <span className="text-xs text-muted-foreground">Blood type </span>
          <span className="font-mono text-sm font-semibold">{p.bloodType}</span>
        </div>
      </div>

      {/* ── Allergies & medications ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Allergies
          </p>
          {p.allergies.length === 0 ? (
            <span className="text-sm text-muted-foreground">None recorded</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {p.allergies.map((a) => (
                <Badge key={a} variant="destructive" className="gap-1 text-xs font-normal">
                  <AlertTriangle className="size-3" />
                  {a}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Separator />
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Current Medications
          </p>
          <div className="space-y-1">
            {p.medications.map((m) => (
              <div key={m} className="flex items-center gap-2 text-sm">
                <Pill className="size-3.5 shrink-0 text-muted-foreground" />
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Last visit notes ──────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Last Visit Notes
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(p.lastVisitDate).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          })}
        </p>
        <div className="flex items-start gap-2 rounded-md bg-background p-2.5 text-sm ring-1 ring-border">
          <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="leading-relaxed text-muted-foreground">{p.lastVisitNotes}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Demonstrates the detail-panel row expand pattern.
 * Click the chevron on any row to reveal contact info, allergies,
 * medications, and the latest visit notes inline — no page navigation needed.
 */
export function RowExpandDetailExample() {
  const { table } = useDataTable({
    columns: COLUMNS,
    data: DEMO_PATIENTS,
    initialPageSize: 10,
    // Tell TanStack that every row can be expanded (required for getCanExpand()
    // to return true when using renderSubComponent rather than sub-rows).
    getRowCanExpand: () => true,
  });

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">Row Expand — Detail Panel</h2>
        <p className="text-sm text-muted-foreground">
          Click the chevron to expand a row and reveal additional details inline.
          Contact info, allergies, medications, and visit notes without leaving
          the table.
        </p>
      </div>

      <DataTable
        table={table}
        renderSubComponent={(row) => <PatientDetailPanel row={row as Row<Patient>} />}
      >
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}
