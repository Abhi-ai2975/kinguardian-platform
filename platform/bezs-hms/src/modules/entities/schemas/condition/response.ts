/**
 * Condition response schemas.
 *
 * Layer: entities / schemas / condition
 *
 * Mirrors the fhir-gql PlainCondition* response shapes exactly.
 * All optional fields use .nullish() — the API returns explicit JSON null, not missing keys.
 * Note: PlainConditionIdentifier, PlainConditionCategory, PlainConditionBodySite
 * have no `id` field in the fhir-gql response — mirrored here.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const ConditionIdentifierResponseSchema = z.object({
  use: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  assigner: z.string().nullish(),
});

export const ConditionCategoryResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ConditionBodySiteResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ConditionStageAssessmentResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const ConditionStageResponseSchema = z.object({
  id: z.number(),
  summary_system: z.string().nullish(),
  summary_code: z.string().nullish(),
  summary_display: z.string().nullish(),
  summary_text: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  assessment: z.array(ConditionStageAssessmentResponseSchema).nullish(),
});

export const ConditionEvidenceCodeResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ConditionEvidenceDetailResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const ConditionEvidenceResponseSchema = z.object({
  id: z.number(),
  code: z.array(ConditionEvidenceCodeResponseSchema).nullish(),
  detail: z.array(ConditionEvidenceDetailResponseSchema).nullish(),
});

export const ConditionNoteResponseSchema = z.object({
  id: z.number(),
  text: z.string(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const ConditionResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  clinical_status_system: z.string().nullish(),
  clinical_status_code: z.string().nullish(),
  clinical_status_display: z.string().nullish(),
  clinical_status_text: z.string().nullish(),
  verification_status_system: z.string().nullish(),
  verification_status_code: z.string().nullish(),
  verification_status_display: z.string().nullish(),
  verification_status_text: z.string().nullish(),
  severity_system: z.string().nullish(),
  severity_code: z.string().nullish(),
  severity_display: z.string().nullish(),
  severity_text: z.string().nullish(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),
  onset_datetime: z.string().nullish(),
  onset_age_value: z.number().nullish(),
  onset_age_comparator: z.string().nullish(),
  onset_age_unit: z.string().nullish(),
  onset_age_system: z.string().nullish(),
  onset_age_code: z.string().nullish(),
  onset_period_start: z.string().nullish(),
  onset_period_end: z.string().nullish(),
  onset_range_low_value: z.number().nullish(),
  onset_range_low_unit: z.string().nullish(),
  onset_range_high_value: z.number().nullish(),
  onset_range_high_unit: z.string().nullish(),
  onset_string: z.string().nullish(),
  abatement_datetime: z.string().nullish(),
  abatement_age_value: z.number().nullish(),
  abatement_age_comparator: z.string().nullish(),
  abatement_age_unit: z.string().nullish(),
  abatement_age_system: z.string().nullish(),
  abatement_age_code: z.string().nullish(),
  abatement_period_start: z.string().nullish(),
  abatement_period_end: z.string().nullish(),
  abatement_range_low_value: z.number().nullish(),
  abatement_range_low_unit: z.string().nullish(),
  abatement_range_high_value: z.number().nullish(),
  abatement_range_high_unit: z.string().nullish(),
  abatement_string: z.string().nullish(),
  recorded_date: z.string().nullish(),
  recorder_type: z.string().nullish(),
  recorder_id: z.number().nullish(),
  recorder_display: z.string().nullish(),
  asserter_type: z.string().nullish(),
  asserter_id: z.number().nullish(),
  asserter_display: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  identifier: z.array(ConditionIdentifierResponseSchema).nullish(),
  category: z.array(ConditionCategoryResponseSchema).nullish(),
  body_site: z.array(ConditionBodySiteResponseSchema).nullish(),
  stage: z.array(ConditionStageResponseSchema).nullish(),
  evidence: z.array(ConditionEvidenceResponseSchema).nullish(),
  note: z.array(ConditionNoteResponseSchema).nullish(),
});
export type TConditionResponse = z.infer<typeof ConditionResponseSchema>;

export const PaginatedConditionResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(ConditionResponseSchema),
});
export type TPaginatedConditionResponse = z.infer<typeof PaginatedConditionResponseSchema>;
