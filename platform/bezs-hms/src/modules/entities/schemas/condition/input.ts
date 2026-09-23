/**
 * Condition input/validation schemas.
 *
 * Layer: entities / schemas / condition
 *
 * No fields are required on create (all FHIR R4 elements are 0..1 or 0..*).
 * Minimum viable payload: subject + code_code.
 * All child arrays are immutable after creation — delete + re-create to change them.
 * URL path: POST/GET/PATCH/DELETE /conditions/
 */

import { z } from "zod";

// ── Child array input schemas ─────────────────────────────────────────────────

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

const CodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const StageAssessmentInputSchema = z.object({
  reference: z.string().optional(),
  reference_display: z.string().optional(),
});

const StageInputSchema = z.object({
  summary_system: z.string().optional(),
  summary_code: z.string().optional(),
  summary_display: z.string().optional(),
  summary_text: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  assessment: z.array(StageAssessmentInputSchema).optional(),
});

const EvidenceCodeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const EvidenceDetailInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

const EvidenceInputSchema = z.object({
  code: z.array(EvidenceCodeInputSchema).optional(),
  detail: z.array(EvidenceDetailInputSchema).optional(),
});

const NoteInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  author_reference: z.string().optional(),
  author_reference_display: z.string().optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /conditions/.
 * All fields optional — minimum viable payload: subject + code_code.
 */
export const CreateConditionValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  clinical_status_system: z.string().optional(),
  clinical_status_code: z.string().optional(),
  clinical_status_display: z.string().optional(),
  clinical_status_text: z.string().optional(),

  verification_status_system: z.string().optional(),
  verification_status_code: z.string().optional(),
  verification_status_display: z.string().optional(),
  verification_status_text: z.string().optional(),

  severity_system: z.string().optional(),
  severity_code: z.string().optional(),
  severity_display: z.string().optional(),
  severity_text: z.string().optional(),

  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),

  /** FHIR reference e.g. "Patient/10001". */
  subject: z.string().optional(),
  subject_display: z.string().optional(),

  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),

  onset_datetime: z.string().optional(),
  onset_age_value: z.number().optional(),
  /** < | <= | >= | > */
  onset_age_comparator: z.string().optional(),
  onset_age_unit: z.string().optional(),
  onset_age_system: z.string().optional(),
  onset_age_code: z.string().optional(),
  onset_period_start: z.string().optional(),
  onset_period_end: z.string().optional(),
  onset_range_low_value: z.number().optional(),
  onset_range_low_unit: z.string().optional(),
  onset_range_high_value: z.number().optional(),
  onset_range_high_unit: z.string().optional(),
  onset_string: z.string().optional(),

  abatement_datetime: z.string().optional(),
  abatement_age_value: z.number().optional(),
  abatement_age_comparator: z.string().optional(),
  abatement_age_unit: z.string().optional(),
  abatement_age_system: z.string().optional(),
  abatement_age_code: z.string().optional(),
  abatement_period_start: z.string().optional(),
  abatement_period_end: z.string().optional(),
  abatement_range_low_value: z.number().optional(),
  abatement_range_low_unit: z.string().optional(),
  abatement_range_high_value: z.number().optional(),
  abatement_range_high_unit: z.string().optional(),
  abatement_string: z.string().optional(),

  recorded_date: z.string().optional(),

  /** FHIR reference e.g. "Practitioner/30001". */
  recorder: z.string().optional(),
  recorder_display: z.string().optional(),

  /** FHIR reference e.g. "Practitioner/30001". */
  asserter: z.string().optional(),
  asserter_display: z.string().optional(),

  identifier: z.array(IdentifierInputSchema).optional(),
  category: z.array(CodeableConceptInputSchema).optional(),
  body_site: z.array(CodeableConceptInputSchema).optional(),
  stage: z.array(StageInputSchema).optional(),
  evidence: z.array(EvidenceInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
});
export type TCreateCondition = z.infer<typeof CreateConditionValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateConditionBaseSchema = z.object({
  clinical_status_system: z.string().optional(),
  clinical_status_code: z.string().optional(),
  clinical_status_display: z.string().optional(),
  clinical_status_text: z.string().optional(),
  verification_status_system: z.string().optional(),
  verification_status_code: z.string().optional(),
  verification_status_display: z.string().optional(),
  verification_status_text: z.string().optional(),
  severity_system: z.string().optional(),
  severity_code: z.string().optional(),
  severity_display: z.string().optional(),
  severity_text: z.string().optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  recorded_date: z.string().optional(),
  encounter_display: z.string().optional(),
  onset_datetime: z.string().optional(),
  onset_age_value: z.number().optional(),
  onset_age_comparator: z.string().optional(),
  onset_age_unit: z.string().optional(),
  onset_age_system: z.string().optional(),
  onset_age_code: z.string().optional(),
  onset_period_start: z.string().optional(),
  onset_period_end: z.string().optional(),
  onset_range_low_value: z.number().optional(),
  onset_range_low_unit: z.string().optional(),
  onset_range_high_value: z.number().optional(),
  onset_range_high_unit: z.string().optional(),
  onset_string: z.string().optional(),
  abatement_datetime: z.string().optional(),
  abatement_age_value: z.number().optional(),
  abatement_age_comparator: z.string().optional(),
  abatement_age_unit: z.string().optional(),
  abatement_age_system: z.string().optional(),
  abatement_age_code: z.string().optional(),
  abatement_period_start: z.string().optional(),
  abatement_period_end: z.string().optional(),
  abatement_range_low_value: z.number().optional(),
  abatement_range_low_unit: z.string().optional(),
  abatement_range_high_value: z.number().optional(),
  abatement_range_high_unit: z.string().optional(),
  abatement_string: z.string().optional(),
});

export const UpdateConditionDtoSchema = UpdateConditionBaseSchema;
export type TUpdateConditionDto = z.infer<typeof UpdateConditionDtoSchema>;

export const UpdateConditionValidationSchema = UpdateConditionBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateCondition = z.infer<typeof UpdateConditionValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListConditionsValidationSchema = z.object({
  clinical_status: z.string().optional(),
  patient_id: z.number().int().optional(),
  encounter_id: z.number().int().optional(),
  recorded_from: z.string().optional(),
  recorded_to: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListConditionsQuery = z.infer<typeof ListConditionsValidationSchema>;

export const GetByIdConditionValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdCondition = z.infer<typeof GetByIdConditionValidationSchema>;

export const DeleteConditionValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteCondition = z.infer<typeof DeleteConditionValidationSchema>;
