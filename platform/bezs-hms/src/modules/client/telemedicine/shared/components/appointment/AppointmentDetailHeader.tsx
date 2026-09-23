/**
 * AppointmentDetailHeader — shared appointment view header component.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Renders the meta-information section at the top of the appointment detail
 * page: status badge, date/time, doctor/patient names, duration, appointment
 * type, and description. Used by both the patient and doctor detail pages.
 *
 * Includes a Back button to navigate to the calling list page.
 */

"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Stethoscope, User, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO datetime string to a long-form localised date.
 *
 * @param iso - UTC ISO string from the FHIR API.
 * @returns Formatted date string, e.g. "Monday, June 14, 2026", or "—".
 */
function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats an ISO datetime string to a localised time.
 *
 * @param iso - UTC ISO string from the FHIR API.
 * @returns Formatted time string, e.g. "10:30 AM", or "—".
 */
function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** @private FHIR status → display label. */
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

/** @private FHIR status → Tailwind colour classes. */
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
 * Resolves the practitioner display name from the participant list.
 *
 * @param participants - Appointment participant array.
 * @returns Practitioner display name or null.
 */
function getDoctorName(
  participants: TAppointmentResponse["participant"],
): string | null {
  return (
    participants?.find((p) => p.reference_type === "Practitioner")
      ?.reference_display ?? null
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for AppointmentDetailHeader. */
interface AppointmentDetailHeaderProps {
  /** The appointment data fetched from the server. */
  appointment: TAppointmentResponse;
  /** Localised href to navigate back to the appointments list. */
  backHref: string;
  /** Controls whether to show the doctor or patient perspective labels. */
  perspective: "patient" | "doctor";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders appointment metadata for the detail view.
 *
 * Patient perspective: shows "Doctor" label with practitioner name.
 * Doctor perspective: shows "Patient" label with subject display name.
 *
 * @param appointment - Full FHIR appointment record.
 * @param backHref - URL of the appointments list for the back button.
 * @param perspective - Determines which party label to show.
 */
export function AppointmentDetailHeader({
  appointment,
  backHref,
  perspective,
}: AppointmentDetailHeaderProps) {
  const status = appointment.status ?? "";
  const statusLabel = STATUS_LABEL[status] ?? status ?? "Unknown";
  const statusClass = STATUS_CLASS[status] ?? "";

  const doctorName = getDoctorName(appointment.participant);
  const patientName = appointment.subject_display;

  const typeLabel =
    appointment.appointment_type_display ??
    appointment.appointment_type_text ??
    null;

  return (
    <div className="space-y-4">
      {/* Back nav */}
      <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Back to Appointments
        </Link>
      </Button>

      {/* Title row */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Appointment Details</h1>
        <Badge variant="outline" className={statusClass}>
          {statusLabel}
        </Badge>
        {typeLabel && (
          <Badge variant="secondary" className="font-normal">
            {typeLabel}
          </Badge>
        )}
      </div>

      {/* Meta grid */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {/* Date */}
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0" />
          {formatLongDate(appointment.start)}
        </span>

        {/* Time */}
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" />
          {formatTime(appointment.start)}
          {appointment.end && ` – ${formatTime(appointment.end)}`}
        </span>

        {/* Duration */}
        {appointment.minutes_duration != null && (
          <span className="flex items-center gap-1.5">
            <Timer className="size-3.5 shrink-0" />
            {appointment.minutes_duration} min
          </span>
        )}

        {/* Doctor or Patient depending on perspective */}
        {perspective === "patient" && doctorName && (
          <span className="flex items-center gap-1.5">
            <Stethoscope className="size-3.5 shrink-0" />
            Dr. {doctorName}
          </span>
        )}
        {perspective === "doctor" && patientName && (
          <span className="flex items-center gap-1.5">
            <User className="size-3.5 shrink-0" />
            {patientName}
          </span>
        )}
      </div>

      {/* Description / reason */}
      {appointment.description && (
        <p className="text-sm text-muted-foreground border-l-2 border-border pl-3">
          {appointment.description}
        </p>
      )}

      <Separator />
    </div>
  );
}
