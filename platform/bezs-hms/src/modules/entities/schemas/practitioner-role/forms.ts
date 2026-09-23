/**
 * PractitionerRole form schemas for React Hook Form.
 *
 * Layer: entities / schemas / practitioner-role
 *
 * Form schemas intentionally differ from the validation schemas:
 *  - `availability[].available_times[].days_of_week` is a comma-separated
 *    string in the form (e.g. "mon,tue,wed"); the modal splits it back into
 *    string[] before submit — mirrors HealthcareService's `available_time`
 *    and Location's `hours_of_operation` pattern.
 *  - `contact[].address_line` is a single string in the form (one line);
 *    the modal wraps it into `[string]` before submit — mirrors Location's
 *    address_line simplification.
 *  - EditPractitionerRoleFormSchema only exposes the scalar fields patchable
 *    per the fhir-gql PATCH contract (see PractitionerRolePatchDtoSchema in
 *    input.ts) — array sub-resources are not editable here.
 *  - Every other array sub-resource shape is reused directly from input.ts
 *    since it needs no form-specific transformation.
 */

import { z } from "zod";
import {
  PractitionerRoleIdentifierInputSchema,
  PractitionerRoleCodeInputSchema,
  PractitionerRoleSpecialtyInputSchema,
  PractitionerRoleLocationInputSchema,
  PractitionerRoleHealthcareServiceInputSchema,
  PractitionerRoleCharacteristicInputSchema,
  PractitionerRoleCommunicationInputSchema,
  PractitionerRoleEndpointInputSchema,
} from "./input";

/**
 * Available-time sub-schema for the create form.
 * `days_of_week` is a comma-separated string instead of string[]; the modal
 * splits it before submit.
 */
export const PractitionerRoleAvailableTimeFormItemSchema = z.object({
  days_of_week: z.string().optional(),
  all_day: z.boolean().optional(),
  available_start_time: z.string().optional(),
  available_end_time: z.string().optional(),
});
export type TPractitionerRoleAvailableTimeFormItem = z.infer<
  typeof PractitionerRoleAvailableTimeFormItemSchema
>;

/** Not-available-time sub-schema for the create form — no transformation needed. */
export const PractitionerRoleNotAvailableTimeFormItemSchema = z.object({
  description: z.string().optional(),
  during_start: z.string().optional(),
  during_end: z.string().optional(),
});
export type TPractitionerRoleNotAvailableTimeFormItem = z.infer<
  typeof PractitionerRoleNotAvailableTimeFormItemSchema
>;

/** Availability container sub-schema for the create form. */
export const PractitionerRoleAvailabilityFormItemSchema = z.object({
  available_times: z.array(PractitionerRoleAvailableTimeFormItemSchema).optional(),
  not_available_times: z.array(PractitionerRoleNotAvailableTimeFormItemSchema).optional(),
});
export type TPractitionerRoleAvailabilityFormItem = z.infer<
  typeof PractitionerRoleAvailabilityFormItemSchema
>;

/**
 * HumanName sub-schema nested inside a contact.
 * `given`/`prefix`/`suffix` are comma-separated strings instead of string[];
 * the modal splits each before submit — mirrors Organization's ContactsTab
 * `name_given`/`name_prefix`/`name_suffix` comma-string convention.
 */
const PractitionerRoleContactNameFormItemSchema = z.object({
  use: z.string().optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

/** ContactPoint sub-schema nested inside a contact — no transformation needed. */
const PractitionerRoleContactTelecomFormItemSchema = z.object({
  system: z.string().optional(),
  value: z.string().optional(),
  use: z.string().optional(),
  rank: z.number().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

/**
 * Contact sub-schema for the create form.
 * `address_line` is a single string (one line) instead of string[]; the
 * modal wraps it into `[string]` before submit.
 */
export const PractitionerRoleContactFormItemSchema = z.object({
  purpose_system: z.string().optional(),
  purpose_code: z.string().optional(),
  purpose_display: z.string().optional(),
  purpose_text: z.string().optional(),
  address_use: z.string().optional(),
  address_type: z.string().optional(),
  address_text: z.string().optional(),
  address_line: z.string().optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  address_period_start: z.string().optional(),
  address_period_end: z.string().optional(),
  organization: z.string().optional(),
  organization_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  names: z.array(PractitionerRoleContactNameFormItemSchema).optional(),
  telecoms: z.array(PractitionerRoleContactTelecomFormItemSchema).optional(),
});
export type TPractitionerRoleContactFormItem = z.infer<
  typeof PractitionerRoleContactFormItemSchema
>;

/**
 * Full form schema for the "Create PractitionerRole" modal.
 * Covers all fields accepted by fhir-gql's PractitionerRoleCreateSchema
 * except user_id/org_id, which the modal stamps from the session.
 */
export const CreatePractitionerRoleFormSchema = z.object({
  practitioner: z.string().optional(),
  practitioner_display: z.string().optional(),
  organization: z.string().optional(),
  organization_display: z.string().optional(),
  active: z.boolean().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  availability_exceptions: z.string().optional(),

  identifier: z.array(PractitionerRoleIdentifierInputSchema).optional(),
  code: z.array(PractitionerRoleCodeInputSchema).optional(),
  specialty: z.array(PractitionerRoleSpecialtyInputSchema).optional(),
  location: z.array(PractitionerRoleLocationInputSchema).optional(),
  healthcare_service: z.array(PractitionerRoleHealthcareServiceInputSchema).optional(),
  characteristic: z.array(PractitionerRoleCharacteristicInputSchema).optional(),
  communication: z.array(PractitionerRoleCommunicationInputSchema).optional(),
  contact: z.array(PractitionerRoleContactFormItemSchema).optional(),
  availability: z.array(PractitionerRoleAvailabilityFormItemSchema).optional(),
  endpoint: z.array(PractitionerRoleEndpointInputSchema).optional(),
});
export type TCreatePractitionerRoleFormSchema = z.infer<
  typeof CreatePractitionerRoleFormSchema
>;

/**
 * Form schema for the "Edit PractitionerRole" modal.
 * Only exposes scalar fields patchable per the fhir-gql PATCH contract.
 * Child arrays and references are not editable here — delete and re-create
 * to change those.
 */
export const EditPractitionerRoleFormSchema = z.object({
  active: z.boolean().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  availability_exceptions: z.string().optional(),
});
export type TEditPractitionerRoleFormSchema = z.infer<
  typeof EditPractitionerRoleFormSchema
>;
