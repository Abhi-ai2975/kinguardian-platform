/**
 * DiagnosticReport response schemas.
 * Layer: entities / schemas / diagnostic-report
 * Mirrors the fhir-gql plain JSON response shape. All fields are .nullish()
 * for forward-compatibility with fhir-server additions.
 */
import { z } from "zod";

// ── Child array response schemas ──────────────────────────────────────────────

const BasedOnResponseSchema = z.object({
  id: z.number().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

const PresentedFormResponseSchema = z.object({
  id: z.number().nullish(),
  content_type: z.string().nullish(),
  language: z.string().nullish(),
  /** FilNest fileId — resolve to presigned URL via /api/filenest-download-url?fileId={url}. */
  url: z.string().nullish(),
  size: z.number().nullish(),
  hash: z.string().nullish(),
  title: z.string().nullish(),
  creation: z.string().nullish(),
});

// ── Top-level response schemas ────────────────────────────────────────────────

export const DiagnosticReportResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  status: z.string().nullish(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),
  effective_datetime: z.string().nullish(),
  effective_period_start: z.string().nullish(),
  effective_period_end: z.string().nullish(),
  issued: z.string().nullish(),
  conclusion: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  based_on: z.array(BasedOnResponseSchema).nullish(),
  presented_form: z.array(PresentedFormResponseSchema).nullish(),
  category: z.array(z.record(z.any())).nullish(),
  performer: z.array(z.record(z.any())).nullish(),
  results_interpreter: z.array(z.record(z.any())).nullish(),
  specimen: z.array(z.record(z.any())).nullish(),
  result: z.array(z.record(z.any())).nullish(),
  imaging_study: z.array(z.record(z.any())).nullish(),
  media: z.array(z.record(z.any())).nullish(),
  conclusion_code: z.array(z.record(z.any())).nullish(),
  identifier: z.array(z.record(z.any())).nullish(),
});
export type TDiagnosticReportResponse = z.infer<typeof DiagnosticReportResponseSchema>;

export const PaginatedDiagnosticReportResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(DiagnosticReportResponseSchema),
});
export type TPaginatedDiagnosticReportResponse = z.infer<typeof PaginatedDiagnosticReportResponseSchema>;
