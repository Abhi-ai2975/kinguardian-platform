/**
 * Location form schemas for React Hook Form.
 *
 * Layer: entities / schemas / location
 *
 * Form schemas intentionally differ from the validation schemas:
 *  - `aliases` and each `hours_of_operation[].days_of_week` are represented as
 *    comma-separated strings in the form; the modal's handleSubmit splits
 *    them back into string[] before calling the server action.
 *  - `address_line` is a single string (one street-address line) instead of
 *    string[], wrapped in an array by the modal before submit — mirrors the
 *    Organization AddressTab pattern.
 *  - EditLocationFormSchema only exposes the scalar fields patchable per the
 *    fhir-gql PATCH contract (see PatchLocationDtoSchema in input.ts). Array
 *    sub-resources are not editable here — delete and re-create.
 */

import { z } from "zod";
import {
  LocationIdentifierInputSchema,
  LocationTelecomInputSchema,
  LocationTypeInputSchema,
  LocationEndpointInputSchema,
} from "./input";

/**
 * Hours-of-operation sub-schema for the create form.
 * `days_of_week` is a comma-separated string (e.g. "mon,tue,wed") instead of
 * string[]; the modal splits it before submit.
 */
export const LocationHoursOfOperationFormItemSchema = z.object({
  days_of_week: z.string().optional(),
  all_day: z.boolean().optional(),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
});
export type TLocationHoursOfOperationFormItem = z.infer<
  typeof LocationHoursOfOperationFormItemSchema
>;

/**
 * Full form schema for the "Create Location" modal.
 * Covers all fields accepted by fhir-gql's LocationCreateSchema except
 * user_id/org_id, which the modal stamps from the session rather than
 * collecting via the form.
 */
export const CreateLocationFormSchema = z.object({
  /** Sourced from the terminology server (resource="Location" field="status") via TerminologySelect. */
  status: z.string().optional(),
  operational_status_system: z.string().optional(),
  operational_status_code: z.string().optional(),
  operational_status_display: z.string().optional(),

  name: z.string().optional(),
  description: z.string().optional(),
  /** Sourced from the terminology server (resource="Location" field="mode") via TerminologySelect. */
  mode: z.string().optional(),

  /** Comma-separated alternate names, e.g. "Old Wing, Building C". */
  aliases: z.string().optional(),

  identifiers: z.array(LocationIdentifierInputSchema).optional(),
  types: z.array(LocationTypeInputSchema).optional(),
  telecoms: z.array(LocationTelecomInputSchema).optional(),

  /** `use`/`type` sourced from the terminology server (resource="Patient" field="address.use"/"address.type"). */
  address_use: z.string().optional(),
  address_type: z.string().optional(),
  address_text: z.string().optional(),
  /** Single street-address line — wrapped in an array by the modal before submit. */
  address_line: z.string().optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),

  physical_type_system: z.string().optional(),
  physical_type_code: z.string().optional(),
  physical_type_display: z.string().optional(),
  physical_type_text: z.string().optional(),

  managing_organization: z.string().optional(),
  managing_organization_display: z.string().optional(),
  part_of: z.string().optional(),
  part_of_display: z.string().optional(),

  availability_exceptions: z.string().optional(),
  hours_of_operation: z.array(LocationHoursOfOperationFormItemSchema).optional(),

  position_longitude: z.number().optional(),
  position_latitude: z.number().optional(),
  position_altitude: z.number().optional(),

  endpoints: z.array(LocationEndpointInputSchema).optional(),
});
export type TCreateLocationFormSchema = z.infer<typeof CreateLocationFormSchema>;

/**
 * Form schema for the "Edit Location" modal.
 * Only exposes scalar fields patchable per the fhir-gql PATCH contract.
 * Child arrays are not editable here — delete and re-create to change those.
 */
export const EditLocationFormSchema = z.object({
  /** Sourced from the terminology server (resource="Location" field="status") via TerminologySelect. */
  status: z.string().optional(),
  operational_status_system: z.string().optional(),
  operational_status_code: z.string().optional(),
  operational_status_display: z.string().optional(),

  name: z.string().optional(),
  description: z.string().optional(),
  /** Sourced from the terminology server (resource="Location" field="mode") via TerminologySelect. */
  mode: z.string().optional(),

  /** `use`/`type` sourced from the terminology server (resource="Patient" field="address.use"/"address.type"). */
  address_use: z.string().optional(),
  address_type: z.string().optional(),
  address_text: z.string().optional(),
  /** Single street-address line — wrapped in an array by the modal before submit. */
  address_line: z.string().optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  address_period_start: z.string().optional(),
  address_period_end: z.string().optional(),

  physical_type_system: z.string().optional(),
  physical_type_code: z.string().optional(),
  physical_type_display: z.string().optional(),
  physical_type_text: z.string().optional(),

  managing_organization: z.string().optional(),
  managing_organization_display: z.string().optional(),
  part_of: z.string().optional(),
  part_of_display: z.string().optional(),

  availability_exceptions: z.string().optional(),

  position_longitude: z.number().optional(),
  position_latitude: z.number().optional(),
  position_altitude: z.number().optional(),
});
export type TEditLocationFormSchema = z.infer<typeof EditLocationFormSchema>;
