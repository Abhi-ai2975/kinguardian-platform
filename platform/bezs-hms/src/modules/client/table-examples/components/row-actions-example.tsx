/**
 * @file row-actions-example.tsx
 * @description Demonstrates the three new DataTable features:
 *
 * 1. **DataTableRowActions** — a per-row "..." dropdown with View, Edit,
 *    and Delete actions. The Delete action is destructive-styled and removes
 *    the row from local state.
 *
 * 2. **`emptyState` prop** — a custom branded empty state with an icon and
 *    a "Clear filters" button, shown when no rows match the current filters.
 *
 * 3. **`loading` prop** — a toggle simulates a 1.2 s data fetch; the table
 *    body is replaced with animated skeleton rows while loading.
 *
 * @layer client/table-examples
 */

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, SearchX, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

/** A single appointment record */
interface Appointment {
  id: string;
  patient: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const INITIAL_DATA: Appointment[] = [
  {
    id: "A001",
    patient: "Aisha Patel",
    doctor: "Dr. Torres",
    specialty: "Cardiology",
    date: "2024-12-01",
    time: "09:00",
    status: "scheduled",
  },
  {
    id: "A002",
    patient: "Bruno Costa",
    doctor: "Dr. Klein",
    specialty: "Neurology",
    date: "2024-12-01",
    time: "10:30",
    status: "completed",
  },
  {
    id: "A003",
    patient: "Clara Nguyen",
    doctor: "Dr. Sharma",
    specialty: "Oncology",
    date: "2024-12-02",
    time: "08:15",
    status: "cancelled",
  },
  {
    id: "A004",
    patient: "David Müller",
    doctor: "Dr. Gupta",
    specialty: "Orthopedics",
    date: "2024-12-02",
    time: "11:00",
    status: "scheduled",
  },
  {
    id: "A005",
    patient: "Evelyn Nakamura",
    doctor: "Dr. Tanaka",
    specialty: "Pediatrics",
    date: "2024-12-03",
    time: "09:45",
    status: "no-show",
  },
  {
    id: "A006",
    patient: "Femi Adeyemi",
    doctor: "Dr. Svensson",
    specialty: "Cardiology",
    date: "2024-12-03",
    time: "14:00",
    status: "scheduled",
  },
  {
    id: "A007",
    patient: "Grace Liu",
    doctor: "Dr. Torres",
    specialty: "Neurology",
    date: "2024-12-04",
    time: "10:00",
    status: "completed",
  },
  {
    id: "A008",
    patient: "Hassan Ali",
    doctor: "Dr. Klein",
    specialty: "Orthopedics",
    date: "2024-12-04",
    time: "13:30",
    status: "scheduled",
  },
  {
    id: "A009",
    patient: "Irene Johansson",
    doctor: "Dr. Sharma",
    specialty: "Oncology",
    date: "2024-12-05",
    time: "08:00",
    status: "completed",
  },
  {
    id: "A010",
    patient: "James Wright",
    doctor: "Dr. Gupta",
    specialty: "Cardiology",
    date: "2024-12-05",
    time: "15:00",
    status: "cancelled",
  },
  {
    id: "A011",
    patient: "Keiko Watanabe",
    doctor: "Dr. Tanaka",
    specialty: "Pediatrics",
    date: "2024-12-06",
    time: "09:00",
    status: "scheduled",
  },
  {
    id: "A012",
    patient: "Luca Bianchi",
    doctor: "Dr. Svensson",
    specialty: "Neurology",
    date: "2024-12-06",
    time: "11:30",
    status: "no-show",
  },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<
  Appointment["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "destructive",
  "no-show": "outline",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shows DataTableRowActions, custom emptyState, and the loading prop.
 * Each row has a "..." menu with View, Edit, and Delete.
 * Deleting all rows that match the current filter reveals the custom empty state.
 * The "Simulate loading" button demonstrates the skeleton overlay.
 */
export function RowActionsExample() {
  const [data, setData] = React.useState<Appointment[]>(INITIAL_DATA);
  const [loading, setLoading] = React.useState(false);

  // ── Row action handlers ──────────────────────────────────────────────────

  /** Stub for "View" — in a real app would navigate or open a sheet */
  const handleView = React.useCallback((appt: Appointment) => {
    toast.info(`Viewing appointment ${appt.id} for ${appt.patient}`);
  }, []);

  /** Stub for "Edit" — in a real app would open a form drawer */
  const handleEdit = React.useCallback((appt: Appointment) => {
    toast(`Editing ${appt.id}`, {
      description: `${appt.patient} with ${appt.doctor}`,
    });
  }, []);

  /** Remove the row from local state */
  const handleDelete = React.useCallback((appt: Appointment) => {
    setData((prev) => prev.filter((a) => a.id !== appt.id));
    toast.error(`Deleted appointment ${appt.id}`);
  }, []);

  // ── Column definitions ───────────────────────────────────────────────────

  /**
   * Columns are built inside useMemo so the action handlers are stable
   * references that close over the latest callbacks without re-building
   * the column array on every render.
   */
  const columns = React.useMemo<ColumnDef<Appointment>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.getValue("id")}
          </span>
        ),
        enableColumnFilter: false,
        enableSorting: false,
        meta: { label: "ID" },
      },
      {
        accessorKey: "patient",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Patient" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("patient")}</span>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        meta: {
          label: "Patient",
          variant: "text",
          placeholder: "Search patient…",
        },
        filterFn: (row, colId, val: string) =>
          String(row.getValue(colId)).toLowerCase().includes(val.toLowerCase()),
      },
      {
        accessorKey: "doctor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Doctor" />
        ),
        enableSorting: true,
        enableColumnFilter: false,
        meta: { label: "Doctor" },
      },
      {
        accessorKey: "specialty",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Specialty" />
        ),
        enableSorting: true,
        enableColumnFilter: true,
        meta: {
          label: "Specialty",
          variant: "select",
          options: [
            { label: "Cardiology", value: "Cardiology" },
            { label: "Neurology", value: "Neurology" },
            { label: "Oncology", value: "Oncology" },
            { label: "Orthopedics", value: "Orthopedics" },
            { label: "Pediatrics", value: "Pediatrics" },
          ],
        },
        filterFn: (row, colId, val: string) => row.getValue(colId) === val,
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Date" />
        ),
        enableSorting: true,
        enableColumnFilter: false,
        meta: { label: "Date" },
      },
      {
        accessorKey: "time",
        header: "Time",
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: "Time" },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        cell: ({ row }) => {
          const s = row.getValue<Appointment["status"]>("status");
          return (
            <Badge variant={STATUS_VARIANT[s]} className="capitalize">
              {s.replace("-", " ")}
            </Badge>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
        meta: {
          label: "Status",
          variant: "select",
          options: [
            { label: "Scheduled", value: "scheduled" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
            { label: "No Show", value: "no-show" },
          ],
        },
        filterFn: (row, colId, val: string) => row.getValue(colId) === val,
      },
      {
        // Per-row actions column — not sortable, not hideable, not exported
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          /**
           * RowAction array typed to Appointment.
           * `separator: true` on Delete draws a divider above it.
           */
          const actions: RowAction<Appointment>[] = [
            {
              label: "View",
              icon: Eye,
              onClick: (r) => handleView(r.original),
            },
            {
              label: "Edit",
              icon: Pencil,
              onClick: (r) => handleEdit(r.original),
              // Disable edit for cancelled / no-show appointments
              disabled: (r) =>
                ["cancelled", "no-show"].includes(r.original.status),
            },
            {
              label: "Delete",
              icon: Trash2,
              onClick: (r) => handleDelete(r.original),
              destructive: true,
              separator: true,
            },
          ];
          return <DataTableRowActions row={row} actions={actions} />;
        },
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
        // Exclude from export so the "Actions" column doesn't appear in downloads
        meta: { exportable: false },
      },
    ],
    [handleView, handleEdit, handleDelete],
  );

  // ── Table instance ───────────────────────────────────────────────────────

  const { table } = useDataTable({ columns, data, initialPageSize: 10 });

  // ── Simulate loading ─────────────────────────────────────────────────────

  /**
   * Resets data to the initial set after a short delay, toggling the loading
   * prop to demonstrate the skeleton overlay behaviour.
   */
  const simulateReload = React.useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setData(INITIAL_DATA);
      setLoading(false);
    }, 1200);
  }, []);

  // ── Custom empty state ───────────────────────────────────────────────────

  /**
   * Clears all active column filters on the table instance.
   * Shown inside the custom empty state so users can escape a zero-results filter.
   */
  const clearFilters = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  const customEmptyState = (
    <div className="flex flex-col items-center gap-3 py-12">
      <SearchX className="size-9 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium">No appointments found</p>
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Row Actions · Empty State · Loading
          </h2>
          <p className="text-sm text-muted-foreground">
            Each row has a &quot;…&quot; menu (View / Edit / Delete). Delete all
            rows matching your filter to see the custom empty state. Use
            &quot;Reload&quot; to see the skeleton loading overlay.
          </p>
        </div>
        {/* Reload button to demo the loading prop */}
        <Button
          variant="outline"
          size="sm"
          onClick={simulateReload}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? "Loading…" : "Simulate reload"}
        </Button>
      </div>

      <DataTable table={table} loading={loading} emptyState={customEmptyState}>
        <div className="flex items-center justify-between gap-2">
          <DataTableToolbar table={table} className="flex-1" />
          <DataTableExportButton
            table={table}
            filename="appointments"
            title="Appointments"
          />
        </div>
      </DataTable>
    </div>
  );
}
