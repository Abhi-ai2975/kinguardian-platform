/**
 * PatientListTable — step 1 of the doctor's Clinical Records drill-down.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Lists every distinct patient this doctor has had an appointment with, with
 * visit counts and last-visit date. Clicking a row drills into that patient's
 * appointments.
 *
 * Data is derived server-side and passed in whole (there is no
 * patients-by-practitioner endpoint to paginate against), so this uses the
 * client-side useDataTable rather than useServerDataTable — search, sort and
 * pagination all run in-memory.
 */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, UserRound, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableToolbar,
  useDataTable,
} from "@/modules/client/shared/components/tables";
import type { DoctorPatientSummary } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO datetime as a short locale date, e.g. "5 Jan 2026".
 *
 * @param iso - ISO 8601 string, or null when the patient has no past visit.
 * @returns Formatted date, or an em dash placeholder.
 */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientListTableProps {
  /** Distinct patients derived from this doctor's appointments. */
  patients: DoctorPatientSummary[];
  /** Localised base href for the drill-down, e.g. "/en/bezs/.../clinical-records". */
  baseHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Searchable, sortable table of the doctor's patients.
 *
 * @param patients - Pre-derived patient summaries (SSR).
 * @param baseHref - Base path that each row links under.
 */
export function PatientListTable({ patients, baseHref }: PatientListTableProps) {
  const router = useRouter();

  /* Column defs depend on baseHref/router for the row link, so memoise on both. */
  const columns = useMemo<ColumnDef<DoctorPatientSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Patient" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium truncate">{row.original.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                Patient/{row.original.patientId}
              </p>
            </div>
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        meta: {
          label: "Patient",
          variant: "text",
          placeholder: "Search patient…",
        },
        filterFn: (row, columnId, filterValue: string) =>
          String(row.getValue(columnId))
            .toLowerCase()
            .includes(String(filterValue).toLowerCase()),
      },
      {
        accessorKey: "visitCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Appointments" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.visitCount}</span>
        ),
        enableSorting: true,
        enableColumnFilter: false,
        meta: { label: "Appointments" },
      },
      {
        accessorKey: "completedCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Completed" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="tabular-nums font-normal">
            {row.original.completedCount}
          </Badge>
        ),
        enableSorting: true,
        enableColumnFilter: false,
        meta: { label: "Completed" },
      },
      {
        accessorKey: "upcomingCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Upcoming" />
        ),
        cell: ({ row }) =>
          row.original.upcomingCount > 0 ? (
            <Badge className="tabular-nums font-normal">
              {row.original.upcomingCount}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: true,
        enableColumnFilter: false,
        meta: { label: "Upcoming" },
      },
      {
        accessorKey: "lastVisit",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Last Visit" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {fmtDate(row.original.lastVisit)}
          </span>
        ),
        enableSorting: true,
        enableColumnFilter: false,
        meta: { label: "Last Visit" },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Open</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => router.push(`${baseHref}/${row.original.patientId}`)}
          >
            Open
            <ChevronRight className="size-3.5" />
          </Button>
        ),
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
        meta: { exportable: false },
      },
    ],
    [baseHref, router],
  );

  const { table } = useDataTable({
    columns,
    data: patients,
    initialSorting: [{ id: "lastVisit", desc: true }],
    initialPageSize: 10,
  });

  /* Dedicated empty state — a doctor with no appointments yet has no roster. */
  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Users className="size-10 opacity-30" />
        <p className="text-sm font-medium">No patients yet.</p>
        <p className="text-xs opacity-70 max-w-xs text-center">
          Patients appear here once they book an appointment with you.
        </p>
      </div>
    );
  }

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
