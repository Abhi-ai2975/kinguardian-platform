/**
 * HealthcareService form schemas for React Hook Form.
 *
 * Layer: entities / schemas / healthcare-service
 *
 * Form schemas intentionally differ from the validation schemas:
 *  - `available_time[].days_of_week` is a comma-separated string in the form
 *    (e.g. "mon,tue,wed"); the modal splits it back into string[] before submit —
 *    mirrors Location's hours_of_operation pattern.
 *  - EditHealthcareServiceFormSchema only exposes the scalar fields patchable
 *    per the fhir-gql PATCH contract (see PatchHealthcareServiceDtoSchema in
 *    input.ts) — array sub-resources are not editable here.
 *  - Most array sub-resource shapes are reused directly from input.ts since
 *    they need no form-specific transformation (unlike Organization's address
 *    array, which flattens `line` to a single string).
 */

import { z } from "zod";
import {
  HealthcareServiceIdentifierInputSchema,
  HealthcareServiceCodeableConceptInputSchema,
  HealthcareServiceLocationRefInputSchema,
  HealthcareServiceTelecomInputSchema,
  HealthcareServiceEligibilityInputSchema,
  HealthcareServiceNotAvailableInputSchema,
  HealthcareServiceEndpointInputSchema,
} from "./input";

/**
 * Available-time sub-schema for the create form.
 * `days_of_week` is a comma-separated string instead of string[]; the modal
 * splits it before submit.
 */
export const HealthcareServiceAvailableTimeFormItemSchema = z.object({
  days_of_week: z.string().optional(),
  all_day: z.boolean().optional(),
  available_start_time: z.string().optional(),
  available_end_time: z.string().optional(),
});
export type THealthcareServiceAvailableTimeFormItem = z.infer<
  typeof HealthcareServiceAvailableTimeFormItemSchema
>;

/**
 * Full form schema for the "Create Healthcare Service" modal.
 * Covers all fields accepted by fhir-gql's HealthcareServiceCreateSchema
 * except user_id/org_id, which the modal stamps from the session.
 */
export const CreateHealthcareServiceFormSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
  comment: z.string().optional(),
  extra_details: z.string().optional(),
  appointment_required: z.boolean().optional(),
  availability_exceptions: z.string().optional(),

  // Photo — populated by HealthcareServicePhotoUpload's onComplete, not typed by hand.
  photo_content_type: z.string().optional(),
  photo_language: z.string().optional(),
  photo_data: z.string().optional(),
  photo_url: z.string().optional(),
  photo_size: z.number().optional(),
  photo_hash: z.string().optional(),
  photo_title: z.string().optional(),
  photo_creation: z.string().optional(),

  provided_by: z.string().optional(),
  provided_by_display: z.string().optional(),

  identifier: z.array(HealthcareServiceIdentifierInputSchema).optional(),
  category: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  type: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  specialty: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  location: z.array(HealthcareServiceLocationRefInputSchema).optional(),
  telecom: z.array(HealthcareServiceTelecomInputSchema).optional(),
  coverage_area: z.array(HealthcareServiceLocationRefInputSchema).optional(),
  service_provision_code: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  eligibility: z.array(HealthcareServiceEligibilityInputSchema).optional(),
  program: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  characteristic: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  communication: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  referral_method: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  available_time: z.array(HealthcareServiceAvailableTimeFormItemSchema).optional(),
  not_available: z.array(HealthcareServiceNotAvailableInputSchema).optional(),
  endpoint: z.array(HealthcareServiceEndpointInputSchema).optional(),
});
export type TCreateHealthcareServiceFormSchema = z.infer<
  typeof CreateHealthcareServiceFormSchema
>;

/**
 * Form schema for the "Edit Healthcare Service" modal.
 * Only exposes scalar fields patchable per the fhir-gql PATCH contract.
 * Child arrays are not editable here — delete and re-create to change those.
 */
export const EditHealthcareServiceFormSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().optional(),
  comment: z.string().optional(),
  extra_details: z.string().optional(),
  appointment_required: z.boolean().optional(),
  availability_exceptions: z.string().optional(),

  photo_content_type: z.string().optional(),
  photo_language: z.string().optional(),
  photo_data: z.string().optional(),
  photo_url: z.string().optional(),
  photo_size: z.number().optional(),
  photo_hash: z.string().optional(),
  photo_title: z.string().optional(),
  photo_creation: z.string().optional(),
});
export type TEditHealthcareServiceFormSchema = z.infer<
  typeof EditHealthcareServiceFormSchema
>;
