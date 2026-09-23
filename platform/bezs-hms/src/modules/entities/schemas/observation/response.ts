/**
 * Observation response schemas.
 *
 * Layer: entities / schemas / observation
 *
 * Mirrors the fhir-gql PlainObservation* response shapes exactly.
 * All optional fields use .nullish() — the API returns explicit JSON null, not missing keys.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const ObservationIdentifierResponseSchema = z.object({
  id: z.number(),
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

const ObsRefItemSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const ObservationBasedOnResponseSchema = ObsRefItemSchema;
export const ObservationPartOfResponseSchema = ObsRefItemSchema;

export const ObservationCategoryResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ObservationFocusResponseSchema = ObsRefItemSchema;
export const ObservationPerformerResponseSchema = ObsRefItemSchema;

export const ObservationInterpretationResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ObservationNoteResponseSchema = z.object({
  id: z.number(),
  text: z.string().nullish(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});

export const ObservationAppliesToResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ObservationReferenceRangeResponseSchema = z.object({
  id: z.number(),
  low_value: z.number().nullish(),
  low_unit: z.string().nullish(),
  low_system: z.string().nullish(),
  low_code: z.string().nullish(),
  high_value: z.number().nullish(),
  high_unit: z.string().nullish(),
  high_system: z.string().nullish(),
  high_code: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  age_low_value: z.number().nullish(),
  age_low_unit: z.string().nullish(),
  age_low_system: z.string().nullish(),
  age_low_code: z.string().nullish(),
  age_high_value: z.number().nullish(),
  age_high_unit: z.string().nullish(),
  age_high_system: z.string().nullish(),
  age_high_code: z.string().nullish(),
  text: z.string().nullish(),
  applies_to: z.array(ObservationAppliesToResponseSchema).nullish(),
});

export const ObservationHasMemberResponseSchema = ObsRefItemSchema;
export const ObservationDerivedFromResponseSchema = ObsRefItemSchema;

export const ObservationComponentInterpretationResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ObservationComponentReferenceRangeAppliesToResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ObservationComponentReferenceRangeResponseSchema = z.object({
  id: z.number(),
  low_value: z.number().nullish(),
  low_unit: z.string().nullish(),
  low_system: z.string().nullish(),
  low_code: z.string().nullish(),
  high_value: z.number().nullish(),
  high_unit: z.string().nullish(),
  high_system: z.string().nullish(),
  high_code: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  age_low_value: z.number().nullish(),
  age_low_unit: z.string().nullish(),
  age_low_system: z.string().nullish(),
  age_low_code: z.string().nullish(),
  age_high_value: z.number().nullish(),
  age_high_unit: z.string().nullish(),
  age_high_system: z.string().nullish(),
  age_high_code: z.string().nullish(),
  text: z.string().nullish(),
  applies_to: z.array(ObservationComponentReferenceRangeAppliesToResponseSchema).nullish(),
});

/** Shared value[x] fields reused by both the top-level and component sub-objects. */
const ValueXFields = {
  value_quantity_value: z.number().nullish(),
  value_quantity_comparator: z.string().nullish(),
  value_quantity_unit: z.string().nullish(),
  value_quantity_system: z.string().nullish(),
  value_quantity_code: z.string().nullish(),
  value_codeable_concept_system: z.string().nullish(),
  value_codeable_concept_code: z.string().nullish(),
  value_codeable_concept_display: z.string().nullish(),
  value_codeable_concept_text: z.string().nullish(),
  value_string: z.string().nullish(),
  value_boolean: z.boolean().nullish(),
  value_integer: z.number().nullish(),
  value_time: z.string().nullish(),
  value_date_time: z.string().nullish(),
  value_period_start: z.string().nullish(),
  value_period_end: z.string().nullish(),
  value_range_low_value: z.number().nullish(),
  value_range_low_unit: z.string().nullish(),
  value_range_low_system: z.string().nullish(),
  value_range_low_code: z.string().nullish(),
  value_range_high_value: z.number().nullish(),
  value_range_high_unit: z.string().nullish(),
  value_range_high_system: z.string().nullish(),
  value_range_high_code: z.string().nullish(),
  value_ratio_numerator_value: z.number().nullish(),
  value_ratio_numerator_comparator: z.string().nullish(),
  value_ratio_numerator_unit: z.string().nullish(),
  value_ratio_numerator_system: z.string().nullish(),
  value_ratio_numerator_code: z.string().nullish(),
  value_ratio_denominator_value: z.number().nullish(),
  value_ratio_denominator_comparator: z.string().nullish(),
  value_ratio_denominator_unit: z.string().nullish(),
  value_ratio_denominator_system: z.string().nullish(),
  value_ratio_denominator_code: z.string().nullish(),
  value_sampled_data_origin_value: z.number().nullish(),
  value_sampled_data_origin_unit: z.string().nullish(),
  value_sampled_data_origin_system: z.string().nullish(),
  value_sampled_data_origin_code: z.string().nullish(),
  value_sampled_data_period: z.number().nullish(),
  value_sampled_data_factor: z.number().nullish(),
  value_sampled_data_lower_limit: z.number().nullish(),
  value_sampled_data_upper_limit: z.number().nullish(),
  value_sampled_data_dimensions: z.number().nullish(),
  value_sampled_data_data: z.string().nullish(),
};

