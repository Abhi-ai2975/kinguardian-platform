/**
 * Consultation response schemas.
 *
 * Layer: entities / schemas / consultation
 *
 * Mirrors the local Prisma Consultation model shape. All nullable Postgres
 * columns use .nullable() — the Prisma client returns null (never undefined)
 * for optional columns.
 */

import { z } from "zod";

// ── Status enum ───────────────────────────────────────────────────────────────

/** Lifecycle status of a virtual consultation session. */
export const ConsultationStatusSchema = z.enum([
  "WAITING",
  "ACTIVE",
  "COMPLETED",
  "ABANDONED",
]);
export type TConsultationStatus = z.infer<typeof ConsultationStatusSchema>;

// ── Transcript message ────────────────────────────────────────────────────────

/** Single turn in the virtual consultation transcript captured via LiveKit. */
export const ConsultationTranscriptMessageSchema = z.object({
  /** "DOCTOR" or "PATIENT" — derived from the LiveKit participant name. */
  speaker: z.enum(["DOCTOR", "PATIENT"]),
  text: z.string(),
  timestamp: z.string(),
});
export type TConsultationTranscriptMessage = z.infer<
  typeof ConsultationTranscriptMessageSchema
>;

// ── SOAP note ─────────────────────────────────────────────────────────────────

/**
 * SOAP note shape from the doctor-report-agent.
 * All fields optional — the agent may omit sections for incomplete consultations.
 *
 * Every nested section carries `.passthrough()` as well as the top level. The
 * agent is an external service whose key names are not pinned here, and a bare
 * inner z.object silently strips anything unlisted — leaving `{}`, which is
 * truthy and rendered a section heading above no content. Passing unknown keys
 * through keeps the note intact; ConsultationInsights renders the extras.
 */
export const SoapNoteSchema = z.object({
  subjective: z
    .object({
      chief_complaint: z.string().optional(),
      history_of_present_illness: z.string().optional(),
      associated_symptoms: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
  objective: z
    .object({
      observations: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
  assessment: z
    .object({
      possible_conditions: z.array(z.string()).optional(),
      clinical_reasoning: z.string().optional(),
    })
    .passthrough()
    .optional(),
  plan: z
    .object({
      next_steps: z.array(z.string()).optional(),
      when_to_seek_care: z.string().optional(),
    })
    .passthrough()
    .optional(),
  summary: z.string().optional(),
}).passthrough();
export type TSoapNote = z.infer<typeof SoapNoteSchema>;

// ── Full report ───────────────────────────────────────────────────────────────

/**
 * Merged report from full-report-agent (calls assessment-plan + doctor-report
 * agents in parallel and merges the results).
 *
 * Shape mirrors the MVP's /api/full-report-agent response.
 */
export const FullConsultationReportSchema = z.object({
  soap_report: SoapNoteSchema.optional(),
  /** Same shape as the intake assessment plan (risk_level, differential, etc.). */
  assessment_plan: z.record(z.string(), z.unknown()).optional(),
  generated_at: z.string().optional(),
}).passthrough();
export type TFullConsultationReport = z.infer<typeof FullConsultationReportSchema>;

// ── Top-level response ────────────────────────────────────────────────────────

/**
 * Lightweight row returned by the paginated list query.
 * Excludes heavy JSON blobs (virtual_conversation, soap_note, full_report,
 * service_requests, medication_requests, observations, conditions) to keep
 * list payloads small. Full record is available via getByFhirAppointmentId.
 */
export const ConsultationListItemSchema = z.object({
  id: z.number(),
  fhir_appointment_id: z.number(),
  user_id: z.string(),
  org_id: z.string().nullable(),
  room_id: z.string(),
  status: ConsultationStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TConsultationListItem = z.infer<typeof ConsultationListItemSchema>;

/**
 * Paginated list response for the AI Consultation table.
 * Mirrors the same shape used by TPaginatedAppointmentResponse.
 */
export const PaginatedConsultationResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(ConsultationListItemSchema),
});
export type TPaginatedConsultationResponse = z.infer<typeof PaginatedConsultationResponseSchema>;

/**
 * Full Consultation record as returned from the local database.
 * Matches the Prisma Consultation model.
 */
export const ConsultationResponseSchema = z.object({
  id: z.number(),
  fhir_appointment_id: z.number(),
  user_id: z.string(),
  org_id: z.string().nullable(),
  room_id: z.string(),
  status: ConsultationStatusSchema,
  virtual_conversation: z.array(ConsultationTranscriptMessageSchema).nullable(),
  soap_note: SoapNoteSchema.nullable(),
  full_report: FullConsultationReportSchema.nullable(),
  /** ServiceRequest[] from clinical-extraction-agent (FHIR R4 shape). */
  service_requests: z.array(z.unknown()).nullable(),
  /** MedicationRequest[] from clinical-extraction-agent (FHIR R4 shape). */
  medication_requests: z.array(z.unknown()).nullable(),
  /** Observation[] from clinical-extraction-agent (FHIR R4 shape). */
  observations: z.array(z.unknown()).nullable(),
  /** Condition[] from clinical-extraction-agent (FHIR R4 shape). */
  conditions: z.array(z.unknown()).nullable(),
  /**
   * When the doctor approved the SOAP note and clinical extractions above.
   * Null means they are still AI suggestions awaiting review — the only signal
   * that distinguishes the two, since the narrative note has no FHIR record to
   * check against.
   */
  published_at: z.coerce.date().nullable(),
  /** Better Auth user ID of the approving doctor. Set with published_at. */
  published_by: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TConsultationResponse = z.infer<typeof ConsultationResponseSchema>;
