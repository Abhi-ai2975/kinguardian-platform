/**
 * Patient appointment table column definitions.
 *
 * Layer: client / telemedicine / patient / appointments / list
 *
 * Produces TanStack Table v8 ColumnDef array for the patient's own appointment
 * list. Columns: Expand, Doctor, Type, Date, Time, Duration, Status, Actions.
 *
 * The Expand column drives the row-detail panel (AppointmentDetailPanel); it
 * only works because the parent table passes `getRowCanExpand` and
 * `renderSubComponent` — the button renders invisible without them.
 *
 * Factory function pattern — callers pass action callbacks so the column
 * definitions remain pure (no Zustand, no React context dependency) and the
 * AlertDialog logic lives in the parent table component.
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  DataTableColumnHeader,
  DataTableExpandButton,
  DataTableRowActions,
  type RowAction,
} from "@/modules/client/shared/components/tables";
import { Badge } from "@/components/ui/badge";
import { type TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import { Eye, XCircle, CalendarClock, User, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Status options used in the multiSelect filter UI.
 * Mapped from FHIR R4 Appointment status codes.
 */
export const APPOINTMENT_STATUS_OPTIONS = [
  { label: "Proposed", value: "proposed" },
  { label: "Pending", value: "pending" },
  { label: "Booked", value: "booked" },
  { label: "Arrived", value: "arrived" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No Show", value: "noshow" },
  { label: "Checked In", value: "checked-in" },
  { label: "Waitlist", value: "waitlist" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO 8601 datetime string as a localised date string.
 * Uses the browser's locale so it respects the user's regional settings.
 *
 * @param isoString - UTC datetime string from the FHIR API, or nullish.
 * @returns Human-readable date string, or "—" if absent.
 */
function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats an ISO 8601 datetime string as a localised time string.
 * Slots are stored in UTC; the browser converts to local time automatically.
 *
 * @param isoString - UTC datetime string from the FHIR API, or nullish.
 * @returns Human-readable local time string, or "—" if absent.
 */
function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Resolves the treating practitioner's display name from the participant array.
 * Looks for the first participant whose reference_type is "Practitioner".
 *
 * @param participants - Appointment participant array, may be null.
 * @returns Display name string, or "—" if no practitioner participant found.
 */
function getDoctorName(
  participants: TAppointmentResponse["participant"],
): string {
  return (
    participants?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? "—"
  );
}

/** @private Maps a FHIR status code to a display label. */
const STATUS_LABEL: Record<string, string> = {
  proposed: "Proposed",
  pending: "Pending",
  booked: "Booked",
  arrived: "Arrived",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  noshow: "No Show",
  "entered-in-error": "Error",
  "checked-in": "Checked In",
  waitlist: "Waitlist",
};

/** @private Maps a FHIR status code to a Tailwind class string for the Badge. */
const STATUS_CLASS: Record<string, string> = {
  proposed: "bg-slate-100 text-slate-700 border-slate-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  booked: "bg-blue-100 text-blue-800 border-blue-200",
  arrived: "bg-teal-100 text-teal-800 border-teal-200",
  fulfilled: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  noshow: "bg-orange-100 text-orange-800 border-orange-200",
  "entered-in-error": "bg-red-200 text-red-900 border-red-300",
  "checked-in": "bg-cyan-100 text-cyan-800 border-cyan-200",
  waitlist: "bg-purple-100 text-purple-800 border-purple-200",
};

/**
 * Renders a coloured status Badge for a FHIR appointment status code.
 *
 * @param status - FHIR appointment status string (may be null).
 * @returns Rendered Badge element.
 */
function AppointmentStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const label = STATUS_LABEL[status ?? ""] ?? status ?? "Unknown";
  const className = STATUS_CLASS[status ?? ""] ?? "";
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// ── Column factory ────────────────────────────────────────────────────────────

/** Callbacks injected into the column actions cell by the parent table component. */
export interface PatientAppointmentColumnCallbacks {
  /** Called when the patient clicks "View" — navigates to the appointment detail page. */
  onView: (row: TAppointmentResponse) => void;
  /** Called when the patient requests to cancel a booked or pending appointment. */
  onCancel: (row: TAppointmentResponse) => void;
  /** Called when the patient requests to reschedule a pending or booked appointment. */
  onReschedule: (row: TAppointmentResponse) => void;
  /** Called when the patient joins the virtual consultation room for a booked appointment. */
  onConsult: (row: TAppointmentResponse) => void;
}

/**
 * Builds the ColumnDef array for the patient appointment table.
 *
 * Separation from the table component means column definitions are stateless
 * and trivial to test independently.
 *
 * @param callbacks - Parent-provided mutation callbacks for row-level actions.
 * @returns TanStack Table v8 column definitions.
 */
export function createPatientAppointmentColumns(
  callbacks: PatientAppointmentColumnCallbacks,
): ColumnDef<TAppointmentResponse>[] {
  return [
    // ── Expand ───────────────────────────────────────────────────────────────
    // Leads the row so the chevron sits at the left edge, matching the
    // Organizations table. Excluded from export — it carries no data.
    {
      id: "expand",
      header: () => null,
      cell: ({ row }) => <DataTableExpandButton row={row} />,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 40,
      meta: { exportable: false },
    },

    // ── Doctor (Practitioner participant) ────────────────────────────────────
    {
      id: "doctor",
      accessorFn: (row) => getDoctorName(row.participant),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Doctor" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <User className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium truncate max-w-40">
            {getDoctorName(row.original.participant)}
          </span>
        </div>
      ),
      meta: {
        label: "Doctor",
        variant: "text",
        placeholder: "Search doctor...",
      },
      filterFn: (row, _columnId, filterValue: string) =>
        getDoctorName(row.original.participant)
          .toLowerCase()
          .includes(filterValue.toLowerCase()),
    },

    // ── Appointment type ─────────────────────────────────────────────────────
    {
      id: "appointment_type",
      accessorFn: (row) =>
        row.appointment_type_display ?? row.appointment_type_text ?? "—",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Type" />
      ),
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {getValue() as string}
        </span>
      ),
      meta: { label: "Type" },
    },

    // ── Date ─────────────────────────────────────────────────────────────────
    {
      id: "date",
      accessorFn: (row) => row.start,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Date" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {formatDate(row.original.start)}
        </span>
      ),
      meta: { label: "Date" },
    },

    // ── Time ─────────────────────────────────────────────────────────────────
    {
      id: "time",
      accessorFn: (row) => row.start,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Time" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {formatTime(row.original.start)}
        </span>
      ),
      meta: { label: "Time" },
    },

    // ── Duration ─────────────────────────────────────────────────────────────
    {
      id: "duration",
      accessorFn: (row) => row.minutes_duration,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Duration" />
      ),
      cell: ({ row }) =>
        row.original.minutes_duration != null ? (
          <span className="tabular-nums text-sm">
            {row.original.minutes_duration} min
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
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
        <AppointmentStatusBadge status={row.original.status} />
      ),
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: APPOINTMENT_STATUS_OPTIONS,
      },
      filterFn: (row, _columnId, filterValue: string[]) =>
        !filterValue?.length || filterValue.includes(row.original.status ?? ""),
    },

    // ── Actions ──────────────────────────────────────────────────────────────
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const status = row.original.status;
        const canCancel = status === "booked" || status === "pending";
        const isBooked = status === "booked";
        // Only slot-booked appointments have a slot reference; AI intake appointments do not
        // and the backend will reject the reschedule with 422 if no slot array exists.
        const canReschedule =
          (status === "pending" || status === "booked") &&
          !!row.original.slot?.length;

        const actions: RowAction<TAppointmentResponse>[] = [
          ...(canReschedule
            ? [
                {
                  label: "Reschedule",
                  icon: CalendarClock,
                  onClick: () => callbacks.onReschedule(row.original),
                },
              ]
            : []),
          ...(canCancel
            ? [
                {
                  label: "Cancel",
                  icon: XCircle,
                  onClick: () => callbacks.onCancel(row.original),
                },
              ]
            : []),
        ];

        return (
          <div className="flex items-center gap-1">
            {/* Inline view button — always visible, navigates to detail page */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => callbacks.onView(row.original)}
            >
              <Eye className="size-3 mr-1" />
              View
            </Button>
            {/* Consult Online — only for booked appointments with a virtual consultation room */}
            {isBooked && (
              <Button
                size="sm"
                variant="default"
                className="h-7 px-2 text-xs"
                onClick={() => callbacks.onConsult(row.original)}
              >
                <Video className="size-3 mr-1" />
                Consult Online
              </Button>
            )}
            {/* Three-dot menu — only when status-dependent actions exist */}
            {actions.length > 0 && (
              <DataTableRowActions row={row} actions={actions} />
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 110,
    },
  ];
}
