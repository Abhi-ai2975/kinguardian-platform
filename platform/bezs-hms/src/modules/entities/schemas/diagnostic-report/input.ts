/**
 * DiagnosticReport input/validation schemas.
 * Layer: entities / schemas / diagnostic-report
 * Required fields: status (1..1).
 * Child arrays (based_on, presented_form, category, etc.) are immutable after
 * creation on the fhir-server — delete and re-create to change them.
 * URL path: POST/GET/PATCH/DELETE /diagnostic-reports/
 */
import { z } from "zod";

// ── Child array input schemas ─────────────────────────────────────────────────

const BasedOnInputSchema = z.object({
  /** FHIR reference e.g. 'ServiceRequest/80001' or 'CarePlan/10001'. */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const PresentedFormInputSchema = z.object({
  /** MIME type e.g. 'application/pdf'. */
  content_type: z.string().optional(),
  language: z.string().optional(),
  /** Base64-encoded content — prefer url for FilNest uploads. */
  data: z.string().optional(),
  /** FilNest fileId stored as the URL value; resolved to a presigned URL on read. */
  url: z.string().optional(),
  size: z.number().int().optional(),
  hash: z.string().optional(),
  title: z.string().optional(),
  creation: z.string().optional(),
});

const CategoryInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const ReferenceInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

const MediaInputSchema = z.object({
  comment: z.string().optional(),
  link_reference: z.string(),
  link_reference_display: z.string().optional(),
});

const ConclusionCodeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const IdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

export const CreateDiagnosticReportValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  /** FHIR R4 DiagnosticReport.status is 1..1. */
  status: z.string(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  /** FHIR reference e.g. 'Patient/10001'. */
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),
  effective_datetime: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),
  issued: z.string().optional(),
  conclusion: z.string().optional(),
  identifier: z.array(IdentifierInputSchema).optional(),
  /** Links to the ServiceRequest or CarePlan that this report fulfils. */
  based_on: z.array(BasedOnInputSchema).optional(),
  category: z.array(CategoryInputSchema).optional(),
  performer: z.array(ReferenceInputSchema).optional(),
  results_interpreter: z.array(ReferenceInputSchema).optional(),
  specimen: z.array(ReferenceInputSchema).optional(),
  result: z.array(ReferenceInputSchema).optional(),
  imaging_study: z.array(ReferenceInputSchema).optional(),
  media: z.array(MediaInputSchema).optional(),
  conclusion_code: z.array(ConclusionCodeInputSchema).optional(),
  /** Attached document(s). For FilNest uploads: url = fileId, content_type = MIME type. */
  presented_form: z.array(PresentedFormInputSchema).optional(),
});
export type TCreateDiagnosticReport = z.infer<typeof CreateDiagnosticReportValidationSchema>;

// ── Update (patch) schema ─────────────────────────────────────────────────────

const UpdateDiagnosticReportBaseSchema = z.object({
  status: z.string().optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  subject_display: z.string().optional(),
  encounter_display: z.string().optional(),
  effective_datetime: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),
  issued: z.string().optional(),
  conclusion: z.string().optional(),
});

export const UpdateDiagnosticReportDtoSchema = UpdateDiagnosticReportBaseSchema;
export type TUpdateDiagnosticReportDto = z.infer<typeof UpdateDiagnosticReportDtoSchema>;

export const UpdateDiagnosticReportValidationSchema = UpdateDiagnosticReportBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateDiagnosticReport = z.infer<typeof UpdateDiagnosticReportValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListDiagnosticReportsValidationSchema = z.object({
  status: z.string().optional(),
  patient_id: z.number().int().optional(),
  issued_from: z.string().optional(),
  issued_to: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListDiagnosticReportsQuery = z.infer<typeof ListDiagnosticReportsValidationSchema>;

export const GetByIdDiagnosticReportValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdDiagnosticReport = z.infer<typeof GetByIdDiagnosticReportValidationSchema>;

export const DeleteDiagnosticReportValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteDiagnosticReport = z.infer<typeof DeleteDiagnosticReportValidationSchema>;
