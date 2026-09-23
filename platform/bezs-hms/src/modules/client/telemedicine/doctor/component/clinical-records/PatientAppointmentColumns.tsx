/**
 * Column definitions for the Clinical Records patient appointment table.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Columns: Date, Timing, Type, Duration, Status, Record, Open.
 *
 * Pagination and filtering are server-driven (see PatientAppointmentsTable,
 * which mirrors the doctor org appointment list) — the table only ever holds
 * one fetched page, so no column defines a filterFn. Two columns still carry
 * `meta.variant` because DataTableToolbar uses that alone to decide which
 * filter control to render; PatientAppointmentsTable reads the resulting
 * column-filter state and turns it into query params for the next fetch:
 *
 *   Date   → "dateRange", becomes start_from / start_to.
 *   Status → "multiSelect", but the backend accepts one status at a time
 *            (ListAppointmentsValidationSchema), so only the first selection
 *            is sent — the same simplification the doctor org list makes.
 *
 * Timing (Upcoming / Past) has no backend equivalent, so it is a plain display
 * column: no meta.variant, no filter control, computed from the caller-supplied
 * `nowMs` purely for the cell's own badge.
 *
 * Factory function pattern — the caller injects `nowMs`, the encounter set and
 * the workspace href so the definitions stay pure.
 */

"use client";

import Link from "next/link";
import { ClipboardList, FileClock } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/modules/client/shared/components/tables";
import {
  APPOINTMENT_STATUS_OPTIONS,
  STATUS_VARIANT,
  appointmentTiming,
  fmtDate,
  fmtDuration,
  fmtTime,
  statusLabel,
} from "./appointmentDisplay";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Column factory ────────────────────────────────────────────────────────────

/** Context the columns need but must not resolve for themselves. */
export interface PatientAppointmentColumnContext {
  /**
   * Reference instant for the Upcoming/Past split, in epoch milliseconds.
   * Resolved once by the server page — see appointmentTiming for why the
   * columns cannot read the clock themselves.
   */
  nowMs: number;
  /** Appointment ids that have at least one Encounter. */
  encounterIds: Set<number>;
  /** Base href for the workspace, e.g. ".../clinical-records/10023". */
  workspaceBaseHref: string;
}

/**
 * Builds the ColumnDef array for the patient appointment table.
 *
 * @param ctx - Reference instant, encounter set and workspace base href.
 * @returns TanStack Table v8 column definitions.
 */
export function createPatientAppointmentColumns({
  nowMs,
  encounterIds,
  workspaceBaseHref,
}: PatientAppointmentColumnContext): ColumnDef<TAppointmentResponse>[] {
  return [
    // ── Date ─────────────────────────────────────────────────────────────────
    // Carries the date-range filter; the cell shows date over time so the
    // column reads as one "when" rather than two.
    {
      id: "date",
      accessorFn: (row) => row.start ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Date" />
      ),
      cell: ({ row }) => {
        const time = fmtTime(row.original.start);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium tabular-nums">
              {fmtDate(row.original.start)}
            </span>
            {time && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {time}
              </span>
            )}
          </div>
        );
      },
      meta: { label: "Date", variant: "dateRange" },
    },

    // ── Timing ───────────────────────────────────────────────────────────────
    // Display only — replaces the old Upcoming / Past section headings, but
    // there is no backend filter for it, so no meta.variant.
    {
      id: "timing",
      accessorFn: (row) => appointmentTiming(row.start, nowMs),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Timing" />
      ),
      cell: ({ getValue }) =>
        getValue() === "upcoming" ? (
          <Badge variant="outline" className="text-xs font-normal">
            Upcoming
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Past</span>
        ),
      meta: { label: "Timing" },
      enableSorting: false,
    },

    // ── Type ─────────────────────────────────────────────────────────────────
    {
      id: "type",
      accessorFn: (row) =>
        row.appointment_type_display ?? row.appointment_type_text ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Type" />
      ),
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {(getValue() as string) || "—"}
        </span>
      ),
      meta: { label: "Type" },
    },

    // ── Duration ─────────────────────────────────────────────────────────────
    {
      id: "duration",
      accessorFn: (row) => row.minutes_duration ?? 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Duration" />
      ),
      cell: ({ row }) => {
        const duration = fmtDuration(
          row.original.start,
          row.original.end,
          row.original.minutes_duration,
        );
        return (
          <span className="text-sm tabular-nums text-muted-foreground">
            {duration ?? "—"}
          </span>
        );
      },
      meta: { label: "Duration" },
    },

    // ── Status ───────────────────────────────────────────────────────────────
    {
      id: "status",
      accessorFn: (row) => row.status ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={STATUS_VARIANT[row.original.status ?? ""] ?? "outline"}
          className="text-xs font-normal"
        >
          {statusLabel(row.original.status)}
        </Badge>
      ),
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: APPOINTMENT_STATUS_OPTIONS,
      },
    },

    // ── Record ───────────────────────────────────────────────────────────────
    // The table-view equivalent of the card's footer hint: whether this visit
    // produced an Encounter and so has something to document against.
    {
      id: "record",
      accessorFn: (row) => (encounterIds.has(row.id) ? "yes" : "no"),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Record" />
      ),
      cell: ({ getValue }) =>
        getValue() === "yes" ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <ClipboardList className="size-3.5 shrink-0" />
            In chart
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <FileClock className="size-3.5 shrink-0" />
            Visit only
          </span>
        ),
      meta: { label: "Record" },
      enableSorting: false,
    },

    // ── Open ─────────────────────────────────────────────────────────────────
    // Table rows are not clickable, so the destination needs an explicit
    // control — the grid view gets it from the card wrapping itself in a link.
    {
      id: "open",
      header: () => <span className="sr-only">Open</span>,
      cell: ({ row }) => (
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={`${workspaceBaseHref}/${row.original.id}`}>Open</Link>
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { exportable: false },
    },
  ];
}
