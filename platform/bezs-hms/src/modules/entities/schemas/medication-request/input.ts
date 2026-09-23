/**
 * MedicationRequest input/validation schemas.
 *
 * Layer: entities / schemas / medication-request
 *
 * Required fields: status (1..1), intent (1..1).
 * All child arrays are immutable after creation — delete + re-create to change them.
 * URL path: POST/GET/PATCH/DELETE /medication-requests/
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

const ReferenceInputSchema = z.object({
  reference: z.string(),
  reference_display: z.string().optional(),
});

const NoteInputSchema = z.object({
  text: z.string(),
  time: z.string().optional(),
  author_string: z.string().optional(),
  author_reference: z.string().optional(),
});

const AdditionalInstructionInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const DoseAndRateInputSchema = z.object({
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  dose_quantity_value: z.number().optional(),
  dose_quantity_unit: z.string().optional(),
  dose_quantity_system: z.string().optional(),
  dose_quantity_code: z.string().optional(),
  dose_range_low_value: z.number().optional(),
  dose_range_low_unit: z.string().optional(),
  dose_range_high_value: z.number().optional(),
  dose_range_high_unit: z.string().optional(),
  rate_ratio_numerator_value: z.number().optional(),
  rate_ratio_numerator_unit: z.string().optional(),
  rate_ratio_denominator_value: z.number().optional(),
  rate_ratio_denominator_unit: z.string().optional(),
  rate_range_low_value: z.number().optional(),
  rate_range_low_unit: z.string().optional(),
  rate_range_high_value: z.number().optional(),
  rate_range_high_unit: z.string().optional(),
  rate_quantity_value: z.number().optional(),
  rate_quantity_unit: z.string().optional(),
  rate_quantity_system: z.string().optional(),
  rate_quantity_code: z.string().optional(),
});

const DosageInstructionInputSchema = z.object({
  sequence: z.number().int().optional(),
  text: z.string().optional(),
  patient_instruction: z.string().optional(),
  as_needed_boolean: z.boolean().optional(),
  as_needed_system: z.string().optional(),
  as_needed_code: z.string().optional(),
  as_needed_display: z.string().optional(),
  as_needed_text: z.string().optional(),
  site_system: z.string().optional(),
  site_code: z.string().optional(),
  site_display: z.string().optional(),
  site_text: z.string().optional(),
  route_system: z.string().optional(),
  route_code: z.string().optional(),
  route_display: z.string().optional(),
  route_text: z.string().optional(),
  method_system: z.string().optional(),
  method_code: z.string().optional(),
  method_display: z.string().optional(),
  method_text: z.string().optional(),
  timing_code_system: z.string().optional(),
  timing_code_code: z.string().optional(),
  timing_code_display: z.string().optional(),
  timing_repeat_bounds_start: z.string().optional(),
  timing_repeat_bounds_end: z.string().optional(),
  timing_repeat_count: z.number().int().optional(),
  timing_repeat_count_max: z.number().int().optional(),
  timing_repeat_duration: z.number().optional(),
  timing_repeat_duration_max: z.number().optional(),
  timing_repeat_duration_unit: z.string().optional(),
  timing_repeat_frequency: z.number().int().optional(),
  timing_repeat_frequency_max: z.number().int().optional(),
  timing_repeat_period: z.number().optional(),
  timing_repeat_period_max: z.number().optional(),
  timing_repeat_period_unit: z.string().optional(),
  /** Comma-separated e.g. "mon,wed,fri". */
  timing_repeat_day_of_week: z.string().optional(),
  /** Comma-separated HH:MM e.g. "08:00,20:00". */
  timing_repeat_time_of_day: z.string().optional(),
  /** Comma-separated event codes e.g. "MORN,EVE". */
  timing_repeat_when: z.string().optional(),
  timing_repeat_offset: z.number().int().optional(),
  max_dose_per_period_numerator_value: z.number().optional(),
  max_dose_per_period_numerator_unit: z.string().optional(),
  max_dose_per_period_denominator_value: z.number().optional(),
  max_dose_per_period_denominator_unit: z.string().optional(),
  max_dose_per_administration_value: z.number().optional(),
  max_dose_per_administration_unit: z.string().optional(),
  max_dose_per_lifetime_value: z.number().optional(),
  max_dose_per_lifetime_unit: z.string().optional(),
  additional_instruction: z.array(AdditionalInstructionInputSchema).optional(),
  dose_and_rate: z.array(DoseAndRateInputSchema).optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /medication-requests/.
 * status (1..1) and intent (1..1) are required.
 */
