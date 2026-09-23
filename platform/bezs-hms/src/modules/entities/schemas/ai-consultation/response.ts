/**
 * AiConsultation response schemas.
 *
 * Layer: entities / schemas / ai-consultation
 *
 * Mirrors the local Prisma AiConsultation model shape. All fields that can be
 * null in Postgres use .nullable() — Prisma returns null (never undefined) for
 * optional columns.
 */

import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

/** Channel through which the AI consultation was conducted. */
export const AiConsultationModeSchema = z.enum(["TEXT", "VOICE"]);
export type TAiConsultationMode = z.infer<typeof AiConsultationModeSchema>;

/** Lifecycle status of a patient AI consultation session. */
export const AiConsultationStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
]);
export type TAiConsultationStatus = z.infer<typeof AiConsultationStatusSchema>;

// ── Conversation message schema ───────────────────────────────────────────────

/** Single turn in the AI consultation transcript. */
export const AiConsultationMessageSchema = z.object({
  /** "user" for patient messages, "assistant" for AI responses. */
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type TAiConsultationMessage = z.infer<typeof AiConsultationMessageSchema>;

// ── AI report schema ─────────────────────────────────────────────────────────

/**
 * AI-generated clinical assessment report.
 * Shape mirrors the /api/assessment-plan-agent response — passthrough so
 * additional fields from future agent versions are preserved.
 */
export const AiConsultationReportSchema = z
  .object({
    clinical_overview: z.string().optional(),
    risk_level: z.string().optional(),
    differential_diagnosis: z.array(z.unknown()).optional(),
    diagnostic_plan: z.unknown().optional(),
    treatment_plan: z.unknown().optional(),
    red_flags: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type TAiConsultationReport = z.infer<typeof AiConsultationReportSchema>;

// ── Top-level response ────────────────────────────────────────────────────────

/**
 * Full AiConsultation record as returned from the local database.
 * Matches the Prisma AiConsultation model with enums as string literals.
 */
export const AiConsultationResponseSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  org_id: z.string().nullable(),
  patient_fhir_id: z.number().nullable(),
  mode: AiConsultationModeSchema,
  status: AiConsultationStatusSchema,
  conversation: z.array(AiConsultationMessageSchema).nullable(),
  report: AiConsultationReportSchema.nullable(),
  fhir_appointment_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TAiConsultationResponse = z.infer<typeof AiConsultationResponseSchema>;
