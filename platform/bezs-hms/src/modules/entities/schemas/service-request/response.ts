/**
 * ServiceRequest response schemas.
 *
 * Layer: entities / schemas / service-request
 *
 * Mirrors the fhir-gql PlainServiceRequest* response shapes exactly.
 * All optional fields use .nullish() — the API returns explicit JSON null, not missing keys.
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

export const ServiceRequestIdentifierResponseSchema = z.object({
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

export const ServiceRequestCategoryResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

export const ServiceRequestOrderDetailResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});

const ReferenceItemSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});

export const ServiceRequestPerformerResponseSchema = ReferenceItemSchema;
export const ServiceRequestLocationCodeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export const ServiceRequestLocationReferenceResponseSchema = ReferenceItemSchema;
export const ServiceRequestReasonCodeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export const ServiceRequestReasonReferenceResponseSchema = ReferenceItemSchema;
export const ServiceRequestInsuranceResponseSchema = ReferenceItemSchema;
export const ServiceRequestSupportingInfoResponseSchema = ReferenceItemSchema;
export const ServiceRequestSpecimenResponseSchema = ReferenceItemSchema;
export const ServiceRequestBodySiteResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export const ServiceRequestNoteResponseSchema = z.object({
  id: z.number(),
  text: z.string(),
  time: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
});
export const ServiceRequestRelevantHistoryResponseSchema = ReferenceItemSchema;
export const ServiceRequestBasedOnResponseSchema = ReferenceItemSchema;
export const ServiceRequestReplacesResponseSchema = ReferenceItemSchema;

// ── Top-level response schema ─────────────────────────────────────────────────

export const ServiceRequestResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  status: z.string(),
  intent: z.string(),
  priority: z.string().nullish(),
  do_not_perform: z.boolean().nullish(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  encounter_id: z.number().nullish(),
  encounter_display: z.string().nullish(),
  occurrence_datetime: z.string().nullish(),
  occurrence_period_start: z.string().nullish(),
  occurrence_period_end: z.string().nullish(),
  occurrence_timing_frequency: z.number().nullish(),
  occurrence_timing_period: z.number().nullish(),
  occurrence_timing_period_unit: z.string().nullish(),
  occurrence_timing_bounds_start: z.string().nullish(),
  occurrence_timing_bounds_end: z.string().nullish(),
  as_needed_boolean: z.boolean().nullish(),
  as_needed_system: z.string().nullish(),
  as_needed_code: z.string().nullish(),
  as_needed_display: z.string().nullish(),
  as_needed_text: z.string().nullish(),
  authored_on: z.string().nullish(),
  requester_type: z.string().nullish(),
  requester_id: z.number().nullish(),
  requester_display: z.string().nullish(),
  performer_type_system: z.string().nullish(),
  performer_type_code: z.string().nullish(),
  performer_type_display: z.string().nullish(),
  performer_type_text: z.string().nullish(),
  quantity_value: z.number().nullish(),
  quantity_unit: z.string().nullish(),
  quantity_system: z.string().nullish(),
  quantity_code: z.string().nullish(),
  quantity_ratio_numerator_value: z.number().nullish(),
  quantity_ratio_numerator_unit: z.string().nullish(),
  quantity_ratio_denominator_value: z.number().nullish(),
  quantity_ratio_denominator_unit: z.string().nullish(),
  quantity_range_low_value: z.number().nullish(),
  quantity_range_low_unit: z.string().nullish(),
  quantity_range_high_value: z.number().nullish(),
  quantity_range_high_unit: z.string().nullish(),
  requisition_use: z.string().nullish(),
  requisition_type_system: z.string().nullish(),
  requisition_type_code: z.string().nullish(),
  requisition_type_display: z.string().nullish(),
  requisition_type_text: z.string().nullish(),
  requisition_system: z.string().nullish(),
  requisition_value: z.string().nullish(),
  requisition_period_start: z.string().nullish(),
  requisition_period_end: z.string().nullish(),
  requisition_assigner: z.string().nullish(),
  instantiates_canonical: z.string().nullish(),
  instantiates_uri: z.string().nullish(),
  patient_instruction: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  identifier: z.array(ServiceRequestIdentifierResponseSchema).nullish(),
  category: z.array(ServiceRequestCategoryResponseSchema).nullish(),
  order_detail: z.array(ServiceRequestOrderDetailResponseSchema).nullish(),
  performer: z.array(ServiceRequestPerformerResponseSchema).nullish(),
  location_code: z.array(ServiceRequestLocationCodeResponseSchema).nullish(),
  location_reference: z.array(ServiceRequestLocationReferenceResponseSchema).nullish(),
  reason_code: z.array(ServiceRequestReasonCodeResponseSchema).nullish(),
  reason_reference: z.array(ServiceRequestReasonReferenceResponseSchema).nullish(),
  insurance: z.array(ServiceRequestInsuranceResponseSchema).nullish(),
  supporting_info: z.array(ServiceRequestSupportingInfoResponseSchema).nullish(),
  specimen: z.array(ServiceRequestSpecimenResponseSchema).nullish(),
  body_site: z.array(ServiceRequestBodySiteResponseSchema).nullish(),
  note: z.array(ServiceRequestNoteResponseSchema).nullish(),
  relevant_history: z.array(ServiceRequestRelevantHistoryResponseSchema).nullish(),
  based_on: z.array(ServiceRequestBasedOnResponseSchema).nullish(),
  replaces: z.array(ServiceRequestReplacesResponseSchema).nullish(),
});
export type TServiceRequestResponse = z.infer<typeof ServiceRequestResponseSchema>;

export const PaginatedServiceRequestResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(ServiceRequestResponseSchema),
});
export type TPaginatedServiceRequestResponse = z.infer<typeof PaginatedServiceRequestResponseSchema>;
