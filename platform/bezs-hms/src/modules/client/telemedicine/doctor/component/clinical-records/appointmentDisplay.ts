/**
 * appointmentDisplay — formatting helpers and status vocabulary shared by the
 * patient appointment card and its table columns.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Both views render the same appointment fields, so the formatters live here
 * rather than in either one — a card and its table row must never disagree
 * about how a date or a status reads.
 *
 * No "use client" directive: these are pure functions with no JSX or hooks, so
 * server components (the Clinical Records page) can import them too.
 */

// ── Status vocabulary ─────────────────────────────────────────────────────────

/**
 * Every FHIR Appointment status the backend accepts.
 *
 * Kept complete — including `entered-in-error`, which the appointment tables
 * elsewhere omit — because this drives a *filter*. An option list shorter than
 * the data means a row that no filter combination can reach.
 */
export const APPOINTMENT_STATUS_OPTIONS = [
  { label: "Proposed", value: "proposed" },
  { label: "Pending", value: "pending" },
  { label: "Booked", value: "booked" },
  { label: "Arrived", value: "arrived" },
  { label: "Checked In", value: "checked-in" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Waitlist", value: "waitlist" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No Show", value: "noshow" },
  { label: "Entered in Error", value: "entered-in-error" },
];

/** Maps a FHIR status code to its badge variant for at-a-glance scanning. */
export const STATUS_VARIANT: Record<
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

/** Maps a FHIR status code to a human-readable label. */
const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  APPOINTMENT_STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Returns the display label for a FHIR appointment status.
 *
 * @param status - Raw FHIR status code, or nullish.
 * @returns The mapped label, the raw code when unmapped, or "Unknown".
 */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return STATUS_LABEL[status] ?? status;
}

// ── Timing ────────────────────────────────────────────────────────────────────

/** Whether an appointment lies ahead of or behind the reference instant. */
export type AppointmentTiming = "upcoming" | "past";

/**
 * Classifies an appointment as upcoming or past against a fixed instant.
 *
 * Takes `nowMs` rather than reading the clock itself: this runs inside a
 * TanStack accessor during render, and a component that reads the clock while
 * rendering is impure (`react-hooks/purity`). The page resolves "now" once and
 * threads it down, which also keeps every row judged against the same instant.
 *
 * Appointments with no parseable start are treated as past so they still appear
 * somewhere rather than being silently dropped — the same rule the old
 * upcoming/past split used.
 *
 * @param start - ISO 8601 appointment start, or nullish.
 * @param nowMs - Reference instant in epoch milliseconds.
 * @returns "upcoming" when the start is in the future, otherwise "past".
 */
export function appointmentTiming(
  start: string | null | undefined,
  nowMs: number,
): AppointmentTiming {
  const startMs = start ? new Date(start).getTime() : NaN;
  return !Number.isNaN(startMs) && startMs > nowMs ? "upcoming" : "past";
}

// ── Formatters ────────────────────────────────────────────────────────────────

/**
 * Pushes a timestamp to the last millisecond of its calendar day.
 *
 * The date-range calendar hands back midnight for the "to" day; sending that
 * straight to the server as `start_to` would exclude every appointment on the
 * last day the doctor selected, which reads as the filter being off by one.
 *
 * @param ms - Epoch milliseconds landing anywhere within the target day.
 * @returns Epoch milliseconds at 23:59:59.999 of that local day.
 */
export function endOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Formats an ISO datetime as a short locale date, e.g. "5 Jan 2026".
 *
 * @param iso - ISO 8601 string, or nullish.
 * @returns The formatted date, or "—" when absent or unparseable.
 */
export function fmtDate(iso: string | null | undefined): string {
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

/**
 * Formats an ISO datetime as a 12-hour clock time, e.g. "10:30 AM".
 *
 * @param iso - ISO 8601 string, or nullish.
 * @returns The formatted time, or null when absent or unparseable.
 */
export function fmtTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * Derives a human-readable duration from start/end or minutes_duration.
 *
 * @param start - ISO start datetime.
 * @param end - ISO end datetime.
 * @param minutesDuration - Explicit duration in minutes (fallback when end is absent).
 * @returns e.g. "30 min" / "1 hr 15 min", or null when indeterminable.
 */
export function fmtDuration(
  start: string | null | undefined,
  end: string | null | undefined,
  minutesDuration: number | null | undefined,
): string | null {
  let mins: number | null = null;

  if (start && end) {
    try {
      mins = Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) / 60000,
      );
    } catch {
      /* unparseable dates — fall through to minutesDuration */
    }
  }

  if (mins == null && minutesDuration != null) mins = minutesDuration;
  if (mins == null || mins <= 0) return null;

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}
