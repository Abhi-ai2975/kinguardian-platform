/**
 * RecentAppointmentsTable — patient dashboard widget showing the 5 most-recent appointments.
 *
 * Layer: client / telemedicine / patient / component / dashboard
 *
 * A lightweight, non-paginated table displaying appointment date, type, doctor, and
 * status badge. Consumed only by PatientDashboard (not the full appointments list page).
 * Status badges map FHIR status codes to human-readable labels and colours.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal appointment record needed for this widget. */
export interface DashboardAppointment {
  id: number;
  /** ISO datetime string, e.g. "2026-06-15T09:30:00Z". */
  date?: string | null;
  /** Appointment type label, e.g. "Virtual Consultation". */
  type?: string | null;
  /** Doctor display name derived from participants. */
  doctorName?: string | null;
  /** FHIR appointment status code. */
  status?: string | null;
}

interface RecentAppointmentsTableProps {
  /** Up to 5 appointments to render. */
  appointments: DashboardAppointment[];
}

// ── Status badge config ───────────────────────────────────────────────────────

/** Maps FHIR appointment status to display label and Tailwind colour class. */
const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  fulfilled: {
    label: "Completed",
    className: "bg-emerald-600/10 text-emerald-600 border-emerald-600/20",
  },
  booked: {
    label: "Booked",
    className: "bg-blue-600/10 text-blue-600 border-blue-600/20",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-600/10 text-yellow-700 border-yellow-600/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-600/10 text-rose-600 border-rose-600/20",
  },
  noshow: {
    label: "No-show",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  arrived: {
    label: "Arrived",
    className: "bg-indigo-600/10 text-indigo-600 border-indigo-600/20",
  },
};

/**
 * Returns a localised date string for display in the table.
 *
 * @param iso - ISO 8601 datetime string.
 * @returns Human-readable date, e.g. "Jun 15, 2026".
 */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a compact table of recent appointments with status badges.
 * Shows a "No appointments yet" empty state when the array is empty.
 *
 * @param appointments - Array of up to 5 appointment records.
 */
export function RecentAppointmentsTable({ appointments }: RecentAppointmentsTableProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Recent Appointments</h2>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-xs h-auto p-0 font-normal opacity-70 hover:opacity-100 hover:bg-transparent hover:underline"
        >
          <Link href="/bezs/telemedicine/patient/appointments">See all</Link>
        </Button>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No appointments yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appt) => {
              const statusCfg =
                STATUS_CONFIG[appt.status ?? ""] ?? {
                  label: appt.status ?? "Unknown",
                  className:
                    "bg-gray-500/10 text-gray-500 border-gray-500/20",
                };

              return (
                <TableRow key={appt.id}>
                  <TableCell className="text-sm">
                    {appt.date ? formatDate(appt.date) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {appt.type ?? "Consultation"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {appt.doctorName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs capitalize", statusCfg.className)}
                    >
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
