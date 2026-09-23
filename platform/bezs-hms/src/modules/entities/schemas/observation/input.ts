/**
 * Observation input/validation schemas.
 *
 * Layer: entities / schemas / observation
 *
 * Required fields: status (1..1). All others optional.
 * All child arrays are immutable after creation — delete + re-create to change them.
 * URL path: POST/GET/PATCH/DELETE /observations/
 *
 * The value[x] mixin (ValueXInputFields) is shared between the create schema and
 * the ObservationComponentInputSchema, mirroring the Python _ValueXFields mixin.
 */

import { z } from "zod";

// ── Shared value[x] fields ────────────────────────────────────────────────────

const ValueXInputFields = {
  value_quantity_value: z.number().optional(),
  /** <|<=|>=|> */
  value_quantity_comparator: z.string().optional(),
  value_quantity_unit: z.string().optional(),
  value_quantity_system: z.string().optional(),
  value_quantity_code: z.string().optional(),
  value_codeable_concept_system: z.string().optional(),
  value_codeable_concept_code: z.string().optional(),
  value_codeable_concept_display: z.string().optional(),
  value_codeable_concept_text: z.string().optional(),
  value_string: z.string().optional(),
  value_boolean: z.boolean().optional(),
  value_integer: z.number().int().optional(),
  /** HH:mm:ss */
  value_time: z.string().optional(),
  value_date_time: z.string().optional(),
  value_period_start: z.string().optional(),
  value_period_end: z.string().optional(),
  value_range_low_value: z.number().optional(),
  value_range_low_unit: z.string().optional(),
  value_range_low_system: z.string().optional(),
  value_range_low_code: z.string().optional(),
  value_range_high_value: z.number().optional(),
  value_range_high_unit: z.string().optional(),
  value_range_high_system: z.string().optional(),
  value_range_high_code: z.string().optional(),
  value_ratio_numerator_value: z.number().optional(),
  value_ratio_numerator_comparator: z.string().optional(),
  value_ratio_numerator_unit: z.string().optional(),
  value_ratio_numerator_system: z.string().optional(),
  value_ratio_numerator_code: z.string().optional(),
  value_ratio_denominator_value: z.number().optional(),
  value_ratio_denominator_comparator: z.string().optional(),
  value_ratio_denominator_unit: z.string().optional(),
  value_ratio_denominator_system: z.string().optional(),
  value_ratio_denominator_code: z.string().optional(),
  value_sampled_data_origin_value: z.number().optional(),
  value_sampled_data_origin_unit: z.string().optional(),
  value_sampled_data_origin_system: z.string().optional(),
  value_sampled_data_origin_code: z.string().optional(),
  value_sampled_data_period: z.number().optional(),
  value_sampled_data_factor: z.number().optional(),
  value_sampled_data_lower_limit: z.number().optional(),
  value_sampled_data_upper_limit: z.number().optional(),
  value_sampled_data_dimensions: z.number().int().optional(),
  value_sampled_data_data: z.string().optional(),
};

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

const ReferenceInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

const CodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const NoteInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  author_reference: z.string().optional(),
});

const AppliesToInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const ReferenceRangeInputSchema = z.object({
  low_value: z.number().optional(),
  low_unit: z.string().optional(),
  low_system: z.string().optional(),
  low_code: z.string().optional(),
  high_value: z.number().optional(),
  high_unit: z.string().optional(),
  high_system: z.string().optional(),
  high_code: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  age_low_value: z.number().optional(),
  age_low_unit: z.string().optional(),
  age_low_system: z.string().optional(),
  age_low_code: z.string().optional(),
  age_high_value: z.number().optional(),
  age_high_unit: z.string().optional(),
  age_high_system: z.string().optional(),
  age_high_code: z.string().optional(),
  text: z.string().optional(),
  applies_to: z.array(AppliesToInputSchema).optional(),
});