export const CreateMedicationRequestValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  /** active|on-hold|cancelled|completed|entered-in-error|stopped|draft|unknown */
  status: z.string(),
  /** proposal|plan|order|original-order|reflex-order|filler-order|instance-order|option */
  intent: z.string(),

  status_reason_system: z.string().optional(),
  status_reason_code: z.string().optional(),
  status_reason_display: z.string().optional(),
  status_reason_text: z.string().optional(),

  /** routine|urgent|asap|stat */
  priority: z.string().optional(),
  do_not_perform: z.boolean().optional(),

  medication_code_system: z.string().optional(),
  medication_code_code: z.string().optional(),
  medication_code_display: z.string().optional(),
  medication_code_text: z.string().optional(),
  /** Reference to Medication e.g. "Medication/10001". */
  medication_reference: z.string().optional(),
  medication_reference_display: z.string().optional(),

  /** Reference e.g. "Patient/10001". */
  subject: z.string().optional(),
  subject_display: z.string().optional(),

  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),

  authored_on: z.string().optional(),

  reported_boolean: z.boolean().optional(),
  reported_reference: z.string().optional(),
  reported_reference_display: z.string().optional(),

  /** Reference to Practitioner|PractitionerRole|Organization|Patient|RelatedPerson|Device. */
  requester: z.string().optional(),
  requester_display: z.string().optional(),

  /** Reference to Practitioner|PractitionerRole|Organization|Patient|Device|RelatedPerson|CareTeam. */
  performer: z.string().optional(),
  performer_display: z.string().optional(),

  performer_type_system: z.string().optional(),
  performer_type_code: z.string().optional(),
  performer_type_display: z.string().optional(),
  performer_type_text: z.string().optional(),

  /** Reference to Practitioner or PractitionerRole. */
  recorder: z.string().optional(),
  recorder_display: z.string().optional(),

  group_identifier_use: z.string().optional(),
  group_identifier_type_system: z.string().optional(),
  group_identifier_type_code: z.string().optional(),
  group_identifier_type_display: z.string().optional(),
  group_identifier_type_text: z.string().optional(),
  group_identifier_system: z.string().optional(),
  group_identifier_value: z.string().optional(),
  group_identifier_period_start: z.string().optional(),
  group_identifier_period_end: z.string().optional(),
  group_identifier_assigner: z.string().optional(),

  course_of_therapy_type_system: z.string().optional(),
  course_of_therapy_type_code: z.string().optional(),
  course_of_therapy_type_display: z.string().optional(),
  course_of_therapy_type_text: z.string().optional(),

  /** Reference to MedicationRequest e.g. "MedicationRequest/90001". */
  prior_prescription: z.string().optional(),
  prior_prescription_display: z.string().optional(),

  instantiates_canonical: z.string().optional(),
  instantiates_uri: z.string().optional(),

  dispense_initial_fill_quantity_value: z.number().optional(),
  dispense_initial_fill_quantity_unit: z.string().optional(),
  dispense_initial_fill_quantity_system: z.string().optional(),
  dispense_initial_fill_quantity_code: z.string().optional(),
  dispense_initial_fill_duration_value: z.number().optional(),
  dispense_initial_fill_duration_unit: z.string().optional(),
  dispense_interval_value: z.number().optional(),
  dispense_interval_unit: z.string().optional(),
  dispense_validity_period_start: z.string().optional(),
  dispense_validity_period_end: z.string().optional(),
  dispense_number_of_repeats_allowed: z.number().int().optional(),
  dispense_quantity_value: z.number().optional(),
  dispense_quantity_unit: z.string().optional(),
  dispense_quantity_system: z.string().optional(),
  dispense_quantity_code: z.string().optional(),
  dispense_expected_supply_duration_value: z.number().optional(),
  dispense_expected_supply_duration_unit: z.string().optional(),
  /** Reference to Organization. */
  dispense_performer: z.string().optional(),
  dispense_performer_display: z.string().optional(),

  substitution_allowed_boolean: z.boolean().optional(),
  substitution_allowed_system: z.string().optional(),
  substitution_allowed_code: z.string().optional(),
  substitution_allowed_display: z.string().optional(),
  substitution_allowed_text: z.string().optional(),
  substitution_reason_system: z.string().optional(),
  substitution_reason_code: z.string().optional(),
  substitution_reason_display: z.string().optional(),
  substitution_reason_text: z.string().optional(),

  identifier: z.array(IdentifierInputSchema).optional(),
  category: z.array(CodeableConceptInputSchema).optional(),
  supporting_info: z.array(ReferenceInputSchema).optional(),
  reason_code: z.array(CodeableConceptInputSchema).optional(),
  reason_reference: z.array(ReferenceInputSchema).optional(),
  based_on: z.array(ReferenceInputSchema).optional(),
  insurance: z.array(ReferenceInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
  dosage_instruction: z.array(DosageInstructionInputSchema).optional(),
  detected_issue: z.array(ReferenceInputSchema).optional(),
  event_history: z.array(ReferenceInputSchema).optional(),
});
export type TCreateMedicationRequest = z.infer<typeof CreateMedicationRequestValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateMedicationRequestBaseSchema = z.object({
  status: z.string().optional(),
  intent: z.string().optional(),
  priority: z.string().optional(),
  do_not_perform: z.boolean().optional(),
  status_reason_system: z.string().optional(),
  status_reason_code: z.string().optional(),
  status_reason_display: z.string().optional(),
  status_reason_text: z.string().optional(),
  medication_code_system: z.string().optional(),
  medication_code_code: z.string().optional(),
  medication_code_display: z.string().optional(),
  medication_code_text: z.string().optional(),
  subject_display: z.string().optional(),
  encounter_display: z.string().optional(),
  authored_on: z.string().optional(),
  reported_boolean: z.boolean().optional(),
  reported_reference_display: z.string().optional(),
  requester_display: z.string().optional(),
  performer_display: z.string().optional(),
  performer_type_system: z.string().optional(),
  performer_type_code: z.string().optional(),
  performer_type_display: z.string().optional(),
  performer_type_text: z.string().optional(),
  recorder_display: z.string().optional(),
  course_of_therapy_type_system: z.string().optional(),
  course_of_therapy_type_code: z.string().optional(),
  course_of_therapy_type_display: z.string().optional(),
  course_of_therapy_type_text: z.string().optional(),
  dispense_number_of_repeats_allowed: z.number().int().optional(),
  dispense_validity_period_start: z.string().optional(),
  dispense_validity_period_end: z.string().optional(),
  dispense_quantity_value: z.number().optional(),
  dispense_quantity_unit: z.string().optional(),
  substitution_allowed_boolean: z.boolean().optional(),
  substitution_reason_system: z.string().optional(),
  substitution_reason_code: z.string().optional(),
  substitution_reason_display: z.string().optional(),
  substitution_reason_text: z.string().optional(),
  instantiates_canonical: z.string().optional(),
  instantiates_uri: z.string().optional(),
});

export const UpdateMedicationRequestDtoSchema = UpdateMedicationRequestBaseSchema;
export type TUpdateMedicationRequestDto = z.infer<typeof UpdateMedicationRequestDtoSchema>;

export const UpdateMedicationRequestValidationSchema = UpdateMedicationRequestBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateMedicationRequest = z.infer<typeof UpdateMedicationRequestValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListMedicationRequestsValidationSchema = z.object({
  status: z.string().optional(),
  patient_id: z.number().int().optional(),
  encounter_id: z.number().int().optional(),
  authored_from: z.string().optional(),
  authored_to: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListMedicationRequestsQuery = z.infer<typeof ListMedicationRequestsValidationSchema>;

export const GetByIdMedicationRequestValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdMedicationRequest = z.infer<typeof GetByIdMedicationRequestValidationSchema>;

export const DeleteMedicationRequestValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteMedicationRequest = z.infer<typeof DeleteMedicationRequestValidationSchema>;
