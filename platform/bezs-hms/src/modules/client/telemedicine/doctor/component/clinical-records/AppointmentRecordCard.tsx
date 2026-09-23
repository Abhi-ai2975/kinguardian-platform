/**
 * AppointmentRecordCard — one appointment as a card, for the grid view of the
 * Clinical Records appointment list.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Lifted out of the former PatientAppointmentList so the table's grid view can
 * render it through DataTableGridView's `renderCard`. The markup is unchanged
 * from that list — same fields, same footer, same hover treatment — so
 * switching the page to a paginated table did not change how a visit reads.
 *
 * Every card links into the Clinical Records workspace route; that route
 * decides whether to show the editable workspace or the read-only visit view,
 * so the doctor never leaves the section mid-drill-down. `hasEncounter` only
 * changes the footer hint, not the destination.
 */

import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  FileClock,
  Stethoscope,
  Timer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_VARIANT, fmtDate, fmtDuration, fmtTime, statusLabel } from "./appointmentDisplay";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppointmentRecordCardProps {
  /** The appointment to render. */
  appointment: TAppointmentResponse;
  /** Whether a clinical record exists — drives the footer hint, not the href. */
  hasEncounter: boolean;
  /** Base href for the workspace, e.g. ".../clinical-records/10023". */
  workspaceBaseHref: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * One appointment card.
 *
 * @param appointment - The appointment to render.
 * @param hasEncounter - Whether a clinical record exists for it.
 * @param workspaceBaseHref - Base path for the Clinical Records route.
 */
export function AppointmentRecordCard({
  appointment,
  hasEncounter,
  workspaceBaseHref,
}: AppointmentRecordCardProps) {
  const startTime = fmtTime(appointment.start);
  const endTime = fmtTime(appointment.end);
  const duration = fmtDuration(
    appointment.start,
    appointment.end,
    appointment.minutes_duration,
  );
  const apptType =
    appointment.appointment_type_display ??
    appointment.appointment_type_text ??
    null;
  const status = appointment.status ?? "unknown";

  const href = `${workspaceBaseHref}/${appointment.id}`;

  return (
    <Card
      className={
        hasEncounter
          ? "h-full transition-colors hover:border-primary/50 hover:bg-muted/30"
          : "h-full transition-colors hover:bg-muted/20"
      }
    >
      {/* h-full on both card and link so cards in a grid row match height */}
      <Link href={href} className="block h-full">
        <CardContent className="flex h-full flex-col gap-2.5 px-4 py-3">
          {/* ── Date + status ── */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
              <CalendarDays className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{fmtDate(appointment.start)}</span>
            </div>
            <Badge
              variant={STATUS_VARIANT[status] ?? "outline"}
              className="shrink-0 text-xs font-normal"
            >
              {statusLabel(appointment.status)}
            </Badge>
          </div>

          {/* ── Time + duration ── */}
          {(startTime ?? duration) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {startTime && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3 shrink-0" />
                  {endTime ? `${startTime} – ${endTime}` : startTime}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="size-3 shrink-0" />
                  {duration}
                </span>
              )}
            </div>
          )}

          {/* ── Appointment type ── */}
          {apptType && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Stethoscope className="size-3 shrink-0" />
              <span className="truncate">{apptType}</span>
            </div>
          )}

          {/* ── Footer: record availability — mt-auto pins it to the card bottom
                 so the call to action lines up across a row ── */}
          <div className="mt-auto flex items-center gap-1.5 border-t pt-2.5 text-xs">
            {hasEncounter ? (
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-primary">
                <ClipboardList className="size-3 shrink-0" />
                <span className="truncate">Open clinical record</span>
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground/70">
                <FileClock className="size-3 shrink-0" />
                <span className="truncate">View visit details</span>
              </span>
            )}
            <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
