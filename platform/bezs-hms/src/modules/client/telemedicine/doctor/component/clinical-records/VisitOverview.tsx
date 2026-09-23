/**
 * VisitOverview — read-only view for a visit with no clinical record yet.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Shown in place of the workspace when an appointment has produced no Encounter.
 * Every clinical resource is linked to an encounter, so there is nothing to
 * write against until the consultation completes — but the doctor still needs
 * to see what the visit is and what the patient reported.
 *
 * This exists so the Clinical Records flow never hands off to the old
 * appointment detail page mid-drill-down. It carries the same information in
 * the section's own visual language.
 */

"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  Info,
  MessageSquare,
  Stethoscope,
  Timer,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { IntakeTab } from "./tabs/IntakeTab";
import { ConsultationTranscriptDrawer } from "./note/ConsultationTranscriptDrawer";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";
import type { TConsultationTranscriptMessage } from "@/modules/entities/schemas/consultation";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO datetime as a locale date + time.
 *
 * @param iso - ISO 8601 string.
 * @returns Formatted string, or an em dash when absent/unparseable.
 */
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

/**
 * Explains, per appointment status, why there is no clinical record.
 *
 * @param status - FHIR appointment status.
 * @returns A sentence for the notice card.
 */
function statusExplanation(status: string): string {
  switch (status) {
    case "cancelled":
      return "This appointment was cancelled, so no consultation took place and no clinical record exists.";
    case "noshow":
      return "The patient did not attend, so no consultation took place and no clinical record exists.";
    case "entered-in-error":
      return "This appointment was recorded in error. No clinical record will be created for it.";
    case "booked":
    case "pending":
    case "proposed":
    case "waitlist":
      return "The consultation has not happened yet. Clinical entry unlocks once it is completed.";
    case "arrived":
    case "checked-in":
      return "The patient has arrived but the consultation has not been completed. Clinical entry unlocks once it is.";
    default:
      return "No encounter was created for this appointment, so there is nothing to document against yet. Clinical entry unlocks once the consultation is completed.";
  }
}

/** Maps an appointment status to a badge variant. */
const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  fulfilled: "secondary",
  "checked-in": "secondary",
  booked: "default",
  pending: "outline",
  proposed: "outline",
  arrived: "default",
  waitlist: "outline",
  cancelled: "destructive",
  noshow: "destructive",
  "entered-in-error": "destructive",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface VisitOverviewProps {
  /** The appointment being viewed. */
  appointment: TAppointmentResponse;
  /** Patient display name. */
  patientName: string;
  /** Doctor display name. */
  doctorName: string;
  /** Intake record, or null when the patient completed none. */
  intake: TIntakeResponse | null;
  /** Consultation transcript, if any was captured. */
  transcript: TConsultationTranscriptMessage[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Read-only visit summary with the AI intake, shown when no encounter exists.
 *
 * @param props - See VisitOverviewProps.
 */
export function VisitOverview({
  appointment,
  patientName,
  doctorName,
  intake,
  transcript,
}: VisitOverviewProps) {
  /** Whether the consultation transcript drawer is open. */
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const status = appointment.status ?? "unknown";
  const apptType =
    appointment.appointment_type_display ??
    appointment.appointment_type_text ??
    null;

  return (
    <div className="space-y-4">
      {/* ── Why there is no record ── */}
      <Card className="border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 px-4 py-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">No clinical record yet</p>
            <p className="text-sm text-muted-foreground">
              {statusExplanation(status)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Appointment detail ── */}
      <Card>
        <CardContent className="space-y-3 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <p className="text-sm font-semibold">Appointment</p>
            <Badge
              variant="outline"
              className="text-[10px] font-mono font-normal"
            >
              Appointment/{appointment.id}
            </Badge>
            <Badge
              variant={STATUS_VARIANT[status] ?? "outline"}
              className="ml-auto text-xs font-normal capitalize"
            >
              {status}
            </Badge>
          </div>

          <Separator />

          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-3">
            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Start
              </p>
              <p className="flex items-center gap-1.5 text-sm">
                <Clock className="size-3 shrink-0 text-muted-foreground" />
                {fmtDateTime(appointment.start)}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                End
              </p>
              <p className="flex items-center gap-1.5 text-sm">
                <Clock className="size-3 shrink-0 text-muted-foreground" />
                {fmtDateTime(appointment.end)}
              </p>
            </div>

            {appointment.minutes_duration != null && (
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Duration
                </p>
                <p className="flex items-center gap-1.5 text-sm">
                  <Timer className="size-3 shrink-0 text-muted-foreground" />
                  {appointment.minutes_duration} min
                </p>
              </div>
            )}

            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Patient
              </p>
              <p className="flex items-center gap-1.5 text-sm">
                <User className="size-3 shrink-0 text-muted-foreground" />
                {patientName}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Practitioner
              </p>
              <p className="flex items-center gap-1.5 text-sm">
                <Stethoscope className="size-3 shrink-0 text-muted-foreground" />
                {doctorName}
              </p>
            </div>

            {apptType && (
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Type
                </p>
                <p className="text-sm">{apptType}</p>
              </div>
            )}
          </div>

          {appointment.description && (
            <>
              <Separator />
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="text-sm">{appointment.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── AI intake — the one thing that does exist before the consultation ── */}
      <IntakeTab intake={intake} />

      {/*
        The consultation transcript normally lives with the note it was written
        from, but this view exists precisely because there is no encounter and
        so no note. A call can still have happened without producing one, so the
        transcript is reachable here through the same drawer rather than being
        stranded.
      */}
      {transcript.length > 0 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setTranscriptOpen(true)}
          >
            <MessageSquare className="size-3.5" />
            View consultation conversation
            <span className="text-[10px] text-muted-foreground">
              {transcript.length}
            </span>
          </Button>

          <ConsultationTranscriptDrawer
            open={transcriptOpen}
            onOpenChange={setTranscriptOpen}
            transcript={transcript}
            patientName={patientName}
            appointmentDate={fmtDateTime(appointment.start)}
          />
        </>
      )}
    </div>
  );
}
