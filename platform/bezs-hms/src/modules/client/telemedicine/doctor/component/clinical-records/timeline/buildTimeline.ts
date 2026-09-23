/**
 * buildTimeline — assembles one chronological event list for the Timeline tab.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / timeline
 *
 * Pure function over data ClinicalWorkspace already holds — booking, intake,
 * the consultation, every published clinical entry, uploaded documents and
 * results, and the review approval. No new fetch backs this: every field read
 * here is one already on the page's existing props, because every FHIR
 * resource in this app carries created_at/created_by and this is the first
 * screen that reads them as a group rather than one row at a time.
 *
 * One field was deliberately left out: Encounter.status_history. fhir-gql
 * declares it on the response schema, but nothing in fhir-gql's
 * encounter_service.py ever writes to it — the same "declared but never
 * populated" gap the allergy data and virtual_service fields have elsewhere in
 * this app. Building a "patient arrived" / "checked in" event off a field that
 * is always empty would be a timeline node that never appears, which is worse
 * than not offering it.
 */

import {
  Brain,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  FlaskConical,
  MessageSquare,
  Pill,
  Sparkles,
  Stethoscope,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TEncounterResponse } from "@/modules/entities/schemas/encounter";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { TDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";
import type { TConsultationTranscriptMessage } from "@/modules/entities/schemas/consultation";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Which section of the visit an event belongs to — drives the node's colour
 * in AppointmentTimeline. Kept to four, matching the workspace's own grouping
 * (booking happens before the visit, documentation is everything typed during
 * it, review is what happens after).
 */
export type TimelinePhase = "booking" | "consultation" | "documentation" | "review";

/** One node on the timeline. */
export interface TimelineEvent {
  /** Stable key — `${kind}-${resourceId}` so re-renders don't remount nodes. */
  id: string;
  /** When it happened. Events with no parseable timestamp are dropped upstream. */
  at: Date;
  phase: TimelinePhase;
  /** Icon reused from the tab this event summarises — a diagnosis event uses
      the same icon as the Diagnoses tab, so the timeline reads as a map back
      to where the detail lives. */
  icon: LucideIcon;
  title: string;
  /** Supporting line — a resource id chip, a reason, a turn count. */
  detail?: string | null;
  /** Who or what did it, when knowable. */
  actor?: string | null;
}

/** Everything buildAppointmentTimeline needs — a subset of ClinicalWorkspaceProps. */
export interface TimelineInput {
  appointment: TAppointmentResponse;
  encounters: TEncounterResponse[];
  intake: TIntakeResponse | null;
  transcript: TConsultationTranscriptMessage[];
  /** When the AI agent produced the SOAP note + extraction (Consultation.created_at). */
  consultationCreatedAt: Date | string | null;
  /** When the doctor approved the note and entries (Consultation.published_at). */
  publishedAt: Date | string | null;
  savedConditions: TConditionResponse[];
  savedObservations: TObservationResponse[];
  savedMedications: TMedicationRequestResponse[];
  savedServiceRequests: TServiceRequestResponse[];
  diagnosticReports: TDiagnosticReportResponse[];
  documents: TDocumentReferenceResponse[];
  /** Display name attributed to every doctor-authored event — see note below. */
  doctorName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses a value to a Date, returning null rather than an Invalid Date.
 *
 * @param value - ISO string, Date, or nullish.
 */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Human label for an intake's lifecycle status. */
const INTAKE_STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "in progress",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
};

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Assembles and sorts every timeline event for one appointment.
 *
 * Clinical-entry events (conditions, observations, medications, orders) are
 * all attributed to `doctorName` rather than each record's raw `created_by`
 * (a Better Auth user id, not a display name) — safe here because this
 * workspace is doctor-only, so every entry on it was authored by the doctor
 * viewing it.
 *
 * @param input - Every resource list the workspace already has as props.
 * @returns Events sorted oldest first, ready for AppointmentTimeline.
 */
export function buildAppointmentTimeline(input: TimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  const {
    appointment,
    encounters,
    intake,
    transcript,
    consultationCreatedAt,
    publishedAt,
    savedConditions,
    savedObservations,
    savedMedications,
    savedServiceRequests,
    diagnosticReports,
    documents,
    doctorName,
  } = input;

  // ── Booking ──────────────────────────────────────────────────────────────
  const bookedAt = toDate(appointment.created_at);
  if (bookedAt) {
    const apptType =
      appointment.appointment_type_display ?? appointment.appointment_type_text;
    events.push({
      id: `appointment-booked-${appointment.id}`,
      at: bookedAt,
      phase: "booking",
      icon: CalendarPlus,
      title: "Appointment booked",
      detail: [`Appointment/${appointment.id}`, apptType].filter(Boolean).join(" · "),
    });
  }

  if (appointment.cancellation_date) {
    const cancelledAt = toDate(appointment.cancellation_date);
    if (cancelledAt) {
      const reason =
        appointment.cancelation_reason_display ??
        appointment.cancelation_reason_text ??
        null;
      events.push({
        id: `appointment-cancelled-${appointment.id}`,
        at: cancelledAt,
        phase: "booking",
        icon: XCircle,
        title: "Appointment cancelled",
        detail: reason,
      });
    }
  }

  // ── Pre-visit ────────────────────────────────────────────────────────────
  if (intake) {
    const intakeAt = toDate(intake.updated_at ?? intake.created_at);
    if (intakeAt) {
      events.push({
        id: `intake-${intake.id}`,
        at: intakeAt,
        phase: "booking",
        icon: Brain,
        title: "AI intake",
        detail: INTAKE_STATUS_LABEL[intake.status] ?? intake.status,
      });
    }
  }

  // ── Consultation ─────────────────────────────────────────────────────────
  for (const enc of encounters) {
    const start = toDate(enc.actual_period_start);
    const end = toDate(enc.actual_period_end);
    const at = start ?? end;
    if (!at) continue;

    let detail = `Encounter/${enc.id}`;
    if (start && end) {
      const mins = Math.round((end.getTime() - start.getTime()) / 60000);
      detail += ` · ${mins} min`;
    }

    events.push({
      id: `encounter-${enc.id}`,
      at,
      phase: "consultation",
      icon: Stethoscope,
      title: "Consultation",
      detail,
    });
  }

  if (transcript.length > 0) {
    const lastTurn = toDate(transcript[transcript.length - 1]?.timestamp);
    if (lastTurn) {
      events.push({
        id: "transcript",
        at: lastTurn,
        phase: "consultation",
        icon: MessageSquare,
        title: "Conversation captured",
        detail: `${transcript.length} turn${transcript.length > 1 ? "s" : ""}`,
      });
    }
  }

  const aiNoteAt = toDate(consultationCreatedAt);
  if (aiNoteAt) {
    events.push({
      id: "ai-note",
      at: aiNoteAt,
      phase: "consultation",
      icon: Sparkles,
      title: "AI clinical note generated",
      actor: "AI agent",
    });
  }

  // ── Documentation ────────────────────────────────────────────────────────
  for (const c of savedConditions) {
    const at = toDate(c.created_at);
    if (!at) continue;
    events.push({
      id: `condition-${c.id}`,
      at,
      phase: "documentation",
      icon: CheckCircle2,
      title: `Diagnosis added — ${c.code_display ?? c.code_text ?? "Untitled"}`,
      actor: doctorName,
    });
  }

  for (const o of savedObservations) {
    const at = toDate(o.created_at);
    if (!at) continue;
    events.push({
      id: `observation-${o.id}`,
      at,
      phase: "documentation",
      icon: CheckCircle2,
      title: `Finding added — ${o.code_display ?? o.code_text ?? "Untitled"}`,
      actor: doctorName,
    });
  }

  for (const m of savedMedications) {
    const at = toDate(m.created_at);
    if (!at) continue;
    events.push({
      id: `medication-${m.id}`,
      at,
      phase: "documentation",
      icon: Pill,
      title: `Prescription added — ${m.medication_code_display ?? m.medication_code_text ?? "Untitled"}`,
      actor: doctorName,
    });
  }

  for (const sr of savedServiceRequests) {
    const at = toDate(sr.created_at);
    if (!at) continue;
    events.push({
      id: `service-request-${sr.id}`,
      at,
      phase: "documentation",
      icon: FlaskConical,
      title: `Order placed — ${sr.code_display ?? sr.code_text ?? "Untitled"}`,
      actor: doctorName,
    });
  }

  for (const dr of diagnosticReports) {
    const at = toDate(dr.created_at);
    if (!at) continue;
    events.push({
      id: `diagnostic-report-${dr.id}`,
      at,
      phase: "documentation",
      icon: FlaskConical,
      title: `Result uploaded — ${dr.code_display ?? dr.code_text ?? "Order result"}`,
      actor: doctorName,
    });
  }

  for (const doc of documents) {
    const at = toDate(doc.created_at);
    if (!at) continue;
    events.push({
      id: `document-${doc.id}`,
      at,
      phase: "documentation",
      icon: FileStack,
      title: `Document uploaded — ${doc.type_display ?? doc.type_text ?? doc.description ?? "Untitled"}`,
      actor: doctorName,
    });
  }

  // ── Review ───────────────────────────────────────────────────────────────
  const approvedAt = toDate(publishedAt);
  if (approvedAt) {
    events.push({
      id: "published",
      at: approvedAt,
      phase: "review",
      icon: ClipboardCheck,
      title: "Note & entries approved",
      detail: "Entered the patient's chart",
      actor: doctorName,
    });
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
