/**
 * ServiceRequest input/validation schemas.
 *
 * Layer: entities / schemas / service-request
 *
 * Required fields: status (1..1), intent (1..1).
 * All child arrays are immutable after creation — delete + re-create to change them.
 * URL path: POST/GET/PATCH/DELETE /service-requests/
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
  author_reference_display: z.string().optional(),
});

// ── Create schema ─────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /service-requests/.
 * status (1..1) and intent (1..1) are required.
 */
export const CreateServiceRequestValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  /** draft|active|on-hold|revoked|completed|entered-in-error|unknown */
  status: z.string(),
  /** proposal|plan|directive|order|original-order|reflex-order|filler-order|instance-order|option */
  intent: z.string(),

  /** routine|urgent|asap|stat */
  priority: z.string().optional(),
  do_not_perform: z.boolean().optional(),

  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),

  /** FHIR reference e.g. "Patient/10001". */
  subject: z.string().optional(),
  subject_display: z.string().optional(),

  encounter_id: z.number().int().optional(),
  encounter_display: z.string().optional(),

  occurrence_datetime: z.string().optional(),
  occurrence_period_start: z.string().optional(),
  occurrence_period_end: z.string().optional(),
  occurrence_timing_frequency: z.number().int().optional(),
  occurrence_timing_period: z.number().optional(),
  /** s|min|h|d|wk|mo|a */
  occurrence_timing_period_unit: z.string().optional(),
  occurrence_timing_bounds_start: z.string().optional(),
  occurrence_timing_bounds_end: z.string().optional(),

  as_needed_boolean: z.boolean().optional(),
  as_needed_system: z.string().optional(),
  as_needed_code: z.string().optional(),
  as_needed_display: z.string().optional(),
  as_needed_text: z.string().optional(),

  authored_on: z.string().optional(),
  /** FHIR reference e.g. "Practitioner/30001". */
  requester: z.string().optional(),
  requester_display: z.string().optional(),

  performer_type_system: z.string().optional(),
  performer_type_code: z.string().optional(),
  performer_type_display: z.string().optional(),
  performer_type_text: z.string().optional(),

  quantity_value: z.number().optional(),
  quantity_unit: z.string().optional(),
  quantity_system: z.string().optional(),
  quantity_code: z.string().optional(),
  quantity_ratio_numerator_value: z.number().optional(),
  quantity_ratio_numerator_unit: z.string().optional(),
  quantity_ratio_denominator_value: z.number().optional(),
  quantity_ratio_denominator_unit: z.string().optional(),
  quantity_range_low_value: z.number().optional(),
  quantity_range_low_unit: z.string().optional(),
  quantity_range_high_value: z.number().optional(),
  quantity_range_high_unit: z.string().optional(),

  requisition_use: z.string().optional(),
  requisition_type_system: z.string().optional(),
  requisition_type_code: z.string().optional(),
  requisition_type_display: z.string().optional(),
  requisition_type_text: z.string().optional(),
  requisition_system: z.string().optional(),
  requisition_value: z.string().optional(),
  requisition_period_start: z.string().optional(),
  requisition_period_end: z.string().optional(),
  requisition_assigner: z.string().optional(),

  instantiates_canonical: z.string().optional(),
  instantiates_uri: z.string().optional(),
  patient_instruction: z.string().optional(),

  identifier: z.array(IdentifierInputSchema).optional(),
  category: z.array(CodeableConceptInputSchema).optional(),
  order_detail: z.array(CodeableConceptInputSchema).optional(),
  performer: z.array(ReferenceInputSchema).optional(),
  location_code: z.array(CodeableConceptInputSchema).optional(),
  location_reference: z.array(ReferenceInputSchema).optional(),
  reason_code: z.array(CodeableConceptInputSchema).optional(),
  reason_reference: z.array(ReferenceInputSchema).optional(),
  insurance: z.array(ReferenceInputSchema).optional(),
  supporting_info: z.array(ReferenceInputSchema).optional(),
  specimen: z.array(ReferenceInputSchema).optional(),
  body_site: z.array(CodeableConceptInputSchema).optional(),
  note: z.array(NoteInputSchema).optional(),
  relevant_history: z.array(ReferenceInputSchema).optional(),
  based_on: z.array(ReferenceInputSchema).optional(),
  replaces: z.array(ReferenceInputSchema).optional(),
});
export type TCreateServiceRequest = z.infer<typeof CreateServiceRequestValidationSchema>;

