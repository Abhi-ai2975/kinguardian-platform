/**
 * Intake input/validation schemas.
 *
 * Layer: entities / schemas / intake
 *
 * Contains all write-side and query Zod schemas for the Intake resource:
 *   - CreateIntakeValidationSchema — start a new intake session
 *   - UpdateIntakeValidationSchema — save conversation + report on completion
 *   - LinkIntakeValidationSchema   — link a completed intake to a FHIR appointment
 *   - GetIntakeByIdValidationSchema
 *   - GetIntakeByFhirAppointmentIdValidationSchema — doctor-side lookup
 *   - AbandonIntakeValidationSchema
 */

import { z } from "zod";
import { IntakeModeSchema } from "./response";

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Payload for creating a new IN_PROGRESS intake session.
 * Called as soon as the patient enters an intake page, before they start typing.
 */
export const CreateIntakeValidationSchema = z.object({
  /** Better Auth session userId — injected server-side from the authenticated session. */
  userId: z.string(),
  org_id: z.string().optional(),
  /** FHIR Patient.id — pass when available for doctor cross-reference. */
  patient_fhir_id: z.number().int().positive().optional(),
  mode: IntakeModeSchema,
});
export type TCreateIntake = z.infer<typeof CreateIntakeValidationSchema>;

// ── Update (complete) ─────────────────────────────────────────────────────────

/**
 * Payload for completing an intake — saves the transcript and AI report
 * and flips status to COMPLETED.
 */
export const UpdateIntakeValidationSchema = z.object({
  id: z.number().int().positive(),
  /** Full conversation transcript. */
  conversation: z.array(
    z.object({ role: z.enum(["user", "assistant"]), content: z.string() }),
  ),
  /** AI assessment report from /api/assessment-plan-agent. Stored as-is — shape
   *  varies by agent version so we accept any object without structural validation. */
  report: z.record(z.string(), z.unknown()).optional(),
});
export type TUpdateIntake = z.infer<typeof UpdateIntakeValidationSchema>;

// ── Link to FHIR appointment ─────────────────────────────────────────────────

/**
 * Payload for linking a completed intake to a booked FHIR appointment.
 * Called after bookAppointmentAction succeeds when intake_id was in the URL.
 */
export const LinkIntakeValidationSchema = z.object({
  /** Local Intake.id */
  id: z.number().int().positive(),
  /** FHIR Appointment.id returned from the booking action. */
  fhir_appointment_id: z.number().int().positive(),
});
export type TLinkIntake = z.infer<typeof LinkIntakeValidationSchema>;

// ── Abandon ──────────────────────────────────────────────────────────────────

/** Payload for marking an IN_PROGRESS intake as abandoned. */
export const AbandonIntakeValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TAbandonIntake = z.infer<typeof AbandonIntakeValidationSchema>;

// ── Read ──────────────────────────────────────────────────────────────────────

/** Schema for fetching a single intake by its local ID. */
export const GetIntakeByIdValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetIntakeById = z.infer<typeof GetIntakeByIdValidationSchema>;

/**
 * Schema for doctor-side intake lookup by linked FHIR appointment ID.
 * Used to display the intake report on the appointment detail panel.
 */
export const GetIntakeByFhirAppointmentIdValidationSchema = z.object({
  fhir_appointment_id: z.number().int().positive(),
});
export type TGetIntakeByFhirAppointmentId = z.infer<
  typeof GetIntakeByFhirAppointmentIdValidationSchema
>;

// ── List (paginated) ──────────────────────────────────────────────────────────

/**
 * Query filters for the paginated AI Intake list.
 * All filters are optional — omitting them returns the full table.
 */
export const ListIntakesValidationSchema = z.object({
  /** Filter by Better Auth user ID (own records only for patient view). */
  user_id: z.string().optional(),
  /** Filter by organisation ID. */
  org_id: z.string().optional(),
  /** Filter by intake status: IN_PROGRESS | COMPLETED | ABANDONED. */
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]).optional(),
  /** Filter by channel mode: TEXT | VOICE. */
  mode: z.enum(["TEXT", "VOICE"]).optional(),
  /** Maximum records to return. Defaults to 10. */
  limit: z.number().int().positive().optional(),
  /** Zero-based offset for pagination. */
  offset: z.number().int().min(0).optional(),
});
export type TListIntakesQuery = z.infer<typeof ListIntakesValidationSchema>;
