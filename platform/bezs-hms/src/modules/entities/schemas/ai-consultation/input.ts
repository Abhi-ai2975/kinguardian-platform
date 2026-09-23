/**
 * AiConsultation input/validation schemas.
 *
 * Layer: entities / schemas / ai-consultation
 *
 * Contains all write-side and query Zod schemas for the AiConsultation resource:
 *   - CreateAiConsultationValidationSchema  — start a new session
 *   - UpdateAiConsultationValidationSchema  — save conversation + report on completion
 *   - LinkAiConsultationValidationSchema    — link a completed session to a FHIR appointment
 *   - GetAiConsultationByIdValidationSchema
 *   - AbandonAiConsultationValidationSchema
 */

import { z } from "zod";
import { AiConsultationModeSchema } from "./response";

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Payload for creating a new IN_PROGRESS AI consultation session.
 * Called as soon as the patient enters a consultation page, before they start.
 */
export const CreateAiConsultationValidationSchema = z.object({
  /** Better Auth session userId — injected server-side from the authenticated session. */
  userId: z.string(),
  org_id: z.string().optional(),
  /** FHIR Patient.id — pass when available for doctor cross-reference. */
  patient_fhir_id: z.number().int().positive().optional(),
  mode: AiConsultationModeSchema,
});
export type TCreateAiConsultation = z.infer<typeof CreateAiConsultationValidationSchema>;

// ── Update (complete) ─────────────────────────────────────────────────────────

/**
 * Payload for completing an AI consultation — saves the transcript and AI report
 * and flips status to COMPLETED.
 */
export const UpdateAiConsultationValidationSchema = z.object({
  id: z.number().int().positive(),
  /** Full conversation transcript. */
  conversation: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() }),
  ),
  /**
   * AI assessment report from /api/assessment-plan-agent.
   * Stored as-is — shape varies by agent version.
   */
  report: z.record(z.string(), z.unknown()).optional(),
});
export type TUpdateAiConsultation = z.infer<typeof UpdateAiConsultationValidationSchema>;

// ── Link to FHIR appointment ─────────────────────────────────────────────────

/**
 * Links a completed AI consultation to a follow-up FHIR appointment.
 * Called after bookAppointmentAction succeeds when consultation_id was in the URL.
 */
export const LinkAiConsultationValidationSchema = z.object({
  /** Local AiConsultation.id */
  id: z.number().int().positive(),
  /** FHIR Appointment.id returned from the booking action. */
  fhir_appointment_id: z.number().int().positive(),
});
export type TLinkAiConsultation = z.infer<typeof LinkAiConsultationValidationSchema>;

// ── Abandon ──────────────────────────────────────────────────────────────────

/** Payload for marking an IN_PROGRESS consultation as abandoned. */
export const AbandonAiConsultationValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TAbandonAiConsultation = z.infer<
  typeof AbandonAiConsultationValidationSchema
>;

// ── Read ──────────────────────────────────────────────────────────────────────

/** Schema for fetching a single AI consultation by its local ID. */
export const GetAiConsultationByIdValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetAiConsultationById = z.infer<
  typeof GetAiConsultationByIdValidationSchema
>;