// ── Update (patch) schemas ────────────────────────────────────────────────────

const UpdateServiceRequestBaseSchema = z.object({
  status: z.string().optional(),
  intent: z.string().optional(),
  priority: z.string().optional(),
  do_not_perform: z.boolean().optional(),
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  encounter_display: z.string().optional(),
  occurrence_datetime: z.string().optional(),
  occurrence_period_start: z.string().optional(),
  occurrence_period_end: z.string().optional(),
  occurrence_timing_frequency: z.number().int().optional(),
  occurrence_timing_period: z.number().optional(),
  occurrence_timing_period_unit: z.string().optional(),
  occurrence_timing_bounds_start: z.string().optional(),
  occurrence_timing_bounds_end: z.string().optional(),
  as_needed_boolean: z.boolean().optional(),
  as_needed_system: z.string().optional(),
  as_needed_code: z.string().optional(),
  as_needed_display: z.string().optional(),
  as_needed_text: z.string().optional(),
  authored_on: z.string().optional(),
  requester_display: z.string().optional(),
  performer_type_system: z.string().optional(),
  performer_type_code: z.string().optional(),
  performer_type_display: z.string().optional(),
  performer_type_text: z.string().optional(),
  quantity_value: z.number().optional(),
  quantity_unit: z.string().optional(),
  quantity_system: z.string().optional(),
  quantity_code: z.string().optional(),
  quantity_ratio_numerator_value: z.number().optional(),
  quantity_ratio_numerator_unit: z.string().optional(),
  quantity_ratio_denominator_value: z.number().optional(),
  quantity_ratio_denominator_unit: z.string().optional(),
  quantity_range_low_value: z.number().optional(),
  quantity_range_low_unit: z.string().optional(),
  quantity_range_high_value: z.number().optional(),
  quantity_range_high_unit: z.string().optional(),
  requisition_use: z.string().optional(),
  requisition_type_system: z.string().optional(),
  requisition_type_code: z.string().optional(),
  requisition_type_display: z.string().optional(),
  requisition_type_text: z.string().optional(),
  requisition_system: z.string().optional(),
  requisition_value: z.string().optional(),
  requisition_period_start: z.string().optional(),
  requisition_period_end: z.string().optional(),
  requisition_assigner: z.string().optional(),
  instantiates_canonical: z.string().optional(),
  instantiates_uri: z.string().optional(),
  patient_instruction: z.string().optional(),
});

export const UpdateServiceRequestDtoSchema = UpdateServiceRequestBaseSchema;
export type TUpdateServiceRequestDto = z.infer<typeof UpdateServiceRequestDtoSchema>;

export const UpdateServiceRequestValidationSchema = UpdateServiceRequestBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateServiceRequest = z.infer<typeof UpdateServiceRequestValidationSchema>;

// ── List / getById / delete ───────────────────────────────────────────────────

export const ListServiceRequestsValidationSchema = z.object({
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
export type TListServiceRequestsQuery = z.infer<typeof ListServiceRequestsValidationSchema>;

export const GetByIdServiceRequestValidationSchema = z.object({ id: z.number().int().positive() });
export type TGetByIdServiceRequest = z.infer<typeof GetByIdServiceRequestValidationSchema>;

export const DeleteServiceRequestValidationSchema = z.object({ id: z.number().int().positive() });
export type TDeleteServiceRequest = z.infer<typeof DeleteServiceRequestValidationSchema>;
