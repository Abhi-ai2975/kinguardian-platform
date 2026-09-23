/**
 * doctorPatients — server helpers for the doctor's Clinical Records drill-down.
 *
 * Layer: server / presentation / helpers
 *
 * fhir-gql has no "patients for this practitioner" endpoint — Patient list
 * filters are name/gender/org only (see ListPatientsValidationSchema). What it
 * does expose is an Appointment list filtered by `practitioner_id`, so the
 * doctor's patient roster is derived by walking that list and grouping on the
 * Patient participant.
 *
 * These helpers are used by the Clinical Records server pages.
 */

import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { DoctorPatientSummary } from "@/modules/client/telemedicine/doctor/component/clinical-records/types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** fhir-gql caps `limit` at 200 per request (ListAppointmentsValidationSchema). */
const PAGE_SIZE = 200;

/**
 * Safety ceiling on how many appointments the roster derivation will walk.
 * A doctor with more history than this needs a real patients-by-practitioner
 * endpoint on fhir-gql rather than client-side grouping — the roster would
 * silently truncate otherwise, so we stop at a predictable point.
 */
const MAX_APPOINTMENTS = 1000;

/** Appointment statuses that count as "the consultation happened". */
const COMPLETED_STATUSES = new Set(["fulfilled", "checked-in"]);

/** Appointment statuses that count as "still to happen". */
const UPCOMING_STATUSES = new Set(["booked", "pending", "proposed", "arrived", "waitlist"]);

// ── Participant accessors ─────────────────────────────────────────────────────

/**
 * Returns the integer FHIR resource ID of the first participant of a type.
 * Mirrors the accessor already used on the appointment review page.
 *
 * @param appointment - Full appointment response.
 * @param type - "Practitioner" or "Patient".
 * @returns The participant's FHIR id, or undefined when absent.
 */
export function getParticipantId(
  appointment: TAppointmentResponse,
  type: "Practitioner" | "Patient",
): number | undefined {
  return (
    appointment.participant?.find((p) => p.reference_type === type)
      ?.reference_id ?? undefined
  );
}

/**
 * Returns the display name of the first participant of a type.
 *
 * @param appointment - Full appointment response.
 * @param type - "Practitioner" or "Patient".
 * @returns The participant's display name, or a generic fallback.
 */
export function getParticipantName(
  appointment: TAppointmentResponse,
  type: "Practitioner" | "Patient",
): string {
  return (
    appointment.participant?.find((p) => p.reference_type === type)
      ?.reference_display ?? (type === "Patient" ? "Patient" : "Doctor")
  );
}

// ── Fetching ──────────────────────────────────────────────────────────────────

/**
 * Fetches every appointment for a practitioner, paging through the 200-row cap.
 *
 * @param params.practitionerId - FHIR Practitioner.id to scope the list to.
 * @param params.orgId - Active organisation id, or null for no org filter.
 * @param params.patientId - Optional FHIR Patient.id to narrow to one patient.
 * @returns All matching appointments, up to MAX_APPOINTMENTS.
 */
export async function fetchAllDoctorAppointments({
  practitionerId,
  orgId,
  patientId,
}: {
  practitionerId: number;
  orgId: string | null;
  patientId?: number;
}): Promise<TAppointmentResponse[]> {
  const collected: TAppointmentResponse[] = [];
  let offset = 0;

  while (offset < MAX_APPOINTMENTS) {
    const [page, err] = await listAppointmentsAction({
      payload: {
        limit: PAGE_SIZE,
        offset,
        practitioner_id: practitionerId,
        ...(orgId ? { org_id: orgId } : {}),
        ...(patientId != null ? { patient_id: patientId } : {}),
      },
    });

    /* A failed page aborts the walk — return what we have rather than throwing,
       so the page renders a (possibly partial) roster instead of an error. */
    if (err || !page) break;

    const rows = page.data ?? [];
    collected.push(...rows);

    /* Stop when the backend returns a short page or we've reached the total. */
    if (rows.length < PAGE_SIZE || collected.length >= (page.total ?? 0)) break;

    offset += PAGE_SIZE;
  }

  return collected;
}

// ── Derivation ────────────────────────────────────────────────────────────────

/**
 * Groups a doctor's appointments into one row per distinct patient.
 *
 * Appointments without a resolvable Patient participant are skipped — they
 * cannot be drilled into, so listing them would produce a dead row.
 *
 * @param appointments - All appointments for this practitioner.
 * @returns Patient summaries sorted by most recent visit first.
 */
export function derivePatientSummaries(
  appointments: TAppointmentResponse[],
): DoctorPatientSummary[] {
  const byPatient = new Map<number, DoctorPatientSummary>();
  const now = Date.now();

  for (const appt of appointments) {
    const patientId = getParticipantId(appt, "Patient");
    if (patientId == null) continue;

    const existing = byPatient.get(patientId) ?? {
      patientId,
      name: getParticipantName(appt, "Patient"),
      visitCount: 0,
      completedCount: 0,
      upcomingCount: 0,
      lastVisit: null,
    };

    existing.visitCount += 1;

    const status = appt.status ?? "";
    if (COMPLETED_STATUSES.has(status)) existing.completedCount += 1;

    const startMs = appt.start ? new Date(appt.start).getTime() : NaN;
    const isFuture = !isNaN(startMs) && startMs > now;

    if (isFuture && UPCOMING_STATUSES.has(status)) existing.upcomingCount += 1;

    /* Track the latest *past* start as the last visit — a future booking is not
       a visit that has happened yet. */
    if (!isNaN(startMs) && !isFuture) {
      if (!existing.lastVisit || appt.start! > existing.lastVisit) {
        existing.lastVisit = appt.start!;
      }
    }

    byPatient.set(patientId, existing);
  }

  return [...byPatient.values()].sort((a, b) =>
    (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""),
  );
}

/**
 * Resolves the reference instant a page uses to judge past vs upcoming.
 *
 * Lives here rather than being called inline because reading the clock during
 * render is impure, and `react-hooks/purity` rejects it in a component body —
 * server components included. The page calls this once and threads the result
 * down as a prop, which also means SSR and hydration agree on "now" and every
 * row is judged against the same moment.
 *
 * @returns The current time in epoch milliseconds.
 */
export function referenceInstantMs(): number {
  return Date.now();
}