const ObservationComponentInputSchema = z.object({
  ...ValueXInputFields,
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  data_absent_reason_system: z.string().optional(),
  data_absent_reason_code: z.string().optional(),
  data_absent_reason_display: z.string().optional(),
  data_absent_reason_text: z.string().optional(),
  interpretation: z.array(CodeableConceptInputSchema).optional(),
  reference_range: z.array(ReferenceRangeInputSchema).optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /observations/.
 * status (1..1) is the only required field.
 */
export const CreateObservationValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  /** registered|preliminary|final|amended|corrected|cancelled|entered-in-error|unknown */
  status: z.string(),

  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),

  /** Reference e.g. "Patient/10001". */
  subject: z.string().optional(),
  subject_display: z.string().optional(),

  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),

  effective_date_time: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),
  effective_instant: z.string().optional(),
  /** Comma-separated ISO datetimes. */
  effective_timing_event: z.string().optional(),
  effective_timing_code_system: z.string().optional(),
  effective_timing_code_code: z.string().optional(),
  effective_timing_code_display: z.string().optional(),
  effective_timing_code_text: z.string().optional(),
  effective_timing_repeat_bounds_duration_value: z.number().optional(),
  effective_timing_repeat_bounds_duration_comparator: z.string().optional(),
  effective_timing_repeat_bounds_duration_unit: z.string().optional(),
  effective_timing_repeat_bounds_duration_system: z.string().optional(),
  effective_timing_repeat_bounds_duration_code: z.string().optional(),
  effective_timing_repeat_bounds_range_low_value: z.number().optional(),
  effective_timing_repeat_bounds_range_low_unit: z.string().optional(),
  effective_timing_repeat_bounds_range_low_system: z.string().optional(),
  effective_timing_repeat_bounds_range_low_code: z.string().optional(),
  effective_timing_repeat_bounds_range_high_value: z.number().optional(),
  effective_timing_repeat_bounds_range_high_unit: z.string().optional(),
  effective_timing_repeat_bounds_range_high_system: z.string().optional(),
  effective_timing_repeat_bounds_range_high_code: z.string().optional(),
  effective_timing_repeat_bounds_period_start: z.string().optional(),
  effective_timing_repeat_bounds_period_end: z.string().optional(),
  effective_timing_repeat_count: z.number().int().optional(),
  effective_timing_repeat_count_max: z.number().int().optional(),
  effective_timing_repeat_duration: z.number().optional(),
  effective_timing_repeat_duration_max: z.number().optional(),
  effective_timing_repeat_duration_unit: z.string().optional(),
  effective_timing_repeat_frequency: z.number().int().optional(),
  effective_timing_repeat_frequency_max: z.number().int().optional(),
  effective_timing_repeat_period: z.number().optional(),
  effective_timing_repeat_period_max: z.number().optional(),
  effective_timing_repeat_period_unit: z.string().optional(),
  /** Comma-separated e.g. "mon,wed,fri". */
  effective_timing_repeat_day_of_week: z.string().optional(),
  /** Comma-separated HH:MM. */
  effective_timing_repeat_time_of_day: z.string().optional(),
  /** Comma-separated event codes. */
  effective_timing_repeat_when: z.string().optional(),
  effective_timing_repeat_offset: z.number().int().optional(),

  issued: z.string().optional(),

  data_absent_reason_system: z.string().optional(),
  data_absent_reason_code: z.string().optional(),
  data_absent_reason_display: z.string().optional(),
  data_absent_reason_text: z.string().optional(),

  body_site_system: z.string().optional(),
  body_site_code: z.string().optional(),
  body_site_display: z.string().optional(),
  body_site_text: z.string().optional(),

  method_system: z.string().optional(),
  method_code: z.string().optional(),
  method_display: z.string().optional(),
  method_text: z.string().optional(),

  /** Reference to Specimen e.g. "Specimen/10001". */
  specimen: z.string().optional(),
  specimen_display: z.string().optional(),

  /** Reference to Device|DeviceMetric e.g. "Device/10001". */
  device: z.string().optional(),
  device_display: z.string().optional(),

  ...ValueXInputFields,

  identifier: z.array(IdentifierInputSchema).optional(),
  based_on: z.array(ReferenceInputSchema).optional(),
  part_of: z.array(ReferenceInputSchema).optional(),
  category: z.array(CodeableConceptInputSchema).optional(),
  focus: z.array(ReferenceInputSchema).optional(),
  performer: z.array(ReferenceInputSchema).optional(),
  interpretation: z.array(CodeableConceptInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
  reference_range: z.array(ReferenceRangeInputSchema).optional(),
  has_member: z.array(ReferenceInputSchema).optional(),
  derived_from: z.array(ReferenceInputSchema).optional(),
  component: z.array(ObservationComponentInputSchema).optional(),
});
export type TCreateObservation = z.infer<typeof CreateObservationValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateObservationBaseSchema = z.object({
  status: z.string().optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  subject_display: z.string().optional(),
  encounter_display: z.string().optional(),
  effective_date_time: z.string().optional(),
  effective_period_start: z.string().optional(),
  effective_period_end: z.string().optional(),
  effective_instant: z.string().optional(),
  issued: z.string().optional(),
  value_quantity_value: z.number().optional(),
  value_quantity_comparator: z.string().optional(),
  value_quantity_unit: z.string().optional(),
  value_quantity_system: z.string().optional(),
  value_quantity_code: z.string().optional(),
  value_codeable_concept_system: z.string().optional(),
  value_codeable_concept_code: z.string().optional(),
  value_codeable_concept_display: z.string().optional(),
  value_codeable_concept_text: z.string().optional(),
  value_string: z.string().optional(),
  value_boolean: z.boolean().optional(),
  value_integer: z.number().int().optional(),
  value_time: z.string().optional(),
  value_date_time: z.string().optional(),
  value_period_start: z.string().optional(),
  value_period_end: z.string().optional(),
  data_absent_reason_system: z.string().optional(),
  data_absent_reason_code: z.string().optional(),
  data_absent_reason_display: z.string().optional(),
  data_absent_reason_text: z.string().optional(),
  body_site_system: z.string().optional(),
  body_site_code: z.string().optional(),
  body_site_display: z.string().optional(),
  body_site_text: z.string().optional(),
  method_system: z.string().optional(),
  method_code: z.string().optional(),
  method_display: z.string().optional(),
  method_text: z.string().optional(),
  specimen_display: z.string().optional(),
  device_display: z.string().optional(),
});

export const UpdateObservationDtoSchema = UpdateObservationBaseSchema;
export type TUpdateObservationDto = z.infer<typeof UpdateObservationDtoSchema>;

export const UpdateObservationValidationSchema = UpdateObservationBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateObservation = z.infer<typeof UpdateObservationValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListObservationsValidationSchema = z.object({
  status: z.string().optional(),
  patient_id: z.number().int().optional(),
  encounter_id: z.number().int().optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListObservationsQuery = z.infer<typeof ListObservationsValidationSchema>;

export const GetByIdObservationValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdObservation = z.infer<typeof GetByIdObservationValidationSchema>;

export const DeleteObservationValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteObservation = z.infer<typeof DeleteObservationValidationSchema>;