export const ObservationComponentResponseSchema = z.object({
  id: z.number(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  ...ValueXFields,
  data_absent_reason_system: z.string().nullish(),
  data_absent_reason_code: z.string().nullish(),
  data_absent_reason_display: z.string().nullish(),
  data_absent_reason_text: z.string().nullish(),
  interpretation: z.array(ObservationComponentInterpretationResponseSchema).nullish(),
  reference_range: z.array(ObservationComponentReferenceRangeResponseSchema).nullish(),
});

// ── Top-level response schema ─────────────────────────────────────────────────

export const ObservationResponseSchema = z.object({
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
  effective_date_time: z.string().nullish(),
  effective_period_start: z.string().nullish(),
  effective_period_end: z.string().nullish(),
  effective_instant: z.string().nullish(),
  effective_timing_event: z.string().nullish(),
  effective_timing_code_system: z.string().nullish(),
  effective_timing_code_code: z.string().nullish(),
  effective_timing_code_display: z.string().nullish(),
  effective_timing_code_text: z.string().nullish(),
  issued: z.string().nullish(),
  ...ValueXFields,
  data_absent_reason_system: z.string().nullish(),
  data_absent_reason_code: z.string().nullish(),
  data_absent_reason_display: z.string().nullish(),
  data_absent_reason_text: z.string().nullish(),
  body_site_system: z.string().nullish(),
  body_site_code: z.string().nullish(),
  body_site_display: z.string().nullish(),
  body_site_text: z.string().nullish(),
  method_system: z.string().nullish(),
  method_code: z.string().nullish(),
  method_display: z.string().nullish(),
  method_text: z.string().nullish(),
  specimen_type: z.string().nullish(),
  specimen_id: z.number().nullish(),
  specimen_display: z.string().nullish(),
  device_type: z.string().nullish(),
  device_id: z.number().nullish(),
  device_display: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  identifier: z.array(ObservationIdentifierResponseSchema).nullish(),
  based_on: z.array(ObservationBasedOnResponseSchema).nullish(),
  part_of: z.array(ObservationPartOfResponseSchema).nullish(),
  category: z.array(ObservationCategoryResponseSchema).nullish(),
  focus: z.array(ObservationFocusResponseSchema).nullish(),
  performer: z.array(ObservationPerformerResponseSchema).nullish(),
  interpretation: z.array(ObservationInterpretationResponseSchema).nullish(),
  note: z.array(ObservationNoteResponseSchema).nullish(),
  reference_range: z.array(ObservationReferenceRangeResponseSchema).nullish(),
  has_member: z.array(ObservationHasMemberResponseSchema).nullish(),
  derived_from: z.array(ObservationDerivedFromResponseSchema).nullish(),
  component: z.array(ObservationComponentResponseSchema).nullish(),
});
export type TObservationResponse = z.infer<typeof ObservationResponseSchema>;

export const PaginatedObservationResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(ObservationResponseSchema),
});
export type TPaginatedObservationResponse = z.infer<typeof PaginatedObservationResponseSchema>;
