/**
 * AppointmentTimeline — vertical rail view of everything that happened on one
 * appointment, from booking through to chart approval.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / timeline
 *
 * Replaces the old Visit tab's static appointment/encounter cards. Rather than
 * a separate summary card plus a list, the appointment and encounter ids now
 * live inside their own nodes (Booked, Consultation) — the timeline is the
 * whole tab, not a header above one.
 *
 * Events are grouped under a day heading only when they actually span more
 * than one calendar day (a same-day visit — the overwhelming majority — stays
 * one flat rail with no redundant date repeated on every node).
 */

"use client";

import { GitCommitVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TimelineEvent, TimelinePhase } from "./buildTimeline";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Tailwind classes for a phase's node — icon colour + ring, light and dark. */
const PHASE_STYLE: Record<TimelinePhase, string> = {
  booking:
    "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-900",
  consultation:
    "bg-primary/10 text-primary ring-primary/20",
  documentation:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-900",
  review:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-900",
};

/**
 * Formats a Date as a locale date + time, e.g. "5 Jan 2026, 10:30 AM".
 *
 * @param date - The instant to format.
 */
function fmtDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats just the time portion, e.g. "10:30 AM" — used inside a day group
 * where the date heading already carries the day.
 *
 * @param date - The instant to format.
 */
function fmtTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats a Date as a day heading, e.g. "Monday, 5 January 2026".
 *
 * @param date - The instant to format.
 */
function fmtDayHeading(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Local calendar-day key for grouping — not UTC, so a late-evening event
 * groups with its own day rather than rolling into the next one.
 *
 * @param date - The instant to key.
 */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentTimelineProps {
  /** Events already sorted oldest-first by buildAppointmentTimeline. */
  events: TimelineEvent[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the appointment's event list as a vertical rail.
 *
 * @param events - Sorted timeline events.
 */
export function AppointmentTimeline({ events }: AppointmentTimelineProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <GitCommitVertical className="size-8 opacity-30" />
          <p className="text-sm">Nothing recorded for this visit yet.</p>
        </CardContent>
      </Card>
    );
  }

  /* Group by local calendar day. Only rendered as separate sections when more
     than one day is actually represented — a same-day visit (the common case)
     stays one flat rail so the date isn't repeated on every node. */
  const distinctDays = new Set(events.map((e) => dayKey(e.at)));
  const showDayHeadings = distinctDays.size > 1;

  const groups: { key: string; day: Date; items: TimelineEvent[] }[] = [];
  for (const event of events) {
    const key = dayKey(event.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(event);
    } else {
      groups.push({ key, day: event.at, items: [event] });
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key} className="space-y-3">
          {showDayHeadings && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {fmtDayHeading(group.day)}
            </p>
          )}

          {/* ── Rail ──
              A single vertical line runs behind every node in the group;
              each node punches through it with a ring-bordered icon circle. */}
          <div className="relative space-y-5 pl-1">
            <div
              aria-hidden
              className="absolute top-1 bottom-1 left-[15px] w-px bg-border"
            />

            {group.items.map((event) => {
              const Icon = event.icon;
              return (
                <div key={event.id} className="relative flex gap-3 pl-0">
                  <div
                    className={cn(
                      "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
                      PHASE_STYLE[event.phase],
                    )}
                  >
                    <Icon className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1 pb-0.5 pt-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-sm font-medium">{event.title}</p>
                      <time
                        dateTime={event.at.toISOString()}
                        className="shrink-0 text-xs tabular-nums text-muted-foreground"
                      >
                        {showDayHeadings ? fmtTime(event.at) : fmtDateTime(event.at)}
                      </time>
                    </div>

                    {(event.detail || event.actor) && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {event.detail && <span>{event.detail}</span>}
                        {event.actor && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal"
                          >
                            {event.actor}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
