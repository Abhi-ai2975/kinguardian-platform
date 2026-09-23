/**
 * Consultation input / validation schemas.
 *
 * Layer: entities / schemas / consultation
 *
 * Contains all write-side and query Zod schemas for the Consultation resource:
 *   - CreateConsultationValidationSchema   — provision room on booking
 *   - CompleteConsultationValidationSchema — write reports on end-call
 *   - SaveClinicalDataValidationSchema     — write extracted FHIR resources
 *   - AbandonConsultationValidationSchema  — mark as abandoned
 *   - GetConsultationByFhirAppointmentIdValidationSchema — lookup
 */

import { z } from "zod";
import { ConsultationTranscriptMessageSchema, SoapNoteSchema } from "./response";

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Payload for provisioning a virtual room immediately after booking.
 * user_id is NOT included here — it is injected server-side from the
 * authenticated session in the ZSA action handler.
 */
export const CreateConsultationValidationSchema = z.object({
  /** FHIR Appointment.id returned by bookAppointmentAction. */
  fhir_appointment_id: z.number().int().positive(),
  org_id: z.string().optional(),
  /** Better Auth user ID — injected from session, not passed by client. */
  user_id: z.string(),
});
export type TCreateConsultation = z.infer<typeof CreateConsultationValidationSchema>;

// ── Complete ──────────────────────────────────────────────────────────────────

/**
 * Payload for completing a consultation — writes the transcript, SOAP note,
 * and full merged report, then sets status to COMPLETED.
 */
export const CompleteConsultationValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
  /**
   * Transcript from LiveKit transcription. Each entry has speaker, text,
   * and timestamp. Stored as-is for display in the appointment detail view.
   */
  virtual_conversation: z.array(ConsultationTranscriptMessageSchema).optional(),
  /**
   * SOAP note from doctor-report-agent.
   * Shape: { subjective, objective, assessment, plan, summary }
   */
  soap_note: SoapNoteSchema.optional(),
  /**
   * Full merged report from full-report-agent.
   * Shape: { soap_report, assessment_plan, generated_at }
   * Stored as-is — shape accepted without deep structural validation.
   */
  full_report: z.record(z.string(), z.unknown()).optional(),
});
export type TCompleteConsultation = z.infer<typeof CompleteConsultationValidationSchema>;

// ── Save clinical data ────────────────────────────────────────────────────────

/**
 * Payload for writing the staged clinical data for an appointment.
 *
 * Two writers use this:
 *   - the clinical-extraction-agent, right after a consultation ends
 *   - the doctor's Clinical Records workspace, which autosaves edits as a draft
 *     before they are published to the EMR
 *
 * Every field is optional so a caller can update just the slice it owns —
 * omitted fields leave the existing staged value untouched.
 * The resource arrays accept unknown[] because the agent returns FHIR R4
 * objects with variable fields.
 */
export const SaveClinicalDataValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
  service_requests: z.array(z.unknown()).optional(),
  medication_requests: z.array(z.unknown()).optional(),
  observations: z.array(z.unknown()).optional(),
  conditions: z.array(z.unknown()).optional(),
  /** Doctor-edited SOAP note, staged as a draft before publishing to the EMR. */
  soap_note: SoapNoteSchema.optional(),
  /**
   * Set by the review page when the doctor approves. The repository stamps
   * published_at/published_by from the server clock and session — the client
   * sends intent only, never the timestamp or the approver, so neither can be
   * forged and the approval time is not a client clock reading.
   *
   * Omitted or false leaves an existing stamp untouched: an autosave from the
   * clinical workspace must never silently un-approve a reviewed record.
   */
  mark_published: z.boolean().optional(),
  /**
   * Approving doctor's user ID. Injected by the server action from the session
   * — anything a client puts here is overwritten before validation.
   */
  published_by: z.string().optional(),
});
export type TSaveClinicalData = z.infer<typeof SaveClinicalDataValidationSchema>;

// ── Abandon ───────────────────────────────────────────────────────────────────

/** Payload for marking a consultation as ABANDONED (patient or doctor left without completing). */
export const AbandonConsultationValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
});
export type TAbandonConsultation = z.infer<typeof AbandonConsultationValidationSchema>;

// ── Read ──────────────────────────────────────────────────────────────────────

/** Schema for fetching a consultation by its linked FHIR appointment ID. */
export const GetConsultationByFhirAppointmentIdValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
});
export type TGetConsultationByFhirAppointmentId = z.infer<
  typeof GetConsultationByFhirAppointmentIdValidationSchema
>;

// ── List (paginated) ──────────────────────────────────────────────────────────

/**
 * Query filters for the paginated AI Consultation list.
 * All filters are optional — omitting them returns the full table.
 */
export const ListConsultationsValidationSchema = z.object({
  /** Filter by Better Auth user ID (own records only for patient view). */
  user_id: z.string().optional(),
  /** Filter by organisation ID. */
  org_id: z.string().optional(),
  /** Filter by consultation status: WAITING | ACTIVE | COMPLETED | ABANDONED. */
  status: z.enum(["WAITING", "ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
  /** Maximum records to return. Defaults to 10. */
  limit: z.number().int().positive().optional(),
  /** Zero-based offset for pagination. */
  offset: z.number().int().min(0).optional(),
});
export type TListConsultationsQuery = z.infer<typeof ListConsultationsValidationSchema>;
