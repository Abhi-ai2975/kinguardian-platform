/**
 * HealthcareService response schemas.
 *
 * Layer: entities / schemas / healthcare-service
 *
 * Mirrors fhir-gql's app/schemas/healthcare_service/response.py. All optional
 * fields use .nullish() — the fhir-gql API serialises Python's Optional[X] =
 * None as explicit JSON null, not as a missing key.
 *
 * fhir-gql types every array sub-resource as a typed Pydantic sub-model (each
 * with its own `id`) rather than untyped List[Dict] — unlike Location, whose
 * response models forward arrays as-is. Still `.nullish()` throughout for
 * defensive parsing, matching the project convention.
 */

import { z } from "zod";

/** Single FHIR Identifier attached to a HealthcareService. */
export const HealthcareServiceIdentifierResponseSchema = z.object({
  id: z.number().nullish(),
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
export type THealthcareServiceIdentifierResponse = z.infer<
  typeof HealthcareServiceIdentifierResponseSchema
>;

/** Shared shape for every simple CodeableConcept sub-resource row. */
export const HealthcareServiceCodeableConceptResponseSchema = z.object({
  id: z.number().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type THealthcareServiceCodeableConceptResponse = z.infer<
  typeof HealthcareServiceCodeableConceptResponseSchema
>;

/** A flattened Location reference row (used for both `location[]` and `coverage_area[]`). */
export const HealthcareServiceLocationRefResponseSchema = z.object({
  id: z.number().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type THealthcareServiceLocationRefResponse = z.infer<
  typeof HealthcareServiceLocationRefResponseSchema
>;

/** A flattened technical endpoint reference row. */
export const HealthcareServiceEndpointResponseSchema = z.object({
  id: z.number().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type THealthcareServiceEndpointResponse = z.infer<
  typeof HealthcareServiceEndpointResponseSchema
>;

/** Single contact point row (phone, email, fax, etc.). */
export const HealthcareServiceTelecomResponseSchema = z.object({
  id: z.number().nullish(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type THealthcareServiceTelecomResponse = z.infer<
  typeof HealthcareServiceTelecomResponseSchema
>;

/** Single eligibility criteria row. */
export const HealthcareServiceEligibilityResponseSchema = z.object({
  id: z.number().nullish(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  comment: z.string().nullish(),
});
export type THealthcareServiceEligibilityResponse = z.infer<
  typeof HealthcareServiceEligibilityResponseSchema
>;

/** Single available-time slot row. */
export const HealthcareServiceAvailableTimeResponseSchema = z.object({
  id: z.number().nullish(),
  days_of_week: z.array(z.string()).nullish(),
  all_day: z.boolean().nullish(),
  available_start_time: z.string().nullish(),
  available_end_time: z.string().nullish(),
});
export type THealthcareServiceAvailableTimeResponse = z.infer<
  typeof HealthcareServiceAvailableTimeResponseSchema
>;

/** Single not-available period row. */
export const HealthcareServiceNotAvailableResponseSchema = z.object({
  id: z.number().nullish(),
  description: z.string().nullish(),
  during_start: z.string().nullish(),
  during_end: z.string().nullish(),
});
export type THealthcareServiceNotAvailableResponse = z.infer<
  typeof HealthcareServiceNotAvailableResponseSchema
>;

/** Full FHIR HealthcareService resource returned by the fhir-gql API. */
export const HealthcareServiceResponseSchema = z.object({
  id: z.number(),
  active: z.boolean().nullish(),
  name: z.string().nullish(),
  comment: z.string().nullish(),
  extra_details: z.string().nullish(),
  appointment_required: z.boolean().nullish(),
  availability_exceptions: z.string().nullish(),

  // Providing organisation — flattened reference
  provided_by_type: z.string().nullish(),
  provided_by_id: z.number().nullish(),
  provided_by_display: z.string().nullish(),

  // Photo (flattened FHIR Attachment)
  photo_content_type: z.string().nullish(),
  photo_language: z.string().nullish(),
  photo_data: z.string().nullish(),
  photo_url: z.string().nullish(),
  photo_size: z.number().nullish(),
  photo_hash: z.string().nullish(),
  photo_title: z.string().nullish(),
  photo_creation: z.string().nullish(),

  // Sub-resource arrays
  identifier: z.array(HealthcareServiceIdentifierResponseSchema).nullish(),
  category: z.array(HealthcareServiceCodeableConceptResponseSchema).nullish(),
  type: z.array(HealthcareServiceCodeableConceptResponseSchema).nullish(),
  specialty: z.array(HealthcareServiceCodeableConceptResponseSchema).nullish(),
  location: z.array(HealthcareServiceLocationRefResponseSchema).nullish(),
  telecom: z.array(HealthcareServiceTelecomResponseSchema).nullish(),
  coverage_area: z.array(HealthcareServiceLocationRefResponseSchema).nullish(),
  service_provision_code: z.array(HealthcareServiceCodeableConceptResponseSchema).nullish(),
  eligibility: z.array(HealthcareServiceEligibilityResponseSchema).nullish(),
  program: z.array(HealthcareServiceCodeableConceptResponseSchema).nullish(),
  characteristic: z.array(HealthcareServiceCodeableConceptResponseSchema).nullish(),
  communication: z.array(HealthcareServiceCodeableConceptResponseSchema).nullish(),
  referral_method: z.array(HealthcareServiceCodeableConceptResponseSchema).nullish(),
  available_time: z.array(HealthcareServiceAvailableTimeResponseSchema).nullish(),
  not_available: z.array(HealthcareServiceNotAvailableResponseSchema).nullish(),
  endpoint: z.array(HealthcareServiceEndpointResponseSchema).nullish(),

  // Tenant / audit fields
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type THealthcareServiceResponse = z.infer<typeof HealthcareServiceResponseSchema>;

/**
 * Paginated list response — { total, limit, offset, data: THealthcareServiceResponse[] }.
 */
export const PaginatedHealthcareServiceResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(HealthcareServiceResponseSchema),
});
export type TPaginatedHealthcareServiceResponse = z.infer<
  typeof PaginatedHealthcareServiceResponseSchema
>;
